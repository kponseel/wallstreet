import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Portfolio, Position, SubmitPortfolioInput, Match, SymbolCache } from '../types';
import {
  isValidSymbol,
  isValidExchange,
  validatePortfolioAllocations,
  createAuditLog,
} from '../utils/helpers';

const db = admin.firestore();

/**
 * Submit or update a portfolio
 */
export const submitPortfolio = functions.https.onCall(
  async (data: SubmitPortfolioInput, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    if (!context.auth.token.email_verified) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Please verify your email before submitting portfolios'
      );
    }

    const uid = context.auth.uid;
    const { matchId, positions } = data;

    // Validate match exists and is open
    const matchRef = db.collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Match not found');
    }

    const match = matchDoc.data() as Match;

    if (match.status !== 'OPEN') {
      throw new functions.https.HttpsError('failed-precondition', 'Match is not open');
    }

    // Check deadline
    if (Timestamp.now().toMillis() > match.entryDeadline.toMillis()) {
      throw new functions.https.HttpsError('failed-precondition', 'Entry deadline has passed');
    }

    // Verify user is participant
    const participantId = `${matchId}_${uid}`;
    const participantRef = db.collection('matchParticipants').doc(participantId);
    const participantDoc = await participantRef.get();

    if (!participantDoc.exists) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'You must join the match before submitting a portfolio'
      );
    }

    // Validate positions count
    if (!positions || positions.length !== 5) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Portfolio must have exactly 5 positions'
      );
    }

    // Validate each position and check for duplicates
    const symbols = new Set<string>();
    const validatedPositions: Position[] = [];

    for (const pos of positions) {
      if (!isValidSymbol(pos.symbol)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid symbol format: ${pos.symbol}`
        );
      }

      if (!isValidExchange(pos.exchange)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Invalid exchange: ${pos.exchange}`
        );
      }

      const symbolKey = `${pos.symbol}_${pos.exchange}`;
      if (symbols.has(symbolKey)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Duplicate symbol: ${pos.symbol}`
        );
      }
      symbols.add(symbolKey);

      // Verify symbol is eligible
      const symbolDoc = await db.collection('symbolCache').doc(symbolKey).get();
      if (!symbolDoc.exists) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Unknown symbol: ${pos.symbol}`
        );
      }

      const symbolData = symbolDoc.data() as SymbolCache;
      if (!symbolData.isEligible) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Symbol not eligible: ${pos.symbol} - ${symbolData.ineligibilityReason || 'Not available'}`
        );
      }

      validatedPositions.push({
        symbol: pos.symbol,
        exchange: pos.exchange,
        companyName: symbolData.companyName,
        allocationCents: pos.allocationCents,
        allocationPercent: (pos.allocationCents / 1000000) * 100,
      });
    }

    // Validate allocations
    const allocationValidation = validatePortfolioAllocations(validatedPositions);
    if (!allocationValidation.valid) {
      throw new functions.https.HttpsError('invalid-argument', allocationValidation.error!);
    }

    // Get user info
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    if (!userData) {
      throw new functions.https.HttpsError('not-found', 'User profile not found');
    }

    // Check if portfolio already exists
    const portfolioId = `${matchId}_${uid}`;
    const portfolioRef = db.collection('portfolios').doc(portfolioId);
    const existingPortfolio = await portfolioRef.get();

    if (existingPortfolio.exists) {
      const existing = existingPortfolio.data() as Portfolio;
      if (existing.isLocked) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Portfolio is already locked and cannot be modified'
        );
      }
    }

    // Create/update portfolio
    const portfolioData: Portfolio = {
      portfolioId,
      matchId,
      userId: uid,
      userDisplayName: userData.displayName,
      positions: validatedPositions,
      totalAllocationCents: 1000000,
      isLocked: false,
      submittedAt: Timestamp.now(),
      lockedAt: null,
      createdAt: existingPortfolio.exists
        ? existingPortfolio.data()!.createdAt
        : Timestamp.now(),
    };

    const batch = db.batch();

    // Set portfolio
    batch.set(portfolioRef, portfolioData);

    // Update participant
    batch.update(participantRef, {
      hasSubmittedPortfolio: true,
      portfolioId,
    });

    // Update match symbols (add any new ones)
    const newSymbols = validatedPositions.map((p) => p.symbol);
    batch.update(matchRef, {
      symbols: admin.firestore.FieldValue.arrayUnion(...newSymbols),
    });

    await batch.commit();

    await createAuditLog(db, 'PORTFOLIO_SUBMITTED', uid, 'PORTFOLIO', portfolioId, {
      matchId,
      symbols: newSymbols,
    });

    functions.logger.info(`Portfolio submitted: ${portfolioId}`);

    return {
      success: true,
      data: {
        portfolioId,
        submittedAt: portfolioData.submittedAt.toDate().toISOString(),
      },
    };
  }
);

/**
 * Get user's portfolio for a match
 */
export const getPortfolio = functions.https.onCall(
  async (data: { matchId: string; userId?: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const requestingUid = context.auth.uid;
    const { matchId, userId } = data;
    const targetUserId = userId || requestingUid;

    // If requesting someone else's portfolio, check if match is finished
    if (targetUserId !== requestingUid) {
      const matchDoc = await db.collection('matches').doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Match not found');
      }

      const match = matchDoc.data() as Match;
      if (match.status !== 'FINISHED') {
        throw new functions.https.HttpsError(
          'permission-denied',
          "Cannot view other players' portfolios until match is finished"
        );
      }
    }

    const portfolioId = `${matchId}_${targetUserId}`;
    const portfolioDoc = await db.collection('portfolios').doc(portfolioId).get();

    if (!portfolioDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Portfolio not found');
    }

    const portfolio = portfolioDoc.data() as Portfolio;

    return {
      success: true,
      data: {
        ...portfolio,
        submittedAt: portfolio.submittedAt.toDate().toISOString(),
        lockedAt: portfolio.lockedAt?.toDate().toISOString() || null,
        createdAt: portfolio.createdAt.toDate().toISOString(),
      },
    };
  }
);

/**
 * Search for symbols
 */
export const searchSymbols = functions.https.onCall(
  async (data: { query: string; limit?: number }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { query, limit = 10 } = data;

    if (!query || query.length < 1) {
      return { success: true, data: { symbols: [] } };
    }

    const sanitizedQuery = query.toUpperCase().replace(/[^A-Z]/g, '');
    if (sanitizedQuery.length < 1) {
      return { success: true, data: { symbols: [] } };
    }

    const maxLimit = Math.min(limit, 20);

    // Query by symbol prefix
    const symbolQuery = await db
      .collection('symbolCache')
      .where('isEligible', '==', true)
      .where('symbol', '>=', sanitizedQuery)
      .where('symbol', '<', sanitizedQuery + '\uf8ff')
      .orderBy('symbol')
      .limit(maxLimit)
      .get();

    const symbols = symbolQuery.docs.map((doc) => {
      const data = doc.data() as SymbolCache;
      return {
        symbol: data.symbol,
        exchange: data.exchange,
        companyName: data.companyName,
        sector: data.sector,
        marketCap: data.marketCap,
      };
    });

    return {
      success: true,
      data: { symbols },
    };
  }
);

/**
 * Validate a single symbol
 */
export const validateSymbol = functions.https.onCall(
  async (data: { symbol: string; exchange: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { symbol, exchange } = data;

    if (!isValidSymbol(symbol)) {
      return {
        success: true,
        data: { valid: false, reason: 'Invalid symbol format' },
      };
    }

    if (!isValidExchange(exchange)) {
      return {
        success: true,
        data: { valid: false, reason: 'Invalid exchange' },
      };
    }

    const symbolKey = `${symbol}_${exchange}`;
    const symbolDoc = await db.collection('symbolCache').doc(symbolKey).get();

    if (!symbolDoc.exists) {
      return {
        success: true,
        data: { valid: false, reason: 'Symbol not found' },
      };
    }

    const symbolData = symbolDoc.data() as SymbolCache;

    if (!symbolData.isEligible) {
      return {
        success: true,
        data: {
          valid: false,
          reason: symbolData.ineligibilityReason || 'Symbol not eligible',
        },
      };
    }

    return {
      success: true,
      data: {
        valid: true,
        symbol: {
          symbol: symbolData.symbol,
          exchange: symbolData.exchange,
          companyName: symbolData.companyName,
          sector: symbolData.sector,
          marketCap: symbolData.marketCap,
        },
      },
    };
  }
);
