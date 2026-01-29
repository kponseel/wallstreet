import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/hooks/useAuthStore';
import type { Match, Portfolio, Result } from '@/types';

export function MatchDetailPage() {
  const { matchId } = useParams();
  const { user } = useAuthStore();
  const [match, setMatch] = useState<Match | null>(null);
  const [userPortfolio, setUserPortfolio] = useState<Portfolio | null>(null);
  const [leaderboard, setLeaderboard] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatchData() {
      if (!matchId) return;

      try {
        // Fetch match details
        const matchDoc = await getDoc(doc(db, 'matches', matchId));
        if (matchDoc.exists()) {
          const data = matchDoc.data();
          setMatch({
            ...data,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            entryDeadline: data.entryDeadline?.toDate(),
          } as Match);
        }

        // Fetch user's portfolio if logged in
        if (user?.uid) {
          const portfolioDoc = await getDoc(
            doc(db, 'matches', matchId, 'portfolios', user.uid)
          );
          if (portfolioDoc.exists()) {
            setUserPortfolio(portfolioDoc.data() as Portfolio);
          }
        }

        // Fetch leaderboard (results) for finished matches
        const resultsQuery = query(
          collection(db, 'matches', matchId, 'results'),
          orderBy('rank', 'asc')
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        const results = resultsSnapshot.docs.map(doc => doc.data() as Result);
        setLeaderboard(results);
      } catch (error) {
        console.error('Error fetching match data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMatchData();
  }, [matchId, user?.uid]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      OPEN: 'bg-green-100 text-green-700',
      LIVE: 'bg-blue-100 text-blue-700',
      SETTLING: 'bg-yellow-100 text-yellow-700',
      FINISHED: 'bg-purple-100 text-purple-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="card p-8 text-center">
        <h3 className="font-medium mb-2">Match not found</h3>
        <Link to="/matches" className="text-primary-600 hover:underline">
          Back to lobby
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <div className="card p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">{match.name}</h2>
          <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusBadge(match.status)}`}>
            {match.status}
          </span>
        </div>

        {match.description && (
          <p className="text-gray-600 mb-4">{match.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Start:</span>
            <span className="ml-2 font-medium">{formatDate(match.startDate)}</span>
          </div>
          <div>
            <span className="text-gray-500">End:</span>
            <span className="ml-2 font-medium">{formatDate(match.endDate)}</span>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>
            <span className="ml-2 font-medium">{match.durationDays} days</span>
          </div>
          <div>
            <span className="text-gray-500">Players:</span>
            <span className="ml-2 font-medium">{match.playerCount}/{match.maxPlayers}</span>
          </div>
        </div>

        {match.type === 'PRIVATE' && match.inviteCode && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500">Invite Code:</span>
            <span className="ml-2 font-mono font-bold">{match.inviteCode}</span>
          </div>
        )}
      </div>

      {/* User's Portfolio */}
      {userPortfolio && (
        <div className="card p-6">
          <h3 className="font-medium mb-4">Your Portfolio</h3>
          <div className="space-y-2">
            {userPortfolio.positions.map((position) => (
              <div key={position.symbol} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="font-medium">{position.symbol}</span>
                  <span className="text-gray-500 text-sm ml-2">{position.exchange}</span>
                </div>
                <span className="font-mono">{(position.allocationCents / 10000).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          {userPortfolio.currentReturnPercent !== undefined && (
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="font-medium">Current Return</span>
              <span className={`font-mono text-lg ${
                userPortfolio.currentReturnPercent >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {userPortfolio.currentReturnPercent >= 0 ? '+' : ''}
                {userPortfolio.currentReturnPercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="card p-6">
          <h3 className="font-medium mb-4">Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.map((result) => (
              <div
                key={result.userId}
                className={`flex justify-between items-center py-2 px-3 rounded ${
                  result.userId === user?.uid ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    result.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    result.rank === 2 ? 'bg-gray-200 text-gray-700' :
                    result.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    #{result.rank}
                  </span>
                  <span className="font-medium">{result.displayName}</span>
                </div>
                <span className={`font-mono ${
                  result.returnPercent >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {result.returnPercent >= 0 ? '+' : ''}
                  {result.returnPercent.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {match.status === 'OPEN' && !userPortfolio && (
        <Link to={`/matches/${matchId}/portfolio`} className="btn-primary w-full block text-center">
          Join Match & Build Portfolio
        </Link>
      )}

      {match.status === 'OPEN' && userPortfolio && (
        <Link to={`/matches/${matchId}/portfolio`} className="btn-secondary w-full block text-center">
          Edit Portfolio
        </Link>
      )}
    </div>
  );
}
