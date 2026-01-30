import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAuthStore } from '@/hooks/useAuthStore';
import { functions } from '@/services/firebase';

export function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleSignOut = async () => {
    await signOut();
  };

  const handleResetDatabase = async () => {
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      const resetDatabase = httpsCallable(functions, 'resetDatabase');
      const result = await resetDatabase({ password: resetPassword });
      const data = result.data as { success: boolean; message: string; deletedCounts: Record<string, number> };

      if (data.success) {
        setResetSuccess(`Database reset! Deleted: ${Object.entries(data.deletedCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
        setResetPassword('');
        setTimeout(() => {
          setShowResetModal(false);
          setResetSuccess('');
        }, 3000);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setResetError(err.message || 'Failed to reset database');
    } finally {
      setResetLoading(false);
    }
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
            <span className="text-gray-600">Matches Played</span>
            <span className="font-medium">{user?.stats?.matchesPlayed || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Matches Won</span>
            <span className="font-medium">{user?.stats?.matchesWon || 0}</span>
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

      {/* Development Tools */}
      <div className="card p-6 border-2 border-dashed border-yellow-300 bg-yellow-50">
        <h3 className="font-medium mb-4 text-yellow-800">Development Tools</h3>
        <button
          onClick={() => setShowResetModal(true)}
          className="btn-danger w-full"
        >
          Reset Database
        </button>
        <p className="text-xs text-yellow-700 mt-2">
          This will delete all matches, portfolios, and reset user stats.
        </p>
      </div>

      {/* Reset Database Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Reset Database</h3>
            <p className="text-gray-600 text-sm mb-4">
              This action will delete all matches, portfolios, results, and reset all user statistics.
              Enter the admin password to confirm.
            </p>

            {resetError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{resetError}</p>
              </div>
            )}

            {resetSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-green-800 text-sm">{resetSuccess}</p>
              </div>
            )}

            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Enter admin password"
              className="input w-full mb-4"
              disabled={resetLoading}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetPassword('');
                  setResetError('');
                }}
                className="btn-secondary flex-1"
                disabled={resetLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleResetDatabase}
                className="btn-danger flex-1"
                disabled={resetLoading || !resetPassword}
              >
                {resetLoading ? 'Resetting...' : 'Reset Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
