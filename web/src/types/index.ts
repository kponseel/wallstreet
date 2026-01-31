// ============================================
// WALLSTREET FANTASY LEAGUE v2.0 - FRONTEND TYPES
// ============================================

// User types
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  emailVerified: boolean;
  stats: UserStats;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalReturns: number;
  bestReturn: number;
  averageRank: number;
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
  creatorPlayerId: string | null;  // PlayerId of the creator (for admin recognition)

  // Status management
  status: GameStatus;

  // Timing (fixed 7-day duration, ends at 22h30 Paris)
  startDate: Date | null;
  endDate: Date | null;

  // Players
  playerCount: number;
  maxPlayers: number;

  // Price snapshot - frozen J-1 prices at launch
  initialPricesSnapshot: Record<string, number> | null;

  // All tickers in this game
  tickers: string[];

  // Data quality tracking
  dataQualityFlag: 'OK' | 'STALE_PRICES' | 'ESTIMATED_PRICES';

  // Timestamps
  createdAt: Date;
  launchedAt: Date | null;
  endedAt: Date | null;
}

// ============================================
// PLAYER TYPES
// ============================================

export interface PortfolioItem {
  ticker: string;
  budgetInvested: number;
  quantity: number;
  initialPrice: number;
}

export interface Player {
  playerId: string;
  gameCode: string;
  userId: string | null;
  nickname: string;
  portfolio: PortfolioItem[];
  totalBudget: number;
  isReady: boolean;
  joinedAt: Date;
  submittedAt: Date | null;
}

// For portfolio builder (before submission)
export interface PortfolioDraft {
  ticker: string;
  companyName: string;
  market: Market;
  budgetInvested: number;
}

// ============================================
// RESULT TYPES
// ============================================

export interface PositionResult {
  ticker: string;
  budgetInvested: number;
  quantity: number;
  initialPrice: number;
  finalPrice: number;
  returnPercent: number;
  valueAtEnd: number;
}

export interface Result {
  resultId: string;
  gameCode: string;
  playerId: string;
  nickname: string;
  positionResults: PositionResult[];
  portfolioReturnPercent: number;
  initialValue: number;
  finalValue: number;
  rank: number;
  totalParticipants: number;
  awards: Award[];
  whatIfMessage: string | null;
  submittedAt: Date;
  calculatedAt: Date;
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
  ticker?: string;
  value?: number;
  message: string;
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
// SYMBOL TYPES
// ============================================

export type Market = 'NASDAQ' | 'NYSE' | 'CAC40';

export interface Symbol {
  ticker: string;
  companyName: string;
  market: Market;
  sector?: string;
  marketCap?: 'LARGE' | 'MID' | 'SMALL';
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
