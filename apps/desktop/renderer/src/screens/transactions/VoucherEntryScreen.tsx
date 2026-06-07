import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChequeType,
  VoucherSubType,
  VoucherType,
  type AccountPickerItem,
  type BillSettlementAllocationDto,
  type CoaPickerKind,
  type MemberListItemDto,
  type OpenBillDto,
  type VoucherLineInputDto,
  type VoucherSaveDto,
} from '@sams/shared-types';
import {
  AccountPickerModal,
  AuditIdentityModal,
  ChequePrintPreviewModal,
  ConfirmDialog,
  GeneralReferencePanel,
  MasterFormToolbar,
  MoneyInput,
} from '../../components';
import type { ChequeCancellationReasonDto, ChequePrintDto } from '@sams/shared-types';
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

const SUB_TYPES: Record<VoucherType, VoucherSubType[]> = {
  [VoucherType.RECEIPT]: [VoucherSubType.MEMBER_RECEIPT, VoucherSubType.GENERAL_RECEIPT],
  [VoucherType.PAYMENT]: [VoucherSubType.CASH_PAYMENT, VoucherSubType.BANK_PAYMENT],
  [VoucherType.CONTRA]: [],
  [VoucherType.JV]: [],
  [VoucherType.DN]: [],
  [VoucherType.CN]: [],
  [VoucherType.PETTY_CASH]: [],
};

export function VoucherEntryScreen(): React.ReactElement {
  const [voucherType, setVoucherType] = useState<VoucherType>(VoucherType.RECEIPT);
  const [subType, setSubType] = useState<VoucherSubType>(VoucherSubType.MEMBER_RECEIPT);
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualNo, setManualNo] = useState('');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<VoucherLineInputDto[]>([emptyLine(1), emptyLine(2)]);
  const [reconciliationAudited, setReconciliationAudited] = useState(false);
  const [recordAudited, setRecordAudited] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [autoFifo, setAutoFifo] = useState(true);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [openBills, setOpenBills] = useState<OpenBillDto[]>([]);
  const [supplementaryBillId, setSupplementaryBillId] = useState('');
  const [supplementaryAmount, setSupplementaryAmount] = useState(0);
  const [generalBillId, setGeneralBillId] = useState('');
  const [generalAmount, setGeneralAmount] = useState(0);
  const [allocationPreview, setAllocationPreview] = useState<BillSettlementAllocationDto[]>([]);
  const [postedVoucherNo, setPostedVoucherNo] = useState<string | null>(null);
  const [postedVoucherId, setPostedVoucherId] = useState<string | null>(null);
  const [chequePrintData, setChequePrintData] = useState<ChequePrintDto | null>(null);
  const [chequePrintOpen, setChequePrintOpen] = useState(false);
  const [confirmCancelCheque, setConfirmCancelCheque] = useState(false);
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10));
  const [cancelReasonId, setCancelReasonId] = useState('');
  const [chequeReasons, setChequeReasons] = useState<ChequeCancellationReasonDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<CoaPickerKind>('ACCOUNT');
  const [pickerLineIndex, setPickerLineIndex] = useState<number | null>(null);
  const [chequeLineIndex, setChequeLineIndex] = useState<number | null>(null);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [manualNoWarning, setManualNoWarning] = useState<string | null>(null);

  const drTotal = useMemo(() => lines.reduce((sum, line) => sum + line.drAmount, 0), [lines]);
  const crTotal = useMemo(() => lines.reduce((sum, line) => sum + line.crAmount, 0), [lines]);
  const balanced = Math.abs(drTotal - crTotal) < 0.01;

  const settlementAmount = useMemo(() => {
    if (voucherType !== VoucherType.RECEIPT) return 0;
    return Math.min(drTotal, crTotal);
  }, [voucherType, drTotal, crTotal]);

  const loadMembers = useCallback(async (): Promise<void> => {
    const response = await window.sams.member.list();
    if (response.success && response.data) {
      setMembers(response.data);
      if (!memberId && response.data[0]) setMemberId(response.data[0].id);
    }
  }, [memberId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    void (async () => {
      const response = await window.sams.masters.listChequeReasons();
      if (response.success && response.data) setChequeReasons(response.data);
    })();
  }, []);

  useEffect(() => {
    if (voucherType === VoucherType.RECEIPT && subType === VoucherSubType.MEMBER_RECEIPT && memberId) {
      void (async () => {
        const response = await window.sams.voucher.getOpenBillsForMember(memberId, 'REGULAR');
        if (response.success && response.data) setOpenBills(response.data);
      })();
    }
  }, [voucherType, subType, memberId]);

  useEffect(() => {
    const options = SUB_TYPES[voucherType];
    if (options.length > 0 && !options.includes(subType)) {
      setSubType(options[0]!);
    }
  }, [voucherType, subType]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'F3') {
        event.preventDefault();
        openPicker(activeLineIndex, 'MEMBER');
      } else if (event.key === 'F4') {
        event.preventDefault();
        openPicker(activeLineIndex, 'BANK');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeLineIndex]);

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

  const openPicker = (index: number, kind: CoaPickerKind): void => {
    setPickerLineIndex(index);
    setPickerKind(kind);
    setPickerOpen(true);
  };

  const selectAccount = (account: AccountPickerItem): void => {
    if (pickerLineIndex == null) return;
    updateLine(pickerLineIndex, {
      accountMasterId: account.id,
      particulars: account.particulars,
      memberId: pickerKind === 'MEMBER' ? account.memberId : undefined,
    });
    if (pickerKind === 'MEMBER' && account.memberId) {
      setMemberId(account.memberId);
    }
    setPickerOpen(false);
    setPickerLineIndex(null);
  };

  const checkManualNo = async (): Promise<void> => {
    if (!manualNo.trim()) {
      setManualNoWarning(null);
      return;
    }
    const response = await window.sams.voucher.validateManualNo({
      voucherType,
      subType: SUB_TYPES[voucherType].length ? subType : undefined,
      manualNo,
    });
    if (response.success && response.data?.warning) {
      setManualNoWarning(response.data.warning);
    } else {
      setManualNoWarning(null);
    }
  };

  const lookupMicrForLine = async (index: number, micrCode: string): Promise<void> => {
    const response = await window.sams.voucher.lookupMicr(micrCode);
    if (!response.success || !response.data) return;
    const line = lines[index];
    updateLine(index, {
      cheque: {
        chequeNo: line.cheque?.chequeNo ?? '',
        chequeDate: line.cheque?.chequeDate ?? voucherDate,
        micrCode,
        bankName: response.data.bankName,
        branchName: response.data.branchName,
        bankMasterId: response.data.bankMasterId,
        isPostDated: line.cheque?.isPostDated ?? false,
        bankSlipNo: line.cheque?.bankSlipNo,
        chequeType: line.cheque?.chequeType,
        drawerName: line.cheque?.drawerName,
        clearedOnDate: line.cheque?.clearedOnDate,
      },
    });
  };

  const buildPayload = (): VoucherSaveDto => ({
    voucherType,
    subType: SUB_TYPES[voucherType].length ? subType : undefined,
    voucherDate,
    manualVoucherNo: manualNo || undefined,
    narration,
    reconciliationAudited,
    recordAudited,
    lines,
    ...(voucherType === VoucherType.RECEIPT &&
    subType === VoucherSubType.MEMBER_RECEIPT &&
    memberId &&
    settlementAmount > 0
      ? {
          regularSettlement: {
            memberId,
            amount: settlementAmount,
            autoFifo,
            billIds: autoFifo ? undefined : selectedBillIds,
          },
        }
      : {}),
    ...(supplementaryBillId && supplementaryAmount > 0
      ? { supplementarySettlements: [{ billId: supplementaryBillId, amount: supplementaryAmount }] }
      : {}),
    ...(subType === VoucherSubType.GENERAL_RECEIPT && generalBillId && generalAmount > 0
      ? { generalBillSettlement: { supplementaryBillId: generalBillId, amount: generalAmount } }
      : {}),
  });

  const previewAllocation = async (): Promise<void> => {
    if (!memberId || settlementAmount <= 0) return;
    const response = await window.sams.voucher.allocateSettlement({
      memberId,
      amount: settlementAmount,
      autoFifo,
      billIds: autoFifo ? undefined : selectedBillIds,
      asOfDate: voucherDate,
    });
    if (response.success && response.data) {
      setAllocationPreview(response.data.allocations);
      setMessage('Settlement allocation preview updated.');
    }
  };

  const previewPost = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.voucher.previewPost(buildPayload());
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    if (response.data.settlementPreview) {
      setAllocationPreview(response.data.settlementPreview.allocations);
    }
    setMessage(
      response.data.balanced
        ? `Balanced: Dr ${response.data.drTotal.toFixed(2)} = Cr ${response.data.crTotal.toFixed(2)}`
        : `Unbalanced by ₹${response.data.difference.toFixed(2)}`,
    );
    if (response.data.warnings.length) {
      setMessage((current) => `${current ?? ''} ${response.data!.warnings.join(' ')}`.trim());
    }
  };

  const postVoucher = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.voucher.post(buildPayload());
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setPostedVoucherNo(response.data.systemVoucherNo);
    setPostedVoucherId(response.data.id);
    setMessage(`Voucher posted: ${response.data.systemVoucherNo}`);
  };

  const openChequePrint = async (): Promise<void> => {
    if (!postedVoucherId) return;
    setError(null);
    const response = await window.sams.voucher.getChequePrintData(postedVoucherId);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setChequePrintData(response.data);
    setChequePrintOpen(true);
  };

  const cancelCheque = async (): Promise<void> => {
    if (!postedVoucherId || !cancelReasonId) {
      setError('Select a cancellation reason.');
      return;
    }
    setError(null);
    const response = await window.sams.voucher.cancel({
      id: postedVoucherId,
      cancelDate,
      reasonId: cancelReasonId,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage(
      `Cheque cancelled. Reversal voucher: ${response.data.reversal.systemVoucherNo}`,
    );
  };

  const showChequePanel =
    voucherType === VoucherType.PAYMENT && subType === VoucherSubType.BANK_PAYMENT;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Receipt / Payment / Contra Entry</h2>
      {postedVoucherNo && (
        <p className="success-text">Last posted voucher: {postedVoucherNo}</p>
      )}

      <MasterFormToolbar
        onSave={() => setConfirmPost(true)}
        onBrowse={() => void previewPost()}
        onUserIdentity={() => setAuditOpen(true)}
        onPrint={
          showChequePanel && postedVoucherId ? () => void openChequePrint() : undefined
        }
        disabled={{
          print: !postedVoucherId || !showChequePanel,
        }}
      />

      {showChequePanel && postedVoucherId && (
        <section className="form-grid">
          <label>
            Cheque Cancel Date (BC-008)
            <input
              type="date"
              value={cancelDate}
              onChange={(event) => setCancelDate(event.target.value)}
            />
          </label>
          <label>
            Cancellation Reason
            <select value={cancelReasonId} onChange={(event) => setCancelReasonId(event.target.value)}>
              <option value="">Select reason…</option>
              {chequeReasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.reasonDescription}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button type="button" onClick={() => setConfirmCancelCheque(true)}>
              Cancel Cheque
            </button>
          </div>
        </section>
      )}

      <div className="form-grid">
        <label>
          Voucher Type *
          <select
            value={voucherType}
            onChange={(event) => setVoucherType(event.target.value as VoucherType)}
          >
            <option value={VoucherType.RECEIPT}>Receipt</option>
            <option value={VoucherType.PAYMENT}>Payment</option>
            <option value={VoucherType.CONTRA}>Contra</option>
          </select>
        </label>
        {SUB_TYPES[voucherType].length > 0 && (
          <label>
            Sub-Type *
            <select
              value={subType}
              onChange={(event) => setSubType(event.target.value as VoucherSubType)}
            >
              {SUB_TYPES[voucherType].map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
        )}
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
          <input
            value={manualNo}
            onChange={(event) => setManualNo(event.target.value)}
            onBlur={() => void checkManualNo()}
          />
          {manualNoWarning && <span className="error-text">{manualNoWarning}</span>}
        </label>
        <label className="full-width">
          Narration
          <textarea
            value={narration}
            onChange={(event) => setNarration(event.target.value)}
            rows={2}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={reconciliationAudited}
            onChange={(event) => setReconciliationAudited(event.target.checked)}
          />
          Reconciliation Audited
        </label>
        <label>
          <input
            type="checkbox"
            checked={recordAudited}
            onChange={(event) => setRecordAudited(event.target.checked)}
          />
          Record Audited
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
            <th>Account</th>
            <th>Particulars</th>
            <th>Dr</th>
            <th>Cr</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr
              key={line.lineNo}
              className={activeLineIndex === index ? 'active-row' : undefined}
              onFocus={() => setActiveLineIndex(index)}
            >
              <td>{index + 1}</td>
              <td>
                <button type="button" onClick={() => openPicker(index, 'ACCOUNT')}>
                  {line.particulars || 'Account…'}
                </button>
                <button type="button" onClick={() => openPicker(index, 'MEMBER')} title="F3">
                  F3
                </button>
                <button type="button" onClick={() => openPicker(index, 'BANK')} title="F4">
                  F4
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
                {showChequePanel && (
                  <button type="button" onClick={() => setChequeLineIndex(index)}>
                    Cheque
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addLine}>
        Add Line
      </button>

      {chequeLineIndex != null && lines[chequeLineIndex] && (
        <section className="cheque-panel">
          <h4>Cheque Details (BC-006)</h4>
          <div className="form-grid">
            <label>
              Cheque No.
              <input
                value={lines[chequeLineIndex].cheque?.chequeNo ?? ''}
                onChange={(event) =>
                  updateLine(chequeLineIndex, {
                    cheque: {
                      chequeNo: event.target.value,
                      chequeDate: lines[chequeLineIndex]!.cheque?.chequeDate ?? voucherDate,
                    },
                  })
                }
              />
            </label>
            <label>
              Cheque Date
              <input
                type="date"
                value={lines[chequeLineIndex].cheque?.chequeDate ?? voucherDate}
                onChange={(event) =>
                  updateLine(chequeLineIndex, {
                    cheque: {
                      chequeNo: lines[chequeLineIndex]!.cheque?.chequeNo ?? '',
                      chequeDate: event.target.value,
                    },
                  })
                }
              />
            </label>
            <label>
              MICR (9 digits)
              <input
                value={lines[chequeLineIndex].cheque?.micrCode ?? ''}
                onChange={(event) => void lookupMicrForLine(chequeLineIndex, event.target.value)}
              />
            </label>
            <label>
              Bank Slip No.
              <input
                value={lines[chequeLineIndex].cheque?.bankSlipNo ?? ''}
                onChange={(event) =>
                  updateLine(chequeLineIndex, {
                    cheque: {
                      chequeNo: lines[chequeLineIndex]!.cheque?.chequeNo ?? '',
                      chequeDate: lines[chequeLineIndex]!.cheque?.chequeDate ?? voucherDate,
                      bankSlipNo: event.target.value,
                    },
                  })
                }
              />
            </label>
            <label>
              Cheque Type
              <select
                value={lines[chequeLineIndex].cheque?.chequeType ?? ''}
                onChange={(event) =>
                  updateLine(chequeLineIndex, {
                    cheque: {
                      chequeNo: lines[chequeLineIndex]!.cheque?.chequeNo ?? '',
                      chequeDate: lines[chequeLineIndex]!.cheque?.chequeDate ?? voucherDate,
                      chequeType: event.target.value as ChequeType,
                    },
                  })
                }
              >
                <option value="">—</option>
                <option value={ChequeType.CROSSED}>Crossed</option>
                <option value={ChequeType.DD}>DD</option>
                <option value={ChequeType.OUTSTATION}>Outstation</option>
              </select>
            </label>
            <label>
              Bank
              <input value={lines[chequeLineIndex].cheque?.bankName ?? ''} readOnly />
            </label>
            <label>
              Branch
              <input value={lines[chequeLineIndex].cheque?.branchName ?? ''} readOnly />
            </label>
            <label>
              <input
                type="checkbox"
                checked={lines[chequeLineIndex].cheque?.isPostDated ?? false}
                onChange={(event) =>
                  updateLine(chequeLineIndex, {
                    cheque: {
                      chequeNo: lines[chequeLineIndex]!.cheque?.chequeNo ?? '',
                      chequeDate: lines[chequeLineIndex]!.cheque?.chequeDate ?? voucherDate,
                      isPostDated: event.target.checked,
                    },
                  })
                }
              />
              Post-Dated Cheque
            </label>
          </div>
          <button type="button" onClick={() => setChequeLineIndex(null)}>
            Close Cheque Panel
          </button>
        </section>
      )}

      {voucherType === VoucherType.RECEIPT && subType === VoucherSubType.MEMBER_RECEIPT && (
        <section className="settlement-panel">
          <h4>Regular Bill Settlement (BC-010)</h4>
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
              Settlement Amount
              <MoneyInput label="" value={settlementAmount} decimalPlaces={2} disabled />
            </label>
            <label>
              <input
                type="checkbox"
                checked={autoFifo}
                onChange={(event) => setAutoFifo(event.target.checked)}
              />
              Auto FIFO (oldest bills first)
            </label>
          </div>
          {!autoFifo && (
            <div>
              <p>Select bills to settle:</p>
              {openBills.map((bill) => (
                <label key={bill.id}>
                  <input
                    type="checkbox"
                    checked={selectedBillIds.includes(bill.id)}
                    onChange={(event) => {
                      setSelectedBillIds((current) =>
                        event.target.checked
                          ? [...current, bill.id]
                          : current.filter((id) => id !== bill.id),
                      );
                    }}
                  />
                  {bill.systemBillNo} — {bill.billDate} — Outstanding ₹{bill.outstanding.toFixed(2)}
                </label>
              ))}
            </div>
          )}
          <button type="button" onClick={() => void previewAllocation()}>
            Preview Allocation
          </button>
        </section>
      )}

      {voucherType === VoucherType.RECEIPT && subType === VoucherSubType.MEMBER_RECEIPT && (
        <section className="settlement-panel">
          <h4>Supplementary Bill Settlement (BC-012)</h4>
          <p className="muted">Explicit bill selection required — no auto FIFO for supplementary bills.</p>
          <div className="form-grid">
            <label>
              Supplementary Bill *
              <SupplementaryBillPicker
                memberId={memberId}
                selectedBillId={supplementaryBillId}
                onSelect={(billId, outstanding) => {
                  setSupplementaryBillId(billId);
                  setSupplementaryAmount(outstanding);
                }}
              />
            </label>
            <label>
              Amount
              <MoneyInput
                label=""
                value={supplementaryAmount}
                decimalPlaces={2}
                onChange={setSupplementaryAmount}
              />
            </label>
          </div>
        </section>
      )}

      {subType === VoucherSubType.GENERAL_RECEIPT && (
        <GeneralReferencePanel
          amount={generalAmount}
          selectedBillId={generalBillId}
          onBillChange={setGeneralBillId}
          onAmountChange={setGeneralAmount}
        />
      )}

      {allocationPreview.length > 0 && (
        <table className="data-grid">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Allocated</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>ST</th>
            </tr>
          </thead>
          <tbody>
            {allocationPreview.map((row) => (
              <tr key={row.billId}>
                <td>{row.systemBillNo}</td>
                <td>{row.allocated.toFixed(2)}</td>
                <td>{row.principalAllocated.toFixed(2)}</td>
                <td>{row.interestAllocated.toFixed(2)}</td>
                <td>{row.serviceTaxAllocated.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <ConfirmDialog
        open={confirmPost}
        title="Post voucher"
        message="Post this voucher to the ledger?"
        onConfirm={() => {
          setConfirmPost(false);
          void postVoucher();
        }}
        onCancel={() => setConfirmPost(false)}
      />

      <ConfirmDialog
        open={confirmCancelCheque}
        title="Cancel cheque"
        message="Create a reversal voucher and mark the original cheque as cancelled?"
        onConfirm={() => {
          setConfirmCancelCheque(false);
          void cancelCheque();
        }}
        onCancel={() => setConfirmCancelCheque(false)}
      />

      {chequePrintData && (
        <ChequePrintPreviewModal
          open={chequePrintOpen}
          payee={chequePrintData.payee}
          amount={chequePrintData.amount}
          amountWords={chequePrintData.amountWords}
          chequeDate={chequePrintData.chequeDate}
          chequeNo={chequePrintData.chequeNo}
          bankName={chequePrintData.bankName}
          branchName={chequePrintData.branchName}
          signatory1={chequePrintData.signatory1}
          signatory2={chequePrintData.signatory2}
          templateHtml={chequePrintData.templateHtml}
          onClose={() => setChequePrintOpen(false)}
        />
      )}

      <AuditIdentityModal open={auditOpen} audit={null} onClose={() => setAuditOpen(false)} />

      <AccountPickerModal
        open={pickerOpen}
        kind={pickerKind}
        title={
          pickerKind === 'MEMBER'
            ? 'Select member account (F3)'
            : pickerKind === 'BANK'
              ? 'Select bank account (F4)'
              : 'Select account'
        }
        onSelect={selectAccount}
        onClose={() => {
          setPickerOpen(false);
          setPickerLineIndex(null);
        }}
      />
    </section>
  );
}

function SupplementaryBillPicker({
  memberId,
  selectedBillId,
  onSelect,
}: {
  memberId: string;
  selectedBillId: string;
  onSelect: (billId: string, outstanding: number) => void;
}): React.ReactElement {
  const [bills, setBills] = useState<OpenBillDto[]>([]);

  useEffect(() => {
    if (!memberId) return;
    void (async () => {
      const response = await window.sams.voucher.getOpenBillsForMember(memberId, 'SUPPLEMENTARY');
      if (response.success && response.data) setBills(response.data);
    })();
  }, [memberId]);

  return (
    <select
      value={selectedBillId}
      onChange={(event) => {
        const bill = bills.find((row) => row.id === event.target.value);
        onSelect(event.target.value, bill?.outstanding ?? 0);
      }}
    >
      <option value="">Select supplementary bill…</option>
      {bills.map((bill) => (
        <option key={bill.id} value={bill.id}>
          {bill.systemBillNo} — Outstanding ₹{bill.outstanding.toFixed(2)}
        </option>
      ))}
    </select>
  );
}
