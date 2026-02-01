/**
 * Stock Price Service
 * Fetches real-time stock prices from Yahoo Finance API
 */

import * as functions from 'firebase-functions';

export interface StockQuote {
  ticker: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  lastUpdated: string;
}

export interface BatchQuoteResult {
  quotes: Record<string, StockQuote>;
  errors: string[];
}

/**
 * Convert European ticker format to Yahoo Finance format
 * CAC40 stocks use .PA suffix on Yahoo Finance
 */
function toYahooTicker(ticker: string): string {
  // French CAC40 stocks end with .PA on Yahoo Finance
  if (ticker.endsWith('.PA')) {
    return ticker;
  }
  // Check if it's a known European stock format (e.g., MC.PA for LVMH)
  if (ticker.includes('.')) {
    return ticker;
  }
  return ticker;
}

/**
 * Fetch a single stock quote from Yahoo Finance
 */
export async function fetchStockQuote(ticker: string): Promise<StockQuote | null> {
  const yahooTicker = toYahooTicker(ticker);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      functions.logger.warn(`Yahoo Finance API error for ${ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.chart?.result?.[0]) {
      functions.logger.warn(`No data returned for ${ticker}`);
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;

    const price = meta.regularMarketPrice || 0;
    const previousClose = meta.previousClose || meta.chartPreviousClose || price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      ticker,
      price: Math.round(price * 100) / 100,
      previousClose: Math.round(previousClose * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      currency: meta.currency || 'USD',
      marketState: meta.marketState || 'CLOSED',
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    functions.logger.error(`Error fetching quote for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch multiple stock quotes in parallel
 * Yahoo Finance supports batch requests but we'll use parallel single requests for reliability
 */
export async function fetchBatchQuotes(tickers: string[]): Promise<BatchQuoteResult> {
  const quotes: Record<string, StockQuote> = {};
  const errors: string[] = [];

  // Fetch in parallel with a concurrency limit
  const BATCH_SIZE = 10;
  const uniqueTickers = [...new Set(tickers)];

  for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
    const batch = uniqueTickers.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (ticker) => {
        const quote = await fetchStockQuote(ticker);
        return { ticker, quote };
      })
    );

    for (const { ticker, quote } of results) {
      if (quote) {
        quotes[ticker] = quote;
      } else {
        errors.push(ticker);
      }
    }
  }

  return { quotes, errors };
}

/**
 * Get the previous trading day's closing price for a stock
 * Used for calculating initial positions
 */
export async function fetchPreviousClose(ticker: string): Promise<number | null> {
  const quote = await fetchStockQuote(ticker);
  return quote?.previousClose ?? null;
}

/**
 * Fetch historical price for a specific date
 * Used for settlement when we need end-of-day prices
 */
export async function fetchHistoricalPrice(
  ticker: string,
  date: Date
): Promise<number | null> {
  const yahooTicker = toYahooTicker(ticker);

  try {
    // Calculate period for the specific date (add buffer days for weekends/holidays)
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      functions.logger.warn(`Yahoo Finance historical API error for ${ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.chart?.result?.[0]) {
      return null;
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    // Find the price closest to the target date
    const targetTime = date.getTime() / 1000;
    let closestIndex = 0;
    let closestDiff = Math.abs(timestamps[0] - targetTime);

    for (let i = 1; i < timestamps.length; i++) {
      const diff = Math.abs(timestamps[i] - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    const price = closes[closestIndex];
    return price ? Math.round(price * 100) / 100 : null;
  } catch (error) {
    functions.logger.error(`Error fetching historical price for ${ticker}:`, error);
    return null;
  }
}

/**
 * Generate a mock price for development/fallback
 */
export function generateMockPrice(ticker: string, basePrice?: number): StockQuote {
  const base = basePrice || (ticker.includes('.PA') ? 150 : 200);
  const variance = Math.random() * 100 - 50;
  const price = Math.round((base + variance) * 100) / 100;
  const previousClose = Math.round((price * (1 + (Math.random() * 0.04 - 0.02))) * 100) / 100;
  const change = Math.round((price - previousClose) * 100) / 100;
  const changePercent = Math.round((change / previousClose) * 10000) / 100;

  return {
    ticker,
    price,
    previousClose,
    change,
    changePercent,
    currency: ticker.includes('.PA') ? 'EUR' : 'USD',
    marketState: 'CLOSED',
    lastUpdated: new Date().toISOString(),
  };
}
