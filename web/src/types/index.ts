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
  matchesPlayed: number;
  matchesWon: number;
  totalReturns: number;
  bestReturn: number;
  averageRank: number;
}

// Match types
export type MatchStatus = 'DRAFT' | 'OPEN' | 'LIVE' | 'SETTLING' | 'FINISHED' | 'CANCELLED';
export type MatchType = 'PUBLIC' | 'PRIVATE';

export interface Match {
  matchId: string;
  name: string;
  description: string | null;
  creatorId: string;
  creatorDisplayName: string;
  type: MatchType;
  matchCode: string | null;
  status: MatchStatus;
  durationDays: number;
  startDate: Date;
  endDate: Date;
  entryDeadline: Date;
  playerCount: number;
  maxPlayers: number;
}

// Portfolio types
export interface Position {
  symbol: string;
  exchange: string;
  companyName: string;
  allocationCents: number;
  allocationPercent: number;
}

export interface Portfolio {
  portfolioId: string;
  matchId: string;
  userId: string;
  positions: Position[];
  isLocked: boolean;
  submittedAt: Date;
}

// Result types
export interface PositionResult extends Position {
  startPriceCents: number;
  endPriceCents: number;
  returnPercent: number;
  weightedContribution: number;
}

export interface Result {
  resultId: string;
  matchId: string;
  userId: string;
  userDisplayName: string;
  positionResults: PositionResult[];
  portfolioReturnPercent: number;
  startValueCents: number;
  endValueCents: number;
  rank: number;
  totalParticipants: number;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  portfolioReturnPercent: number;
  endValueCents: number;
  topHolding: string;
  topHoldingReturn: number;
}

// Symbol types
export interface Symbol {
  symbol: string;
  exchange: string;
  companyName: string;
  sector?: string;
  marketCap?: 'LARGE' | 'MID' | 'SMALL';
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
