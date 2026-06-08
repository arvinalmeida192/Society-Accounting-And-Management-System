import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReportCatalogEntryDto } from '@sams/shared-types';
import { useTabStore } from '../../store/tabStore';
import { getIpcErrorMessage } from '../../hooks/session';

/** Phase 18 — Reports hub listing billing and member reports. */
export function ReportsHubScreen(): React.ReactElement {
  const navigate = useNavigate();
  const openTab = useTabStore((state) => state.openTab);
  const [catalog, setCatalog] = useState<ReportCatalogEntryDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await window.sams.report.list();
      if (!response.success || !response.data) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      setCatalog(response.data);
    })();
  }, []);

  const openReport = (entry: ReportCatalogEntryDto): void => {
    const route = `/app/reports/${entry.reportId}`;
    openTab({ id: entry.reportId.toLowerCase(), title: entry.title, route });
    navigate(route);
  };

  const billing = catalog.filter((entry) => entry.category === 'billing');
  const member = catalog.filter((entry) => entry.category === 'member');

  return (
    <section className="form-screen">
      <h2>Reports</h2>
      <p className="muted">Billing and member reports (Phase 18).</p>
      {error && <p className="error-text">{error}</p>}

      <h3>Billing Reports</h3>
      <ul className="report-catalog">
        {billing.map((entry) => (
          <li key={entry.reportId}>
            <button type="button" onClick={() => openReport(entry)}>
              {entry.reportId} — {entry.title}
            </button>
          </li>
        ))}
      </ul>

      <h3>Member Reports</h3>
      <ul className="report-catalog">
        {member.map((entry) => (
          <li key={entry.reportId}>
            <button type="button" onClick={() => openReport(entry)}>
              {entry.reportId} — {entry.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
