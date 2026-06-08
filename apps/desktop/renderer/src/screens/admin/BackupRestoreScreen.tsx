import { useCallback, useEffect, useState } from 'react';
import type { ScheduledBackupConfigDto } from '@sams/shared-types';
import { ConfirmDialog } from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';
import { useSession } from '../../hooks/SessionContext';

/** ADM-003 — Backup & restore. */
export function BackupRestoreScreen(): React.ReactElement {
  const { refreshSession } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupPath, setBackupPath] = useState('');
  const [restorePath, setRestorePath] = useState('');
  const [schedule, setSchedule] = useState<ScheduledBackupConfigDto>({
    enabled: false,
    intervalHours: 24,
    targetDir: '',
    lastRunAt: null,
  });
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [running, setRunning] = useState(false);

  const loadSchedule = useCallback(async (): Promise<void> => {
    const response = await window.sams.admin.getScheduledBackup();
    if (response.success && response.data) setSchedule(response.data.config);
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const runBackup = async (): Promise<void> => {
    setRunning(true);
    setError(null);
    setMessage(null);
    const pick = await window.sams.startup.pickSaveDatabase('sams-backup.sqlite');
    if (!pick.success || !pick.data?.path) {
      setRunning(false);
      return;
    }
    const response = await window.sams.admin.backup(pick.data.path);
    setRunning(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setBackupPath(response.data.path);
    setMessage(
      `Backup saved. Integrity: ${response.data.integrityOk ? 'OK' : 'FAILED'}. SHA256: ${response.data.checksum.slice(0, 16)}…`,
    );
  };

  const runRestore = async (): Promise<void> => {
    setRunning(true);
    setError(null);
    const response = await window.sams.admin.restore({ backupPath: restorePath });
    setRunning(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    if (response.data.reconnected) {
      await refreshSession();
      setMessage(`Restore completed and database reconnected at ${response.data.path}.`);
    } else {
      setMessage(`Restore completed to ${response.data.path}. Re-open the database from Startup.`);
    }
  };

  const saveSchedule = async (): Promise<void> => {
    const response = await window.sams.admin.scheduleBackup(schedule);
    if (!response.success) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage('Scheduled backup settings saved.');
  };

  return (
    <section className="form-screen">
      <h2>Backup &amp; Restore</h2>
      <p className="muted">WAL checkpoint runs before backup copy (NF-006). integrity_check verified (NF-007).</p>

      <div className="toolbar-row">
        <button type="button" disabled={running} onClick={() => void runBackup()}>
          Create backup
        </button>
        <button
          type="button"
          disabled={running}
          onClick={() => {
            void (async () => {
              const pick = await window.sams.startup.pickOpenDatabase();
              if (pick.success && pick.data?.path) setRestorePath(pick.data.path);
            })();
          }}
        >
          Select backup file
        </button>
        <button
          type="button"
          disabled={running || !restorePath}
          onClick={() => setConfirmRestore(true)}
        >
          Restore backup
        </button>
      </div>

      {backupPath && <p className="info-banner">Last backup: {backupPath}</p>}
      {restorePath && <p className="info-banner">Restore source: {restorePath}</p>}

      <h3>Scheduled backup (IMP-013)</h3>
      <div className="form-grid">
        <label>
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(event) => setSchedule({ ...schedule, enabled: event.target.checked })}
          />{' '}
          Enable scheduled backup
        </label>
        <label>
          Interval (hours)
          <input
            type="number"
            min={1}
            value={schedule.intervalHours}
            onChange={(event) =>
              setSchedule({ ...schedule, intervalHours: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Target directory
          <input
            value={schedule.targetDir}
            onChange={(event) => setSchedule({ ...schedule, targetDir: event.target.value })}
            placeholder="Leave empty for default userData/backups"
          />
        </label>
      </div>
      <button type="button" onClick={() => void saveSchedule()}>
        Save schedule
      </button>
      {schedule.lastRunAt && <p className="muted">Last run: {schedule.lastRunAt}</p>}

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <ConfirmDialog
        open={confirmRestore}
        title="Confirm restore"
        message="Restore will copy the backup to a new file. You must re-open the database from Startup. Continue?"
        onConfirm={() => {
          setConfirmRestore(false);
          void runRestore();
        }}
        onCancel={() => setConfirmRestore(false)}
      />
    </section>
  );
}
