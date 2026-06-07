import { useCallback, useEffect, useState } from 'react';
import {
  AccountCategoryType,
  type TariffSettlementSequenceDto,
  type TariffSettlementSequenceLineDto,
} from '@sams/shared-types';
import { AccountPickerModal, AuditIdentityModal, MasterFormToolbar } from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyLine = (srNo: number): TariffSettlementSequenceLineDto => ({
  id: '',
  sequenceId: '',
  srNo,
  accountMasterId: '',
  accountParticulars: '',
  accountShortCode: null,
  remark: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function SettlementSequenceScreen(): React.ReactElement {
  const [sequences, setSequences] = useState<TariffSettlementSequenceDto[]>([]);
  const [selected, setSelected] = useState<TariffSettlementSequenceDto | null>(null);
  const [lines, setLines] = useState<TariffSettlementSequenceLineDto[]>([emptyLine(1)]);
  const [editing, setEditing] = useState(false);
  const [newEffectiveDate, setNewEffectiveDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLineIndex, setPickerLineIndex] = useState<number | null>(null);

  const loadSequences = useCallback(async (): Promise<void> => {
    const response = await window.sams.tariff.listSettlementSequences();
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setSequences(response.data);
    if (response.data[0]) {
      setSelected(response.data[0]);
      setLines(response.data[0].lines.length > 0 ? response.data[0].lines : [emptyLine(1)]);
    }
  }, []);

  useEffect(() => {
    void loadSequences();
  }, [loadSequences]);

  const selectSequence = (sequence: TariffSettlementSequenceDto): void => {
    setSelected(sequence);
    setLines(sequence.lines.length > 0 ? sequence.lines : [emptyLine(1)]);
    setEditing(false);
    setError(null);
    setMessage(null);
  };

  const saveSequence = async (): Promise<void> => {
    setError(null);
    setMessage(null);
    const response = await window.sams.tariff.saveSettlementSequence({
      id: selected?.isReadOnly ? undefined : selected?.id,
      effectiveDate: selected?.effectiveDate ?? newEffectiveDate,
      lines: lines.map((line) => ({
        id: line.id || undefined,
        srNo: line.srNo,
        accountMasterId: line.accountMasterId,
        remark: line.remark,
      })),
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setSelected(response.data);
    setLines(response.data.lines);
    setEditing(false);
    setMessage('Settlement sequence saved.');
    await loadSequences();
  };

  const createNewSequence = async (): Promise<void> => {
    if (!newEffectiveDate) {
      setError('Enter an effective date for the new sequence.');
      return;
    }
    setError(null);
    const response = await window.sams.tariff.saveSettlementSequence({
      effectiveDate: newEffectiveDate,
      lines: lines.map((line) => ({
        srNo: line.srNo,
        accountMasterId: line.accountMasterId,
        remark: line.remark,
      })),
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setNewEffectiveDate('');
    setMessage('New settlement sequence created.');
    await loadSequences();
    selectSequence(response.data);
  };

  const readOnly = selected?.isReadOnly ?? false;
  const disabled = !editing || readOnly;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Tariffwise Settlement Sequence</h2>
      <p className="muted">
        Defines FIFO allocation order across charge heads when receipts settle bills.
      </p>

      <MasterFormToolbar
        disabled={{ save: !editing, cancel: !editing }}
        onAdd={() => {
          setSelected(null);
          setLines([emptyLine(1)]);
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void saveSequence()}
        onCancel={() => {
          if (selected) {
            setLines(selected.lines.length > 0 ? selected.lines : [emptyLine(1)]);
          }
          setEditing(false);
        }}
        onBrowse={() => void loadSequences()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <ul>
            {sequences.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={selected?.id === row.id ? 'active' : undefined}
                  onClick={() => selectSequence(row)}
                >
                  {row.effectiveDate}
                  {row.isReadOnly && <span> (historical)</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          {selected?.isReadOnly && (
            <p className="info-banner">Historical sequence — read only.</p>
          )}

          <div className="inline-actions">
            <label>
              New Sequence Effective From
              <input
                type="date"
                value={newEffectiveDate}
                onChange={(event) => setNewEffectiveDate(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => void createNewSequence()}>
              Create New Sequence
            </button>
          </div>

          <table className="data-grid">
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Charge Head</th>
                <th>Remark</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.id || 'new'}-${index}`}>
                  <td>{line.srNo}</td>
                  <td>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setPickerLineIndex(index);
                        setPickerOpen(true);
                      }}
                    >
                      {line.accountParticulars || 'Select account…'}
                    </button>
                  </td>
                  <td>
                    <input
                      disabled={disabled}
                      value={line.remark ?? ''}
                      onChange={(event) => {
                        setLines((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, remark: event.target.value } : row,
                          ),
                        );
                        setEditing(true);
                      }}
                    />
                  </td>
                  <td className="grid-actions">
                    <button
                      type="button"
                      disabled={disabled || index === 0}
                      onClick={() => {
                        const next = [...lines];
                        const temp = next[index];
                        next[index] = next[index - 1]!;
                        next[index - 1] = temp!;
                        setLines(next.map((row, rowIndex) => ({ ...row, srNo: rowIndex + 1 })));
                        setEditing(true);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index === lines.length - 1}
                      onClick={() => {
                        const next = [...lines];
                        const temp = next[index];
                        next[index] = next[index + 1]!;
                        next[index + 1] = temp!;
                        setLines(next.map((row, rowIndex) => ({ ...row, srNo: rowIndex + 1 })));
                        setEditing(true);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setLines((current) =>
                          current
                            .filter((_, rowIndex) => rowIndex !== index)
                            .map((row, rowIndex) => ({ ...row, srNo: rowIndex + 1 })),
                        );
                        setEditing(true);
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setLines((current) => [...current, emptyLine(current.length + 1)]);
              setEditing(true);
            }}
          >
            Add Line
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <AccountPickerModal
        open={pickerOpen}
        title="Select charge head"
        categoryId={AccountCategoryType.INCOME}
        onClose={() => {
          setPickerOpen(false);
          setPickerLineIndex(null);
        }}
        onSelect={(item) => {
          if (pickerLineIndex === null) return;
          setLines((current) =>
            current.map((row, rowIndex) =>
              rowIndex === pickerLineIndex
                ? {
                    ...row,
                    accountMasterId: item.id,
                    accountParticulars: item.label,
                    accountShortCode: item.shortCode,
                  }
                : row,
            ),
          );
          setEditing(true);
          setPickerOpen(false);
          setPickerLineIndex(null);
        }}
      />

      <AuditIdentityModal open={auditOpen} record={selected} onClose={() => setAuditOpen(false)} />
    </section>
  );
}
