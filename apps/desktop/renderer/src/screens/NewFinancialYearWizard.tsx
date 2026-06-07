import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIpcErrorMessage } from '../hooks/session';

export function NewFinancialYearWizard(): React.ReactElement {
  const navigate = useNavigate();
  const [sourceDbPath, setSourceDbPath] = useState('');
  const [targetDbPath, setTargetDbPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        `Source validated: ${validation.data.societyName} (${validation.data.fyLabel}). Carry-forward will be implemented in Phase 17.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const attemptOpenNewYear = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      const response = await window.sams.startup.openNewFinancialYear({
        sourceDbPath,
        targetDbPath,
      });
      if (!response.success) {
        setError(getIpcErrorMessage(response.error));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wizard-screen">
      <header>
        <h1>Open New Financial Year</h1>
        <p>Select the current year database and a target file for the new year.</p>
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
          Create New Year (Phase 17)
        </button>
      </footer>
    </div>
  );
}
