import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export Auth functions
export { onUserCreated, deleteUserAccount, updateLastLogin, resetDatabase } from './auth';

// Export Match functions
export {
  createMatch,
  publishMatch,
  cancelMatch,
  joinMatch,
  leaveMatch,
  getMatchByCode,
} from './match';

// Export Portfolio functions
export {
  submitPortfolio,
  getPortfolio,
  searchSymbols,
  validateSymbol,
} from './portfolio';

// Export Settlement functions
export {
  processMatchStarts,
  processMatchEnds,
  forceSettlement,
} from './settlement';
