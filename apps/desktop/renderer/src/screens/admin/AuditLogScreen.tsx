import { useCallback, useEffect, useState } from 'react';
import { AuditAction, type AuditLogDto } from '@sams/shared-types';
import { getIpcErrorMessage } from '../../hooks/session';

/** ADM-005 — Audit log viewer with CSV export. */
export function AuditLogScreen(): React.ReactElement {
  const [rows, setRows] = useState<AuditLogDto[]>([]);
  const [entityName, setEntityName] = useState('');
  const [action, setAction] = useState<AuditAction | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const response = await window.sams.admin.listAuditLog({
      entityName: entityName || undefined,
      action: action || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 500,
    });
    if (response.success && response.data) setRows(response.data);
    else setError(getIpcErrorMessage(response.error));
  }, [entityName, action, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.admin.exportAuditLog({
      entityName: entityName || undefined,
      action: action || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    if (response.data.exported) {
      setMessage(`Exported to ${response.data.path}`);
    }
  };

  return (
    <section className="form-screen">
      <h2>Audit Log</h2>
      <p className="muted">Mutation audit trail (NF-014). Export to CSV for external review.</p>

      <div className="form-grid">
        <label>
          Entity name
          <input value={entityName} onChange={(event) => setEntityName(event.target.value)} />
        </label>
        <label>
          Action
          <select value={action} onChange={(event) => setAction(event.target.value as AuditAction | '')}>
            <option value="">All</option>
            {Object.values(AuditAction).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          From date
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label>
          To date
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
      </div>

      <div className="toolbar-row">
        <button type="button" onClick={() => void load()}>
          Refresh
        </button>
        <button type="button" onClick={() => void exportCsv()}>
          Export CSV
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <table className="data-grid">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Entity ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.timestamp}</td>
              <td>{row.displayName}</td>
              <td>{row.action}</td>
              <td>{row.entityName}</td>
              <td>{row.entityId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
