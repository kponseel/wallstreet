import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { User, UserStats, UserPreferences } from '../types';
import { createAuditLog } from '../utils/helpers';

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
