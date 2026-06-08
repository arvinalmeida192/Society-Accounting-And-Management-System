import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { RecentDatabaseEntry } from '@sams/shared-types';
import { getIpcErrorMessage } from '../hooks/session';
import { useSession } from '../hooks/SessionContext';

export function StartupScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { refreshSession, markDatabaseOpen, setPostLoginRoute } = useSession();
  const [recent, setRecent] = useState<RecentDatabaseEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.sams.startup.getRecentDatabases().then((res) => {
      if (res.success && res.data) {
        setRecent(res.data.paths);
      }
    });
  }, []);

  const openDatabasePath = async (
    dbPath: string,
    options?: { postLoginRoute?: string },
  ): Promise<boolean> => {
    const validation = await window.sams.startup.validateDatabase(dbPath);
    if (!validation.success || !validation.data?.valid) {
      setError(
        validation.data?.errorMessage ??
          getIpcErrorMessage(validation.error) ??
          'Selected file is not a valid SAMS database.',
      );
      return false;
    }

    const opened = await window.sams.startup.openDatabase(dbPath);
    if (!opened.success) {
      setError(getIpcErrorMessage(opened.error));
      return false;
    }

    markDatabaseOpen(dbPath);
    const updated = await refreshSession();
    if (!updated?.databasePath) {
      setError('Database opened but session failed to update. Try again.');
      return false;
    }

    if (options?.postLoginRoute) {
      setPostLoginRoute(options.postLoginRoute);
    }
    navigate('/login');
    return true;
  };

  const openExisting = async (path?: string): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      let dbPath = path;
      if (!dbPath) {
        const pick = await window.sams.startup.pickOpenDatabase();
        if (!pick.success || !pick.data?.path) {
          return;
        }
        dbPath = pick.data.path;
      }
      await openDatabasePath(dbPath);
    } finally {
      setBusy(false);
    }
  };

  const openNewFinancialYear = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      const pick = await window.sams.startup.pickOpenDatabase();
      if (!pick.success || !pick.data?.path) {
        return;
      }
      await openDatabasePath(pick.data.path, { postLoginRoute: '/startup/new-year' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="startup-screen">
      <header className="startup-header">
        <h1>Society Accounting &amp; Management System</h1>
        <p>Select how you want to begin this session.</p>
      </header>

      <div className="startup-actions">
        <button type="button" disabled={busy} onClick={() => void openExisting()}>
          Open Existing Society / Year
        </button>
        <Link to="/startup/new-society" className="startup-link-button">
          Create New Society
        </Link>
        <button
          type="button"
          className="startup-link-button"
          disabled={busy}
          onClick={() => void openNewFinancialYear()}
        >
          Open New Financial Year
        </button>
      </div>

      {recent.length > 0 && (
        <section className="recent-databases">
          <h2>Recently Opened</h2>
          <ul>
            {recent.map((entry) => (
              <li key={entry.path}>
                <button type="button" disabled={busy} onClick={() => void openExisting(entry.path)}>
                  <strong>{entry.label}</strong>
                  <span>{entry.path}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
