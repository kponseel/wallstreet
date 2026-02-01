import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { useAuthStore } from '@/hooks/useAuthStore';

const SUPER_ADMIN_EMAIL = 'kevin.ponseel@gmail.com';

interface AdminGame {
  code: string;
  name: string;
  status: 'DRAFT' | 'LIVE' | 'ENDED';
  playerCount: number;
  maxPlayers: number;
  creatorDisplayName: string;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
}

interface AdminPlayer {
  playerId: string;
  gameCode: string;
  nickname: string;
  isReady: boolean;
  joinedAt: string;
  portfolioCount: number;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'games' | 'players'>('games');
  const [games, setGames] = useState<AdminGame[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedGameCode, setSelectedGameCode] = useState<string>('');

  // Check if user is super admin
  useEffect(() => {
    if (user && user.email !== SUPER_ADMIN_EMAIL) {
      navigate('/');
    }
  }, [user, navigate]);

  // Load games on mount
  useEffect(() => {
    if (user?.email === SUPER_ADMIN_EMAIL) {
      loadGames();
    }
  }, [user]);

  const loadGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminListGames = httpsCallable(functions, 'adminListGames');
      const result = await adminListGames({});
      const data = result.data as { success: boolean; data?: { games: AdminGame[] } };
      if (data.success && data.data?.games) {
        setGames(data.data.games);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async (gameCode?: string) => {
    setLoading(true);
    setError(null);
    try {
      const adminListPlayers = httpsCallable(functions, 'adminListPlayers');
      const result = await adminListPlayers({ gameCode: gameCode || undefined });
      const data = result.data as { success: boolean; data?: { players: AdminPlayer[] } };
      if (data.success && data.data?.players) {
        setPlayers(data.data.players);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameCode: string) => {
    if (!confirm(`Delete game ${gameCode} and all its players?`)) return;

    setDeleting(gameCode);
    try {
      const adminDeleteGame = httpsCallable(functions, 'adminDeleteGame');
      await adminDeleteGame({ gameCode });
      setGames(games.filter(g => g.code !== gameCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete game');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeletePlayer = async (playerId: string, gameCode: string) => {
    if (!confirm(`Delete player ${playerId}?`)) return;

    setDeleting(playerId);
    try {
      const adminDeletePlayer = httpsCallable(functions, 'adminDeletePlayer');
      await adminDeletePlayer({ playerId });
      setPlayers(players.filter(p => p.playerId !== playerId));
      // Update game player count
      setGames(games.map(g =>
        g.code === gameCode ? { ...g, playerCount: g.playerCount - 1 } : g
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete player');
    } finally {
      setDeleting(null);
    }
  };

  const handleTabChange = (tab: 'games' | 'players') => {
    setActiveTab(tab);
    if (tab === 'players') {
      loadPlayers(selectedGameCode || undefined);
    } else {
      loadGames();
    }
  };

  const handleGameFilterChange = (gameCode: string) => {
    setSelectedGameCode(gameCode);
    loadPlayers(gameCode || undefined);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'LIVE':
        return 'bg-green-100 text-green-800';
      case 'ENDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Super admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Super Admin Panel</h2>
        <span className="text-xs text-gray-500 bg-red-100 px-2 py-1 rounded">
          {user.email}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => handleTabChange('games')}
          className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
            activeTab === 'games'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Games ({games.length})
        </button>
        <button
          onClick={() => handleTabChange('players')}
          className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
            activeTab === 'players'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Players ({players.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : activeTab === 'games' ? (
        /* Games Tab */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Players</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {games.map((game) => (
                  <tr key={game.code} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium">{game.code}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{game.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(game.status)}`}>
                        {game.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {game.playerCount}/{game.maxPlayers}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {game.creatorDisplayName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(game.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeleteGame(game.code)}
                        disabled={deleting === game.code}
                        className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                      >
                        {deleting === game.code ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
                {games.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No games found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Players Tab */
        <div className="space-y-4">
          {/* Filter by game */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Filter by game:</label>
            <select
              value={selectedGameCode}
              onChange={(e) => handleGameFilterChange(e.target.value)}
              className="input text-sm py-1 w-48"
            >
              <option value="">All games</option>
              {games.map((game) => (
                <option key={game.code} value={game.code}>
                  {game.code} - {game.name}
                </option>
              ))}
            </select>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nickname</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ready</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Portfolio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map((player) => (
                    <tr key={player.playerId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs">{player.playerId.slice(0, 8)}...</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-sm">{player.gameCode}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {player.nickname}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          player.isReady ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {player.isReady ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {player.portfolioCount} positions
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(player.joinedAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeletePlayer(player.playerId, player.gameCode)}
                          disabled={deleting === player.playerId}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                        >
                          {deleting === player.playerId ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {players.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No players found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
