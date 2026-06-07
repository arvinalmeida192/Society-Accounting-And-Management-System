import { Navigate, Route, Routes } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { SessionDto } from '@sams/shared-types';
import { refreshSession } from './hooks/session';
import { LoginScreen } from './screens/LoginScreen';
import { MainShell } from './screens/MainShell';
import { NewFinancialYearWizard } from './screens/NewFinancialYearWizard';
import { NewSocietyWizard } from './screens/NewSocietyWizard';
import { StartupScreen } from './screens/StartupScreen';

export default function App(): React.ReactElement {
  const [session, setSession] = useState<SessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const loadSession = useCallback(async (): Promise<void> => {
    try {
      if (typeof window.sams?.auth?.getSession !== 'function') {
        setBootError('Application bridge failed to initialize. Restart the app.');
        setSession(null);
        return;
      }
      const data = await refreshSession();
      setSession(data);
      setBootError(null);
    } catch (error) {
      setBootError(error instanceof Error ? error.message : 'Failed to load session.');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (loading) {
    return <div className="loading-screen">Loading SAMS…</div>;
  }

  if (bootError) {
    return (
      <div className="loading-screen">
        <p className="form-error">{bootError}</p>
        <button type="button" onClick={() => void loadSession()}>
          Retry
        </button>
      </div>
    );
  }

  const hasDatabase = Boolean(session?.databasePath);
  const isAuthenticated = Boolean(session?.userId);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/startup" replace />} />
      <Route
        path="/startup"
        element={
          hasDatabase && isAuthenticated ? (
            <Navigate to="/app/home" replace />
          ) : hasDatabase ? (
            <Navigate to="/login" replace />
          ) : (
            <StartupScreen />
          )
        }
      />
      <Route
        path="/startup/new-society"
        element={hasDatabase ? <Navigate to="/login" replace /> : <NewSocietyWizard />}
      />
      <Route
        path="/startup/new-year"
        element={hasDatabase ? <Navigate to="/login" replace /> : <NewFinancialYearWizard />}
      />
      <Route
        path="/login"
        element={
          !hasDatabase ? (
            <Navigate to="/startup" replace />
          ) : isAuthenticated ? (
            <Navigate to="/app/home" replace />
          ) : (
            <LoginScreen onLoggedIn={() => void loadSession()} />
          )
        }
      />
      <Route
        path="/app/*"
        element={
          !hasDatabase ? (
            <Navigate to="/startup" replace />
          ) : !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (
            <MainShell session={session!} onSessionChange={() => void loadSession()} />
          )
        }
      />
      <Route path="*" element={<Navigate to="/startup" replace />} />
    </Routes>
  );
}
