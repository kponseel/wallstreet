import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { useAuthStore } from '@/hooks/useAuthStore';

interface UserGame {
  code: string;
  name: string;
  status: string;
  playerCount: number;
  creatorId: string;
  creatorDisplayName: string;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  isCreator: boolean;
  myNickname: string;
  myPlayerId: string;
}

export function ProfilePage() {
  const { user, signOut, updateNickname } = useAuthStore();
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [createdGames, setCreatedGames] = useState<UserGame[]>([]);
  const [joinedGames, setJoinedGames] = useState<UserGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // Load user games on mount
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const getUserGames = httpsCallable(functions, 'getUserGames');
        const result = await getUserGames({});
        const data = result.data as {
          success: boolean;
          data?: { created: UserGame[]; joined: UserGame[] };
        };
        if (data.success && data.data) {
          setCreatedGames(data.data.created);
          setJoinedGames(data.data.joined);
        }
      } catch (err) {
        console.error('Failed to fetch user games:', err);
      } finally {
        setLoadingGames(false);
      }
    };
    fetchGames();
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const startEditingNickname = () => {
    setNewNickname(user?.nickname || '');
    setEditingNickname(true);
    setNicknameError(null);
  };

  const cancelEditingNickname = () => {
    setEditingNickname(false);
    setNewNickname('');
    setNicknameError(null);
  };

  const handleSaveNickname = async () => {
    if (!newNickname.trim() || newNickname.trim().length < 2 || newNickname.trim().length > 20) {
      setNicknameError('Le pseudo doit contenir 2-20 caracteres');
      return;
    }

    setSavingNickname(true);
    setNicknameError(null);

    try {
      const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
      const result = await updateUserProfile({ nickname: newNickname.trim() });
      const data = result.data as { success: boolean };

      if (data.success) {
        updateNickname(newNickname.trim());
        setEditingNickname(false);
      }
    } catch (err) {
      setNicknameError(err instanceof Error ? err.message : 'Erreur lors de la mise a jour');
    } finally {
      setSavingNickname(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'En attente' },
      LIVE: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En cours' },
      ENDED: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Terminee' },
    };
    const style = styles[status] || styles.DRAFT;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderGameList = (games: UserGame[], emptyMessage: string) => {
    if (games.length === 0) {
      return <p className="text-gray-500 text-center py-4">{emptyMessage}</p>;
    }

    return (
      <div className="space-y-2">
        {games.map((game) => (
          <Link
            key={game.code}
            to={`/games/${game.code}`}
            className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{game.name}</p>
                <p className="text-xs text-gray-500">
                  {game.code} - {formatDate(game.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(game.status)}
                {game.isCreator && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {user?.nickname?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Pseudo de jeu</p>
            {editingNickname ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="input text-lg font-semibold py-1 flex-1"
                    placeholder="Ton pseudo"
                    minLength={2}
                    maxLength={20}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveNickname}
                    disabled={savingNickname || newNickname.trim().length < 2}
                    className="text-green-600 hover:text-green-700 text-xl px-2"
                  >
                    {savingNickname ? '...' : '✓'}
                  </button>
                  <button
                    onClick={cancelEditingNickname}
                    className="text-gray-500 hover:text-gray-700 text-xl px-2"
                  >
                    ✕
                  </button>
                </div>
                {nicknameError && (
                  <p className="text-red-500 text-sm">{nicknameError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{user?.nickname || user?.displayName}</h2>
                <button
                  onClick={startEditingNickname}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                  title="Modifier le pseudo"
                >
                  ✎
                </button>
              </div>
            )}
            <p className="text-gray-600 text-sm mt-1">{user?.email}</p>
          </div>
        </div>

        {!user?.emailVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">Email non verifie</p>
          </div>
        )}
      </div>

      {/* My Games */}
      <div className="card p-6">
        <h3 className="font-bold mb-4">Mes Parties</h3>

        {loadingGames ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Created Games */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Admin</span>
                Parties creees ({createdGames.length})
              </h4>
              {renderGameList(createdGames, "Tu n'as cree aucune partie")}
            </div>

            {/* Joined Games */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Parties rejointes ({joinedGames.length})
              </h4>
              {renderGameList(joinedGames, "Tu n'as rejoint aucune partie")}
            </div>
          </div>
        )}

        {!loadingGames && createdGames.length === 0 && joinedGames.length === 0 && (
          <div className="text-center py-4">
            <Link to="/create" className="btn-primary">
              Creer ma premiere partie
            </Link>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="card p-6">
        <h3 className="font-bold mb-4">Statistiques</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Parties jouees</span>
            <span className="font-medium">{user?.stats?.gamesPlayed || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Parties gagnees</span>
            <span className="font-medium">{user?.stats?.gamesWon || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rendement total</span>
            <span className={`font-medium ${(user?.stats?.totalReturns || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(user?.stats?.totalReturns || 0) >= 0 ? '+' : ''}{(user?.stats?.totalReturns || 0).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Meilleur rendement</span>
            <span className="font-medium text-green-600">
              +{(user?.stats?.bestReturn || 0).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rang moyen</span>
            <span className="font-medium">#{(user?.stats?.averageRank || 0).toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button onClick={handleSignOut} className="btn-danger w-full">
        Deconnexion
      </button>
    </div>
  );
}
