import { Link } from 'react-router-dom';
import { useAuthStore } from '@/hooks/useAuthStore';

export function HomePage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-2">
          Welcome, {user?.displayName}!
        </h2>
        <p className="text-gray-600">
          Ready to compete in stock picking competitions?
        </p>
      </div>

      {/* Stats Card */}
      <div className="card p-6">
        <h3 className="text-lg font-medium mb-4">Your Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">
              {user?.stats?.matchesPlayed || 0}
            </div>
            <div className="text-sm text-gray-600">Matches Played</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-success-600">
              {user?.stats?.matchesWon || 0}
            </div>
            <div className="text-sm text-gray-600">Wins</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className={`text-2xl font-bold ${
              (user?.stats?.bestReturn || 0) >= 0 ? 'text-success-600' : 'text-danger-600'
            }`}>
              {user?.stats?.bestReturn?.toFixed(2) || '0.00'}%
            </div>
            <div className="text-sm text-gray-600">Best Return</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">
              #{user?.stats?.averageRank?.toFixed(1) || '-'}
            </div>
            <div className="text-sm text-gray-600">Avg Rank</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/matches" className="card-hover p-6 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <div className="font-medium">Browse Matches</div>
          <div className="text-sm text-gray-500">Join competitions</div>
        </Link>
        <Link to="/create" className="card-hover p-6 text-center">
          <div className="text-3xl mb-2">➕</div>
          <div className="font-medium">Create Match</div>
          <div className="text-sm text-gray-500">Start your own</div>
        </Link>
      </div>

      {/* Email Verification Warning */}
      {!user?.emailVerified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Please verify your email to create or join matches.
            <Link to="/verify-email" className="ml-1 underline">
              Verify now
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
