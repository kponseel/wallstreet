/**
 * Stock Price Functions
 * Cloud Functions for fetching real-time stock prices
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  fetchStockQuote,
  fetchBatchQuotes,
  generateMockPrice,
  type StockQuote,
} from '../utils/stockPrices';
import { findStockByTicker } from '../data/stocks';

const db = admin.firestore();

// Cache prices for 1 minute to reduce API calls
const CACHE_DURATION_MS = 60 * 1000;

interface CachedPrice {
  quote: StockQuote;
  cachedAt: number;
}

const priceCache: Map<string, CachedPrice> = new Map();

/**
 * Get cached price or fetch new one
 */
async function getCachedOrFetchPrice(ticker: string): Promise<StockQuote | null> {
  const cached = priceCache.get(ticker);
  const now = Date.now();

  if (cached && now - cached.cachedAt < CACHE_DURATION_MS) {
    return cached.quote;
  }

  const quote = await fetchStockQuote(ticker);
  if (quote) {
    priceCache.set(ticker, { quote, cachedAt: now });
  }

  return quote;
}

/**
 * Get current price for a single stock
 */
export const getStockPrice = functions.https.onCall(
  async (data: { ticker: string }) => {
    const { ticker } = data;

    if (!ticker) {
      throw new functions.https.HttpsError('invalid-argument', 'Ticker is required');
    }

    // Verify stock is in our eligible list
    const stockInfo = findStockByTicker(ticker);
    if (!stockInfo) {
      throw new functions.https.HttpsError('not-found', 'Stock not found in eligible list');
    }

    const quote = await getCachedOrFetchPrice(ticker);

    if (!quote) {
      // Return mock price as fallback
      functions.logger.warn(`Using mock price for ${ticker}`);
      const mockQuote = generateMockPrice(ticker);
      return {
        success: true,
        data: {
          ...mockQuote,
          companyName: stockInfo.companyName,
          market: stockInfo.market,
          isMock: true,
        },
      };
    }

    return {
      success: true,
      data: {
        ...quote,
        companyName: stockInfo.companyName,
        market: stockInfo.market,
        isMock: false,
      },
    };
  }
);

/**
 * Get current prices for multiple stocks
 */
export const getBatchStockPrices = functions.https.onCall(
  async (data: { tickers: string[] }) => {
    const { tickers } = data;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Tickers array is required');
    }

    if (tickers.length > 50) {
      throw new functions.https.HttpsError('invalid-argument', 'Maximum 50 tickers per request');
    }

    // Filter to eligible stocks only
    const eligibleTickers = tickers.filter((t) => findStockByTicker(t));

    const now = Date.now();
    const results: Record<string, StockQuote & { companyName: string; market: string; isMock: boolean }> = {};
    const tickersToFetch: string[] = [];

    // Check cache first
    for (const ticker of eligibleTickers) {
      const cached = priceCache.get(ticker);
      if (cached && now - cached.cachedAt < CACHE_DURATION_MS) {
        const stockInfo = findStockByTicker(ticker)!;
        results[ticker] = {
          ...cached.quote,
          companyName: stockInfo.companyName,
          market: stockInfo.market,
          isMock: false,
        };
      } else {
        tickersToFetch.push(ticker);
      }
    }

    // Fetch missing prices
    if (tickersToFetch.length > 0) {
      const { quotes, errors } = await fetchBatchQuotes(tickersToFetch);

      // Add successful quotes to results and cache
      for (const [ticker, quote] of Object.entries(quotes)) {
        priceCache.set(ticker, { quote, cachedAt: now });
        const stockInfo = findStockByTicker(ticker)!;
        results[ticker] = {
          ...quote,
          companyName: stockInfo.companyName,
          market: stockInfo.market,
          isMock: false,
        };
      }

      // Generate mock prices for failures
      for (const ticker of errors) {
        const stockInfo = findStockByTicker(ticker);
        if (stockInfo) {
          const mockQuote = generateMockPrice(ticker);
          results[ticker] = {
            ...mockQuote,
            companyName: stockInfo.companyName,
            market: stockInfo.market,
            isMock: true,
          };
        }
      }
    }

    return {
      success: true,
      data: { prices: results },
    };
  }
);

/**
 * Store daily price snapshot (called by scheduled function)
 * This captures end-of-day prices for settlement
 */
export const storePriceSnapshot = functions.https.onCall(
  async (data: { ticker: string; date?: string }, context) => {
    // Only allow authenticated users or scheduled functions
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { ticker, date } = data;
    const snapshotDate = date || new Date().toISOString().split('T')[0];

    const quote = await fetchStockQuote(ticker);
    if (!quote) {
      throw new functions.https.HttpsError('not-found', 'Could not fetch price');
    }

    const snapshotId = `${snapshotDate}_${ticker}`;
    await db.collection('priceSnapshots').doc(snapshotId).set({
      ticker,
      date: snapshotDate,
      price: quote.price,
      previousClose: quote.previousClose,
      currency: quote.currency,
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, data: { snapshotId, price: quote.price } };
  }
);

/**
 * Get price snapshot for a specific date
 */
export const getPriceSnapshot = functions.https.onCall(
  async (data: { ticker: string; date: string }) => {
    const { ticker, date } = data;

    if (!ticker || !date) {
      throw new functions.https.HttpsError('invalid-argument', 'Ticker and date are required');
    }

    const snapshotId = `${date}_${ticker}`;
    const doc = await db.collection('priceSnapshots').doc(snapshotId).get();

    if (!doc.exists) {
      return { success: false, data: null };
    }

    return {
      success: true,
      data: doc.data(),
    };
  }
);

/**
 * Scheduled function to capture daily price snapshots
 * Runs at market close (22:00 Paris time for European, 16:30 EST for US)
 */
export const dailyPriceSnapshot = functions.pubsub
  .schedule('30 22 * * 1-5') // 22:30 Paris time, weekdays only
  .timeZone('Europe/Paris')
  .onRun(async () => {
    functions.logger.info('Starting daily price snapshot capture');

    // Get all active games
    const activeGames = await db
      .collection('games')
      .where('status', '==', 'LIVE')
      .get();

    if (activeGames.empty) {
      functions.logger.info('No active games, skipping price snapshot');
      return;
    }

    // Collect all unique tickers from active games
    const tickerSet = new Set<string>();

    for (const gameDoc of activeGames.docs) {
      const gameCode = gameDoc.id;
      const playersSnapshot = await db
        .collection('players')
        .where('gameCode', '==', gameCode)
        .get();

      for (const playerDoc of playersSnapshot.docs) {
        const player = playerDoc.data();
        for (const position of player.portfolio || []) {
          tickerSet.add(position.ticker);
        }
      }
    }

    const tickers = Array.from(tickerSet);
    functions.logger.info(`Capturing prices for ${tickers.length} tickers`);

    // Fetch and store all prices
    const today = new Date().toISOString().split('T')[0];
    const { quotes, errors } = await fetchBatchQuotes(tickers);

    const batch = db.batch();

    for (const [ticker, quote] of Object.entries(quotes)) {
      const snapshotId = `${today}_${ticker}`;
      const ref = db.collection('priceSnapshots').doc(snapshotId);
      batch.set(ref, {
        ticker,
        date: today,
        price: quote.price,
        previousClose: quote.previousClose,
        currency: quote.currency,
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    functions.logger.info(
      `Price snapshot complete: ${Object.keys(quotes).length} success, ${errors.length} errors`
    );

    if (errors.length > 0) {
      functions.logger.warn('Failed to fetch prices for:', errors);
    }
  });
