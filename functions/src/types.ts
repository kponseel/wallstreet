import { Timestamp } from 'firebase-admin/firestore';

// User types
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
  matchesPlayed: number;
  matchesWon: number;
  totalReturns: number;
  bestReturn: number;
  averageRank: number;
}

export interface UserPreferences {
  timezone: string;
  notifications: boolean;
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
  startDate: Timestamp;
  endDate: Timestamp;
  entryDeadline: Timestamp;
  playerCount: number;
  maxPlayers: number;
  minPlayers: number;
  createdAt: Timestamp;
  publishedAt: Timestamp | null;
  liveAt: Timestamp | null;
  settlingAt: Timestamp | null;
  finishedAt: Timestamp | null;
  cancelledAt: Timestamp | null;
  cancellationReason: string | null;
  dataQualityFlag: 'OK' | 'STALE_PRICES' | 'ESTIMATED_PRICES';
  symbols: string[];
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
  userDisplayName: string;
  positions: Position[];
  totalAllocationCents: number;
  isLocked: boolean;
  submittedAt: Timestamp;
  lockedAt: Timestamp | null;
  createdAt: Timestamp;
}

// Price types
export interface PriceSnapshot {
  snapshotId: string;
  symbol: string;
  exchange: string;
  date: string;
  closePrice: number;
  closePriceFloat: number;
  currency: string;
  volume: number | null;
  adjustedForSplits: boolean;
  source: string;
  fetchedAt: Timestamp;
  dataQuality: 'LIVE' | 'DELAYED' | 'STALE' | 'ESTIMATED';
}

// Result types
export interface PositionResult {
  symbol: string;
  exchange: string;
  allocationCents: number;
  allocationPercent: number;
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
  portfolioId: string;
  positionResults: PositionResult[];
  portfolioReturnPercent: number;
  startValueCents: number;
  endValueCents: number;
  rank: number;
  totalParticipants: number;
  submittedAt: Timestamp;
  calculatedAt: Timestamp;
  dataQualityFlags: string[];
}

// Leaderboard types
export interface LeaderboardEntry {
  entryId: string;
  matchId: string;
  rank: number;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  portfolioReturnPercent: number;
  endValueCents: number;
  topHolding: string;
  topHoldingReturn: number;
}

// Participant types
export interface MatchParticipant {
  participantId: string;
  matchId: string;
  userId: string;
  userDisplayName: string;
  joinedAt: Timestamp;
  hasSubmittedPortfolio: boolean;
  portfolioId: string | null;
}

// Symbol Cache types
export interface SymbolCache {
  cacheId: string;
  symbol: string;
  exchange: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  marketCap: 'LARGE' | 'MID' | 'SMALL' | null;
  avgVolume30d: number;
  isEligible: boolean;
  ineligibilityReason: string | null;
  lastUpdated: Timestamp;
}

// Audit Log types
export interface AuditLog {
  logId: string;
  action: string;
  actorId: string;
  targetType: 'USER' | 'MATCH' | 'PORTFOLIO';
  targetId: string;
  details: Record<string, unknown>;
  timestamp: Timestamp;
  ipAddress: string | null;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Function input types
export interface CreateMatchInput {
  name: string;
  description?: string;
  type: MatchType;
  durationDays: number;
  startDate: string;
}

export interface SubmitPortfolioInput {
  matchId: string;
  positions: Array<{
    symbol: string;
    exchange: string;
    allocationCents: number;
  }>;
}

export interface JoinMatchInput {
  matchId: string;
  matchCode?: string;
}
