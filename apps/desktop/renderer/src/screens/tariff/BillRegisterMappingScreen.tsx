import { useCallback, useEffect, useState } from 'react';
import {
  AccountCategoryType,
  BillRegisterDisplayMode,
  type TariffBillRegisterMappingDto,
} from '@sams/shared-types';
import { AccountPickerModal, MasterFormToolbar } from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyRow = (srNo: number): TariffBillRegisterMappingDto => ({
  id: '',
  financialYearId: '',
  srNo,
  accountMasterId: '',
  accountParticulars: '',
  accountShortCode: null,
  displayMode: BillRegisterDisplayMode.SHORT_CODE,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function BillRegisterMappingScreen(): React.ReactElement {
  const [rows, setRows] = useState<TariffBillRegisterMappingDto[]>([emptyRow(1)]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRowIndex, setPickerRowIndex] = useState<number | null>(null);

  const loadMapping = useCallback(async (): Promise<void> => {
    const response = await window.sams.tariff.listBillRegisterMapping();
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setRows(response.data.length > 0 ? response.data : [emptyRow(1)]);
    setEditing(false);
  }, []);

  useEffect(() => {
    void loadMapping();
  }, [loadMapping]);

  const saveMapping = async (): Promise<void> => {
    setError(null);
    setMessage(null);
    const response = await window.sams.tariff.saveBillRegisterMapping({
      rows: rows.map((row) => ({
        id: row.id || undefined,
        srNo: row.srNo,
        accountMasterId: row.accountMasterId,
        displayMode: row.displayMode,
      })),
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setRows(response.data);
    setEditing(false);
    setMessage('Bill register column mapping saved.');
  };

  const disabled = !editing;

  return (
    <section className="form-screen">
      <h2>Bill Register Column Mapping</h2>
      <p className="muted">
        Controls column order and header labels for the horizontal Bill Register report (RPT-B01).
      </p>

      <MasterFormToolbar
        disabled={{ save: !editing, cancel: !editing }}
        onEdit={() => setEditing(true)}
        onSave={() => void saveMapping()}
        onCancel={() => {
          void loadMapping();
        }}
        onBrowse={() => void loadMapping()}
      />

      <table className="data-grid">
        <thead>
          <tr>
            <th>Sr.</th>
            <th>Charge Head</th>
            <th>Display Mode</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.id || 'new'}-${index}`}>
              <td>{row.srNo}</td>
              <td>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setPickerRowIndex(index);
                    setPickerOpen(true);
                  }}
                >
                  {row.accountParticulars || 'Select account…'}
                </button>
              </td>
              <td>
                <select
                  disabled={disabled}
                  value={row.displayMode}
                  onChange={(event) => {
                    setRows((current) =>
                      current.map((item, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...item,
                              displayMode: event.target.value as BillRegisterDisplayMode,
                            }
                          : item,
                      ),
                    );
                    setEditing(true);
                  }}
                >
                  <option value={BillRegisterDisplayMode.SHORT_CODE}>Short Code</option>
                  <option value={BillRegisterDisplayMode.FULL_NAME}>Full Name</option>
                </select>
              </td>
              <td className="grid-actions">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => {
                    const next = [...rows];
                    const temp = next[index];
                    next[index] = next[index - 1]!;
                    next[index - 1] = temp!;
                    setRows(next.map((item, rowIndex) => ({ ...item, srNo: rowIndex + 1 })));
                    setEditing(true);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || index === rows.length - 1}
                  onClick={() => {
                    const next = [...rows];
                    const temp = next[index];
                    next[index] = next[index + 1]!;
                    next[index + 1] = temp!;
                    setRows(next.map((item, rowIndex) => ({ ...item, srNo: rowIndex + 1 })));
                    setEditing(true);
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setRows((current) =>
                      current
                        .filter((_, rowIndex) => rowIndex !== index)
                        .map((item, rowIndex) => ({ ...item, srNo: rowIndex + 1 })),
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
          setRows((current) => [...current, emptyRow(current.length + 1)]);
          setEditing(true);
        }}
      >
        Add Column
      </button>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <AccountPickerModal
        open={pickerOpen}
        title="Select charge head for bill register column"
        categoryId={AccountCategoryType.INCOME}
        onClose={() => {
          setPickerOpen(false);
          setPickerRowIndex(null);
        }}
        onSelect={(item) => {
          if (pickerRowIndex === null) return;
          setRows((current) =>
            current.map((row, rowIndex) =>
              rowIndex === pickerRowIndex
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
          setPickerRowIndex(null);
        }}
      />
    </section>
  );
}
