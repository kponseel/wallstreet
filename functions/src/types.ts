import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// WALLSTREET FANTASY LEAGUE v2.0 - TYPE DEFINITIONS
// ============================================

// User types (simplified - can be anonymous or authenticated)
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  stats: UserStats;
  preferences: UserPreferences;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalReturns: number;
  bestReturn: number;
  averageRank: number;
}

export interface UserPreferences {
  timezone: string;
  notifications: boolean;
}

// ============================================
// GAME TYPES (formerly Match)
// ============================================

export type GameStatus = 'DRAFT' | 'LIVE' | 'ENDED';

export interface Game {
  // Primary identifier - unique code like "WS-8821"
  code: string;

  // Game metadata
  name: string;
  creatorId: string;
  creatorDisplayName: string;

  // Status management
  status: GameStatus;

  // Timing (fixed 7-day duration, ends at 22h30 Paris)
  startDate: Timestamp | null;  // Set when admin launches
  endDate: Timestamp | null;    // startDate + 7 days @ 22h30 Paris

  // Players
  playerCount: number;
  maxPlayers: number;

  // Price snapshot - frozen J-1 prices at launch
  // Format: { "AAPL": 185.50, "MSFT": 420.30, "MC.PA": 890.00 }
  initialPricesSnapshot: Record<string, number> | null;

  // All tickers in this game (denormalized for queries)
  tickers: string[];

  // Data quality tracking
  dataQualityFlag: 'OK' | 'STALE_PRICES' | 'ESTIMATED_PRICES';

  // Timestamps
  createdAt: Timestamp;
  launchedAt: Timestamp | null;  // When admin clicked "Launch"
  endedAt: Timestamp | null;     // When game finished
}

// ============================================
// PLAYER TYPES (combines old Portfolio + Participant)
// ============================================

export interface PortfolioItem {
  ticker: string;           // Stock symbol (e.g., "AAPL", "MC.PA")
  budgetInvested: number;   // Credits allocated (0-10000)
  quantity: number;         // Calculated: budgetInvested / initialPrice
  initialPrice: number;     // J-1 closing price (frozen at launch)
}

export interface Player {
  playerId: string;          // Unique player ID
  gameCode: string;          // Reference to game

  // Player identity
  userId: string | null;     // Firebase Auth UID (null if anonymous)
  nickname: string;          // Display name chosen by player

  // Portfolio (exactly 3 positions)
  portfolio: PortfolioItem[];
  totalBudget: number;       // Always 10000 Credits

  // Status
  isReady: boolean;          // Player has validated their portfolio

  // Timestamps
  joinedAt: Timestamp;
  submittedAt: Timestamp | null;  // When portfolio was validated
}

// ============================================
// PRICE TYPES
// ============================================

export interface PriceSnapshot {
  snapshotId: string;        // Format: {YYYY-MM-DD}_{ticker}
  ticker: string;
  date: string;              // YYYY-MM-DD
  closePrice: number;        // Price in Credits (1€ = 1$ = 1 Credit)
  currency: string;          // Original currency (USD/EUR)
  volume: number | null;
  source: string;            // API source
  fetchedAt: Timestamp;
  dataQuality: 'LIVE' | 'DELAYED' | 'STALE' | 'ESTIMATED';
}

// ============================================
// RESULT TYPES
// ============================================

export interface PositionResult {
  ticker: string;
  budgetInvested: number;
  quantity: number;
  initialPrice: number;      // J-1 price
  finalPrice: number;        // End price
  returnPercent: number;     // ((final - initial) / initial) * 100
  valueAtEnd: number;        // quantity * finalPrice
}

export interface Result {
  resultId: string;
  gameCode: string;

  // Player info
  playerId: string;
  nickname: string;

  // Results
  positionResults: PositionResult[];
  portfolioReturnPercent: number;  // Weighted average return
  initialValue: number;            // Always 10000
  finalValue: number;              // Sum of all position end values

  // Ranking
  rank: number;
  totalParticipants: number;

  // Awards earned
  awards: Award[];

  // "What If" regret message
  whatIfMessage: string | null;

  // Timestamps
  submittedAt: Timestamp;    // For tie-breaking
  calculatedAt: Timestamp;
}

// ============================================
// AWARDS TYPES
// ============================================

export type AwardType =
  | 'WOLF'        // 🏆 Le Loup de Wall Street - 1st place
  | 'DOLPHIN'     // 🥈 Le Dauphin - 2nd place
  | 'INTERN'      // 🪵 Le Stagiaire - Last place
  | 'ROCKET'      // 🚀 La Fusée - Best single stock performance
  | 'BAG_HOLDER'  // 💩 La Tuile - Worst single stock performance
  | 'ORACLE'      // 🔮 L'Oracle - All 3 stocks in green
  | 'GAMBLER';    // 🎰 Le Casino - >8000 credits on one stock

export interface Award {
  type: AwardType;
  ticker?: string;           // Related stock (for ROCKET, BAG_HOLDER, GAMBLER)
  value?: number;            // Related value (return %, allocation)
  message: string;           // Display message
}

export const AWARD_CONFIG: Record<AwardType, { emoji: string; titleFr: string; titleEn: string }> = {
  WOLF: { emoji: '🏆', titleFr: 'Le Loup de Wall Street', titleEn: 'The Wolf of Wall Street' },
  DOLPHIN: { emoji: '🥈', titleFr: 'Le Dauphin', titleEn: 'The Runner-Up' },
  INTERN: { emoji: '🪵', titleFr: 'Le Stagiaire', titleEn: 'The Intern' },
  ROCKET: { emoji: '🚀', titleFr: 'La Fusée', titleEn: 'The Rocket' },
  BAG_HOLDER: { emoji: '💩', titleFr: 'La Tuile', titleEn: 'The Bag Holder' },
  ORACLE: { emoji: '🔮', titleFr: "L'Oracle", titleEn: 'The Oracle' },
  GAMBLER: { emoji: '🎰', titleFr: 'Le Casino', titleEn: 'The Gambler' },
};

// ============================================
// LEADERBOARD TYPES
// ============================================

export interface LeaderboardEntry {
  gameCode: string;
  rank: number;
  playerId: string;
  nickname: string;
  portfolioReturnPercent: number;
  finalValue: number;
  awards: Award[];
  bestPosition: {
    ticker: string;
    returnPercent: number;
  };
  worstPosition: {
    ticker: string;
    returnPercent: number;
  };
}

// ============================================
// SYMBOL CACHE TYPES
// ============================================

export type Market = 'NASDAQ' | 'NYSE' | 'CAC40';

export interface SymbolCache {
  cacheId: string;           // Format: {ticker}
  ticker: string;
  companyName: string;
  market: Market;
  sector: string | null;
  industry: string | null;
  marketCap: 'LARGE' | 'MID' | 'SMALL' | null;
  avgVolume30d: number;
  isEligible: boolean;
  ineligibilityReason: string | null;
  lastUpdated: Timestamp;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export interface AuditLog {
  logId: string;
  action: string;
  actorId: string;
  targetType: 'USER' | 'GAME' | 'PLAYER';
  targetId: string;
  details: Record<string, unknown>;
  timestamp: Timestamp;
  ipAddress: string | null;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// FUNCTION INPUT TYPES
// ============================================

export interface CreateGameInput {
  name: string;
}

export interface JoinGameInput {
  gameCode: string;
  nickname: string;
}

export interface SubmitPortfolioInput {
  gameCode: string;
  positions: Array<{
    ticker: string;
    budgetInvested: number;
  }>;
}

export interface LaunchGameInput {
  gameCode: string;
}

// ============================================
// CONSTANTS
// ============================================

export const GAME_CONSTANTS = {
  TOTAL_BUDGET: 10000,           // 10,000 Credits
  REQUIRED_POSITIONS: 3,          // Exactly 3 stocks
  DURATION_DAYS: 7,               // Fixed 7 days
  END_HOUR_PARIS: 22,             // 22h30 Paris time
  END_MINUTE_PARIS: 30,
  MAX_PLAYERS: 50,                // Max players per game
  GAMBLER_THRESHOLD: 8000,        // Credits threshold for "Le Casino" award
} as const;
