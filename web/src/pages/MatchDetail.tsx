import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { useAuthStore } from '@/hooks/useAuthStore';
import { GAME_CONSTANTS, AWARD_CONFIG, type Game, type LeaderboardEntry, type Award } from '@/types';

interface PlayerInfo {
  playerId: string;
  nickname: string;
  isReady: boolean;
  joinedAt: string;
  portfolioCount?: number;
  portfolio?: Array<{
    ticker: string;
    budgetInvested: number;
    quantity: number;
    initialPrice: number;
  }>;
}

export function MatchDetailPage() {
  const { gameCode } = useParams<{ gameCode: string }>();
  const { user } = useAuthStore();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const isCreator = user?.uid === game?.creatorId;

  // Get playerId from localStorage
  useEffect(() => {
    if (gameCode) {
      const storedPlayerId = localStorage.getItem(`player_${gameCode}`);
      setCurrentPlayerId(storedPlayerId);
    }
  }, [gameCode]);

  const fetchGameData = useCallback(async () => {
    if (!gameCode) return;

    try {
      // Fetch game info
      const getGameByCode = httpsCallable(functions, 'getGameByCode');
      const gameResult = await getGameByCode({ gameCode });
      const gameData = gameResult.data as { success: boolean; data?: any };

      if (gameData.success && gameData.data) {
        setGame({
          ...gameData.data,
          startDate: gameData.data.startDate ? new Date(gameData.data.startDate) : null,
          endDate: gameData.data.endDate ? new Date(gameData.data.endDate) : null,
          createdAt: new Date(),
        } as Game);
      }

      // Fetch players
      const getGamePlayers = httpsCallable(functions, 'getGamePlayers');
      const playersResult = await getGamePlayers({ gameCode });
      const playersData = playersResult.data as { success: boolean; data?: { players: PlayerInfo[] } };

      if (playersData.success && playersData.data) {
        setPlayers(playersData.data.players);
      }

      // Fetch leaderboard for ended games
      if (gameData.data?.status === 'ENDED') {
        const getLeaderboard = httpsCallable(functions, 'getLeaderboard');
        const leaderboardResult = await getLeaderboard({ gameCode });
        const leaderboardData = leaderboardResult.data as { success: boolean; data?: { entries: LeaderboardEntry[] } };

        if (leaderboardData.success && leaderboardData.data) {
          setLeaderboard(leaderboardData.data.entries);
        }
      }
    } catch (err) {
      console.error('Error fetching game data:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [gameCode]);

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  // Countdown timer
  useEffect(() => {
    if (!game?.endDate || game.status !== 'LIVE') return;

    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(game.endDate!);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Termine !');
        fetchGameData(); // Refresh to get final results
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${days}j ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [game?.endDate, game?.status, fetchGameData]);

  const handleLaunchGame = async () => {
    if (!gameCode || !isCreator) return;
    setLaunching(true);
    setError(null);

    try {
      const launchGame = httpsCallable(functions, 'launchGame');
      const result = await launchGame({ gameCode });
      const data = result.data as { success: boolean };

      if (data.success) {
        fetchGameData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du lancement');
    } finally {
      setLaunching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'En attente' },
      LIVE: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En cours' },
      ENDED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Terminee' },
    };
    const style = statusStyles[status] || statusStyles.DRAFT;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const renderAwardBadge = (award: Award) => {
    const config = AWARD_CONFIG[award.type];
    return (
      <div key={award.type} className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full">
        <span className="text-xl">{config.emoji}</span>
        <span className="text-sm font-medium text-yellow-800">{config.titleFr}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="card p-8 text-center">
        <h3 className="font-medium mb-2">Partie introuvable</h3>
        <Link to="/games" className="text-primary-600 hover:underline">
          Retour
        </Link>
      </div>
    );
  }

  const allPlayersReady = players.length >= 2 && players.every((p) => p.isReady);
  const currentPlayer = players.find((p) => p.playerId === currentPlayerId);

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="card p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">{game.name}</h2>
            <p className="text-gray-500 text-sm">Code: {game.code}</p>
          </div>
          {getStatusBadge(game.status)}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* Live Countdown */}
        {game.status === 'LIVE' && (
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-blue-600 text-sm mb-1">Temps restant</p>
            <p className="text-3xl font-bold text-blue-800 font-mono">{timeRemaining}</p>
            <p className="text-blue-600 text-xs mt-1">Fin: {game.endDate?.toLocaleString('fr-FR')}</p>
          </div>
        )}

        {/* Draft Info */}
        {game.status === 'DRAFT' && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Joueurs:</span>
              <span className="ml-2 font-medium">{game.playerCount}/{game.maxPlayers}</span>
            </div>
            <div>
              <span className="text-gray-500">Duree:</span>
              <span className="ml-2 font-medium">{GAME_CONSTANTS.DURATION_DAYS} jours</span>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard for ENDED games */}
      {game.status === 'ENDED' && leaderboard.length > 0 && (
        <div className="space-y-4">
          {/* Podium */}
          <div className="card p-6">
            <h3 className="font-bold text-lg mb-4 text-center">Podium</h3>
            <div className="flex justify-center items-end gap-4">
              {/* 2nd place */}
              {leaderboard[1] && (
                <div className="text-center">
                  <div className="w-20 h-24 bg-gray-200 rounded-t-lg flex items-center justify-center">
                    <span className="text-3xl">🥈</span>
                  </div>
                  <p className="font-medium mt-2">{leaderboard[1].nickname}</p>
                  <p className={`text-sm ${leaderboard[1].portfolioReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {leaderboard[1].portfolioReturnPercent >= 0 ? '+' : ''}{leaderboard[1].portfolioReturnPercent.toFixed(2)}%
                  </p>
                </div>
              )}
              {/* 1st place */}
              {leaderboard[0] && (
                <div className="text-center">
                  <div className="w-24 h-32 bg-yellow-200 rounded-t-lg flex items-center justify-center">
                    <span className="text-4xl">🏆</span>
                  </div>
                  <p className="font-bold mt-2 text-lg">{leaderboard[0].nickname}</p>
                  <p className={`font-medium ${leaderboard[0].portfolioReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {leaderboard[0].portfolioReturnPercent >= 0 ? '+' : ''}{leaderboard[0].portfolioReturnPercent.toFixed(2)}%
                  </p>
                </div>
              )}
              {/* 3rd place */}
              {leaderboard[2] && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-orange-200 rounded-t-lg flex items-center justify-center">
                    <span className="text-2xl">🥉</span>
                  </div>
                  <p className="font-medium mt-2">{leaderboard[2].nickname}</p>
                  <p className={`text-sm ${leaderboard[2].portfolioReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {leaderboard[2].portfolioReturnPercent >= 0 ? '+' : ''}{leaderboard[2].portfolioReturnPercent.toFixed(2)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Full leaderboard with awards */}
          <div className="card p-6">
            <h3 className="font-bold mb-4">Classement Final</h3>
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.playerId}
                  className={`p-4 rounded-lg ${entry.playerId === currentPlayerId ? 'bg-primary-50 border-2 border-primary-200' : 'bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        entry.rank === 1 ? 'bg-yellow-200 text-yellow-800' :
                        entry.rank === 2 ? 'bg-gray-300 text-gray-800' :
                        entry.rank === 3 ? 'bg-orange-200 text-orange-800' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {entry.rank}
                      </span>
                      <div>
                        <p className="font-medium">{entry.nickname}</p>
                        <p className="text-xs text-gray-500">
                          Meilleur: {entry.bestPosition.ticker} ({entry.bestPosition.returnPercent > 0 ? '+' : ''}{entry.bestPosition.returnPercent.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${entry.portfolioReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.portfolioReturnPercent >= 0 ? '+' : ''}{entry.portfolioReturnPercent.toFixed(2)}%
                      </p>
                      <p className="text-sm text-gray-500">{entry.finalValue.toLocaleString()} Credits</p>
                    </div>
                  </div>
                  {entry.awards.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {entry.awards.map(renderAwardBadge)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Players List */}
      <div className="card p-6">
        <h3 className="font-bold mb-4">
          Joueurs ({players.length})
        </h3>
        {players.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aucun joueur pour le moment</p>
        ) : (
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.playerId}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  player.playerId === currentPlayerId ? 'bg-primary-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{player.nickname}</span>
                  {player.playerId === currentPlayerId && (
                    <span className="text-xs text-primary-600">(toi)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {game.status === 'DRAFT' ? (
                    player.isReady ? (
                      <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                        <span>✓</span> Pret
                      </span>
                    ) : (
                      <span className="text-orange-600 text-sm">En preparation...</span>
                    )
                  ) : player.portfolio && (
                    <span className="text-xs text-gray-500">
                      {player.portfolio.length} positions
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revealed Portfolios (when LIVE or ENDED) */}
      {(game.status === 'LIVE' || game.status === 'ENDED') && players.some((p) => p.portfolio) && (
        <div className="card p-6">
          <h3 className="font-bold mb-4">Portefeuilles</h3>
          <div className="space-y-4">
            {players.map((player) => player.portfolio && (
              <div key={player.playerId} className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium mb-2">{player.nickname}</p>
                <div className="space-y-1">
                  {player.portfolio.map((pos) => (
                    <div key={pos.ticker} className="flex justify-between text-sm">
                      <span>{pos.ticker}</span>
                      <span className="text-gray-600">{pos.budgetInvested.toLocaleString()} Credits</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {game.status === 'DRAFT' && (
        <div className="space-y-3">
          {/* Admin: Launch button */}
          {isCreator && (
            <button
              onClick={handleLaunchGame}
              disabled={launching || !allPlayersReady}
              className={`w-full py-3 rounded-lg font-medium ${
                allPlayersReady
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {launching ? 'Lancement...' : allPlayersReady ? 'Lancer la partie !' : `En attente (${players.filter((p) => p.isReady).length}/${players.length} prets)`}
            </button>
          )}

          {/* Player: Edit portfolio button */}
          {currentPlayer && !currentPlayer.isReady && (
            <Link to={`/games/${gameCode}/portfolio`} className="btn-primary w-full block text-center">
              Composer mon portefeuille
            </Link>
          )}

          {currentPlayer && currentPlayer.isReady && (
            <Link to={`/games/${gameCode}/portfolio`} className="btn-secondary w-full block text-center">
              Modifier mon portefeuille
            </Link>
          )}

          {/* Not a player: Join button */}
          {!currentPlayer && !isCreator && (
            <Link to="/games" className="btn-primary w-full block text-center">
              Rejoindre cette partie
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
