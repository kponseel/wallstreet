import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import type { Symbol } from '@/types';

interface Position {
  symbol: string;
  exchange: string;
  companyName: string;
  allocationPercent: number;
}

export function PortfolioBuilderPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAllocation = positions.reduce((sum, p) => sum + p.allocationPercent, 0);
  const isValid = positions.length === 5 && totalAllocation === 100;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchSymbols = httpsCallable(functions, 'searchSymbols');
      const result = await searchSymbols({ query, limit: 10 });
      const data = result.data as { success: boolean; data?: { symbols: Symbol[] } };
      if (data.success && data.data?.symbols) {
        setSearchResults(data.data.symbols);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addPosition = (symbol: Symbol) => {
    if (positions.length >= 5) return;
    if (positions.some((p) => p.symbol === symbol.symbol)) return;

    setPositions([
      ...positions,
      {
        symbol: symbol.symbol,
        exchange: symbol.exchange,
        companyName: symbol.companyName,
        allocationPercent: 20,
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removePosition = (index: number) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, value: number) => {
    const newPositions = [...positions];
    newPositions[index].allocationPercent = Math.min(50, Math.max(5, value));
    setPositions(newPositions);
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);

    try {
      const submitPortfolio = httpsCallable(functions, 'submitPortfolio');
      const result = await submitPortfolio({
        matchId,
        positions: positions.map((p) => ({
          symbol: p.symbol,
          exchange: p.exchange,
          allocationCents: p.allocationPercent * 10000, // Convert % to cents of $10,000
        })),
      });

      const data = result.data as { success: boolean };
      if (data.success) {
        navigate(`/matches/${matchId}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit portfolio');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Build Your Portfolio</h2>

      {error && (
        <div className="bg-danger-50 text-danger-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="card p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Stocks ({positions.length}/5)
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="input"
          placeholder="Search by symbol (e.g., AAPL)"
          disabled={positions.length >= 5}
        />

        {searchResults.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-48 overflow-auto">
            {searchResults.map((symbol) => (
              <button
                key={`${symbol.symbol}_${symbol.exchange}`}
                onClick={() => addPosition(symbol)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                disabled={positions.some((p) => p.symbol === symbol.symbol)}
              >
                <span>
                  <span className="font-medium">{symbol.symbol}</span>
                  <span className="text-gray-500 ml-2">{symbol.companyName}</span>
                </span>
                <span className="text-xs text-gray-400">{symbol.exchange}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Positions */}
      <div className="card p-4 space-y-4">
        <h3 className="font-medium">Your Positions</h3>

        {positions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Search and add 5 stocks to your portfolio
          </p>
        ) : (
          <div className="space-y-3">
            {positions.map((position, index) => (
              <div key={position.symbol} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-medium">{position.symbol}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      {position.companyName}
                    </span>
                  </div>
                  <button
                    onClick={() => removePosition(index)}
                    className="text-danger-500 hover:text-danger-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={50}
                    value={position.allocationPercent}
                    onChange={(e) => updateAllocation(index, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-mono">
                    {position.allocationPercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center pt-3 border-t">
          <span className="font-medium">Total Allocation</span>
          <span
            className={`font-mono ${
              totalAllocation === 100
                ? 'text-success-600'
                : totalAllocation > 100
                ? 'text-danger-600'
                : 'text-gray-600'
            }`}
          >
            {totalAllocation}%
          </span>
        </div>
      </div>

      {/* Validation */}
      <div className="card p-4">
        <h3 className="font-medium mb-2">Validation</h3>
        <ul className="space-y-1 text-sm">
          <li className={positions.length === 5 ? 'text-success-600' : 'text-gray-500'}>
            {positions.length === 5 ? '✓' : '○'} Exactly 5 positions
          </li>
          <li className={totalAllocation === 100 ? 'text-success-600' : 'text-gray-500'}>
            {totalAllocation === 100 ? '✓' : '○'} Total allocation equals 100%
          </li>
          <li className={positions.every((p) => p.allocationPercent >= 5) ? 'text-success-600' : 'text-gray-500'}>
            {positions.every((p) => p.allocationPercent >= 5) ? '✓' : '○'} Each position at least 5%
          </li>
        </ul>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="btn-primary w-full"
      >
        {submitting ? 'Submitting...' : 'Submit Portfolio'}
      </button>
    </div>
  );
}
