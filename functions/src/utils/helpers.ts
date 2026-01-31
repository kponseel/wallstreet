import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { GAME_CONSTANTS } from '../types';

// ============================================
// WALLSTREET v2.0 - UTILITY HELPERS
// ============================================

/**
 * Generate a unique game code (e.g., "WS-8821")
 */
export function generateGameCode(): string {
  const chars = '0123456789';
  let code = 'WS-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique player ID
 */
export function generatePlayerId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ============================================
// PARIS TIMEZONE HELPERS
// ============================================

/**
 * Get current time in Paris
 */
export function getParisTime(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);

  // Simple DST check for Paris (last Sunday of March to last Sunday of October)
  const year = now.getUTCFullYear();
  const marchLastSunday = getLastSundayOfMonth(year, 2); // March = 2
  const octoberLastSunday = getLastSundayOfMonth(year, 9); // October = 9

  const isDST = now >= marchLastSunday && now < octoberLastSunday;
  const parisOffset = isDST ? 2 : 1; // UTC+2 in summer, UTC+1 in winter

  return new Date(utc + (parisOffset * 3600000));
}

/**
 * Get last Sunday of a month at 2:00 AM UTC
 */
function getLastSundayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 2, 0, 0));
  const dayOfWeek = lastDay.getUTCDay();
  lastDay.setUTCDate(lastDay.getUTCDate() - dayOfWeek);
  return lastDay;
}

/**
 * Calculate game end date: start + 7 calendar days at 22h30 Paris time
 */
export function calculateGameEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + GAME_CONSTANTS.DURATION_DAYS);

  // Set to 22h30 Paris time
  // Paris is UTC+1 or UTC+2 depending on DST
  const year = endDate.getFullYear();
  const marchLastSunday = getLastSundayOfMonth(year, 2);
  const octoberLastSunday = getLastSundayOfMonth(year, 9);
  const isDST = endDate >= marchLastSunday && endDate < octoberLastSunday;
  const parisOffset = isDST ? 2 : 1;

  // 22:30 Paris = (22:30 - offset) UTC
  const utcHours = GAME_CONSTANTS.END_HOUR_PARIS - parisOffset;
  endDate.setUTCHours(utcHours, GAME_CONSTANTS.END_MINUTE_PARIS, 0, 0);

  return endDate;
}

/**
 * Check if current time is past game end time
 */
export function isGameEnded(endDate: Date): boolean {
  return new Date() >= endDate;
}

// ============================================
// TRADING DAY HELPERS
// ============================================

// US Market holidays 2024-2026
const US_HOLIDAYS = [
  '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27',
  '2024-06-19', '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
  '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
  '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
];

// French Market holidays (Euronext Paris) 2024-2026
const FR_HOLIDAYS = [
  '2024-01-01', '2024-03-29', '2024-04-01', '2024-05-01', '2024-12-25', '2024-12-26',
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01', '2025-12-25', '2025-12-26',
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-12-25',
];

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get yesterday's date
 */
export function getYesterday(date: Date = new Date()): Date {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

/**
 * Get the last trading day before a given date (J-1)
 * This accounts for weekends and holidays
 */
export function getLastTradingDay(date: Date = new Date()): Date {
  const checkDate = new Date(date);
  checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

  // Keep going back until we find a trading day
  while (true) {
    const dateStr = formatDateString(checkDate);
    const day = checkDate.getDay();

    // Check if it's a weekend
    if (day === 0 || day === 6) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    // Check if it's a US or French holiday
    if (US_HOLIDAYS.includes(dateStr) || FR_HOLIDAYS.includes(dateStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    // It's a valid trading day
    break;
  }

  return checkDate;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate game name (3-50 chars, alphanumeric + spaces/punctuation)
 */
export function isValidGameName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 50) {
    return false;
  }
  const nameRegex = /^[a-zA-Z0-9\s\-_'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]+$/;
  return nameRegex.test(name);
}

/**
 * Validate nickname (2-20 chars)
 */
export function isValidNickname(nickname: string): boolean {
  if (!nickname || nickname.length < 2 || nickname.length > 20) {
    return false;
  }
  const nicknameRegex = /^[a-zA-Z0-9\s\-_àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]+$/;
  return nicknameRegex.test(nickname);
}

/**
 * Validate stock ticker format
 * Supports: US tickers (AAPL), French tickers (MC.PA)
 */
export function isValidTicker(ticker: string): boolean {
  // US ticker: 1-5 uppercase letters
  const usTickerRegex = /^[A-Z]{1,5}$/;
  // French ticker: 1-5 uppercase letters + .PA suffix
  const frTickerRegex = /^[A-Z]{1,5}\.PA$/;

  return usTickerRegex.test(ticker) || frTickerRegex.test(ticker);
}

/**
 * Validate portfolio allocations for v2.0
 * - Exactly 3 positions
 * - Total must equal 10,000 Credits
 * - No min/max per position (free allocation)
 */
export function validatePortfolioAllocations(
  positions: Array<{ budgetInvested: number }>
): { valid: boolean; error?: string } {
  if (positions.length !== GAME_CONSTANTS.REQUIRED_POSITIONS) {
    return {
      valid: false,
      error: `Portfolio must have exactly ${GAME_CONSTANTS.REQUIRED_POSITIONS} positions`,
    };
  }

  let total = 0;
  for (const pos of positions) {
    if (pos.budgetInvested <= 0) {
      return { valid: false, error: 'Each position must have a positive allocation' };
    }
    total += pos.budgetInvested;
  }

  if (Math.abs(total - GAME_CONSTANTS.TOTAL_BUDGET) > 0.01) {
    return {
      valid: false,
      error: `Total allocation must be exactly ${GAME_CONSTANTS.TOTAL_BUDGET} Credits (got ${total})`,
    };
  }

  return { valid: true };
}

// ============================================
// CALCULATION HELPERS
// ============================================

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate percentage return
 */
export function calculateReturn(initialPrice: number, finalPrice: number): number {
  if (initialPrice === 0) return 0;
  return ((finalPrice - initialPrice) / initialPrice) * 100;
}

/**
 * Calculate position quantity from budget and price
 */
export function calculateQuantity(budgetInvested: number, price: number): number {
  if (price === 0) return 0;
  return budgetInvested / price;
}

/**
 * Calculate position value from quantity and price
 */
export function calculatePositionValue(quantity: number, price: number): number {
  return quantity * price;
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Create audit log entry
 */
export async function createAuditLog(
  db: admin.firestore.Firestore,
  action: string,
  actorId: string,
  targetType: 'USER' | 'GAME' | 'PLAYER',
  targetId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const logRef = db.collection('auditLog').doc();
  await logRef.set({
    logId: logRef.id,
    action,
    actorId,
    targetType,
    targetId,
    details,
    timestamp: Timestamp.now(),
    ipAddress: null,
  });
}

// ============================================
// MISC HELPERS
// ============================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * delay * 0.2;
        await sleep(delay + jitter);
      }
    }
  }

  throw lastError;
}
