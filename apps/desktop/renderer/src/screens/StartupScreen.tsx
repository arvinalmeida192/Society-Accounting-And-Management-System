import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { RecentDatabaseEntry } from '@sams/shared-types';
import { getIpcErrorMessage } from '../hooks/session';

export function StartupScreen(): React.ReactElement {
  const navigate = useNavigate();
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

      const validation = await window.sams.startup.validateDatabase(dbPath);
      if (!validation.success || !validation.data?.valid) {
        setError(
          validation.data?.errorMessage ??
            getIpcErrorMessage(validation.error) ??
            'Selected file is not a valid SAMS database.',
        );
        return;
      }

      const opened = await window.sams.startup.openDatabase(dbPath);
      if (!opened.success) {
        setError(getIpcErrorMessage(opened.error));
        return;
      }

      navigate('/login');
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
        <Link to="/startup/new-year" className="startup-link-button">
          Open New Financial Year
        </Link>
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
