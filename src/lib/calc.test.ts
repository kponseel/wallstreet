import { describe, it, expect } from 'vitest';
import type { Portfolio, PriceQuote } from '../types';
import { positionMetrics, portfolioMetrics, leaderboard, collectTickers, currentPriceFor } from './calc';

function quote(ticker: string, price: number): PriceQuote {
  return { ticker, price, asOf: '2026-06-03T00:00:00.000Z', source: 'yahoo' };
}

function makePortfolio(over: Partial<Portfolio> & Pick<Portfolio, 'id' | 'positions'>): Portfolio {
  return {
    name: 'P',
    aiModel: 'Test',
    baseCurrency: 'USD',
    suggestedAt: '2026-06-01T00:00:00.000Z',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...over,
  };
}

describe('positionMetrics', () => {
  it('computes shares, value and return from the price ratio', () => {
    const m = positionMetrics(
      { id: '1', ticker: 'AAPL', entryPrice: 100, amountInvested: 1000 },
      { AAPL: quote('AAPL', 110) }
    );
    expect(m.shares).toBe(10);
    expect(m.value).toBeCloseTo(1100);
    expect(m.pnl).toBeCloseTo(100);
    expect(m.returnPct).toBeCloseTo(10);
    expect(m.hasPrice).toBe(true);
  });

  it('stays flat (return 0) when no current price is known', () => {
    const m = positionMetrics({ id: '1', ticker: 'XYZ', entryPrice: 50, amountInvested: 500 }, {});
    expect(m.hasPrice).toBe(false);
    expect(m.value).toBe(500);
    expect(m.returnPct).toBe(0);
  });

  it('prefers a manual current price over the live quote', () => {
    const price = currentPriceFor(
      { id: '1', ticker: 'AAPL', entryPrice: 100, amountInvested: 1000, manualCurrentPrice: 130 },
      { AAPL: quote('AAPL', 110) }
    );
    expect(price).toBe(130);
  });
});

describe('portfolioMetrics', () => {
  it('aggregates value and return across mixed-currency positions via ratios', () => {
    const p = makePortfolio({
      id: 'a',
      positions: [
        { id: '1', ticker: 'AAPL', entryPrice: 100, amountInvested: 1000 }, // +20%
        { id: '2', ticker: 'MC.PA', entryPrice: 200, amountInvested: 1000 }, // -10%
      ],
    });
    const m = portfolioMetrics(p, { AAPL: quote('AAPL', 120), 'MC.PA': quote('MC.PA', 180) });
    expect(m.invested).toBe(2000);
    expect(m.value).toBeCloseTo(2100); // 1200 + 900
    expect(m.returnPct).toBeCloseTo(5);
    expect(m.fullyPriced).toBe(true);
    expect(m.best?.position.ticker).toBe('AAPL');
    expect(m.worst?.position.ticker).toBe('MC.PA');
    expect(m.positions[0].weight).toBeCloseTo(0.5);
  });

  it('reports partial pricing', () => {
    const p = makePortfolio({
      id: 'a',
      positions: [
        { id: '1', ticker: 'AAPL', entryPrice: 100, amountInvested: 1000 },
        { id: '2', ticker: 'ZZZ', entryPrice: 10, amountInvested: 1000 },
      ],
    });
    const m = portfolioMetrics(p, { AAPL: quote('AAPL', 150) });
    expect(m.pricedCount).toBe(1);
    expect(m.totalCount).toBe(2);
    expect(m.fullyPriced).toBe(false);
    expect(m.value).toBeCloseTo(2500); // 1500 + 1000 (flat)
  });
});

describe('leaderboard', () => {
  it('ranks portfolios by return, best first', () => {
    const winner = makePortfolio({ id: 'w', positions: [{ id: '1', ticker: 'A', entryPrice: 100, amountInvested: 1000 }] });
    const loser = makePortfolio({ id: 'l', positions: [{ id: '2', ticker: 'B', entryPrice: 100, amountInvested: 1000 }] });
    const rows = leaderboard([loser, winner], { A: quote('A', 200), B: quote('B', 50) });
    expect(rows[0].portfolio.id).toBe('w');
    expect(rows[0].rank).toBe(1);
    expect(rows[1].portfolio.id).toBe('l');
    expect(rows[1].rank).toBe(2);
  });
});

describe('collectTickers', () => {
  it('returns unique upper-cased tickers', () => {
    const p1 = makePortfolio({ id: '1', positions: [{ id: 'a', ticker: 'aapl', entryPrice: 1, amountInvested: 1 }] });
    const p2 = makePortfolio({
      id: '2',
      positions: [
        { id: 'b', ticker: 'AAPL', entryPrice: 1, amountInvested: 1 },
        { id: 'c', ticker: 'msft', entryPrice: 1, amountInvested: 1 },
      ],
    });
    expect(collectTickers([p1, p2]).sort()).toEqual(['AAPL', 'MSFT']);
  });
});
