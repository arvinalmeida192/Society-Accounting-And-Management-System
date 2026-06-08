import { useCallback, useEffect, useState } from 'react';
import type { YearEndChecklistDto } from '@sams/shared-types';
import { ConfirmDialog } from '../../components';
import { useSession } from '../../hooks/SessionContext';
import { getIpcErrorMessage } from '../../hooks/session';

/** ADM-004 — Year-end close and reopen. */
export function YearEndScreen(): React.ReactElement {
  const { session, refreshSession } = useSession();
  const [checklist, setChecklist] = useState<YearEndChecklistDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [reopenText, setReopenText] = useState('');
  const [running, setRunning] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const response = await window.sams.admin.yearEndChecklist();
    if (response.success && response.data) setChecklist(response.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closeYear = async (): Promise<void> => {
    setRunning(true);
    setError(null);
    const response = await window.sams.admin.yearEndClose();
    setRunning(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage(`Year ${response.data.financialYearLabel} closed. Database is now read-only.`);
    await refreshSession();
    await load();
  };

  const reopen = async (): Promise<void> => {
    setRunning(true);
    setError(null);
    const response = await window.sams.admin.reopenYear(reopenText);
    setRunning(false);
    if (!response.success) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage('Financial year reopened for editing.');
    setReopenText('');
    await refreshSession();
    await load();
  };

  return (
    <section className="form-screen">
      <h2>Year-End Processing</h2>
      <p className="muted">
        Closing sets SystemMeta.isReadOnly and blocks postings (NF-009). Use Startup → Open New FY for
        carry-forward.
      </p>

      {checklist && (
        <div className="info-banner">
          <p>
            <strong>Financial year:</strong> {checklist.financialYearLabel}
          </p>
          <p>
            <strong>Status:</strong>{' '}
            {checklist.isReadOnly ? 'Read-only (closed)' : 'Open for posting'}
          </p>
          <p>
            <strong>Uncleared cheques:</strong> {checklist.unclearedCheques}
          </p>
          <p>
            <strong>Draft bills:</strong> {checklist.draftBills}
          </p>
          <p>
            <strong>Draft vouchers:</strong> {checklist.draftVouchers}
          </p>
        </div>
      )}

      <div className="toolbar-row">
        <button
          type="button"
          disabled={running || checklist?.isReadOnly}
          onClick={() => setConfirmClose(true)}
        >
          Close financial year
        </button>
        <button
          type="button"
          disabled={running || !checklist?.isReadOnly}
          onClick={() => setConfirmReopen(true)}
        >
          Reopen year (Admin)
        </button>
      </div>

      {session.isReadOnly && (
        <p className="error-text">
          Current session is read-only. Posting operations are blocked until the year is reopened or a
          new year database is opened.
        </p>
      )}

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <ConfirmDialog
        open={confirmClose}
        title="Close financial year"
        message="This will mark the database read-only. No further postings will be allowed. Continue?"
        onConfirm={() => {
          setConfirmClose(false);
          void closeYear();
        }}
        onCancel={() => setConfirmClose(false)}
      />

      <ConfirmDialog
        open={confirmReopen}
        title="Reopen financial year"
        message={`Type the society name (${session.societyName}) exactly to confirm reopen.`}
        onConfirm={() => {
          setConfirmReopen(false);
          void reopen();
        }}
        onCancel={() => setConfirmReopen(false)}
      />
      {confirmReopen && (
        <label>
          Confirmation
          <input value={reopenText} onChange={(event) => setReopenText(event.target.value)} />
        </label>
      )}
    </section>
  );
}
