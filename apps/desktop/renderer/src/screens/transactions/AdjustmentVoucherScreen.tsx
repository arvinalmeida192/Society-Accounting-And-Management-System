import { useEffect, useMemo, useState } from 'react';
import {
  VoucherType,
  type AccountPickerItem,
  type MemberListItemDto,
  type OpenBillDto,
  type PartialWaiverPreviewDto,
  type VoucherLineInputDto,
} from '@sams/shared-types';
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

const ADJUSTMENT_TYPES = [VoucherType.JV, VoucherType.DN, VoucherType.CN] as const;

/** VCH-005 — journal voucher / debit note / credit note entry (AJ-001–005). */
export function AdjustmentVoucherScreen(): React.ReactElement {
  const [voucherType, setVoucherType] = useState<(typeof ADJUSTMENT_TYPES)[number]>(VoucherType.JV);
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualNo, setManualNo] = useState('');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<VoucherLineInputDto[]>([emptyLine(1), emptyLine(2)]);
  const [memberId, setMemberId] = useState('');
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [billType, setBillType] = useState<'REGULAR' | 'SUPPLEMENTARY'>('REGULAR');
  const [openBills, setOpenBills] = useState<OpenBillDto[]>([]);
  const [linkedBillId, setLinkedBillId] = useState('');
  const [linkedAmount, setLinkedAmount] = useState(0);
  const [waiverBillId, setWaiverBillId] = useState('');
  const [waiverAmount, setWaiverAmount] = useState(0);
  const [waiverPreview, setWaiverPreview] = useState<PartialWaiverPreviewDto | null>(null);
  const [postedVoucherNo, setPostedVoucherNo] = useState<string | null>(null);
  const [loadedVoucherId, setLoadedVoucherId] = useState('');
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLineIndex, setPickerLineIndex] = useState<number | null>(null);

  const drTotal = useMemo(() => lines.reduce((sum, line) => sum + line.drAmount, 0), [lines]);
  const crTotal = useMemo(() => lines.reduce((sum, line) => sum + line.crAmount, 0), [lines]);
  const balanced = Math.abs(drTotal - crTotal) < 0.01;

  useEffect(() => {
    void (async () => {
      const response = await window.sams.member.list();
      if (response.success && response.data) {
        setMembers(response.data);
        if (!memberId && response.data[0]) setMemberId(response.data[0].id);
      }
    })();
  }, [memberId]);

  useEffect(() => {
    if (!memberId) return;
    void (async () => {
      const response = await window.sams.voucher.getOpenBillsForMember(memberId, billType);
      if (response.success && response.data) setOpenBills(response.data);
    })();
  }, [memberId, billType]);

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
      memberId: account.memberId,
    });
    setPickerOpen(false);
    setPickerLineIndex(null);
  };

  const buildPayload = () => ({
    voucherType,
    voucherDate,
    manualVoucherNo: manualNo || undefined,
    narration,
    lines,
    ...(memberId && linkedBillId && linkedAmount > 0 && billType === 'REGULAR'
      ? {
          regularSettlement: {
            memberId,
            amount: linkedAmount,
            autoFifo: false,
            billIds: [linkedBillId],
          },
        }
      : {}),
    ...(linkedBillId && linkedAmount > 0 && billType === 'SUPPLEMENTARY'
      ? { supplementarySettlements: [{ billId: linkedBillId, amount: linkedAmount }] }
      : {}),
  });

  const postAdjustment = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.adjustment.post(buildPayload());
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setPostedVoucherNo(response.data.systemVoucherNo);
    setLoadedVoucherId(response.data.id);
    setMessage(`Adjustment posted: ${response.data.systemVoucherNo}`);
  };

  const previewWaiver = async (): Promise<void> => {
    if (!waiverBillId || waiverAmount <= 0) return;
    setError(null);
    const response = await window.sams.adjustment.previewPartialWaiver({
      billId: waiverBillId,
      waiverAmount,
      voucherType,
      voucherDate,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setWaiverPreview(response.data);
    setMessage('Partial waiver preview generated.');
  };

  const applyWaiverLines = (): void => {
    if (!waiverPreview) return;
    setLines(
      waiverPreview.proposedLines.map((line) => ({
        lineNo: line.lineNo,
        accountMasterId: line.accountMasterId,
        memberId: line.memberId,
        drAmount: line.drAmount,
        crAmount: line.crAmount,
        particulars: line.particulars,
      })),
    );
    setNarration(`Partial waiver for ${waiverPreview.systemBillNo}`);
    setMessage('Proposed JV lines loaded into the grid.');
  };

  const postPartialWaiver = async (): Promise<void> => {
    if (!waiverBillId || waiverAmount <= 0) return;
    setError(null);
    const response = await window.sams.adjustment.partialWaiver({
      billId: waiverBillId,
      waiverAmount,
      voucherType,
      voucherDate,
      narration: narration || undefined,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setPostedVoucherNo(response.data.voucher.systemVoucherNo);
    setLoadedVoucherId(response.data.voucher.id);
    setWaiverPreview(response.data.allocations);
    setMessage(`Partial waiver posted: ${response.data.voucher.systemVoucherNo}`);
  };

  const cancelAdjustment = async (): Promise<void> => {
    if (!loadedVoucherId) return;
    setError(null);
    const response = await window.sams.adjustment.cancel({
      id: loadedVoucherId,
      cancelDate,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage(
      `Adjustment cancelled. Reversal voucher: ${response.data.reversal.systemVoucherNo}`,
    );
  };

  return (
    <section className="form-screen master-browse-screen">
      <h2>Journal / Debit Note / Credit Note</h2>
      {postedVoucherNo && <p className="success-text">Last posted voucher: {postedVoucherNo}</p>}

      <MasterFormToolbar
        onSave={() => setConfirmPost(true)}
        onDelete={loadedVoucherId ? () => setConfirmCancel(true) : undefined}
      />

      <div className="form-grid">
        <label>
          Adjustment Type *
          <select
            value={voucherType}
            onChange={(event) => setVoucherType(event.target.value as (typeof ADJUSTMENT_TYPES)[number])}
          >
            {ADJUSTMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
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

      <h3>Voucher Lines (AJ-002)</h3>
      <p className={balanced ? 'success-text' : 'error-text'}>
        Dr: {drTotal.toFixed(2)} · Cr: {crTotal.toFixed(2)} · Difference:{' '}
        {(drTotal - crTotal).toFixed(2)}
      </p>

      <table className="data-grid">
        <thead>
          <tr>
            <th>Sr.</th>
            <th>Account</th>
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
                  {line.particulars || 'Account…'}
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

      <section className="settlement-panel">
        <h4>Bill Linkage (AJ-003)</h4>
        <div className="form-grid">
          <label>
            Member
            <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.memberName} — {member.unitNo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bill Type
            <select
              value={billType}
              onChange={(event) => setBillType(event.target.value as 'REGULAR' | 'SUPPLEMENTARY')}
            >
              <option value="REGULAR">Regular</option>
              <option value="SUPPLEMENTARY">Supplementary</option>
            </select>
          </label>
          <label>
            Bill
            <select
              value={linkedBillId}
              onChange={(event) => {
                const bill = openBills.find((row) => row.id === event.target.value);
                setLinkedBillId(event.target.value);
                setLinkedAmount(bill?.outstanding ?? 0);
              }}
            >
              <option value="">Select bill…</option>
              {openBills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.systemBillNo} — Outstanding ₹{bill.outstanding.toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Settlement Amount
            <MoneyInput label="" value={linkedAmount} decimalPlaces={2} onChange={setLinkedAmount} />
          </label>
        </div>
      </section>

      <section className="settlement-panel">
        <h4>Partial Waiver (AJ-005)</h4>
        <div className="form-grid">
          <label>
            Bill
            <select
              value={waiverBillId}
              onChange={(event) => setWaiverBillId(event.target.value)}
            >
              <option value="">Select bill…</option>
              {openBills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.systemBillNo} — Outstanding ₹{bill.outstanding.toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Waiver Amount
            <MoneyInput label="" value={waiverAmount} decimalPlaces={2} onChange={setWaiverAmount} />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => void previewWaiver()}>
            Preview Waiver
          </button>
          <button type="button" onClick={applyWaiverLines} disabled={!waiverPreview}>
            Load Lines Into Grid
          </button>
          <button type="button" onClick={() => void postPartialWaiver()}>
            Post Partial Waiver
          </button>
        </div>
        {waiverPreview && (
          <table className="data-grid">
            <thead>
              <tr>
                <th>Component</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Principal</td>
                <td>{waiverPreview.principalWaiver.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Interest</td>
                <td>{waiverPreview.interestWaiver.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Service Tax</td>
                <td>{waiverPreview.serviceTaxWaiver.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total Waiver</td>
                <td>{waiverPreview.waiverAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      {loadedVoucherId && (
        <section className="form-grid">
          <label>
            Cancel Date (AJ-004)
            <input
              type="date"
              value={cancelDate}
              onChange={(event) => setCancelDate(event.target.value)}
            />
          </label>
        </section>
      )}

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <ConfirmDialog
        open={confirmPost}
        title="Post adjustment"
        message="Post this balanced adjustment voucher?"
        onConfirm={() => {
          setConfirmPost(false);
          void postAdjustment();
        }}
        onCancel={() => setConfirmPost(false)}
      />

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel adjustment"
        message="Create a reversal voucher and mark the original as cancelled?"
        onConfirm={() => {
          setConfirmCancel(false);
          void cancelAdjustment();
        }}
        onCancel={() => setConfirmCancel(false)}
      />

      <AccountPickerModal
        open={pickerOpen}
        kind="ACCOUNT"
        title="Select account"
        onSelect={selectAccount}
        onClose={() => {
          setPickerOpen(false);
          setPickerLineIndex(null);
        }}
      />
    </section>
  );
}
