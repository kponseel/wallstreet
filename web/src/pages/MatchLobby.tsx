import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { useAuthStore } from '@/hooks/useAuthStore';
import { GAME_CONSTANTS } from '@/types';

interface OpenGame {
  code: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  creatorDisplayName: string;
  createdAt: string;
}

export function MatchLobbyPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [gameCode, setGameCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'code' | 'nickname'>('code');
  const [gameInfo, setGameInfo] = useState<{
    code: string;
    name: string;
    playerCount: number;
    creatorDisplayName: string;
  } | null>(null);
  const [openGames, setOpenGames] = useState<OpenGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // Pre-populate nickname from user profile when entering nickname step
  useEffect(() => {
    if (step === 'nickname' && user?.nickname && !nickname) {
      setNickname(user.nickname);
    }
  }, [step, user?.nickname]);

  // Load open games on mount
  useEffect(() => {
    const fetchOpenGames = async () => {
      try {
        const listOpenGames = httpsCallable(functions, 'listOpenGames');
        const result = await listOpenGames({});
        const data = result.data as { success: boolean; data?: { games: OpenGame[] } };
        if (data.success && data.data?.games) {
          setOpenGames(data.data.games);
        }
      } catch {
        // Silently fail - just show manual code entry
      } finally {
        setLoadingGames(false);
      }
    };
    fetchOpenGames();
  }, []);

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const getGameByCode = httpsCallable(functions, 'getGameByCode');
      const result = await getGameByCode({ gameCode: gameCode.toUpperCase() });

      const data = result.data as {
        success: boolean;
        data?: {
          code: string;
          name: string;
          status: string;
          playerCount: number;
          creatorDisplayName: string;
        };
      };

      if (data.success && data.data) {
        if (data.data.status !== 'DRAFT') {
          setError('Cette partie a deja commence ou est terminee');
          return;
        }
        setGameInfo({
          code: data.data.code,
          name: data.data.name,
          playerCount: data.data.playerCount,
          creatorDisplayName: data.data.creatorDisplayName,
        });
        setStep('nickname');
      } else {
        setError('Partie introuvable');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const selectGame = (game: OpenGame) => {
    setGameInfo({
      code: game.code,
      name: game.name,
      playerCount: game.playerCount,
      creatorDisplayName: game.creatorDisplayName,
    });
    setStep('nickname');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameInfo) return;

    setLoading(true);
    setError(null);

    try {
      const joinGame = httpsCallable(functions, 'joinGame');
      const result = await joinGame({
        gameCode: gameInfo.code,
        nickname: nickname.trim(),
      });

      const data = result.data as {
        success: boolean;
        data?: { playerId: string; gameCode: string };
      };

      if (data.success && data.data) {
        // Store playerId in localStorage for this session
        localStorage.setItem(`player_${gameInfo.code}`, data.data.playerId);
        navigate(`/games/${gameInfo.code}/portfolio`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('code');
    setGameInfo(null);
    setGameCode('');
    setNickname('');
    setError(null);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "a l'instant";
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    return `il y a ${diffDays}j`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Rejoindre une Partie</h2>

      {step === 'code' ? (
        <>
          {/* Open Games List */}
          <div className="card p-6">
            <h3 className="font-medium mb-4">Parties ouvertes</h3>

            {loadingGames ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent"></div>
              </div>
            ) : openGames.length > 0 ? (
              <div className="space-y-2">
                {openGames.map((game) => (
                  <button
                    key={game.code}
                    onClick={() => selectGame(game)}
                    className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{game.name}</p>
                        <p className="text-sm text-gray-500">
                          par {game.creatorDisplayName} - {formatTimeAgo(game.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          {game.playerCount}/{game.maxPlayers} joueurs
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Aucune partie ouverte pour le moment
              </p>
            )}
          </div>

          {/* Manual Code Entry */}
          <form onSubmit={handleCheckCode} className="card p-6 space-y-4">
            <h3 className="font-medium">Ou entre un code</h3>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code de la partie
              </label>
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="input text-center text-2xl font-mono tracking-widest"
                placeholder="WS-XXXX"
                maxLength={10}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Demande le code a l'organisateur de la partie
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || gameCode.length < 4}
              className="btn-primary w-full"
            >
              {loading ? 'Recherche...' : 'Trouver la partie'}
            </button>

            <div className="text-center pt-4 border-t">
              <p className="text-gray-600 text-sm mb-2">Tu veux organiser ta propre partie ?</p>
              <Link to="/create" className="text-primary-600 font-medium hover:underline">
                Creer une partie
              </Link>
            </div>
          </form>
        </>
      ) : (
        <div className="card p-6 space-y-6">
          {/* Game info */}
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-green-800 font-medium mb-1">Partie trouvee !</p>
            <p className="text-2xl font-bold text-green-900">{gameInfo?.name}</p>
            <p className="text-sm text-green-700 mt-2">
              Organisee par {gameInfo?.creatorDisplayName} - {gameInfo?.playerCount} joueur(s) deja inscrits
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ton pseudo
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input"
                placeholder="ex: TraderFou, BoursierPro..."
                minLength={2}
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Ce pseudo sera visible par tous les joueurs
              </p>
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Rappel des regles :</p>
              <ul className="space-y-1">
                <li>Tu dois choisir {GAME_CONSTANTS.REQUIRED_POSITIONS} actions</li>
                <li>Tu as {GAME_CONSTANTS.TOTAL_BUDGET.toLocaleString()} Credits a repartir</li>
                <li>La partie dure {GAME_CONSTANTS.DURATION_DAYS} jours</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary flex-1"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={loading || nickname.trim().length < 2}
                className="btn-primary flex-1"
              >
                {loading ? 'Connexion...' : 'Rejoindre'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
