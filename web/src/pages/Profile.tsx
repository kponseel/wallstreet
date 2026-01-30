import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import { useAuthStore } from '@/hooks/useAuthStore';

export function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [resetInput, setResetInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;

    setIsDeleting(true);
    setError(null);
    try {
      const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
      await deleteUserAccount({ confirmation: 'DELETE' });
      await signOut();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleResetDatabase = async () => {
    if (resetInput !== 'RESET') return;

    setIsResetting(true);
    setError(null);
    try {
      const resetDatabase = httpsCallable(functions, 'resetDatabase');
      await resetDatabase({ confirmation: 'RESET_ALL_DATA' });
      await signOut();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset database';
      setError(errorMessage);
      setIsResetting(false);
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <button onClick={handleSignOut} className="btn-secondary w-full">
        Sign Out
      </button>

      <div className="card p-6 border-red-200 bg-red-50">
        <h3 className="font-medium text-red-800 mb-4">Danger Zone</h3>

        <div className="space-y-3">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger w-full"
          >
            Delete My Account
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
          >
            Reset Entire Database (Dev Only)
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Delete Account</h3>
            <p className="text-gray-600 mb-4">
              This will permanently delete your account and all your created matches.
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE"
              className="input w-full mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput('');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE' || isDeleting}
                className="btn-danger flex-1 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Database Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Reset Database</h3>
            <p className="text-gray-600 mb-4">
              This will delete ALL users, matches, and data from the database.
              Only use this for development/testing.
              Type <strong>RESET</strong> to confirm.
            </p>
            <input
              type="text"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="Type RESET"
              className="input w-full mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetInput('');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDatabase}
                disabled={resetInput !== 'RESET' || isResetting}
                className="btn-danger flex-1 disabled:opacity-50"
              >
                {isResetting ? 'Resetting...' : 'Reset Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
