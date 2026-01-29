import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  Match,
  Portfolio,
  PriceSnapshot,
  Result,
  PositionResult,
  LeaderboardEntry,
} from '../types';
import {
  formatDateString,
  roundTo,
  calculateReturn,
  createAuditLog,
} from '../utils/helpers';

const db = admin.firestore();

/**
 * Process matches that are ready to start
 * Scheduled to run every 15 minutes
 */
export const processMatchStarts = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('America/New_York')
  .onRun(async () => {
    const now = Timestamp.now();

    // Find OPEN matches where startDate has passed
    const matchesQuery = await db
      .collection('matches')
      .where('status', '==', 'OPEN')
      .where('startDate', '<=', now)
      .limit(50)
      .get();

    functions.logger.info(`Found ${matchesQuery.size} matches ready to start`);

    for (const matchDoc of matchesQuery.docs) {
      try {
        await startMatch(matchDoc.id);
      } catch (error) {
        functions.logger.error(`Failed to start match ${matchDoc.id}:`, error);
      }
    }
  });

/**
 * Start a single match
 */
async function startMatch(matchId: string): Promise<void> {
  const matchRef = db.collection('matches').doc(matchId);

  await db.runTransaction(async (transaction) => {
    const matchDoc = await transaction.get(matchRef);
    const match = matchDoc.data() as Match;

    // Idempotency check
    if (match.status !== 'OPEN') {
      functions.logger.info(`Match ${matchId} already processed (status: ${match.status})`);
      return;
    }

    // Count submitted portfolios
    const portfoliosQuery = await db
      .collection('portfolios')
      .where('matchId', '==', matchId)
      .get();

    if (portfoliosQuery.size < match.minPlayers) {
      // Cancel match - insufficient players
      transaction.update(matchRef, {
        status: 'CANCELLED',
        cancelledAt: Timestamp.now(),
        cancellationReason: 'INSUFFICIENT_PLAYERS',
      });

      functions.logger.info(`Match ${matchId} cancelled: insufficient players`);
      return;
    }

    // Lock all portfolios
    portfoliosQuery.docs.forEach((doc) => {
      transaction.update(doc.ref, {
        isLocked: true,
        lockedAt: Timestamp.now(),
      });
    });

    // Update match status
    transaction.update(matchRef, {
      status: 'LIVE',
      liveAt: Timestamp.now(),
      playerCount: portfoliosQuery.size,
    });
  });

  // Fetch and store start prices (outside transaction)
  await fetchAndStorePrices(matchId, 'start');

  await createAuditLog(db, 'MATCH_STARTED', 'SYSTEM', 'MATCH', matchId, {});

  functions.logger.info(`Match ${matchId} started successfully`);
}

/**
 * Process matches that are ready to end
 * Scheduled to run every 15 minutes
 */
export const processMatchEnds = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('America/New_York')
  .onRun(async () => {
    const now = Timestamp.now();

    // Find LIVE matches where endDate has passed
    const matchesQuery = await db
      .collection('matches')
      .where('status', '==', 'LIVE')
      .where('endDate', '<=', now)
      .limit(50)
      .get();

    functions.logger.info(`Found ${matchesQuery.size} matches ready to end`);

    for (const matchDoc of matchesQuery.docs) {
      try {
        await endMatch(matchDoc.id);
      } catch (error) {
        functions.logger.error(`Failed to end match ${matchDoc.id}:`, error);
      }
    }
  });

/**
 * End a match and trigger settlement
 */
async function endMatch(matchId: string): Promise<void> {
  const matchRef = db.collection('matches').doc(matchId);
  const matchDoc = await matchRef.get();
  const match = matchDoc.data() as Match;

  // Idempotency check
  if (match.status !== 'LIVE') {
    functions.logger.info(`Match ${matchId} already processed (status: ${match.status})`);
    return;
  }

  // Update to SETTLING
  await matchRef.update({
    status: 'SETTLING',
    settlingAt: Timestamp.now(),
  });

  // Trigger settlement
  await settleMatch(matchId);
}

/**
 * Settle a match - calculate results and rankings
 */
async function settleMatch(matchId: string, retryCount: number = 0): Promise<void> {
  const matchRef = db.collection('matches').doc(matchId);
  const matchDoc = await matchRef.get();
  const match = matchDoc.data() as Match;

  // Idempotency check
  if (match.status === 'FINISHED') {
    functions.logger.info(`Match ${matchId} already settled`);
    return;
  }

  if (match.status !== 'SETTLING') {
    functions.logger.error(`Match ${matchId} not in SETTLING state`);
    return;
  }

  // Fetch end prices
  const pricesFetched = await fetchAndStorePrices(matchId, 'end');

  if (!pricesFetched && retryCount < 3) {
    // Schedule retry
    functions.logger.warn(`Price fetch failed for match ${matchId}, scheduling retry`);
    // In production, would use Cloud Tasks for delayed retry
    return;
  }

  // Get all portfolios
  const portfoliosQuery = await db
    .collection('portfolios')
    .where('matchId', '==', matchId)
    .get();

  const startDate = formatDateString(match.startDate.toDate());
  const endDate = formatDateString(match.endDate.toDate());

  // Calculate results for each portfolio
  const results: Result[] = [];

  for (const portfolioDoc of portfoliosQuery.docs) {
    const portfolio = portfolioDoc.data() as Portfolio;
    const result = await calculatePortfolioResult(portfolio, startDate, endDate);
    results.push(result);
  }

  // Rank results
  rankResults(results);

  // Write results and leaderboard
  const batch = db.batch();

  for (const result of results) {
    // Write result
    const resultRef = db.collection('results').doc(result.resultId);
    batch.set(resultRef, result);

    // Write leaderboard entry
    const leaderboardEntry = createLeaderboardEntry(result, portfoliosQuery.docs.find(
      (d) => d.data().userId === result.userId
    )?.data() as Portfolio);
    const leaderboardRef = db.collection('leaderboard').doc(`${matchId}_${result.rank}`);
    batch.set(leaderboardRef, leaderboardEntry);

    // Update user stats
    const userRef = db.collection('users').doc(result.userId);
    batch.update(userRef, {
      'stats.matchesPlayed': admin.firestore.FieldValue.increment(1),
      'stats.matchesWon': admin.firestore.FieldValue.increment(result.rank === 1 ? 1 : 0),
      'stats.totalReturns': admin.firestore.FieldValue.increment(result.portfolioReturnPercent),
    });
  }

  // Update match status
  batch.update(matchRef, {
    status: 'FINISHED',
    finishedAt: Timestamp.now(),
  });

  await batch.commit();

  await createAuditLog(db, 'MATCH_SETTLED', 'SYSTEM', 'MATCH', matchId, {
    participantCount: results.length,
    winnerUserId: results.find((r) => r.rank === 1)?.userId,
  });

  functions.logger.info(`Match ${matchId} settled with ${results.length} participants`);
}

/**
 * Fetch and store prices for a match
 */
async function fetchAndStorePrices(matchId: string, phase: 'start' | 'end'): Promise<boolean> {
  const matchDoc = await db.collection('matches').doc(matchId).get();
  const match = matchDoc.data() as Match;

  const date = phase === 'start' ? match.startDate : match.endDate;
  const dateStr = formatDateString(date.toDate());

  // Get unique symbols from match
  const symbols = match.symbols;

  // Check which prices we already have
  const existingPrices = await db
    .collection('priceSnapshots')
    .where('date', '==', dateStr)
    .where('symbol', 'in', symbols.slice(0, 10)) // Firestore limit
    .get();

  const existingSymbols = new Set(existingPrices.docs.map((d) => d.data().symbol));
  const missingSymbols = symbols.filter((s) => !existingSymbols.has(s));

  if (missingSymbols.length === 0) {
    return true;
  }

  // In production, would call external API here
  // For now, generate mock prices
  const batch = db.batch();

  for (const symbol of missingSymbols) {
    const snapshotId = `${dateStr}_${symbol}_NASDAQ`;
    const priceRef = db.collection('priceSnapshots').doc(snapshotId);

    // Mock price generation (replace with real API call)
    const mockPrice = Math.floor(10000 + Math.random() * 50000); // $100-$600

    const priceSnapshot: PriceSnapshot = {
      snapshotId,
      symbol,
      exchange: 'NASDAQ',
      date: dateStr,
      closePrice: mockPrice,
      closePriceFloat: mockPrice / 100,
      currency: 'USD',
      volume: Math.floor(Math.random() * 10000000),
      adjustedForSplits: true,
      source: 'mock',
      fetchedAt: Timestamp.now(),
      dataQuality: 'LIVE',
    };

    batch.set(priceRef, priceSnapshot);
  }

  await batch.commit();
  return true;
}

/**
 * Calculate results for a single portfolio
 */
async function calculatePortfolioResult(
  portfolio: Portfolio,
  startDate: string,
  endDate: string
): Promise<Result> {
  const positionResults: PositionResult[] = [];
  let totalWeightedReturn = 0;

  for (const position of portfolio.positions) {
    // Get start price
    const startSnapshotId = `${startDate}_${position.symbol}_${position.exchange}`;
    const startPriceDoc = await db.collection('priceSnapshots').doc(startSnapshotId).get();
    const startPrice = startPriceDoc.exists ? startPriceDoc.data()!.closePrice : 10000;

    // Get end price
    const endSnapshotId = `${endDate}_${position.symbol}_${position.exchange}`;
    const endPriceDoc = await db.collection('priceSnapshots').doc(endSnapshotId).get();
    const endPrice = endPriceDoc.exists ? endPriceDoc.data()!.closePrice : startPrice;

    // Calculate return
    const returnPercent = calculateReturn(startPrice, endPrice);
    const weightedContribution = (position.allocationPercent / 100) * returnPercent;
    totalWeightedReturn += weightedContribution;

    positionResults.push({
      symbol: position.symbol,
      exchange: position.exchange,
      allocationCents: position.allocationCents,
      allocationPercent: position.allocationPercent,
      startPriceCents: startPrice,
      endPriceCents: endPrice,
      returnPercent: roundTo(returnPercent, 6),
      weightedContribution: roundTo(weightedContribution, 6),
    });
  }

  const portfolioReturn = roundTo(totalWeightedReturn, 6);
  const endValueCents = Math.round(1000000 * (1 + portfolioReturn / 100));

  return {
    resultId: `${portfolio.matchId}_${portfolio.userId}`,
    matchId: portfolio.matchId,
    userId: portfolio.userId,
    userDisplayName: portfolio.userDisplayName,
    portfolioId: portfolio.portfolioId,
    positionResults,
    portfolioReturnPercent: portfolioReturn,
    startValueCents: 1000000,
    endValueCents,
    rank: 0, // Set by rankResults
    totalParticipants: 0, // Set by rankResults
    submittedAt: portfolio.submittedAt,
    calculatedAt: Timestamp.now(),
    dataQualityFlags: [],
  };
}

/**
 * Rank results by return, with tie-breakers
 */
function rankResults(results: Result[]): void {
  // Sort by return (desc), then submittedAt (asc), then displayName (asc)
  results.sort((a, b) => {
    // Primary: return (descending)
    if (a.portfolioReturnPercent !== b.portfolioReturnPercent) {
      return b.portfolioReturnPercent - a.portfolioReturnPercent;
    }
    // Secondary: submission time (ascending - earlier wins)
    const aTime = a.submittedAt.toMillis();
    const bTime = b.submittedAt.toMillis();
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    // Tertiary: alphabetical name
    return a.userDisplayName.toLowerCase().localeCompare(b.userDisplayName.toLowerCase());
  });

  // Assign ranks
  const totalParticipants = results.length;
  results.forEach((result, index) => {
    result.rank = index + 1;
    result.totalParticipants = totalParticipants;
  });
}

/**
 * Create leaderboard entry from result
 */
function createLeaderboardEntry(result: Result, portfolio: Portfolio): LeaderboardEntry {
  // Find top performing position
  const sortedPositions = [...result.positionResults].sort(
    (a, b) => b.returnPercent - a.returnPercent
  );
  const topPosition = sortedPositions[0];

  return {
    entryId: `${result.matchId}_${result.rank}`,
    matchId: result.matchId,
    rank: result.rank,
    userId: result.userId,
    userDisplayName: result.userDisplayName,
    userPhotoURL: null, // Would need to fetch from user doc
    portfolioReturnPercent: roundTo(result.portfolioReturnPercent, 2),
    endValueCents: result.endValueCents,
    topHolding: topPosition.symbol,
    topHoldingReturn: roundTo(topPosition.returnPercent, 2),
  };
}

/**
 * Force settlement for stuck matches
 * Scheduled to run hourly
 */
export const forceSettlement = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('America/New_York')
  .onRun(async () => {
    const threeHoursAgo = Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000);

    // Find matches stuck in SETTLING
    const stuckMatches = await db
      .collection('matches')
      .where('status', '==', 'SETTLING')
      .where('settlingAt', '<', threeHoursAgo)
      .limit(10)
      .get();

    functions.logger.info(`Found ${stuckMatches.size} stuck matches to force settle`);

    for (const matchDoc of stuckMatches.docs) {
      try {
        await settleMatch(matchDoc.id, 999); // High retry count to force
        functions.logger.info(`Force settled match ${matchDoc.id}`);
      } catch (error) {
        functions.logger.error(`Failed to force settle match ${matchDoc.id}:`, error);
      }
    }
  });
