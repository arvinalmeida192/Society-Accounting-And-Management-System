import { useState } from 'react';
import type { MemberCsvRowError } from '@sams/shared-types';
import { getIpcErrorMessage } from '../../hooks/session';

/** Phase 20 — CSV member import (NF-028, IMP-010). */
export function MemberImportScreen(): React.ReactElement {
  const [filePath, setFilePath] = useState('');
  const [templatePath, setTemplatePath] = useState<string | null>(null);
  const [errors, setErrors] = useState<MemberCsvRowError[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [valid, setValid] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.import.memberCsvTemplate();
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setTemplatePath(response.data.path);
    setMessage(`Template saved to ${response.data.path}`);
  };

  const pickFile = async (): Promise<void> => {
    setError(null);
    const pick = await window.sams.import.pickMemberCsv();
    if (!pick.success || !pick.data?.path) {
      if (pick.error?.code !== 'USER_CANCELLED') {
        setError(getIpcErrorMessage(pick.error));
      }
      return;
    }
    setFilePath(pick.data.path);
    setValid(null);
    setErrors([]);
  };

  const validate = async (): Promise<void> => {
    if (!filePath) {
      setError('Select a CSV file first.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await window.sams.import.memberCsvValidate(filePath);
    setBusy(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setValid(response.data.valid);
    setRowCount(response.data.rowCount);
    setErrors(response.data.errors);
    setMessage(
      response.data.valid
        ? `Validation passed for ${response.data.rowCount} row(s). Ready to import.`
        : `Validation failed with ${response.data.errors.length} error(s).`,
    );
  };

  const commit = async (): Promise<void> => {
    if (!filePath) {
      setError('Select a CSV file first.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await window.sams.import.memberCsvCommit(filePath);
    setBusy(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage(`Successfully imported ${response.data.imported} member(s).`);
    setValid(true);
  };

  return (
    <section className="form-screen">
      <h2>Member CSV Import</h2>
      <p className="muted">
        Download the template, fill member rows, validate, then commit. Import is all-or-nothing — any
        row error blocks the commit (SRS §6.4).
      </p>

      <div className="form-actions">
        <button type="button" disabled={busy} onClick={() => void downloadTemplate()}>
          Download Template
        </button>
        <button type="button" disabled={busy} onClick={() => void pickFile()}>
          Select CSV File
        </button>
        <button type="button" disabled={busy || !filePath} onClick={() => void validate()}>
          Validate
        </button>
        <button
          type="button"
          disabled={busy || !filePath || valid !== true}
          onClick={() => void commit()}
        >
          Import Members
        </button>
      </div>

      {templatePath && <p className="muted">Template: {templatePath}</p>}
      {filePath && <p className="muted">Selected file: {filePath}</p>}
      {valid !== null && (
        <p className={valid ? 'success-text' : 'error-text'}>
          {valid ? `Valid — ${rowCount} row(s)` : 'Invalid — fix errors below'}
        </p>
      )}

      {errors.length > 0 && (
        <table className="data-grid">
          <thead>
            <tr>
              <th>Row</th>
              <th>Field</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((row, index) => (
              <tr key={`${row.rowNumber}-${row.field}-${index}`}>
                <td>{row.rowNumber}</td>
                <td>{row.field}</td>
                <td>{row.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
