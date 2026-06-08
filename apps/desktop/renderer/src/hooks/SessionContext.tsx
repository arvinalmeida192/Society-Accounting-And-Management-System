import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SessionDto } from '@sams/shared-types';
import { refreshSession as fetchSession } from './session';

interface SessionContextValue {
  session: SessionDto | null;
  loading: boolean;
  bootError: string | null;
  /** Set synchronously after openDatabase before React session state catches up. */
  pendingDatabasePath: string | null;
  /** Route to navigate to after the next successful login. */
  postLoginRoute: string | null;
  refreshSession: () => Promise<SessionDto | null>;
  markDatabaseOpen: (path: string) => void;
  setPostLoginRoute: (route: string | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [session, setSession] = useState<SessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [pendingDatabasePath, setPendingDatabasePath] = useState<string | null>(null);
  const [postLoginRoute, setPostLoginRoute] = useState<string | null>(null);

  const markDatabaseOpen = useCallback((path: string) => {
    setPendingDatabasePath(path);
  }, []);

  const refreshSession = useCallback(async (): Promise<SessionDto | null> => {
    try {
      if (typeof window.sams?.auth?.getSession !== 'function') {
        setBootError('Application bridge failed to initialize. Restart the app.');
        setSession(null);
        return null;
      }
      const data = await fetchSession();
      setSession(data);
      if (data?.databasePath) {
        setPendingDatabasePath(null);
      }
      setBootError(null);
      return data;
    } catch (error) {
      setBootError(error instanceof Error ? error.message : 'Failed to load session.');
      setSession(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      session,
      loading,
      bootError,
      pendingDatabasePath,
      postLoginRoute,
      refreshSession,
      markDatabaseOpen,
      setPostLoginRoute,
    }),
    [session, loading, bootError, pendingDatabasePath, postLoginRoute, refreshSession, markDatabaseOpen],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
