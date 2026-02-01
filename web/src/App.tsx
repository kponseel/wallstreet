import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/hooks/useAuthStore';

// Pages
import { HomePage } from '@/pages/Home';
import { LoginPage } from '@/pages/Login';
import { SignupPage } from '@/pages/Signup';
import { VerifyEmailPage } from '@/pages/VerifyEmail';
import { MatchLobbyPage } from '@/pages/MatchLobby';
import { MatchDetailPage } from '@/pages/MatchDetail';
import { CreateMatchPage } from '@/pages/CreateMatch';
import { PortfolioBuilderPage } from '@/pages/PortfolioBuilder';
import { ProfilePage } from '@/pages/Profile';
import { ChangelogPage } from '@/pages/Changelog';
import { AdminPage } from '@/pages/Admin';

// Components
import { Layout } from '@/components/Layout';
import { LoadingScreen } from '@/components/LoadingScreen';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Auth Route wrapper (redirect if already logged in)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { initialize, loading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthRoute>
            <SignupPage />
          </AuthRoute>
        }
      />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/changelog" element={<ChangelogPage />} />

      {/* Protected routes with layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />

        {/* Game routes (v2.0) */}
        <Route path="/games" element={<MatchLobbyPage />} />
        <Route path="/games/:gameCode" element={<MatchDetailPage />} />
        <Route path="/games/:gameCode/portfolio" element={<PortfolioBuilderPage />} />
        <Route path="/create" element={<CreateMatchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />

        {/* Legacy routes - redirect to new paths */}
        <Route path="/matches" element={<Navigate to="/games" replace />} />
        <Route path="/matches/:matchId" element={<Navigate to="/games" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
