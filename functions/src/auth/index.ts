import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { User, UserStats, UserPreferences, UpdateUserProfileInput, Game, Player } from '../types';
import { createAuditLog, isValidNickname } from '../utils/helpers';

const db = admin.firestore();

/**
 * Create user profile when a new user signs up
 * Triggered by Firebase Auth onCreate event
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL, emailVerified } = user;

  // Generate display name if not provided
  const finalDisplayName = displayName || email?.split('@')[0] || `User${uid.slice(0, 6)}`;

  const defaultStats: UserStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    totalReturns: 0,
    bestReturn: 0,
    averageRank: 0,
  };

  const defaultPreferences: UserPreferences = {
    timezone: 'America/New_York',
    notifications: true,
  };

  const userData: User = {
    uid,
    email: email || '',
    displayName: finalDisplayName,
    nickname: finalDisplayName,  // Initialize nickname same as displayName
    photoURL: photoURL || null,
    emailVerified: emailVerified || false,
    createdAt: Timestamp.now(),
    lastLoginAt: Timestamp.now(),
    status: 'ACTIVE',
    stats: defaultStats,
    preferences: defaultPreferences,
  };

  try {
    await db.collection('users').doc(uid).set(userData);

    await createAuditLog(db, 'USER_CREATED', uid, 'USER', uid, {
      email,
      provider: user.providerData?.[0]?.providerId || 'email',
    });

    functions.logger.info(`User profile created for ${uid}`);
  } catch (error) {
    functions.logger.error(`Failed to create user profile for ${uid}:`, error);
    throw error;
  }
});

/**
 * Delete user account and clean up related data
 * Called by client via HTTPS callable
 */
export const deleteUserAccount = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = context.auth.uid;
  const { confirmation } = data;

  // Verify confirmation
  if (confirmation !== 'DELETE') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Must type DELETE to confirm account deletion'
    );
  }

  try {
    const batch = db.batch();

    // 1. Update user document
    const userRef = db.collection('users').doc(uid);
    batch.update(userRef, {
      status: 'DELETED',
      displayName: '[Deleted User]',
      email: '',
      photoURL: null,
    });

    // 2. Remove player from DRAFT games (v2.0 uses 'players' collection)
    const playerDocs = await db
      .collection('players')
      .where('userId', '==', uid)
      .get();

    for (const playerDoc of playerDocs.docs) {
      const player = playerDoc.data();
      const gameCode = player.gameCode;

      // Check if game is still in DRAFT status
      const gameDoc = await db.collection('games').doc(gameCode).get();
      if (gameDoc.exists && gameDoc.data()?.status === 'DRAFT') {
        // Delete player document
        batch.delete(playerDoc.ref);
        // Decrement player count on the game
        batch.update(db.collection('games').doc(gameCode), {
          playerCount: admin.firestore.FieldValue.increment(-1),
        });
      }
    }

    await batch.commit();

    // 4. Log deletion
    await createAuditLog(db, 'USER_DELETED', uid, 'USER', uid, {});

    // 5. Schedule auth account deletion (in production, would use a delay)
    await admin.auth().deleteUser(uid);

    functions.logger.info(`User account deleted: ${uid}`);

    return { success: true, message: 'Account deleted successfully' };
  } catch (error) {
    functions.logger.error(`Failed to delete user account ${uid}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to delete account');
  }
});

/**
 * Update user's last login timestamp
 * Called after successful authentication
 */
export const updateLastLogin = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = context.auth.uid;

  try {
    await db.collection('users').doc(uid).update({
      lastLoginAt: Timestamp.now(),
      emailVerified: context.auth.token.email_verified || false,
    });

    return { success: true };
  } catch (error) {
    functions.logger.error(`Failed to update last login for ${uid}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to update login time');
  }
});

/**
 * Update user profile (nickname, etc.)
 * Called by client to update profile settings
 */
export const updateUserProfile = functions.https.onCall(
  async (data: UpdateUserProfileInput, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const uid = context.auth.uid;
    const { nickname } = data;

    // Validate nickname if provided
    if (nickname !== undefined) {
      if (!isValidNickname(nickname)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Nickname must be 2-20 characters, alphanumeric'
        );
      }
    }

    try {
      const updateData: Record<string, unknown> = {};

      if (nickname !== undefined) {
        updateData.nickname = nickname.trim();
      }

      if (Object.keys(updateData).length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'No fields to update');
      }

      await db.collection('users').doc(uid).update(updateData);

      await createAuditLog(db, 'USER_PROFILE_UPDATED', uid, 'USER', uid, updateData);

      functions.logger.info(`User profile updated for ${uid}`);

      return { success: true, data: updateData };
    } catch (error) {
      functions.logger.error(`Failed to update user profile for ${uid}:`, error);
      throw new functions.https.HttpsError('internal', 'Failed to update profile');
    }
  }
);

/**
 * Get all games for the current user (created and joined)
 * Returns games organized by status
 */
export const getUserGames = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = context.auth.uid;

  try {
    // Get all player records for this user
    const playerDocs = await db
      .collection('players')
      .where('userId', '==', uid)
      .get();

    // Get unique game codes
    const gameCodes = [...new Set(playerDocs.docs.map((doc) => doc.data().gameCode))];

    if (gameCodes.length === 0) {
      return {
        success: true,
        data: {
          created: [],
          joined: [],
        },
      };
    }

    // Fetch all games (Firestore doesn't support IN queries > 30 items)
    const games: Array<{
      code: string;
      name: string;
      status: string;
      playerCount: number;
      creatorId: string;
      creatorDisplayName: string;
      createdAt: string;
      startDate: string | null;
      endDate: string | null;
      isCreator: boolean;
      myNickname: string;
      myPlayerId: string;
    }> = [];

    // Batch fetch games (max 10 at a time for IN query)
    for (let i = 0; i < gameCodes.length; i += 10) {
      const batch = gameCodes.slice(i, i + 10);
      const gameDocs = await db
        .collection('games')
        .where('code', 'in', batch)
        .get();

      for (const gameDoc of gameDocs.docs) {
        const game = gameDoc.data() as Game;
        const playerDoc = playerDocs.docs.find(
          (p) => p.data().gameCode === game.code
        );
        const player = playerDoc?.data() as Player | undefined;

        games.push({
          code: game.code,
          name: game.name,
          status: game.status,
          playerCount: game.playerCount,
          creatorId: game.creatorId,
          creatorDisplayName: game.creatorDisplayName,
          createdAt: game.createdAt.toDate().toISOString(),
          startDate: game.startDate?.toDate().toISOString() || null,
          endDate: game.endDate?.toDate().toISOString() || null,
          isCreator: game.creatorId === uid,
          myNickname: player?.nickname || '',
          myPlayerId: player?.playerId || '',
        });
      }
    }

    // Sort by createdAt descending
    games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Separate into created and joined
    const created = games.filter((g) => g.isCreator);
    const joined = games.filter((g) => !g.isCreator);

    return {
      success: true,
      data: {
        created,
        joined,
      },
    };
  } catch (error) {
    functions.logger.error(`Failed to get user games for ${uid}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to get games');
  }
});
