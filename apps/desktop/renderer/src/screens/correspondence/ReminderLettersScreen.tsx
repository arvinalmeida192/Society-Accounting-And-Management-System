import { useCallback, useEffect, useState } from 'react';
import {
  LetterType,
  type BuildingDto,
  type DefaulterMemberDto,
  type GeneratedLetterDto,
  type LetterTemplateDto,
} from '@sams/shared-types';
import { ConfirmDialog, PrintPreviewModal } from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

/** COR-001 — Reminder Letter Generator (CL-001 to CL-004). */
export function ReminderLettersScreen(): React.ReactElement {
  const [templates, setTemplates] = useState<LetterTemplateDto[]>([]);
  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [defaulters, setDefaulters] = useState<DefaulterMemberDto[]>([]);
  const [generated, setGenerated] = useState<GeneratedLetterDto[]>([]);
  const [letterType, setLetterType] = useState<LetterType>(LetterType.GENERAL_REMINDER);
  const [templateId, setTemplateId] = useState('');
  const [balanceAsOnDate, setBalanceAsOnDate] = useState(new Date().toISOString().slice(0, 10));
  const [minOutstanding, setMinOutstanding] = useState(1);
  const [buildingId, setBuildingId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateBody, setTemplateBody] = useState('');

  const load = useCallback(async (): Promise<void> => {
    const [templateRes, buildingRes, historyRes] = await Promise.all([
      window.sams.correspondence.listTemplates(),
      window.sams.property.listBuildings(),
      window.sams.correspondence.listGeneratedLetters(),
    ]);
    if (templateRes.success && templateRes.data) {
      setTemplates(templateRes.data);
      const match = templateRes.data.find((row) => row.letterType === letterType);
      if (match) setTemplateId(match.id);
    }
    if (buildingRes.success && buildingRes.data) setBuildings(buildingRes.data.items);
    if (historyRes.success && historyRes.data) setGenerated(historyRes.data);
  }, [letterType]);

  const loadDefaulters = useCallback(async (): Promise<void> => {
    const response = await window.sams.correspondence.listDefaulters({
      minOutstanding,
      buildingId: buildingId || undefined,
    });
    if (response.success && response.data) {
      setDefaulters(response.data);
      setSelectedMemberIds(response.data.map((row) => row.memberId));
    }
  }, [minOutstanding, buildingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadDefaulters();
  }, [loadDefaulters]);

  useEffect(() => {
    const match = templates.find((row) => row.letterType === letterType);
    if (match) setTemplateId(match.id);
  }, [letterType, templates]);

  useEffect(() => {
    const selected = templates.find((row) => row.id === templateId);
    if (selected) setTemplateBody(selected.bodyTemplate);
  }, [templateId, templates]);

  const toggleMember = (memberId: string): void => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const generate = async (): Promise<void> => {
    setRunning(true);
    setError(null);
    setMessage(null);
    const response = await window.sams.correspondence.generateReminder({
      letterType,
      letterTemplateId: templateId || undefined,
      balanceAsOnDate,
      memberIds: selectedMemberIds,
      minOutstanding,
      buildingId: buildingId || undefined,
    });
    setRunning(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setGenerated(response.data.letters);
    setMessage(`Generated ${response.data.generated} letter(s).`);
  };

  const openPreview = (letter: GeneratedLetterDto): void => {
    setPreviewHtml(letter.renderedHtml);
    setPreviewOpen(true);
  };

  const printPreview = (): void => {
    const frame = document.querySelector('.preview-frame');
    if (!frame) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(previewHtml ?? '');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <section className="form-screen master-browse-screen">
      <h2>Reminder Letters</h2>
      <p className="muted">
        Generate general reminders or MCACT-101 notices. Placeholders: {'{amount}'}, [date].
      </p>

      <div className="form-grid">
        <label>
          Letter type
          <select
            value={letterType}
            onChange={(event) => setLetterType(event.target.value as LetterType)}
          >
            <option value={LetterType.GENERAL_REMINDER}>General Reminder</option>
            <option value={LetterType.MCACT_101}>MCACT-101</option>
            <option value={LetterType.CUSTOM}>Custom Template</option>
          </select>
        </label>
        <label>
          Template
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {templates
              .filter((row) => row.letterType === letterType)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Balance as on
          <input
            type="date"
            value={balanceAsOnDate}
            onChange={(event) => setBalanceAsOnDate(event.target.value)}
          />
        </label>
        <label>
          Minimum outstanding
          <input
            type="number"
            min={0}
            step="0.01"
            value={minOutstanding}
            onChange={(event) => setMinOutstanding(Number(event.target.value))}
          />
        </label>
        <label>
          Building filter
          <select value={buildingId} onChange={(event) => setBuildingId(event.target.value)}>
            <option value="">All buildings</option>
            {buildings.map((row) => (
              <option key={row.id} value={row.id}>
                {row.shortName} — {row.fullName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h3>Letter template (CL-001)</h3>
      <div className="toolbar-row">
        <button type="button" onClick={() => setEditingTemplate((value) => !value)}>
          {editingTemplate ? 'Cancel edit' : 'Edit template'}
        </button>
        {editingTemplate && (
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const selected = templates.find((row) => row.id === templateId);
                if (!selected) return;
                const response = await window.sams.correspondence.saveTemplate({
                  ...selected,
                  bodyTemplate: templateBody,
                });
                if (response.success) {
                  setMessage('Template saved.');
                  setEditingTemplate(false);
                  await load();
                } else {
                  setError(getIpcErrorMessage(response.error));
                }
              })();
            }}
          >
            Save template
          </button>
        )}
      </div>
      <textarea
        rows={8}
        readOnly={!editingTemplate}
        value={templateBody}
        onChange={(event) => setTemplateBody(event.target.value)}
      />

      <div className="toolbar-row">
        <button type="button" onClick={() => void loadDefaulters()}>
          Refresh defaulters
        </button>
        <button
          type="button"
          disabled={running || selectedMemberIds.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          {running ? 'Generating…' : `Generate for ${selectedMemberIds.length} member(s)`}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <h3>Defaulters</h3>
      <table className="data-grid">
        <thead>
          <tr>
            <th />
            <th>Member</th>
            <th>Unit</th>
            <th>Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {defaulters.map((row) => (
            <tr key={row.memberId}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(row.memberId)}
                  onChange={() => toggleMember(row.memberId)}
                />
              </td>
              <td>{row.memberName}</td>
              <td>
                {row.buildingName}/{row.wingName}/{row.unitNo}
              </td>
              <td>{row.outstanding.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Generated letters</h3>
      <table className="data-grid">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Member</th>
            <th>Amount</th>
            <th>Issue date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {generated.map((row) => (
            <tr key={row.id}>
              <td>{row.referenceNo}</td>
              <td>{row.memberName ?? '—'}</td>
              <td>{row.amountDue.toFixed(2)}</td>
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

      <ConfirmDialog
        open={confirmOpen}
        title="Generate reminder letters"
        message={`Generate ${selectedMemberIds.length} ${letterType} letter(s)? Generated letters are persisted before print.`}
        onConfirm={() => {
          setConfirmOpen(false);
          void generate();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <PrintPreviewModal
        open={previewOpen}
        title="Reminder Letter Preview"
        html={previewHtml ?? ''}
        onClose={() => setPreviewOpen(false)}
        onPrint={printPreview}
      />
    </section>
  );
}
