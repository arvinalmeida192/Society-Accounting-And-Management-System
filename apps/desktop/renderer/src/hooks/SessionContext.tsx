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
  refreshSession: () => Promise<SessionDto | null>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [session, setSession] = useState<SessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const refreshSession = useCallback(async (): Promise<SessionDto | null> => {
    try {
      if (typeof window.sams?.auth?.getSession !== 'function') {
        setBootError('Application bridge failed to initialize. Restart the app.');
        setSession(null);
        return null;
      }
      const data = await fetchSession();
      setSession(data);
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
    () => ({ session, loading, bootError, refreshSession }),
    [session, loading, bootError, refreshSession],
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
