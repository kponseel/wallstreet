import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Game, Player, SubmitPortfolioInput, GAME_CONSTANTS } from '../types';
import {
  isValidTicker,
  validatePortfolioAllocations,
  createAuditLog,
} from '../utils/helpers';
import { findStockByTicker, searchStocks, isTickerEligible } from '../data/stocks';

const db = admin.firestore();

// ============================================
// WALLSTREET v2.0 - PORTFOLIO FUNCTIONS
// ============================================

/**
 * Submit or update a portfolio (before game launch)
 */
export const submitPortfolio = functions.https.onCall(
  async (data: SubmitPortfolioInput & { playerId: string }, context) => {
    const { gameCode, playerId, positions } = data;

    // Get player
    const playerRef = db.collection('players').doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Player not found');
    }

    const player = playerDoc.data() as Player;

    // Verify player belongs to this game
    if (player.gameCode !== gameCode) {
      throw new functions.https.HttpsError('permission-denied', 'Player not in this game');
    }

    // Get game
    const gameRef = db.collection('games').doc(gameCode);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Game not found');
    }

    const game = gameDoc.data() as Game;

    // Validate game state
    if (game.status !== 'DRAFT') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Cannot modify portfolio after game has started'
      );
    }

    // Validate positions count (must be exactly 3)
    if (!positions || positions.length !== GAME_CONSTANTS.REQUIRED_POSITIONS) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Portfolio must have exactly ${GAME_CONSTANTS.REQUIRED_POSITIONS} positions`
      );
    }

    // Validate each position
    const tickers = new Set<string>();
    const validatedPositions: Array<{
      ticker: string;
      budgetInvested: number;
      quantity: number;
      initialPrice: number;
    }> = [];

    for (const pos of positions) {
      // Validate ticker format
      if (!isValidTicker(pos.ticker)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid ticker format: ${pos.ticker}`
        );
      }

      // Check for duplicates
      if (tickers.has(pos.ticker)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Duplicate ticker: ${pos.ticker}`
        );
      }
      tickers.add(pos.ticker);

      // Verify ticker is eligible
      if (!isTickerEligible(pos.ticker)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Ticker not eligible: ${pos.ticker}. Must be NASDAQ or CAC40.`
        );
      }

      // Validate budget
      if (pos.budgetInvested <= 0 || pos.budgetInvested > GAME_CONSTANTS.TOTAL_BUDGET) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid budget for ${pos.ticker}: must be between 1 and ${GAME_CONSTANTS.TOTAL_BUDGET}`
        );
      }

      validatedPositions.push({
        ticker: pos.ticker,
        budgetInvested: pos.budgetInvested,
        quantity: 0, // Will be calculated at game launch
        initialPrice: 0, // Will be set at game launch
      });
    }

    // Validate total allocation
    const allocationValidation = validatePortfolioAllocations(validatedPositions);
    if (!allocationValidation.valid) {
      throw new functions.https.HttpsError('invalid-argument', allocationValidation.error!);
    }

    // Update player's portfolio
    await playerRef.update({
      portfolio: validatedPositions,
      isReady: true,
      submittedAt: Timestamp.now(),
    });

    // Update game tickers list
    await gameRef.update({
      tickers: admin.firestore.FieldValue.arrayUnion(...Array.from(tickers)),
    });

    await createAuditLog(
      db,
      'PORTFOLIO_SUBMITTED',
      player.userId || 'anonymous',
      'PLAYER',
      playerId,
      {
        gameCode,
        tickers: Array.from(tickers),
      }
    );

    functions.logger.info(`Portfolio submitted for player ${playerId} in game ${gameCode}`);

    return {
      success: true,
      data: {
        playerId,
        isReady: true,
        submittedAt: new Date().toISOString(),
      },
    };
  }
);

/**
 * Get a player's portfolio
 * Only returns full details if:
 * - Requester is the player themselves
 * - Game is LIVE or ENDED (portfolios revealed)
 */
export const getPortfolio = functions.https.onCall(
  async (data: { playerId: string; requestingPlayerId?: string }) => {
    const { playerId, requestingPlayerId } = data;

    const playerDoc = await db.collection('players').doc(playerId).get();

    if (!playerDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Player not found');
    }

    const player = playerDoc.data() as Player;

    // Get game to check status
    const gameDoc = await db.collection('games').doc(player.gameCode).get();
    const game = gameDoc.data() as Game;

    // Check visibility rules
    const isSelf = requestingPlayerId === playerId;
    const isRevealed = game.status === 'LIVE' || game.status === 'ENDED';

    if (!isSelf && !isRevealed) {
      // Return limited info
      return {
        success: true,
        data: {
          playerId: player.playerId,
          nickname: player.nickname,
          isReady: player.isReady,
          portfolioHidden: true,
        },
      };
    }

    // Return full portfolio
    const portfolioWithDetails = player.portfolio.map((pos) => {
      const stockData = findStockByTicker(pos.ticker);
      return {
        ...pos,
        companyName: stockData?.companyName || pos.ticker,
        market: stockData?.market || 'UNKNOWN',
        sector: stockData?.sector || null,
      };
    });

    return {
      success: true,
      data: {
        playerId: player.playerId,
        gameCode: player.gameCode,
        nickname: player.nickname,
        portfolio: portfolioWithDetails,
        totalBudget: player.totalBudget,
        isReady: player.isReady,
        submittedAt: player.submittedAt?.toDate().toISOString() || null,
      },
    };
  }
);

/**
 * Search for stocks (NASDAQ + CAC40)
 */
export const searchSymbols = functions.https.onCall(
  async (data: { query: string; limit?: number }, context) => {
    const { query, limit = 10 } = data;

    if (!query || query.length < 1) {
      return { success: true, data: { symbols: [] } };
    }

    const maxLimit = Math.min(limit, 20);
    const results = searchStocks(query, maxLimit);

    const symbols = results.map((stock) => ({
      ticker: stock.ticker,
      companyName: stock.companyName,
      market: stock.market,
      sector: stock.sector,
    }));

    return {
      success: true,
      data: { symbols },
    };
  }
);

/**
 * Validate a single ticker
 */
export const validateTicker = functions.https.onCall(
  async (data: { ticker: string }) => {
    const { ticker } = data;

    if (!isValidTicker(ticker)) {
      return {
        success: true,
        data: { valid: false, reason: 'Invalid ticker format' },
      };
    }

    const stockData = findStockByTicker(ticker);

    if (!stockData) {
      return {
        success: true,
        data: { valid: false, reason: 'Ticker not found in eligible stocks' },
      };
    }

    return {
      success: true,
      data: {
        valid: true,
        stock: {
          ticker: stockData.ticker,
          companyName: stockData.companyName,
          market: stockData.market,
          sector: stockData.sector,
        },
      },
    };
  }
);

/**
 * Clear a player's portfolio (set to not ready)
 */
export const clearPortfolio = functions.https.onCall(
  async (data: { playerId: string }) => {
    const { playerId } = data;

    const playerRef = db.collection('players').doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Player not found');
    }

    const player = playerDoc.data() as Player;

    // Get game to check status
    const gameDoc = await db.collection('games').doc(player.gameCode).get();
    const game = gameDoc.data() as Game;

    if (game.status !== 'DRAFT') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Cannot modify portfolio after game has started'
      );
    }

    await playerRef.update({
      portfolio: [],
      isReady: false,
      submittedAt: null,
    });

    return { success: true };
  }
);
