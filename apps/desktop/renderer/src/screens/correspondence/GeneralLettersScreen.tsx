import { useCallback, useEffect, useState } from 'react';
import type { GeneratedLetterDto } from '@sams/shared-types';
import { PrintPreviewModal } from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

/** COR-002 — General Letters & Notices. */
export function GeneralLettersScreen(): React.ReactElement {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [letters, setLetters] = useState<GeneratedLetterDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const response = await window.sams.correspondence.listGeneratedLetters();
    if (response.success && response.data) {
      setLetters(response.data.filter((row) => row.letterType === 'CUSTOM'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (): Promise<void> => {
    setError(null);
    setMessage(null);
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!bodyHtml.trim()) {
      setError('Letter body is required.');
      return;
    }
    const response = await window.sams.correspondence.saveGeneralLetter({
      subject: subject.trim(),
      bodyHtml,
      issueDate,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage(`Letter saved with reference ${response.data.referenceNo}.`);
    setSubject('');
    setBodyHtml('');
    await load();
  };

  const openPreview = (letter: GeneratedLetterDto): void => {
    setPreviewHtml(letter.renderedHtml);
    setPreviewOpen(true);
  };

  const printPreview = (): void => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(previewHtml ?? '');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <section className="form-screen">
      <h2>General Letters &amp; Notices</h2>
      <p className="muted">Compose society notices with rich text stored as HTML.</p>

      <div className="form-grid">
        <label>
          Subject
          <input value={subject} onChange={(event) => setSubject(event.target.value)} />
        </label>
        <label>
          Issue date
          <input
            type="date"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
          />
        </label>
      </div>

      <label>
        Letter body (HTML supported)
        <textarea
          rows={12}
          value={bodyHtml}
          onChange={(event) => setBodyHtml(event.target.value)}
          placeholder="Enter notice text. Line breaks are preserved."
        />
      </label>

      <button type="button" onClick={() => void save()}>
        Save letter
      </button>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <h3>Saved letters</h3>
      <table className="data-grid">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Subject</th>
            <th>Date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {letters.map((row) => (
            <tr key={row.id}>
              <td>{row.referenceNo}</td>
              <td>{row.subject}</td>
              <td>{row.issueDate}</td>
              <td>
                <button type="button" onClick={() => openPreview(row)}>
                  Preview / Print
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <PrintPreviewModal
        open={previewOpen}
        title="General Letter Preview"
        html={previewHtml ?? ''}
        onClose={() => setPreviewOpen(false)}
        onPrint={printPreview}
      />
    </section>
  );
}
