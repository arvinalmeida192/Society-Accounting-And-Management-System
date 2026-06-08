import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  BillReferenceType,
  BillingPeriodDto,
  BillSettlementDto,
  MemberListItemDto,
  RegularBillDetailDto,
  SocietyParametersDto,
} from '@sams/shared-types';
import { useTabStore } from '../../store/tabStore';
import {
  AuditIdentityModal,
  BillReferencePanel,
  ConfirmDialog,
  InterestDetailModal,
  MasterFormToolbar,
  MoneyInput,
  PrintPreviewModal,
} from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';
import { useReadOnlySession } from '../../hooks/useReadOnlySession';

export function RegularBillScreen(): React.ReactElement {
  const readOnly = useReadOnlySession();
  const navigate = useNavigate();
  const openTab = useTabStore((state) => state.openTab);
  const [periods, setPeriods] = useState<BillingPeriodDto[]>([]);
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [parameters, setParameters] = useState<SocietyParametersDto | null>(null);
  const [bill, setBill] = useState<RegularBillDetailDto | null>(null);
  const [memberId, setMemberId] = useState('');
  const [periodKey, setPeriodKey] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [interestOverride, setInterestOverride] = useState<number | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [remark, setRemark] = useState('');
  const [settlements, setSettlements] = useState<BillSettlementDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [billPrintHtml, setBillPrintHtml] = useState<string | null>(null);
  const [billPrintOpen, setBillPrintOpen] = useState(false);

  const loadBase = useCallback(async (): Promise<void> => {
    const [periodRes, memberRes, paramRes, nextRes] = await Promise.all([
      window.sams.billing.listPeriods(),
      window.sams.member.list(),
      window.sams.society.getParameters(),
      window.sams.billing.getNextPeriod(),
    ]);
    if (periodRes.success && periodRes.data) setPeriods(periodRes.data);
    if (memberRes.success && memberRes.data) {
      setMembers(memberRes.data.items);
      if (!memberId && memberRes.data.items[0]) setMemberId(memberRes.data.items[0].id);
    }
    if (paramRes.success && paramRes.data) setParameters(paramRes.data);
    if (nextRes.success && nextRes.data) setPeriodKey(nextRes.data.periodKey);
    else if (periodRes.success && periodRes.data?.[0]) setPeriodKey(periodRes.data[0].periodKey);
  }, [memberId]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  const preview = async (): Promise<void> => {
    if (!memberId || !periodKey) {
      setError('Select member and bill period.');
      return;
    }
    setError(null);
    setMessage(null);
    const response = await window.sams.billing.previewRegularBill({
      memberId,
      billForPeriodKey: periodKey,
      billDate,
      dueDate: dueDate || undefined,
      interestOverride,
      adjustmentAmount,
      remark: remark || null,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setBill(response.data);
    if (!dueDate) setDueDate(response.data.dueDate);
    setMessage('Bill preview calculated.');
  };

  const saveBill = async (): Promise<void> => {
    if (!memberId || !periodKey) return;
    setError(null);
    const response = await window.sams.billing.saveRegularBill({
      memberId,
      billForPeriodKey: periodKey,
      billDate,
      dueDate: dueDate || undefined,
      interestOverride,
      adjustmentAmount,
      remark: remark || null,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setBill(response.data);
    setMessage(`Bill saved: ${response.data.systemBillNo}`);
    if (response.data.id) {
      const settleRes = await window.sams.billing.getBillSettlements(response.data.id);
      if (settleRes.success && settleRes.data) setSettlements(settleRes.data);
    }
  };

  const printBill = async (): Promise<void> => {
    if (!bill?.id) {
      setError('Save the bill before printing.');
      return;
    }
    setError(null);
    const response = await window.sams.billing.printRegularBill(bill.id);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setBillPrintHtml(response.data.templateHtml);
    setBillPrintOpen(true);
  };

  const selectedPeriod = periods.find((row) => row.periodKey === periodKey);

  return (
    <section className="form-screen master-browse-screen">
      <h2>Regular Bill Entry</h2>
      {selectedPeriod && (
        <p className="info-banner">
          Bill For: <strong>{selectedPeriod.periodLabel}</strong> ({selectedPeriod.periodKey})
        </p>
      )}

      <MasterFormToolbar
        onSave={() => setConfirmSave(true)}
        onBrowse={() => void preview()}
        onPrint={() => void printBill()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="form-grid">
        <label>
          Bill For Period *
          <select value={periodKey} onChange={(event) => setPeriodKey(event.target.value)}>
            {periods.map((row) => (
              <option key={row.periodKey} value={row.periodKey}>
                {row.periodLabel}
              </option>
            ))}
          </select>
        </label>
        <label>
          Member *
          <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
            {members.map((row) => (
              <option key={row.id} value={row.id}>
                {row.memberName} — {row.unitNo}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bill Date
          <input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} />
        </label>
        <label>
          Due Date
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
      </div>

      <div className="inline-actions">
        <button type="button" onClick={() => void preview()}>
          Preview / Calculate
        </button>
        <button type="button" onClick={() => setInterestOpen(true)} disabled={!bill}>
          Interest Detail
        </button>
        <button type="button" onClick={() => setReferenceOpen(true)} disabled={!bill?.id}>
          Reference Panel
        </button>
      </div>

      {bill && (
        <div className="bill-summary-panel">
          <p>
            <strong>Bill No:</strong> {bill.systemBillNo || '(preview)'}
          </p>
          <p>
            {bill.buildingShortName}/{bill.wingShortName}/{bill.unitNo} · Area: {bill.areaSnapshot}
          </p>
          <table className="data-grid">
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Charge</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((line) => (
                <tr key={line.srNo}>
                  <td>{line.srNo}</td>
                  <td>{line.chargeName}</td>
                  <td>{line.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-grid">
            <label>
              Interest
              <MoneyInput
                value={bill.interestAmount}
                decimalPlaces={parameters?.tariffDecimalPlaces ?? 2}
                disabled
              />
            </label>
            <label>
              Service Tax
              <MoneyInput
                value={bill.serviceTaxAmount}
                decimalPlaces={parameters?.tariffDecimalPlaces ?? 2}
                disabled
              />
            </label>
            <label>
              Rebate
              <MoneyInput
                value={bill.rebateAmount}
                decimalPlaces={parameters?.tariffDecimalPlaces ?? 2}
                disabled
              />
            </label>
            <label>
              Adjustment
              <MoneyInput
                value={adjustmentAmount}
                decimalPlaces={parameters?.tariffDecimalPlaces ?? 2}
                onChange={setAdjustmentAmount}
              />
            </label>
          </div>
          <p>
            Principal Arrears: {bill.principalArrears.toFixed(2)} · Interest Arrears:{' '}
            {bill.interestArrears.toFixed(2)}
          </p>
          <p className="bill-amount-total">
            <strong>Bill Amount: {bill.billAmount.toFixed(2)}</strong>
          </p>
          <label>
            Remark
            <textarea value={remark} onChange={(event) => setRemark(event.target.value)} rows={2} />
          </label>

          <h4>Settlement Status</h4>
          {settlements.length === 0 ? (
            <p className="muted">No settlements yet.</p>
          ) : (
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Voucher</th>
                  <th>Date</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>ST</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((row) => (
                  <tr key={row.id}>
                    <td>{row.voucherSystemNo ?? row.voucherId ?? '—'}</td>
                    <td>{row.settlementDate}</td>
                    <td>{row.principalAllocated.toFixed(2)}</td>
                    <td>{row.interestAllocated.toFixed(2)}</td>
                    <td>{row.serviceTaxAllocated.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <InterestDetailModal
        open={interestOpen}
        details={bill?.interestDetails ?? []}
        totalInterest={bill?.interestAmount ?? 0}
        allowOverride={parameters?.regularAllowManualOverride ?? false}
        overrideValue={interestOverride}
        onOverrideChange={setInterestOverride}
        onClose={() => setInterestOpen(false)}
      />

      <BillReferencePanel
        open={referenceOpen}
        billId={bill?.id ?? null}
        onClose={() => setReferenceOpen(false)}
        onNavigate={(refType: BillReferenceType) => {
          const routes: Partial<Record<BillReferenceType, { id: string; title: string; route: string }>> = {
            ALL_BILLS: { id: 'bil-bulk', title: 'Bulk Regular Bills', route: '/app/billing/regular/bulk' },
            RECEIPTS: { id: 'vch-entry', title: 'Receipt / Payment', route: '/app/transactions/voucher' },
            ADJUSTMENTS: { id: 'vch-adj', title: 'JV / DN / CN', route: '/app/transactions/adjustments' },
            MEMBER_LEDGER: {
              id: 'mem-reg',
              title: 'Member Register',
              route: memberId ? `/app/members/register?memberId=${memberId}` : '/app/members/register',
            },
            CONTRIBUTION: {
              id: 'rpt-b05',
              title: 'Contribution Summary',
              route: `/app/reports/RPT-B05${memberId ? `?memberId=${memberId}&autoRun=1` : '?autoRun=1'}`,
            },
            OPENING_BILL: {
              id: 'mem-reg',
              title: 'Member Register',
              route: memberId ? `/app/members/register?memberId=${memberId}` : '/app/members/register',
            },
          };
          const target = routes[refType];
          if (!target) return;
          openTab(target);
          navigate(target.route);
          setReferenceOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirmSave}
        title="Save regular bill"
        message="Post this bill to the register?"
        onConfirm={() => {
          setConfirmSave(false);
          void saveBill();
        }}
        onCancel={() => setConfirmSave(false)}
      />

      <AuditIdentityModal open={auditOpen} record={bill} onClose={() => setAuditOpen(false)} />

      <PrintPreviewModal
        open={billPrintOpen}
        title={`Bill — ${bill?.systemBillNo ?? ''}`}
        html={billPrintHtml ?? ''}
        onClose={() => setBillPrintOpen(false)}
        onPrint={() => window.print()}
      />
    </section>
  );
}
