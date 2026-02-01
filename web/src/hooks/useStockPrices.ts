import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';

export interface StockQuote {
  ticker: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  lastUpdated: string;
  companyName: string;
  market: string;
  isMock: boolean;
}

interface UseStockPricesResult {
  prices: Record<string, StockQuote>;
  loading: boolean;
  error: string | null;
  fetchPrice: (ticker: string) => Promise<StockQuote | null>;
  fetchPrices: (tickers: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useStockPrices(initialTickers: string[] = []): UseStockPricesResult {
  const [prices, setPrices] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickers, setTickers] = useState<string[]>(initialTickers);

  const fetchPrice = useCallback(async (ticker: string): Promise<StockQuote | null> => {
    try {
      const getStockPrice = httpsCallable(functions, 'getStockPrice');
      const result = await getStockPrice({ ticker });
      const data = result.data as { success: boolean; data?: StockQuote };

      if (data.success && data.data) {
        setPrices((prev) => ({ ...prev, [ticker]: data.data! }));
        return data.data;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching price for ${ticker}:`, err);
      return null;
    }
  }, []);

  const fetchPrices = useCallback(async (tickersToFetch: string[]) => {
    if (tickersToFetch.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const getBatchStockPrices = httpsCallable(functions, 'getBatchStockPrices');
      const result = await getBatchStockPrices({ tickers: tickersToFetch });
      const data = result.data as { success: boolean; data?: { prices: Record<string, StockQuote> } };

      if (data.success && data.data?.prices) {
        setPrices((prev) => ({ ...prev, ...data.data!.prices }));
        setTickers(tickersToFetch);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    if (tickers.length > 0) {
      await fetchPrices(tickers);
    }
  }, [tickers, fetchPrices]);

  // Fetch initial prices
  useEffect(() => {
    if (initialTickers.length > 0) {
      fetchPrices(initialTickers);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    prices,
    loading,
    error,
    fetchPrice,
    fetchPrices,
    refetch,
  };
}

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Format price change with color indicator
 */
export function formatChange(change: number, changePercent: number): {
  text: string;
  color: string;
} {
  const sign = change >= 0 ? '+' : '';
  return {
    text: `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`,
    color: change >= 0 ? 'text-green-600' : 'text-red-600',
  };
}
