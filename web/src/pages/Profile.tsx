import { useAuthStore } from '@/hooks/useAuthStore';

export function ProfilePage() {
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {user?.displayName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.displayName}</h2>
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>

        {!user?.emailVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-800 text-sm">Email not verified</p>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-medium mb-4">Statistics</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Games Played</span>
            <span className="font-medium">{user?.stats?.gamesPlayed || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Games Won</span>
            <span className="font-medium">{user?.stats?.gamesWon || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Returns</span>
            <span className={`font-medium ${(user?.stats?.totalReturns || 0) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {(user?.stats?.totalReturns || 0).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Best Return</span>
            <span className="font-medium text-success-600">
              {(user?.stats?.bestReturn || 0).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Average Rank</span>
            <span className="font-medium">#{(user?.stats?.averageRank || 0).toFixed(1)}</span>
          </div>
        </div>
      </div>

      <button onClick={handleSignOut} className="btn-danger w-full">
        Sign Out
      </button>
    </div>
  );
}
