import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { createAuditLog } from '../utils/helpers';

const db = admin.firestore();

// Password for development database reset
const RESET_PASSWORD = 'admin';

/**
 * Reset the database - delete all matches, portfolios, and related data
 * FOR DEVELOPMENT USE ONLY
 * Called by client via HTTPS callable
 */
export const resetDatabase = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { password } = data;

  // Verify password
  if (password !== RESET_PASSWORD) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Invalid reset password'
    );
  }

  const uid = context.auth.uid;

  functions.logger.info(`Database reset initiated by user ${uid}`);

  try {
    const deletedCounts = {
      matches: 0,
      portfolios: 0,
      matchParticipants: 0,
      results: 0,
      leaderboard: 0,
      priceSnapshots: 0,
    };

    // Delete all matches
    const matchesSnapshot = await db.collection('matches').get();
    for (const doc of matchesSnapshot.docs) {
      await doc.ref.delete();
      deletedCounts.matches++;
    }

    // Delete all portfolios
    const portfoliosSnapshot = await db.collection('portfolios').get();
    for (const doc of portfoliosSnapshot.docs) {
      await doc.ref.delete();
      deletedCounts.portfolios++;
    }

    // Delete all match participants
    const participantsSnapshot = await db.collection('matchParticipants').get();
    for (const doc of participantsSnapshot.docs) {
      await doc.ref.delete();
      deletedCounts.matchParticipants++;
    }

    // Delete all results
    const resultsSnapshot = await db.collection('results').get();
    for (const doc of resultsSnapshot.docs) {
      await doc.ref.delete();
      deletedCounts.results++;
    }

    // Delete all leaderboard entries
    const leaderboardSnapshot = await db.collection('leaderboard').get();
    for (const doc of leaderboardSnapshot.docs) {
      await doc.ref.delete();
      deletedCounts.leaderboard++;
    }

    // Delete all price snapshots
    const priceSnapshotsSnapshot = await db.collection('priceSnapshots').get();
    for (const doc of priceSnapshotsSnapshot.docs) {
      await doc.ref.delete();
      deletedCounts.priceSnapshots++;
    }

    // Reset all user stats
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    for (const doc of usersSnapshot.docs) {
      batch.update(doc.ref, {
        stats: {
          matchesPlayed: 0,
          matchesWon: 0,
          totalReturns: 0,
          bestReturn: 0,
          averageRank: 0,
        },
      });
    }
    await batch.commit();

    // Log the reset action (using USER type for admin action)
    await createAuditLog(db, 'DATABASE_RESET', uid, 'USER', uid, {
      deletedCounts,
      resetAt: Timestamp.now(),
    });

    functions.logger.info(`Database reset completed by user ${uid}`, deletedCounts);

    return {
      success: true,
      message: 'Database reset successfully',
      deletedCounts,
    };
  } catch (error) {
    functions.logger.error(`Failed to reset database:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to reset database');
  }
});
