import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { GAME_CONSTANTS, type Symbol, type Market } from '@/types';

interface PositionDraft {
  ticker: string;
  companyName: string;
  market: Market;
  budgetInvested: number;
}

export function PortfolioBuilderPage() {
  const { gameCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();
  const [positions, setPositions] = useState<PositionDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Get playerId from localStorage and check game status
  useEffect(() => {
    if (gameCode) {
      const storedPlayerId = localStorage.getItem(`player_${gameCode}`);
      if (storedPlayerId) {
        setPlayerId(storedPlayerId);
      } else {
        // If no playerId, redirect to join page
        navigate('/games');
        return;
      }

      // Check game status
      const checkGameStatus = async () => {
        try {
          const getGameByCode = httpsCallable(functions, 'getGameByCode');
          const result = await getGameByCode({ gameCode });
          const data = result.data as { success: boolean; data?: { status: string } };
          if (data.success && data.data) {
            setGameStatus(data.data.status);
          }
        } catch {
          setError('Impossible de charger la partie');
        } finally {
          setInitialLoading(false);
        }
      };
      checkGameStatus();
    }
  }, [gameCode, navigate]);

  // If game is not in DRAFT, show message
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (gameStatus && gameStatus !== 'DRAFT') {
    return (
      <div className="card p-8 text-center">
        <h3 className="font-medium mb-2 text-lg">Portefeuille verrouille</h3>
        <p className="text-gray-600 mb-4">
          La partie a deja commence. Tu ne peux plus modifier ton portefeuille.
        </p>
        <button onClick={() => navigate(`/games/${gameCode}`)} className="btn-primary">
          Voir la partie
        </button>
      </div>
    );
  }

  const totalBudget = positions.reduce((sum, p) => sum + p.budgetInvested, 0);
  const remainingBudget = GAME_CONSTANTS.TOTAL_BUDGET - totalBudget;
  const isValid = positions.length === GAME_CONSTANTS.REQUIRED_POSITIONS &&
                  Math.abs(totalBudget - GAME_CONSTANTS.TOTAL_BUDGET) < 1;

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
        // Filter out already selected stocks
        const filtered = data.data.symbols.filter(
          (s) => !positions.some((p) => p.ticker === s.ticker)
        );
        setSearchResults(filtered);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addPosition = (symbol: Symbol) => {
    if (positions.length >= GAME_CONSTANTS.REQUIRED_POSITIONS) return;
    if (positions.some((p) => p.ticker === symbol.ticker)) return;

    // Calculate default allocation (split remaining budget)
    const defaultBudget = Math.floor(remainingBudget / (GAME_CONSTANTS.REQUIRED_POSITIONS - positions.length));

    setPositions([
      ...positions,
      {
        ticker: symbol.ticker,
        companyName: symbol.companyName,
        market: symbol.market,
        budgetInvested: defaultBudget,
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removePosition = (index: number) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  const updateBudget = (index: number, value: number) => {
    const newPositions = [...positions];
    newPositions[index].budgetInvested = Math.max(0, Math.min(GAME_CONSTANTS.TOTAL_BUDGET, value));
    setPositions(newPositions);
  };

  const distributeEvenly = () => {
    if (positions.length === 0) return;
    const evenBudget = Math.floor(GAME_CONSTANTS.TOTAL_BUDGET / positions.length);
    const remainder = GAME_CONSTANTS.TOTAL_BUDGET - evenBudget * positions.length;

    const newPositions = positions.map((p, i) => ({
      ...p,
      budgetInvested: evenBudget + (i === 0 ? remainder : 0),
    }));
    setPositions(newPositions);
  };

  const allocateAllToLast = () => {
    if (positions.length === 0) return;
    const newPositions = positions.map((p, i) => ({
      ...p,
      budgetInvested: i === positions.length - 1 ? remainingBudget + p.budgetInvested : p.budgetInvested,
    }));
    setPositions(newPositions);
  };

  const handleSubmit = async () => {
    if (!isValid || !playerId || !gameCode) return;
    setSubmitting(true);
    setError(null);

    try {
      const submitPortfolio = httpsCallable(functions, 'submitPortfolio');
      const result = await submitPortfolio({
        gameCode,
        playerId,
        positions: positions.map((p) => ({
          ticker: p.ticker,
          budgetInvested: p.budgetInvested,
        })),
      });

      const data = result.data as { success: boolean };
      if (data.success) {
        navigate(`/games/${gameCode}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const getMarketBadgeColor = (market: Market) => {
    switch (market) {
      case 'NASDAQ': return 'bg-blue-100 text-blue-800';
      case 'NYSE': return 'bg-green-100 text-green-800';
      case 'CAC40': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Compose ton Portefeuille</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Budget Summary */}
      <div className="card p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Budget total</p>
            <p className="text-2xl font-bold">{GAME_CONSTANTS.TOTAL_BUDGET.toLocaleString()} Credits</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Restant</p>
            <p className={`text-2xl font-bold ${remainingBudget === 0 ? 'text-green-600' : remainingBudget < 0 ? 'text-red-600' : 'text-orange-600'}`}>
              {remainingBudget.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${totalBudget > GAME_CONSTANTS.TOTAL_BUDGET ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(100, (totalBudget / GAME_CONSTANTS.TOTAL_BUDGET) * 100)}%` }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rechercher des actions ({positions.length}/{GAME_CONSTANTS.REQUIRED_POSITIONS})
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="input"
          placeholder="Ticker ou nom (ex: AAPL, LVMH, Tesla...)"
          disabled={positions.length >= GAME_CONSTANTS.REQUIRED_POSITIONS}
        />

        {loading && (
          <div className="mt-2 text-center text-gray-500 text-sm">Recherche...</div>
        )}

        {!loading && searchResults.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-64 overflow-auto">
            {searchResults.map((symbol) => (
              <button
                key={symbol.ticker}
                onClick={() => addPosition(symbol)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
              >
                <div>
                  <span className="font-medium">{symbol.ticker}</span>
                  <span className="text-gray-500 text-sm ml-2">{symbol.companyName}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getMarketBadgeColor(symbol.market)}`}>
                  {symbol.market}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Positions */}
      <div className="card p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Tes Positions</h3>
          {positions.length > 0 && (
            <button onClick={distributeEvenly} className="text-sm text-primary-600 hover:underline">
              Repartir egalement
            </button>
          )}
        </div>

        {positions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            Recherche et ajoute {GAME_CONSTANTS.REQUIRED_POSITIONS} actions a ton portefeuille
          </p>
        ) : (
          <div className="space-y-4">
            {positions.map((position, index) => (
              <div key={position.ticker} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{position.ticker}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getMarketBadgeColor(position.market)}`}>
                        {position.market}
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm">{position.companyName}</span>
                  </div>
                  <button
                    onClick={() => removePosition(index)}
                    className="text-red-500 hover:text-red-700 text-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={GAME_CONSTANTS.TOTAL_BUDGET}
                      step={100}
                      value={position.budgetInvested}
                      onChange={(e) => updateBudget(index, Number(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={GAME_CONSTANTS.TOTAL_BUDGET}
                      step={100}
                      value={position.budgetInvested}
                      onChange={(e) => updateBudget(index, Number(e.target.value))}
                      className="input w-32 text-right font-mono"
                    />
                    <span className="text-gray-600">Credits</span>
                    <span className="text-gray-400 text-sm ml-2">
                      ({((position.budgetInvested / GAME_CONSTANTS.TOTAL_BUDGET) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {positions.length > 0 && remainingBudget > 0 && (
          <button
            onClick={allocateAllToLast}
            className="text-sm text-primary-600 hover:underline"
          >
            Ajouter le reste ({remainingBudget.toLocaleString()}) a la derniere position
          </button>
        )}
      </div>

      {/* Validation */}
      <div className="card p-4">
        <h3 className="font-medium mb-2">Validation</h3>
        <ul className="space-y-1 text-sm">
          <li className={positions.length === GAME_CONSTANTS.REQUIRED_POSITIONS ? 'text-green-600' : 'text-gray-500'}>
            {positions.length === GAME_CONSTANTS.REQUIRED_POSITIONS ? '✓' : '○'} {GAME_CONSTANTS.REQUIRED_POSITIONS} actions selectionnees
          </li>
          <li className={remainingBudget === 0 ? 'text-green-600' : 'text-gray-500'}>
            {remainingBudget === 0 ? '✓' : '○'} Budget totalement alloue ({GAME_CONSTANTS.TOTAL_BUDGET.toLocaleString()} Credits)
          </li>
          <li className={positions.every((p) => p.budgetInvested > 0) ? 'text-green-600' : 'text-gray-500'}>
            {positions.every((p) => p.budgetInvested > 0) ? '✓' : '○'} Chaque position a un montant
          </li>
        </ul>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="btn-primary w-full"
      >
        {submitting ? 'Envoi...' : 'Valider mon portefeuille'}
      </button>
    </div>
  );
}
