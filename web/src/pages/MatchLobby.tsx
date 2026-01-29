import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/services/firebase';
import type { Match } from '@/types';

export function MatchLobbyPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const q = query(
          collection(db, 'matches'),
          where('status', '==', 'OPEN'),
          where('type', '==', 'PUBLIC'),
          orderBy('startDate', 'asc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const matchData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            entryDeadline: data.entryDeadline?.toDate(),
          } as Match;
        });
        setMatches(matchData);
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  const handleJoinPrivate = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    setJoinError(null);

    try {
      const getMatchByCode = httpsCallable(functions, 'getMatchByCode');
      const result = await getMatchByCode({ code: inviteCode.toUpperCase() });
      const data = result.data as { success: boolean; data?: { matchId: string } };

      if (data.success && data.data?.matchId) {
        setShowJoinModal(false);
        navigate(`/matches/${data.data.matchId}`);
      } else {
        setJoinError('Match not found');
      }
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Failed to find match');
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Join Private Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Join Private Match</h3>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              className="input mb-4"
              maxLength={8}
            />
            {joinError && (
              <p className="text-danger-600 text-sm mb-4">{joinError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinPrivate}
                disabled={joining || !inviteCode.trim()}
                className="btn-primary flex-1"
              >
                {joining ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Match Lobby</h2>
        <button
          onClick={() => setShowJoinModal(true)}
          className="btn-secondary text-sm"
        >
          Join Private
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="font-medium mb-2">No open matches</h3>
          <p className="text-gray-600 mb-4">Be the first to create one!</p>
          <Link to="/create" className="btn-primary">
            Create Match
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Link
              key={match.matchId}
              to={`/matches/${match.matchId}`}
              className="card-hover block p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{match.name}</h3>
                <span className="badge-primary">{match.durationDays}d</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {match.description || 'No description'}
              </p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  {match.playerCount}/{match.maxPlayers} players
                </span>
                <span>Starts {formatDate(match.startDate)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
