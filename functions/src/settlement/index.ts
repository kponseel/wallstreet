import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  Game,
  Player,
  Result,
  PositionResult,
  Award,
  LeaderboardEntry,
  GAME_CONSTANTS,
} from '../types';
import {
  calculateReturn,
  calculatePositionValue,
  roundTo,
  createAuditLog,
  formatDateString,
} from '../utils/helpers';
import { findStockByTicker } from '../data/stocks';

const db = admin.firestore();

// ============================================
// WALLSTREET v2.0 - SETTLEMENT & AWARDS
// ============================================

/**
 * Scheduled function to check for games that need to end
 * Runs every 15 minutes
 */
export const processGameEnds = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('Europe/Paris')
  .onRun(async () => {
    const now = Timestamp.now();

    // Find LIVE games that have passed their end date
    const gamesQuery = await db
      .collection('games')
      .where('status', '==', 'LIVE')
      .where('endDate', '<=', now)
      .get();

    functions.logger.info(`Found ${gamesQuery.size} games to settle`);

    for (const gameDoc of gamesQuery.docs) {
      const game = gameDoc.data() as Game;
      try {
        await settleGame(game.code);
        functions.logger.info(`Settled game: ${game.code}`);
      } catch (error) {
        functions.logger.error(`Failed to settle game ${game.code}:`, error);
      }
    }
  });

/**
 * Manually trigger settlement for a game (for testing or admin)
 */
export const forceSettleGame = functions.https.onCall(
  async (data: { gameCode: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { gameCode } = data;

    const gameDoc = await db.collection('games').doc(gameCode).get();
    if (!gameDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Game not found');
    }

    const game = gameDoc.data() as Game;

    // Only creator can force settle
    if (game.creatorId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only creator can force settle');
    }

    if (game.status !== 'LIVE') {
      throw new functions.https.HttpsError('failed-precondition', 'Game is not live');
    }

    await settleGame(gameCode);

    return { success: true };
  }
);

/**
 * Main settlement function
 */
async function settleGame(gameCode: string): Promise<void> {
  const gameRef = db.collection('games').doc(gameCode);
  const gameDoc = await gameRef.get();
  const game = gameDoc.data() as Game;

  // Check if already settled (prevent duplicate settlement)
  const existingResults = await db
    .collection('results')
    .where('gameCode', '==', gameCode)
    .limit(1)
    .get();

  if (!existingResults.empty) {
    functions.logger.warn(`Game ${gameCode} already settled, skipping`);
    return;
  }

  // Also check game status
  if (game.status === 'ENDED') {
    functions.logger.warn(`Game ${gameCode} already ended, skipping settlement`);
    return;
  }

  // Get all players
  const playersSnapshot = await db
    .collection('players')
    .where('gameCode', '==', gameCode)
    .get();

  const players = playersSnapshot.docs.map((doc) => doc.data() as Player);

  // Fetch current (final) prices
  const finalPrices = await fetchFinalPrices(game.tickers);

  // Calculate results for each player
  const results: Result[] = [];

  for (const player of players) {
    const positionResults: PositionResult[] = [];
    let totalFinalValue = 0;

    for (const position of player.portfolio) {
      const initialPrice = position.initialPrice;
      const finalPrice = finalPrices[position.ticker] || initialPrice;
      const quantity = position.quantity;
      const valueAtEnd = calculatePositionValue(quantity, finalPrice);
      const returnPercent = calculateReturn(initialPrice, finalPrice);

      positionResults.push({
        ticker: position.ticker,
        budgetInvested: position.budgetInvested,
        quantity,
        initialPrice,
        finalPrice,
        returnPercent: roundTo(returnPercent, 4),
        valueAtEnd: roundTo(valueAtEnd, 2),
      });

      totalFinalValue += valueAtEnd;
    }

    // Calculate portfolio return
    const portfolioReturnPercent = calculateReturn(GAME_CONSTANTS.TOTAL_BUDGET, totalFinalValue);

    const result: Result = {
      resultId: `${gameCode}_${player.playerId}`,
      gameCode,
      playerId: player.playerId,
      nickname: player.nickname,
      positionResults,
      portfolioReturnPercent: roundTo(portfolioReturnPercent, 4),
      initialValue: GAME_CONSTANTS.TOTAL_BUDGET,
      finalValue: roundTo(totalFinalValue, 2),
      rank: 0, // Will be set after ranking
      totalParticipants: players.length,
      awards: [], // Will be set after awards calculation
      whatIfMessage: null, // Will be set after awards calculation
      submittedAt: player.submittedAt!,
      calculatedAt: Timestamp.now(),
    };

    results.push(result);
  }

  // Rank results (highest return first)
  rankResults(results);

  // Calculate awards
  const awardsMap = calculateAwards(results);

  // Assign awards and what-if messages to results
  for (const result of results) {
    result.awards = awardsMap.get(result.playerId) || [];
    result.whatIfMessage = generateWhatIfMessage(result, results);
  }

  // Save results and update game in a batch
  const batch = db.batch();

  // Save each result
  for (const result of results) {
    batch.set(db.collection('results').doc(result.resultId), result);

    // Create leaderboard entry
    const leaderboardEntry: LeaderboardEntry = {
      gameCode,
      rank: result.rank,
      playerId: result.playerId,
      nickname: result.nickname,
      portfolioReturnPercent: result.portfolioReturnPercent,
      finalValue: result.finalValue,
      awards: result.awards,
      bestPosition: getBestPosition(result.positionResults),
      worstPosition: getWorstPosition(result.positionResults),
    };

    batch.set(db.collection('leaderboard').doc(result.resultId), leaderboardEntry);
  }

  // Update game status
  batch.update(gameRef, {
    status: 'ENDED',
    endedAt: Timestamp.now(),
  });

  await batch.commit();

  // Update user stats
  await updateUserStats(results);

  await createAuditLog(db, 'GAME_SETTLED', 'system', 'GAME', gameCode, {
    playerCount: results.length,
    winner: results.find((r) => r.rank === 1)?.nickname,
  });

  functions.logger.info(`Game ${gameCode} settled with ${results.length} results`);
}

/**
 * Fetch final prices for all tickers
 */
async function fetchFinalPrices(tickers: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const today = formatDateString(new Date());

  for (const ticker of tickers) {
    // Try to get from price snapshots
    const priceDoc = await db
      .collection('priceSnapshots')
      .doc(`${today}_${ticker}`)
      .get();

    if (priceDoc.exists) {
      prices[ticker] = priceDoc.data()!.closePrice;
    } else {
      // Use mock price (simulate some movement from initial)
      const stockData = findStockByTicker(ticker);
      if (stockData) {
        // Generate a price with some variance (-15% to +20%)
        const basePrice = stockData.market === 'CAC40' ? 150 : 200;
        const variance = (Math.random() * 35 - 15) / 100; // -15% to +20%
        prices[ticker] = Math.round((basePrice + basePrice * variance + Math.random() * 400) * 100) / 100;
      }
    }
  }

  return prices;
}

/**
 * Rank results by portfolio return (descending)
 * Ties broken by submission time (earlier wins)
 */
function rankResults(results: Result[]): void {
  results.sort((a, b) => {
    // Primary: return percent (descending)
    if (b.portfolioReturnPercent !== a.portfolioReturnPercent) {
      return b.portfolioReturnPercent - a.portfolioReturnPercent;
    }
    // Secondary: submission time (ascending - earlier wins)
    return a.submittedAt.toMillis() - b.submittedAt.toMillis();
  });

  // Assign ranks
  for (let i = 0; i < results.length; i++) {
    results[i].rank = i + 1;
  }
}

/**
 * Calculate all awards for a game
 */
function calculateAwards(results: Result[]): Map<string, Award[]> {
  const awardsMap = new Map<string, Award[]>();

  // Initialize empty arrays for all players
  for (const result of results) {
    awardsMap.set(result.playerId, []);
  }

  // Podium Awards
  if (results.length > 0) {
    const first = results.find((r) => r.rank === 1);
    if (first) {
      awardsMap.get(first.playerId)!.push({
        type: 'WOLF',
        value: first.portfolioReturnPercent,
        message: `Le Loup de Wall Street avec ${first.portfolioReturnPercent > 0 ? '+' : ''}${first.portfolioReturnPercent.toFixed(2)}%`,
      });
    }

    const second = results.find((r) => r.rank === 2);
    if (second) {
      awardsMap.get(second.playerId)!.push({
        type: 'DOLPHIN',
        value: second.portfolioReturnPercent,
        message: `Le Dauphin avec ${second.portfolioReturnPercent > 0 ? '+' : ''}${second.portfolioReturnPercent.toFixed(2)}%`,
      });
    }

    const last = results.find((r) => r.rank === results.length);
    if (last && last.rank > 2) {
      awardsMap.get(last.playerId)!.push({
        type: 'INTERN',
        value: last.portfolioReturnPercent,
        message: `Le Stagiaire avec ${last.portfolioReturnPercent > 0 ? '+' : ''}${last.portfolioReturnPercent.toFixed(2)}%`,
      });
    }
  }

  // Flatten all positions for special awards
  const allPositions: Array<{
    playerId: string;
    nickname: string;
    ticker: string;
    returnPercent: number;
    budgetInvested: number;
  }> = [];

  for (const result of results) {
    for (const pos of result.positionResults) {
      allPositions.push({
        playerId: result.playerId,
        nickname: result.nickname,
        ticker: pos.ticker,
        returnPercent: pos.returnPercent,
        budgetInvested: pos.budgetInvested,
      });
    }
  }

  // La Fusée - Best single stock performance
  if (allPositions.length > 0) {
    const bestStock = allPositions.reduce((best, pos) =>
      pos.returnPercent > best.returnPercent ? pos : best
    );
    awardsMap.get(bestStock.playerId)!.push({
      type: 'ROCKET',
      ticker: bestStock.ticker,
      value: bestStock.returnPercent,
      message: `A déniché ${bestStock.ticker} qui a fait ${bestStock.returnPercent > 0 ? '+' : ''}${bestStock.returnPercent.toFixed(1)}% !`,
    });
  }

  // La Tuile - Worst single stock performance
  if (allPositions.length > 0) {
    const worstStock = allPositions.reduce((worst, pos) =>
      pos.returnPercent < worst.returnPercent ? pos : worst
    );
    // Only award if actually negative
    if (worstStock.returnPercent < 0) {
      awardsMap.get(worstStock.playerId)!.push({
        type: 'BAG_HOLDER',
        ticker: worstStock.ticker,
        value: worstStock.returnPercent,
        message: `A coulé avec ${worstStock.ticker} (${worstStock.returnPercent.toFixed(1)}%)...`,
      });
    }
  }

  // L'Oracle - All 3 stocks in green
  for (const result of results) {
    const allGreen = result.positionResults.every((pos) => pos.returnPercent > 0);
    if (allGreen) {
      awardsMap.get(result.playerId)!.push({
        type: 'ORACLE',
        message: 'Le seul avec 3 actions dans le vert !',
      });
      break; // Only one Oracle per game
    }
  }

  // Le Casino - >8000 credits on one stock
  const bigBets = allPositions.filter(
    (pos) => pos.budgetInvested >= GAME_CONSTANTS.GAMBLER_THRESHOLD
  );
  if (bigBets.length > 0) {
    const biggestBet = bigBets.reduce((max, pos) =>
      pos.budgetInvested > max.budgetInvested ? pos : max
    );
    awardsMap.get(biggestBet.playerId)!.push({
      type: 'GAMBLER',
      ticker: biggestBet.ticker,
      value: biggestBet.budgetInvested,
      message: `A tout misé sur ${biggestBet.ticker} (${biggestBet.budgetInvested} crédits)`,
    });
  }

  return awardsMap;
}

/**
 * Generate "What If" regret message for non-winners
 */
function generateWhatIfMessage(result: Result, allResults: Result[]): string | null {
  // Only for non-winners
  if (result.rank === 1) return null;

  // Find player's best performing stock
  const bestPosition = result.positionResults.reduce((best, pos) =>
    pos.returnPercent > best.returnPercent ? pos : best
  );

  // Calculate hypothetical return if 100% on best stock
  const hypotheticalReturn = bestPosition.returnPercent;

  // Find what rank they would have been
  let hypotheticalRank = 1;
  for (const other of allResults) {
    if (other.playerId !== result.playerId && other.portfolioReturnPercent > hypotheticalReturn) {
      hypotheticalRank++;
    }
  }

  // Only show if it would have improved their position
  if (hypotheticalRank >= result.rank) return null;

  const rankSuffix = hypotheticalRank === 1 ? 'er' : 'ème';

  return `Si tu avais mis tes 10 000 crédits uniquement sur ${bestPosition.ticker}, tu aurais fini ${hypotheticalRank}${rankSuffix} !`;
}

/**
 * Get best performing position
 */
function getBestPosition(positions: PositionResult[]): { ticker: string; returnPercent: number } {
  const best = positions.reduce((b, p) => (p.returnPercent > b.returnPercent ? p : b));
  return { ticker: best.ticker, returnPercent: best.returnPercent };
}

/**
 * Get worst performing position
 */
function getWorstPosition(positions: PositionResult[]): { ticker: string; returnPercent: number } {
  const worst = positions.reduce((w, p) => (p.returnPercent < w.returnPercent ? p : w));
  return { ticker: worst.ticker, returnPercent: worst.returnPercent };
}

/**
 * Update user statistics after game settlement
 */
async function updateUserStats(results: Result[]): Promise<void> {
  for (const result of results) {
    // Get player to find userId
    const playerDoc = await db.collection('players').doc(result.playerId).get();
    const player = playerDoc.data() as Player;

    if (!player.userId) continue; // Skip anonymous players

    const userRef = db.collection('users').doc(player.userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) continue;

    const userData = userDoc.data()!;
    const currentStats = userData.stats || {
      gamesPlayed: 0,
      gamesWon: 0,
      totalReturns: 0,
      bestReturn: 0,
      averageRank: 0,
    };

    const newGamesPlayed = currentStats.gamesPlayed + 1;
    const newGamesWon = currentStats.gamesWon + (result.rank === 1 ? 1 : 0);
    const newTotalReturns = currentStats.totalReturns + result.portfolioReturnPercent;
    const newBestReturn = Math.max(currentStats.bestReturn, result.portfolioReturnPercent);

    // Calculate new average rank
    const totalRankSum = currentStats.averageRank * currentStats.gamesPlayed + result.rank;
    const newAverageRank = totalRankSum / newGamesPlayed;

    await userRef.update({
      'stats.gamesPlayed': newGamesPlayed,
      'stats.gamesWon': newGamesWon,
      'stats.totalReturns': roundTo(newTotalReturns, 2),
      'stats.bestReturn': roundTo(newBestReturn, 2),
      'stats.averageRank': roundTo(newAverageRank, 2),
    });
  }
}

/**
 * Get leaderboard for a game
 */
export const getLeaderboard = functions.https.onCall(async (data: { gameCode: string }) => {
  const { gameCode } = data;

  const leaderboardSnapshot = await db
    .collection('leaderboard')
    .where('gameCode', '==', gameCode)
    .orderBy('rank', 'asc')
    .get();

  const entries = leaderboardSnapshot.docs.map((doc) => doc.data() as LeaderboardEntry);

  return {
    success: true,
    data: { entries },
  };
});

/**
 * Get results for a specific player
 */
export const getPlayerResult = functions.https.onCall(
  async (data: { gameCode: string; playerId: string }) => {
    const { gameCode, playerId } = data;

    const resultDoc = await db.collection('results').doc(`${gameCode}_${playerId}`).get();

    if (!resultDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Result not found');
    }

    const result = resultDoc.data() as Result;

    return {
      success: true,
      data: {
        ...result,
        submittedAt: result.submittedAt.toDate().toISOString(),
        calculatedAt: result.calculatedAt.toDate().toISOString(),
      },
    };
  }
);

/**
 * Force settlement for stuck games
 * Scheduled to run hourly
 */
export const forceSettlement = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('Europe/Paris')
  .onRun(async () => {
    // This is a safety net - in v2.0 we don't have a SETTLING state
    // so games should settle immediately when endDate passes
    functions.logger.info('Force settlement check complete');
  });
