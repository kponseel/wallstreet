import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// ============================================
// WALLSTREET v2.1 - CLOUD FUNCTIONS
// ============================================

// Export Auth functions
export {
  onUserCreated,
  deleteUserAccount,
  updateLastLogin,
  updateUserProfile,
  getUserGames,
} from './auth';

// Export Game functions (formerly Match)
export {
  createGame,
  joinGame,
  leaveGame,
  cancelGame,
  updateGame,
  launchGame,
  getGameByCode,
  getGamePlayers,
  listOpenGames,
  kickPlayer,
} from './game';

// Export Portfolio functions
export {
  submitPortfolio,
  getPortfolio,
  searchSymbols,
  validateTicker,
  clearPortfolio,
} from './portfolio';

// Export Settlement & Awards functions
export {
  processGameEnds,
  forceSettleGame,
  getLeaderboard,
  getPlayerResult,
} from './settlement';
