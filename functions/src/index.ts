import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// ============================================
// WALLSTREET v2.0 - CLOUD FUNCTIONS
// ============================================

// Export Auth functions
export { onUserCreated, deleteUserAccount, updateLastLogin } from './auth';

// Export Game functions (formerly Match)
export {
  createGame,
  joinGame,
  leaveGame,
  cancelGame,
  launchGame,
  getGameByCode,
  getGamePlayers,
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
  forceSettlement,
  getLeaderboard,
  getPlayerResult,
} from './settlement';
