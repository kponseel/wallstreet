import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Match, MatchParticipant, CreateMatchInput, JoinMatchInput } from '../types';
import {
  generateMatchCode,
  isTradingDay,
  calculateEndDate,
  isValidMatchName,
  getMarketCloseTime,
  createAuditLog,
} from '../utils/helpers';

const db = admin.firestore();

// Default market holidays for 2024-2025
const DEFAULT_HOLIDAYS = [
  '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27',
  '2024-06-19', '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
  '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
  '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
];

/**
 * Get market holidays from system config or use defaults
 */
async function getMarketHolidays(): Promise<string[]> {
  try {
    const configDoc = await db.collection('systemConfig').doc('config').get();
    if (configDoc.exists) {
      return configDoc.data()?.marketHolidays || DEFAULT_HOLIDAYS;
    }
  } catch (error) {
    functions.logger.warn('Failed to fetch holidays, using defaults:', error);
  }
  return DEFAULT_HOLIDAYS;
}

/**
 * Create a new match
 */
export const createMatch = functions.https.onCall(async (data: CreateMatchInput, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  // Verify email is verified
  if (!context.auth.token.email_verified) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Please verify your email before creating matches'
    );
  }

  const uid = context.auth.uid;
  const { name, description, type, durationDays, startDate } = data;

  // Validate inputs
  if (!isValidMatchName(name)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Match name must be 3-50 characters, alphanumeric'
    );
  }

  if (!['PUBLIC', 'PRIVATE'].includes(type)) {
    throw new functions.https.HttpsError('invalid-argument', 'Type must be PUBLIC or PRIVATE');
  }

  if (![1, 3, 5, 7, 14, 30].includes(durationDays)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid duration');
  }

  // Check user's active matches count
  const activeMatches = await db
    .collection('matches')
    .where('creatorId', '==', uid)
    .where('status', 'in', ['DRAFT', 'OPEN', 'LIVE', 'SETTLING'])
    .get();

  if (activeMatches.size >= 5) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'You can only have 5 active matches at a time'
    );
  }

  // Validate start date
  const holidays = await getMarketHolidays();
  const startDateObj = new Date(startDate);
  const now = new Date();

  // Must be at least 24 hours in future
  const minStartDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (startDateObj < minStartDate) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Start date must be at least 24 hours in the future'
    );
  }

  // Must be within 30 days
  const maxStartDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (startDateObj > maxStartDate) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Start date must be within 30 days'
    );
  }

  // Must be a trading day
  if (!isTradingDay(startDateObj, holidays)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Start date must be a trading day (not weekend or holiday)'
    );
  }

  // Calculate end date
  const endDateObj = calculateEndDate(startDateObj, durationDays, holidays);

  // Get user info for denormalization
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();
  if (!userData) {
    throw new functions.https.HttpsError('not-found', 'User profile not found');
  }

  // Generate match code if private
  let matchCode: string | null = null;
  if (type === 'PRIVATE') {
    // Ensure uniqueness
    let codeIsUnique = false;
    let attempts = 0;
    while (!codeIsUnique && attempts < 10) {
      matchCode = generateMatchCode();
      const existing = await db
        .collection('matches')
        .where('matchCode', '==', matchCode)
        .limit(1)
        .get();
      codeIsUnique = existing.empty;
      attempts++;
    }
    if (!codeIsUnique) {
      matchCode = generateMatchCode(8); // Fall back to longer code
    }
  }

  // Create match document
  const matchRef = db.collection('matches').doc();
  const matchData: Match = {
    matchId: matchRef.id,
    name,
    description: description || null,
    creatorId: uid,
    creatorDisplayName: userData.displayName,
    type,
    matchCode,
    status: 'DRAFT',
    durationDays,
    startDate: Timestamp.fromDate(getMarketCloseTime(startDateObj)),
    endDate: Timestamp.fromDate(getMarketCloseTime(endDateObj)),
    entryDeadline: Timestamp.fromDate(getMarketCloseTime(startDateObj)),
    playerCount: 0,
    maxPlayers: 100,
    minPlayers: 2,
    createdAt: Timestamp.now(),
    publishedAt: null,
    liveAt: null,
    settlingAt: null,
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    dataQualityFlag: 'OK',
    symbols: [],
  };

  await matchRef.set(matchData);

  await createAuditLog(db, 'MATCH_CREATED', uid, 'MATCH', matchRef.id, {
    name,
    type,
    durationDays,
  });

  functions.logger.info(`Match created: ${matchRef.id} by ${uid}`);

  return {
    success: true,
    data: {
      matchId: matchRef.id,
      matchCode,
    },
  };
});

/**
 * Publish a draft match (make it available for joining)
 */
export const publishMatch = functions.https.onCall(async (data: { matchId: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = context.auth.uid;
  const { matchId } = data;

  const matchRef = db.collection('matches').doc(matchId);
  const matchDoc = await matchRef.get();

  if (!matchDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Match not found');
  }

  const match = matchDoc.data() as Match;

  if (match.creatorId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Only creator can publish match');
  }

  if (match.status !== 'DRAFT') {
    throw new functions.https.HttpsError('failed-precondition', 'Match is not in draft status');
  }

  await matchRef.update({
    status: 'OPEN',
    publishedAt: Timestamp.now(),
  });

  await createAuditLog(db, 'MATCH_PUBLISHED', uid, 'MATCH', matchId, {});

  return { success: true };
});

/**
 * Cancel a match
 */
export const cancelMatch = functions.https.onCall(async (data: { matchId: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = context.auth.uid;
  const { matchId } = data;

  const matchRef = db.collection('matches').doc(matchId);
  const matchDoc = await matchRef.get();

  if (!matchDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Match not found');
  }

  const match = matchDoc.data() as Match;

  if (match.creatorId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Only creator can cancel match');
  }

  if (!['DRAFT', 'OPEN'].includes(match.status)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Can only cancel draft or open matches'
    );
  }

  const batch = db.batch();

  // Update match status
  batch.update(matchRef, {
    status: 'CANCELLED',
    cancelledAt: Timestamp.now(),
    cancellationReason: 'CREATOR_CANCELLED',
  });

  // Delete all portfolios
  const portfolios = await db.collection('portfolios').where('matchId', '==', matchId).get();
  portfolios.forEach((doc) => batch.delete(doc.ref));

  // Delete all participants
  const participants = await db
    .collection('matchParticipants')
    .where('matchId', '==', matchId)
    .get();
  participants.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();

  await createAuditLog(db, 'MATCH_CANCELLED', uid, 'MATCH', matchId, {
    reason: 'CREATOR_CANCELLED',
  });

  return { success: true };
});

/**
 * Join a match
 */
export const joinMatch = functions.https.onCall(async (data: JoinMatchInput, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  if (!context.auth.token.email_verified) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Please verify your email before joining matches'
    );
  }

  const uid = context.auth.uid;
  const { matchId, matchCode } = data;

  // Get match
  const matchRef = db.collection('matches').doc(matchId);
  const matchDoc = await matchRef.get();

  if (!matchDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Match not found');
  }

  const match = matchDoc.data() as Match;

  // Validate match state
  if (match.status !== 'OPEN') {
    throw new functions.https.HttpsError('failed-precondition', 'Match is not open for joining');
  }

  // Check deadline
  if (Timestamp.now().toMillis() > match.entryDeadline.toMillis()) {
    throw new functions.https.HttpsError('failed-precondition', 'Entry deadline has passed');
  }

  // Validate match code for private matches
  if (match.type === 'PRIVATE') {
    if (!matchCode || matchCode !== match.matchCode) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid match code');
    }
  }

  // Check if already joined
  const participantId = `${matchId}_${uid}`;
  const existingParticipant = await db.collection('matchParticipants').doc(participantId).get();
  if (existingParticipant.exists) {
    // Already joined - return success (idempotent)
    return {
      success: true,
      data: { participantId, alreadyJoined: true },
    };
  }

  // Check max players
  if (match.playerCount >= match.maxPlayers) {
    throw new functions.https.HttpsError('resource-exhausted', 'Match is full');
  }

  // Get user info
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();
  if (!userData) {
    throw new functions.https.HttpsError('not-found', 'User profile not found');
  }

  // Create participant and update count in transaction
  await db.runTransaction(async (transaction) => {
    const freshMatchDoc = await transaction.get(matchRef);
    const freshMatch = freshMatchDoc.data() as Match;

    if (freshMatch.playerCount >= freshMatch.maxPlayers) {
      throw new functions.https.HttpsError('resource-exhausted', 'Match is full');
    }

    const participant: MatchParticipant = {
      participantId,
      matchId,
      userId: uid,
      userDisplayName: userData.displayName,
      joinedAt: Timestamp.now(),
      hasSubmittedPortfolio: false,
      portfolioId: null,
    };

    transaction.set(db.collection('matchParticipants').doc(participantId), participant);
    transaction.update(matchRef, {
      playerCount: admin.firestore.FieldValue.increment(1),
    });
  });

  await createAuditLog(db, 'MATCH_JOINED', uid, 'MATCH', matchId, {});

  return {
    success: true,
    data: { participantId },
  };
});

/**
 * Leave a match
 */
export const leaveMatch = functions.https.onCall(async (data: { matchId: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = context.auth.uid;
  const { matchId } = data;

  const participantId = `${matchId}_${uid}`;
  const participantRef = db.collection('matchParticipants').doc(participantId);
  const participantDoc = await participantRef.get();

  if (!participantDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Not a participant in this match');
  }

  // Check match status
  const matchRef = db.collection('matches').doc(matchId);
  const matchDoc = await matchRef.get();
  const match = matchDoc.data() as Match;

  if (match.status !== 'OPEN') {
    throw new functions.https.HttpsError('failed-precondition', 'Can only leave open matches');
  }

  // Check if portfolio is locked
  const portfolioQuery = await db
    .collection('portfolios')
    .where('matchId', '==', matchId)
    .where('userId', '==', uid)
    .limit(1)
    .get();

  if (!portfolioQuery.empty) {
    const portfolio = portfolioQuery.docs[0].data();
    if (portfolio.isLocked) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Cannot leave after portfolio is locked'
      );
    }
  }

  const batch = db.batch();

  // Delete portfolio if exists
  if (!portfolioQuery.empty) {
    batch.delete(portfolioQuery.docs[0].ref);
  }

  // Delete participant
  batch.delete(participantRef);

  // Decrement player count
  batch.update(matchRef, {
    playerCount: admin.firestore.FieldValue.increment(-1),
  });

  await batch.commit();

  await createAuditLog(db, 'MATCH_LEFT', uid, 'MATCH', matchId, {});

  return { success: true };
});

/**
 * Get match by code (for private matches)
 */
export const getMatchByCode = functions.https.onCall(async (data: { matchCode: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { matchCode } = data;

  if (!matchCode || matchCode.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid match code');
  }

  const matchQuery = await db
    .collection('matches')
    .where('matchCode', '==', matchCode.toUpperCase())
    .where('status', '==', 'OPEN')
    .limit(1)
    .get();

  if (matchQuery.empty) {
    throw new functions.https.HttpsError('not-found', 'No open match found with this code');
  }

  const match = matchQuery.docs[0].data();

  return {
    success: true,
    data: {
      matchId: match.matchId,
      name: match.name,
      type: match.type,
      playerCount: match.playerCount,
      startDate: match.startDate.toDate().toISOString(),
      durationDays: match.durationDays,
    },
  };
});
