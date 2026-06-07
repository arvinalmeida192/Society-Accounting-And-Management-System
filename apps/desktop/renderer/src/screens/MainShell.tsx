import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { SessionDto } from '@sams/shared-types';
import { ExplorerTree } from '../components/ExplorerTree';
import { useTabStore } from '../store/tabStore';

interface MainShellProps {
  session: SessionDto;
  onSessionChange?: () => void;
}

function HomePane({ session }: { session: SessionDto }): React.ReactElement {
  return (
    <section className="home-pane">
      <h2>Welcome to SAMS</h2>
      <p>
        Signed in as <strong>{session.displayName ?? session.username}</strong> (
        {session.role}) for <strong>{session.societyName}</strong>, financial year{' '}
        <strong>{session.fyLabel}</strong>.
      </p>
      <p className="muted">
        Society setup is available under Explorer → Society Setup. Accounting, billing, and reports
        arrive in later phases.
      </p>
    </section>
  );
}

import { SocietyIdentityScreen } from './society/SocietyIdentityScreen';
import { SocietyParametersScreen } from './society/SocietyParametersScreen';
import { PropertyInformationScreen } from './society/PropertyInformationScreen';
import { ReportFormatsScreen } from './society/ReportFormatsScreen';

function PlaceholderPane({ title }: { title: string }): React.ReactElement {
  return (
    <section className="placeholder-pane">
      <h2>{title}</h2>
      <p>This screen is scheduled for a later implementation phase.</p>
    </section>
  );
}

export function MainShell({ session, onSessionChange }: MainShellProps): React.ReactElement {
  const navigate = useNavigate();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const explorerVisible = useTabStore((state) => state.explorerVisible);
  const closeTab = useTabStore((state) => state.closeTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const toggleExplorer = useTabStore((state) => state.toggleExplorer);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  const selectTab = (tab: (typeof tabs)[number]): void => {
    setActiveTab(tab.id);
    navigate(tab.route);
  };

  const logout = async (): Promise<void> => {
    await window.sams.auth.logout();
    onSessionChange?.();
    navigate('/login');
  };

  return (
    <div className="main-shell">
      <header className="main-header">
        <div>
          <h1>{session.societyName}</h1>
          <p>
            FY {session.fyLabel} · {session.displayName ?? session.username} ({session.role})
          </p>
        </div>
        <div className="main-header-actions">
          <button type="button" onClick={toggleExplorer}>
            {explorerVisible ? 'Hide Explorer' : 'Show Explorer'}
          </button>
          <button type="button" onClick={() => void logout()}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="tab-bar">
        {tabs.map((tab) => (
          <div key={tab.id} className={tab.id === activeTab?.id ? 'tab active' : 'tab'}>
            <button type="button" onClick={() => selectTab(tab)}>
              {tab.title}
            </button>
            {tab.id !== 'home' && (
              <button
                type="button"
                className="tab-close"
                aria-label={`Close ${tab.title}`}
                onClick={() => closeTab(tab.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="main-body">
        {explorerVisible && (
          <aside className="sidebar">
            <ExplorerTree />
          </aside>
        )}

        <main className="main-content">
          <Routes>
            <Route path="home" element={<HomePane session={session} />} />
            <Route path="setup/identity" element={<SocietyIdentityScreen />} />
            <Route path="setup/parameters" element={<SocietyParametersScreen />} />
            <Route path="setup/property" element={<PropertyInformationScreen />} />
            <Route path="setup/report-formats" element={<ReportFormatsScreen />} />
            <Route path="property/buildings" element={<PlaceholderPane title="Buildings" />} />
            <Route path="reports" element={<PlaceholderPane title="Reports" />} />
            <Route path="*" element={<Navigate to="home" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
