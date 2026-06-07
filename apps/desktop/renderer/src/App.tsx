import { Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './hooks/SessionContext';
import { LoginScreen } from './screens/LoginScreen';
import { MainShell } from './screens/MainShell';
import { NewFinancialYearWizard } from './screens/NewFinancialYearWizard';
import { NewSocietyWizard } from './screens/NewSocietyWizard';
import { StartupScreen } from './screens/StartupScreen';

function AppRoutes(): React.ReactElement {
  const { session, loading, bootError, refreshSession } = useSession();

  if (loading) {
    return <div className="loading-screen">Loading SAMS…</div>;
  }

  if (bootError) {
    return (
      <div className="loading-screen">
        <p className="form-error">{bootError}</p>
        <button type="button" onClick={() => void refreshSession()}>
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
            <LoginScreen />
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
            <MainShell session={session!} />
          )
        }
      />
      <Route path="*" element={<Navigate to="/startup" replace />} />
    </Routes>
  );
}

export default function App(): React.ReactElement {
  return (
    <SessionProvider>
      <AppRoutes />
    </SessionProvider>
  );
}
