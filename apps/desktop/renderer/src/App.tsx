import { useEffect, useState } from 'react';
import {
  ConfirmDialog,
  FilterDrawer,
  MasterFormToolbar,
  PrintPreviewModal,
} from './components';

export default function App(): React.ReactElement {
  const [sessionLabel, setSessionLabel] = useState('Loading session…');
  const [filterOpen, setFilterOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    void window.sams.auth.getSession().then((res) => {
      if (res.success && res.data) {
        setSessionLabel(
          res.data.userId
            ? `Signed in as ${res.data.username} (${res.data.role})`
            : 'No active session — Phase 2 login pending',
        );
      } else {
        setSessionLabel(res.error?.message ?? 'Session unavailable');
      }
    });
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Society Accounting &amp; Management System</h1>
        <p className="subtitle">Phase 1 — Platform Foundation</p>
        <p className="session">{sessionLabel}</p>
      </header>

      <main className="app-main">
        <MasterFormToolbar
          onAdd={() => undefined}
          onEdit={() => undefined}
          onSave={() => undefined}
          onCancel={() => undefined}
          onDelete={() => setConfirmOpen(true)}
          onFind={() => setFilterOpen(true)}
          onBrowse={() => undefined}
          onPrint={() => setPrintOpen(true)}
          onExit={() => undefined}
        />

        <section className="placeholder">
          <p>Renderer shell ready. Feature modules arrive in Phase 2+.</p>
        </section>
      </main>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={() => setFilterOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm action"
        message="Shared ConfirmDialog stub (NF-021)."
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />

      <PrintPreviewModal
        open={printOpen}
        title="Print Preview"
        html="<p>Print preview stub (NF-020)</p>"
        onClose={() => setPrintOpen(false)}
        onPrint={() => setPrintOpen(false)}
      />
    </div>
  );
}
