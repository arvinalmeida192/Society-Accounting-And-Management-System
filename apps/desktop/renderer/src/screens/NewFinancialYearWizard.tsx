import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIpcErrorMessage } from '../hooks/session';
import { useSession } from '../hooks/SessionContext';

export function NewFinancialYearWizard(): React.ReactElement {
  const navigate = useNavigate();
  const { session, refreshSession, markDatabaseOpen } = useSession();
  const [sourceDbPath, setSourceDbPath] = useState('');
  const [targetDbPath, setTargetDbPath] = useState('');
  const [newFyStartDate, setNewFyStartDate] = useState('');
  const [newFyEndDate, setNewFyEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session?.databasePath) {
      setSourceDbPath(session.databasePath);
    }
  }, [session?.databasePath]);

  const pickSource = async (): Promise<void> => {
    const response = await window.sams.startup.pickOpenDatabase();
    if (response.success && response.data?.path) {
      setSourceDbPath(response.data.path);
    }
  };

  const pickTarget = async (): Promise<void> => {
    const response = await window.sams.startup.pickSaveDatabase('society-new-year.sqlite');
    if (response.success && response.data?.path) {
      setTargetDbPath(response.data.path);
    }
  };

  const validateAndPreview = async (): Promise<void> => {
    setError(null);
    setInfo(null);
    if (!sourceDbPath || !targetDbPath) {
      setError('Select both source and target database files.');
      return;
    }

    setBusy(true);
    try {
      const validation = await window.sams.startup.validateDatabase(sourceDbPath);
      if (!validation.success || !validation.data?.valid) {
        setError(validation.data?.errorMessage ?? 'Source database is invalid.');
        return;
      }
      setInfo(
        `Source validated: ${validation.data.societyName} (${validation.data.fyLabel}). Carry-forward will copy masters, roll account opening balances, and carry member arrears.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const attemptOpenNewYear = async (): Promise<void> => {
    setError(null);
    if (!newFyStartDate || !newFyEndDate) {
      setError('Enter new financial year start and end dates.');
      return;
    }
    setBusy(true);
    try {
      const response = await window.sams.startup.openNewFinancialYear({
        sourceDbPath,
        targetDbPath,
        newFyStartDate,
        newFyEndDate,
      });
      if (!response.success) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      if (response.data?.warning) {
        setInfo(response.data.warning);
      }
      if (response.data?.dbPath) {
        markDatabaseOpen(response.data.dbPath);
      }
      const updated = await refreshSession();
      if (updated?.databasePath) {
        navigate('/app/home');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wizard-screen">
      <header>
        <h1>Open New Financial Year</h1>
        <p>
          {session?.societyName
            ? `Carry forward from ${session.societyName} (FY ${session.fyLabel}) into a new database file.`
            : 'Select the current year database and a target file for the new year.'}
        </p>
      </header>

      <section className="wizard-panel">
        <label>
          Source Database (current year)
          <input value={sourceDbPath} readOnly />
        </label>
        <button type="button" onClick={() => void pickSource()}>
          Browse Source…
        </button>

        <label>
          Target Database (new year)
          <input value={targetDbPath} readOnly />
        </label>
        <button type="button" onClick={() => void pickTarget()}>
          Browse Target…
        </button>

        <label>
          New FY start date
          <input
            type="date"
            value={newFyStartDate}
            onChange={(event) => setNewFyStartDate(event.target.value)}
          />
        </label>
        <label>
          New FY end date
          <input
            type="date"
            value={newFyEndDate}
            onChange={(event) => setNewFyEndDate(event.target.value)}
          />
        </label>
      </section>

      {info && <p className="form-info">{info}</p>}
      {error && <p className="form-error">{error}</p>}

      <footer className="wizard-footer">
        <button type="button" onClick={() => navigate('/startup')}>
          Back to Startup
        </button>
        <button type="button" disabled={busy} onClick={() => void validateAndPreview()}>
          Validate Source
        </button>
        <button type="button" disabled={busy} onClick={() => void attemptOpenNewYear()}>
          Create New Year &amp; Carry Forward
        </button>
      </footer>
    </div>
  );
}
