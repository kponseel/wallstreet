import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Generate a random alphanumeric string
 */
export function generateMatchCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if a date is a US market trading day
 */
export function isTradingDay(date: Date, holidays: string[]): boolean {
  const dayOfWeek = date.getDay();
  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  // Holiday check
  const dateStr = formatDateString(date);
  return !holidays.includes(dateStr);
}

/**
 * Get next trading day from a given date
 */
export function getNextTradingDay(date: Date, holidays: string[]): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  while (!isTradingDay(nextDay, holidays)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  return nextDay;
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string to Date object (assumes UTC)
 */
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/**
 * Get market close time for a date (4 PM ET)
 */
export function getMarketCloseTime(date: Date): Date {
  const closeTime = new Date(date);
  closeTime.setUTCHours(20, 0, 0, 0); // 4 PM ET = 20:00 UTC (during EDT)
  return closeTime;
}

/**
 * Calculate end date based on start date and duration
 */
export function calculateEndDate(startDate: Date, durationDays: number, holidays: string[]): Date {
  let tradingDaysRemaining = durationDays;
  const endDate = new Date(startDate);

  while (tradingDaysRemaining > 0) {
    endDate.setDate(endDate.getDate() + 1);
    if (isTradingDay(endDate, holidays)) {
      tradingDaysRemaining--;
    }
  }

  return endDate;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate match name
 */
export function isValidMatchName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 50) {
    return false;
  }
  // Allow alphanumeric, spaces, and basic punctuation
  const nameRegex = /^[a-zA-Z0-9\s\-_']+$/;
  return nameRegex.test(name);
}

/**
 * Validate stock symbol format
 */
export function isValidSymbol(symbol: string): boolean {
  const symbolRegex = /^[A-Z]{1,5}$/;
  return symbolRegex.test(symbol);
}

/**
 * Validate exchange name
 */
export function isValidExchange(exchange: string): boolean {
  const validExchanges = ['NYSE', 'NASDAQ', 'AMEX'];
  return validExchanges.includes(exchange);
}

/**
 * Validate portfolio allocations
 */
export function validatePortfolioAllocations(positions: Array<{ allocationCents: number }>): {
  valid: boolean;
  error?: string;
} {
  if (positions.length !== 5) {
    return { valid: false, error: 'Portfolio must have exactly 5 positions' };
  }

  let totalCents = 0;
  for (const pos of positions) {
    if (pos.allocationCents < 50000) { // $500 minimum
      return { valid: false, error: 'Each position must be at least $500 (5%)' };
    }
    if (pos.allocationCents > 500000) { // $5000 maximum
      return { valid: false, error: 'Each position cannot exceed $5,000 (50%)' };
    }
    totalCents += pos.allocationCents;
  }

  if (totalCents !== 1000000) { // $10,000 total
    return { valid: false, error: `Total allocation must be exactly $10,000 (got $${totalCents / 100})` };
  }

  return { valid: true };
}

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
export function calculateReturn(startPrice: number, endPrice: number): number {
  if (startPrice === 0) return 0;
  return ((endPrice - startPrice) / startPrice) * 100;
}

/**
 * Create audit log entry
 */
export async function createAuditLog(
  db: admin.firestore.Firestore,
  action: string,
  actorId: string,
  targetType: 'USER' | 'MATCH' | 'PORTFOLIO',
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

/**
 * Map exchange codes from API to standard format
 */
export function mapExchangeCode(apiExchange: string): string {
  const exchangeMap: Record<string, string> = {
    'XNAS': 'NASDAQ',
    'XNYS': 'NYSE',
    'XASE': 'AMEX',
    'ARCX': 'NYSE',
    'BATS': 'NYSE',
  };
  return exchangeMap[apiExchange] || apiExchange;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
