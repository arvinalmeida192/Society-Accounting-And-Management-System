import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccountPickerItem, VoucherLineInputDto } from '@sams/shared-types';
import {
  AccountPickerModal,
  ConfirmDialog,
  MasterFormToolbar,
  MoneyInput,
} from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

function emptyLine(lineNo: number): VoucherLineInputDto {
  return {
    lineNo,
    accountMasterId: '',
    drAmount: 0,
    crAmount: 0,
    particulars: '',
  };
}

/** VCH-002 — petty cash voucher entry (GAP-012–015). */
export function PettyCashScreen(): React.ReactElement {
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualNo, setManualNo] = useState('');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<VoucherLineInputDto[]>([emptyLine(1), emptyLine(2)]);
  const [postedVoucherNo, setPostedVoucherNo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLineIndex, setPickerLineIndex] = useState<number | null>(null);

  const drTotal = useMemo(() => lines.reduce((sum, line) => sum + line.drAmount, 0), [lines]);
  const crTotal = useMemo(() => lines.reduce((sum, line) => sum + line.crAmount, 0), [lines]);
  const balanced = Math.abs(drTotal - crTotal) < 0.01;

  const updateLine = (index: number, patch: Partial<VoucherLineInputDto>): void => {
    setLines((current) =>
      current.map((line, rowIndex) => (rowIndex === index ? { ...line, ...patch } : line)),
    );
  };

  const addLine = (): void => {
    setLines((current) => [...current, emptyLine(current.length + 1)]);
  };

  const removeLine = (index: number): void => {
    setLines((current) =>
      current
        .filter((_, rowIndex) => rowIndex !== index)
        .map((line, rowIndex) => ({ ...line, lineNo: rowIndex + 1 })),
    );
  };

  const openPicker = (index: number): void => {
    setPickerLineIndex(index);
    setPickerOpen(true);
  };

  const selectAccount = (account: AccountPickerItem): void => {
    if (pickerLineIndex == null) return;
    updateLine(pickerLineIndex, {
      accountMasterId: account.id,
      particulars: account.particulars,
    });
    setPickerOpen(false);
    setPickerLineIndex(null);
  };

  const postVoucher = useCallback(async (): Promise<void> => {
    setError(null);
    const response = await window.sams.pettycash.post({
      voucherDate,
      manualVoucherNo: manualNo || undefined,
      narration,
      lines,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setPostedVoucherNo(response.data.systemVoucherNo);
    setMessage(`Petty cash voucher posted: ${response.data.systemVoucherNo}`);
  }, [voucherDate, manualNo, narration, lines]);

  return (
    <section className="form-screen master-browse-screen">
      <h2>Petty Cash Entry</h2>
      <p className="muted">
        Only accounts flagged as petty cash in Chart of Accounts are selectable (GAP-012). Posting
        follows the same double-entry rules as cash payments (GAP-013).
      </p>
      {postedVoucherNo && <p className="success-text">Last posted voucher: {postedVoucherNo}</p>}

      <MasterFormToolbar onSave={() => setConfirmPost(true)} />

      <div className="form-grid">
        <label>
          Voucher Date
          <input
            type="date"
            value={voucherDate}
            onChange={(event) => setVoucherDate(event.target.value)}
          />
        </label>
        <label>
          Manual Voucher No.
          <input value={manualNo} onChange={(event) => setManualNo(event.target.value)} />
        </label>
        <label className="full-width">
          Narration
          <textarea value={narration} onChange={(event) => setNarration(event.target.value)} rows={2} />
        </label>
      </div>

      <h3>Voucher Lines</h3>
      <p className={balanced ? 'success-text' : 'error-text'}>
        Dr: {drTotal.toFixed(2)} · Cr: {crTotal.toFixed(2)} · Difference:{' '}
        {(drTotal - crTotal).toFixed(2)}
      </p>

      <table className="data-grid">
        <thead>
          <tr>
            <th>Sr.</th>
            <th>Petty Cash Account</th>
            <th>Particulars</th>
            <th>Dr</th>
            <th>Cr</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.lineNo}>
              <td>{index + 1}</td>
              <td>
                <button type="button" onClick={() => openPicker(index)}>
                  {line.particulars || 'Select petty cash account…'}
                </button>
              </td>
              <td>
                <input
                  value={line.particulars ?? ''}
                  onChange={(event) => updateLine(index, { particulars: event.target.value })}
                />
              </td>
              <td>
                <MoneyInput
                  label=""
                  value={line.drAmount}
                  decimalPlaces={2}
                  onChange={(value) => updateLine(index, { drAmount: value, crAmount: 0 })}
                />
              </td>
              <td>
                <MoneyInput
                  label=""
                  value={line.crAmount}
                  decimalPlaces={2}
                  onChange={(value) => updateLine(index, { crAmount: value, drAmount: 0 })}
                />
              </td>
              <td>
                <button type="button" onClick={() => removeLine(index)} disabled={lines.length <= 2}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addLine}>
        Add Line
      </button>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <ConfirmDialog
        open={confirmPost}
        title="Post petty cash voucher"
        message="Post this petty cash voucher to the ledger?"
        onConfirm={() => {
          setConfirmPost(false);
          void postVoucher();
        }}
        onCancel={() => setConfirmPost(false)}
      />

      <AccountPickerModal
        open={pickerOpen}
        kind="ACCOUNT"
        pettyCashOnly
        title="Select petty cash account"
        onSelect={selectAccount}
        onClose={() => {
          setPickerOpen(false);
          setPickerLineIndex(null);
        }}
      />
    </section>
  );
}
