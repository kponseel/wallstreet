// ============================================================
// Performance math.
//
// Returns are computed per position from the price *ratio* (current / entry),
// which is currency-agnostic — so a single portfolio can safely mix a USD stock
// and a EUR stock. The portfolio value is the sum of each invested amount grown
// by its own return ratio; positions without a known current price stay flat.
// ============================================================

import type { Portfolio, Position, PriceQuote } from '../types';

export type PriceMap = Record<string, PriceQuote>;

/** Resolve the current price for a position: manual override first, then live quote. */
export function currentPriceFor(pos: Position, prices: PriceMap): number | undefined {
  if (typeof pos.manualCurrentPrice === 'number' && pos.manualCurrentPrice > 0) {
    return pos.manualCurrentPrice;
  }
  const q = prices[pos.ticker.toUpperCase()];
  return q && q.price > 0 ? q.price : undefined;
}

export interface PositionMetrics {
  position: Position;
  shares: number;
  entryPrice: number;
  currentPrice?: number;
  hasPrice: boolean;
  invested: number;
  value: number;
  pnl: number;
  returnPct: number;
  /** Share of the portfolio's total invested amount, 0..1. */
  weight: number;
}

export function positionMetrics(pos: Position, prices: PriceMap, totalInvested = 0): PositionMetrics {
  const entryPrice = pos.entryPrice || 0;
  const invested = pos.amountInvested || 0;
  const shares = entryPrice > 0 ? invested / entryPrice : 0;
  const currentPrice = currentPriceFor(pos, prices);
  const hasPrice = typeof currentPrice === 'number' && currentPrice > 0 && entryPrice > 0;
  const ratio = hasPrice ? (currentPrice as number) / entryPrice : 1;
  const value = invested * ratio;
  return {
    position: pos,
    shares,
    entryPrice,
    currentPrice,
    hasPrice,
    invested,
    value,
    pnl: value - invested,
    returnPct: hasPrice ? (ratio - 1) * 100 : 0,
    weight: totalInvested > 0 ? invested / totalInvested : 0,
  };
}

export interface PortfolioMetrics {
  invested: number;
  value: number;
  pnl: number;
  returnPct: number;
  positions: PositionMetrics[];
  pricedCount: number;
  totalCount: number;
  fullyPriced: boolean;
  best?: PositionMetrics;
  worst?: PositionMetrics;
}

export function portfolioMetrics(p: Portfolio, prices: PriceMap): PortfolioMetrics {
  const totalInvested = p.positions.reduce((s, pos) => s + (pos.amountInvested || 0), 0);
  const positions = p.positions.map((pos) => positionMetrics(pos, prices, totalInvested));
  const value = positions.reduce((s, m) => s + m.value, 0);
  const priced = positions.filter((m) => m.hasPrice);
  const byReturn = [...priced].sort((a, b) => b.returnPct - a.returnPct);

  return {
    invested: totalInvested,
    value,
    pnl: value - totalInvested,
    returnPct: totalInvested > 0 ? (value / totalInvested - 1) * 100 : 0,
    positions,
    pricedCount: priced.length,
    totalCount: positions.length,
    fullyPriced: positions.length > 0 && priced.length === positions.length,
    best: byReturn[0],
    worst: byReturn[byReturn.length - 1],
  };
}

export interface LeaderboardRow {
  portfolio: Portfolio;
  metrics: PortfolioMetrics;
  rank: number;
}

/** Portfolios ranked by return %, best first. */
export function leaderboard(portfolios: Portfolio[], prices: PriceMap): LeaderboardRow[] {
  const rows = portfolios.map((portfolio) => ({
    portfolio,
    metrics: portfolioMetrics(portfolio, prices),
  }));
  rows.sort((a, b) => b.metrics.returnPct - a.metrics.returnPct);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Unique, upper-cased tickers used across the given portfolios. */
export function collectTickers(portfolios: Portfolio[]): string[] {
  const set = new Set<string>();
  for (const p of portfolios) {
    for (const pos of p.positions) {
      const t = pos.ticker.trim().toUpperCase();
      if (t) set.add(t);
    }
  }
  return [...set];
}
