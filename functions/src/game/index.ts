import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  Game,
  Player,
  CreateGameInput,
  JoinGameInput,
  LaunchGameInput,
  GAME_CONSTANTS,
} from '../types';
import {
  generateGameCode,
  generatePlayerId,
  isValidGameName,
  isValidNickname,
  calculateGameEndDate,
  getLastTradingDay,
  formatDateString,
  calculateQuantity,
  createAuditLog,
} from '../utils/helpers';
import { findStockByTicker } from '../data/stocks';

const db = admin.firestore();

// ============================================
// WALLSTREET v2.0 - GAME FUNCTIONS
// ============================================

/**
 * Create a new game (Admin only)
 */
export const createGame = functions.https.onCall(
  async (data: CreateGameInput, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = context.auth.uid;
    const { name, nickname } = data;

    // Validate game name
    if (!isValidGameName(name)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Game name must be 3-50 characters, alphanumeric'
      );
    }

    // Check user's active games count (max 5)
    const activeGames = await db
      .collection('games')
      .where('creatorId', '==', uid)
      .where('status', 'in', ['DRAFT', 'LIVE'])
      .get();

    if (activeGames.size >= 5) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'You can only have 5 active games at a time'
      );
    }

    // Get user info for denormalization
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    if (!userData) {
      throw new functions.https.HttpsError('not-found', 'User profile not found');
    }

    // Generate unique game code
    let gameCode: string;
    let codeIsUnique = false;
    let attempts = 0;

    while (!codeIsUnique && attempts < 20) {
      gameCode = generateGameCode();
      const existing = await db.collection('games').doc(gameCode).get();
      codeIsUnique = !existing.exists;
      attempts++;
    }

    if (!codeIsUnique) {
      throw new functions.https.HttpsError('internal', 'Failed to generate unique game code');
    }

    // Use nickname or fallback to displayName
    const creatorNickname = nickname?.trim() || userData.displayName;

    // Validate nickname
    if (!isValidNickname(creatorNickname)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Nickname must be 2-20 characters'
      );
    }

    // Generate player ID for creator
    const playerId = generatePlayerId();

    // Create game document with creator as first player
    const gameData: Game = {
      code: gameCode!,
      name,
      creatorId: uid,
      creatorDisplayName: creatorNickname,
      status: 'DRAFT',
      startDate: null,
      endDate: null,
      playerCount: 1,  // Creator is automatically the first player
      maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
      initialPricesSnapshot: null,
      tickers: [],
      dataQualityFlag: 'OK',
      createdAt: Timestamp.now(),
      launchedAt: null,
      endedAt: null,
    };

    // Create player document for creator
    const playerData: Player = {
      playerId,
      gameCode: gameCode!,
      userId: uid,
      nickname: creatorNickname,
      portfolio: [],
      totalBudget: GAME_CONSTANTS.TOTAL_BUDGET,
      isReady: false,
      joinedAt: Timestamp.now(),
      submittedAt: null,
    };

    // Save both documents
    const batch = db.batch();
    batch.set(db.collection('games').doc(gameCode!), gameData);
    batch.set(db.collection('players').doc(playerId), playerData);
    await batch.commit();

    await createAuditLog(db, 'GAME_CREATED', uid, 'GAME', gameCode!, { name, playerId });

    functions.logger.info(`Game created: ${gameCode!} by ${uid}, playerId: ${playerId}`);

    return {
      success: true,
      data: {
        gameCode: gameCode!,
        playerId,
      },
    };
  }
);

/**
 * Join a game with nickname
 */
export const joinGame = functions.https.onCall(
  async (data: JoinGameInput, context) => {
    const { gameCode, nickname } = data;

    // Validate nickname
    if (!isValidNickname(nickname)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Nickname must be 2-20 characters'
      );
    }

    // Get game
    const gameRef = db.collection('games').doc(gameCode.toUpperCase());
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Game not found with this code');
    }

    const game = gameDoc.data() as Game;

    // Validate game state
    if (game.status !== 'DRAFT') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Game has already started or ended'
      );
    }

    // Check max players
    if (game.playerCount >= game.maxPlayers) {
      throw new functions.https.HttpsError('resource-exhausted', 'Game is full');
    }

    // Check if nickname is already taken in this game (case-insensitive)
    const allPlayers = await db
      .collection('players')
      .where('gameCode', '==', game.code)
      .get();

    const nicknameLower = nickname.toLowerCase();
    const existingNickname = allPlayers.docs.find(
      (doc) => (doc.data() as Player).nickname.toLowerCase() === nicknameLower
    );

    if (existingNickname) {
      throw new functions.https.HttpsError(
        'already-exists',
        'This nickname is already taken in this game'
      );
    }

    // Generate player ID
    const playerId = generatePlayerId();

    // Get user ID if authenticated
    const userId = context.auth?.uid || null;

    // If authenticated, check if user is already in game
    if (userId) {
      const existingPlayer = await db
        .collection('players')
        .where('gameCode', '==', game.code)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!existingPlayer.empty) {
        // Return existing player with consistent response structure
        const existing = existingPlayer.docs[0].data() as Player;
        return {
          success: true,
          data: {
            playerId: existing.playerId,
            gameCode: game.code,
            gameName: game.name,
            alreadyJoined: true,
          },
        };
      }
    }

    // Create player in transaction
    await db.runTransaction(async (transaction) => {
      const freshGameDoc = await transaction.get(gameRef);
      const freshGame = freshGameDoc.data() as Game;

      if (freshGame.playerCount >= freshGame.maxPlayers) {
        throw new functions.https.HttpsError('resource-exhausted', 'Game is full');
      }

      const playerData: Player = {
        playerId,
        gameCode: game.code,
        userId,
        nickname,
        portfolio: [],
        totalBudget: GAME_CONSTANTS.TOTAL_BUDGET,
        isReady: false,
        joinedAt: Timestamp.now(),
        submittedAt: null,
      };

      transaction.set(db.collection('players').doc(playerId), playerData);
      transaction.update(gameRef, {
        playerCount: admin.firestore.FieldValue.increment(1),
      });
    });

    await createAuditLog(db, 'GAME_JOINED', userId || 'anonymous', 'GAME', game.code, {
      playerId,
      nickname,
    });

    functions.logger.info(`Player ${playerId} joined game ${game.code}`);

    return {
      success: true,
      data: {
        playerId,
        gameCode: game.code,
        gameName: game.name,
        alreadyJoined: false,
      },
    };
  }
);

/**
 * Leave a game (before it starts)
 */
export const leaveGame = functions.https.onCall(
  async (data: { playerId: string }, context) => {
    const { playerId } = data;

    const playerRef = db.collection('players').doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Player not found');
    }

    const player = playerDoc.data() as Player;

    // Get game
    const gameRef = db.collection('games').doc(player.gameCode);
    const gameDoc = await gameRef.get();
    const game = gameDoc.data() as Game;

    // Can only leave draft games
    if (game.status !== 'DRAFT') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Cannot leave after game has started'
      );
    }

    // Cannot leave if you're the creator
    if (player.userId === game.creatorId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Game creator cannot leave. Cancel the game instead.'
      );
    }

    // Delete player and update count
    const batch = db.batch();
    batch.delete(playerRef);
    batch.update(gameRef, {
      playerCount: admin.firestore.FieldValue.increment(-1),
    });
    await batch.commit();

    await createAuditLog(db, 'GAME_LEFT', player.userId || 'anonymous', 'GAME', player.gameCode, {
      playerId,
    });

    return { success: true };
  }
);

/**
 * Cancel a game (Admin only, draft games only)
 */
export const cancelGame = functions.https.onCall(
  async (data: { gameCode: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = context.auth.uid;
    const { gameCode } = data;

    const gameRef = db.collection('games').doc(gameCode);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Game not found');
    }

    const game = gameDoc.data() as Game;

    if (game.creatorId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only creator can cancel game');
    }

    if (game.status !== 'DRAFT') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Can only cancel draft games'
      );
    }

    // Delete all players and the game
    const batch = db.batch();

    const players = await db.collection('players').where('gameCode', '==', gameCode).get();
    players.forEach((doc) => batch.delete(doc.ref));

    batch.delete(gameRef);

    await batch.commit();

    await createAuditLog(db, 'GAME_CANCELLED', uid, 'GAME', gameCode, {});

    return { success: true };
  }
);

/**
 * Update game settings (Admin only, draft games only)
 */
export const updateGame = functions.https.onCall(
  async (data: { gameCode: string; name?: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = context.auth.uid;
    const { gameCode, name } = data;

    const gameRef = db.collection('games').doc(gameCode);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Game not found');
    }

    const game = gameDoc.data() as Game;

    // Verify creator
    if (game.creatorId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only creator can update game');
    }

    // Only allow updates in DRAFT status
    if (game.status !== 'DRAFT') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Can only update game settings before launch'
      );
    }

    // Validate and update name
    const updates: Record<string, string> = {};
    if (name !== undefined) {
      if (!isValidGameName(name)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Game name must be 3-50 characters'
        );
      }
      updates.name = name;
    }

    if (Object.keys(updates).length === 0) {
      return { success: true }; // Nothing to update
    }

    await gameRef.update(updates);

    await createAuditLog(db, 'GAME_UPDATED', uid, 'GAME', gameCode, updates);

    return { success: true };
  }
);

/**
 * Launch a game (Admin only)
 * This freezes J-1 prices and starts the 7-day countdown
 */
export const launchGame = functions.https.onCall(
  async (data: LaunchGameInput, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = context.auth.uid;
    const { gameCode } = data;

    const gameRef = db.collection('games').doc(gameCode);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Game not found');
    }

    const game = gameDoc.data() as Game;

    // Verify creator
    if (game.creatorId !== uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only creator can launch game');
    }

    // Verify status
    if (game.status !== 'DRAFT') {
      throw new functions.https.HttpsError('failed-precondition', 'Game is not in draft status');
    }

    // Get all players
    const playersSnapshot = await db
      .collection('players')
      .where('gameCode', '==', gameCode)
      .get();

    // Separate ready and not-ready players
    const allPlayers = playersSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as Player,
    }));
    const readyPlayers = allPlayers.filter((p) => p.data.isReady);
    const notReadyPlayers = allPlayers.filter((p) => !p.data.isReady);

    // Must have at least 1 ready player (the creator should always be ready)
    if (readyPlayers.length < 1) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Need at least 1 player with a submitted portfolio to start the game'
      );
    }

    // Collect all unique tickers from ready players only
    const players = readyPlayers.map((p) => p.data);
    const allTickers = new Set<string>();
    for (const player of players) {
      for (const position of player.portfolio) {
        allTickers.add(position.ticker);
      }
    }

    // Fetch J-1 prices for all tickers
    const j1Date = getLastTradingDay();
    const j1DateStr = formatDateString(j1Date);
    const initialPrices: Record<string, number> = {};

    for (const ticker of allTickers) {
      // Try to get from price snapshots
      const priceDoc = await db
        .collection('priceSnapshots')
        .doc(`${j1DateStr}_${ticker}`)
        .get();

      if (priceDoc.exists) {
        initialPrices[ticker] = priceDoc.data()!.closePrice;
      } else {
        // Use mock price for now (in production, fetch from API)
        const stockData = findStockByTicker(ticker);
        if (stockData) {
          // Generate a realistic mock price based on market
          const basePrice = stockData.market === 'CAC40' ? 150 : 200;
          const variance = Math.random() * 400;
          initialPrices[ticker] = Math.round((basePrice + variance) * 100) / 100;
        } else {
          throw new functions.https.HttpsError(
            'internal',
            `Cannot find price for ticker: ${ticker}`
          );
        }
      }
    }

    // Calculate start and end dates
    const startDate = new Date();
    const endDate = calculateGameEndDate(startDate);

    // Update game and all players in a batch
    const batch = db.batch();

    // Expel not-ready players (delete their player documents)
    for (const notReadyPlayer of notReadyPlayers) {
      batch.delete(db.collection('players').doc(notReadyPlayer.id));
    }

    // Update game with correct player count (only ready players remain)
    batch.update(gameRef, {
      status: 'LIVE',
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      launchedAt: Timestamp.now(),
      initialPricesSnapshot: initialPrices,
      tickers: Array.from(allTickers),
      playerCount: readyPlayers.length,
    });

    // Update each ready player's portfolio with quantities
    for (const player of players) {
      const updatedPortfolio = player.portfolio.map((pos) => ({
        ...pos,
        initialPrice: initialPrices[pos.ticker],
        quantity: calculateQuantity(pos.budgetInvested, initialPrices[pos.ticker]),
      }));

      batch.update(db.collection('players').doc(player.playerId), {
        portfolio: updatedPortfolio,
      });
    }

    await batch.commit();

    // Log expelled players if any
    if (notReadyPlayers.length > 0) {
      functions.logger.info(
        `Expelled ${notReadyPlayers.length} player(s) from game ${gameCode} for not submitting portfolio`
      );
    }

    await createAuditLog(db, 'GAME_LAUNCHED', uid, 'GAME', gameCode, {
      playerCount: readyPlayers.length,
      expelledCount: notReadyPlayers.length,
      tickers: Array.from(allTickers),
      j1Date: j1DateStr,
    });

    functions.logger.info(`Game ${gameCode} launched with ${readyPlayers.length} players`);

    return {
      success: true,
      data: {
        gameCode,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        playerCount: players.length,
      },
    };
  }
);

/**
 * Get game by code (public info)
 */
export const getGameByCode = functions.https.onCall(
  async (data: { gameCode: string }) => {
    const { gameCode } = data;

    if (!gameCode || gameCode.length < 4) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid game code');
    }

    const gameDoc = await db.collection('games').doc(gameCode.toUpperCase()).get();

    if (!gameDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Game not found');
    }

    const game = gameDoc.data() as Game;

    return {
      success: true,
      data: {
        code: game.code,
        name: game.name,
        status: game.status,
        playerCount: game.playerCount,
        maxPlayers: game.maxPlayers,
        creatorDisplayName: game.creatorDisplayName,
        startDate: game.startDate?.toDate().toISOString() || null,
        endDate: game.endDate?.toDate().toISOString() || null,
      },
    };
  }
);

/**
 * Get players in a game
 * In DRAFT mode: only shows nicknames and ready status (hidden portfolios)
 * In LIVE/ENDED mode: shows full portfolios
 */
export const getGamePlayers = functions.https.onCall(
  async (data: { gameCode: string }) => {
    const { gameCode } = data;

    const gameDoc = await db.collection('games').doc(gameCode).get();

    if (!gameDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Game not found');
    }

    const game = gameDoc.data() as Game;

    const playersSnapshot = await db
      .collection('players')
      .where('gameCode', '==', gameCode)
      .get();

    const players = playersSnapshot.docs.map((doc) => {
      const player = doc.data() as Player;

      // In DRAFT mode, hide portfolio details
      if (game.status === 'DRAFT') {
        return {
          playerId: player.playerId,
          userId: player.userId,
          nickname: player.nickname,
          isReady: player.isReady,
          joinedAt: player.joinedAt.toDate().toISOString(),
          // Portfolio is hidden
          portfolioCount: player.portfolio.length,
        };
      }

      // In LIVE or ENDED mode, show full portfolio
      return {
        playerId: player.playerId,
        userId: player.userId,
        nickname: player.nickname,
        isReady: player.isReady,
        joinedAt: player.joinedAt.toDate().toISOString(),
        portfolio: player.portfolio,
        totalBudget: player.totalBudget,
      };
    });

    return {
      success: true,
      data: {
        gameCode: game.code,
        gameName: game.name,
        status: game.status,
        players,
        portfoliosVisible: game.status !== 'DRAFT',
      },
    };
  }
);

/**
 * List open games that can be joined
 * Returns public games in DRAFT status
 */
export const listOpenGames = functions.https.onCall(async () => {
  const gamesSnapshot = await db
    .collection('games')
    .where('status', '==', 'DRAFT')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const games = gamesSnapshot.docs.map((doc) => {
    const game = doc.data() as Game;
    return {
      code: game.code,
      name: game.name,
      playerCount: game.playerCount,
      maxPlayers: game.maxPlayers,
      creatorDisplayName: game.creatorDisplayName,
      createdAt: game.createdAt.toDate().toISOString(),
    };
  });

  return {
    success: true,
    data: { games },
  };
});
