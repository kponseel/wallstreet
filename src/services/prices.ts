// ============================================================
// Free price fetching via Yahoo Finance's public chart endpoint.
//
// The browser can't call query1.finance.yahoo.com directly (CORS), so requests
// go through the Vite dev/preview proxy mounted at "/api/yf" (see vite.config.ts).
// This means auto-pricing works when running `npm run dev` / `npm run preview`.
// A fully static deployment has no proxy — manual prices remain the fallback.
// ============================================================

import type { PriceQuote } from '../types';

const YF_BASE = '/api/yf';

/** Auto-pricing relies on the dev/preview proxy, which only exists in dev mode. */
export function autoPricingAvailable(): boolean {
  return import.meta.env.DEV;
}

async function fetchOne(symbol: string): Promise<PriceQuote> {
  const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const price: unknown = meta?.regularMarketPrice;
  if (typeof price !== 'number' || !isFinite(price)) {
    const err = data?.chart?.error?.description;
    throw new Error(err || 'no price in response');
  }
  const asOf = meta?.regularMarketTime
    ? new Date(meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();
  return {
    ticker: symbol.toUpperCase(),
    price,
    currency: typeof meta?.currency === 'string' ? meta.currency : undefined,
    asOf,
    source: 'yahoo',
  };
}

/** Run an async worker over items with bounded concurrency. */
async function mapPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export interface FetchResult {
  quotes: Record<string, PriceQuote>;
  errors: string[];
}

/** Fetch the latest quote for a single symbol (used by "auto-fill price"). */
export async function fetchQuote(symbol: string): Promise<PriceQuote> {
  return fetchOne(symbol.trim());
}

/** Fetch quotes for many symbols. Failures are collected, not thrown. */
export async function fetchQuotes(symbols: string[]): Promise<FetchResult> {
  const unique = Array.from(new Set(symbols.map((s) => s.trim()).filter(Boolean)));
  const quotes: Record<string, PriceQuote> = {};
  const errors: string[] = [];

  await mapPool(unique, 5, async (symbol) => {
    try {
      const q = await fetchOne(symbol);
      quotes[q.ticker] = q;
    } catch (e) {
      errors.push(`${symbol}: ${(e as Error).message}`);
    }
  });

  return { quotes, errors };
}
