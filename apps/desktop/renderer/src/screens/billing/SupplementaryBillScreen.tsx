import { useCallback, useEffect, useState } from 'react';
import {
  BillToType,
  type AccountPickerItem,
  type BillingPeriodDto,
  type BillSettlementDto,
  type MemberListItemDto,
  type SocietyParametersDto,
  type SupplementaryBillDetailDto,
  type SupplementaryBillLineInputDto,
  type TenantDto,
} from '@sams/shared-types';
import {
  AccountPickerModal,
  AuditIdentityModal,
  ConfirmDialog,
  InterestDetailModal,
  MasterFormToolbar,
  MoneyInput,
} from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyLine = (): SupplementaryBillLineInputDto => ({
  accountMasterId: '',
  chargeName: '',
  amount: 0,
  srNo: 1,
});

export function SupplementaryBillScreen(): React.ReactElement {
  const [periods, setPeriods] = useState<BillingPeriodDto[]>([]);
  const [members, setMembers] = useState<MemberListItemDto[]>([]);
  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [parameters, setParameters] = useState<SocietyParametersDto | null>(null);
  const [bill, setBill] = useState<SupplementaryBillDetailDto | null>(null);
  const [billToType, setBillToType] = useState<BillToType>(BillToType.MEMBER);
  const [memberId, setMemberId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [generalPartyName, setGeneralPartyName] = useState('');
  const [generalReferenceNo, setGeneralReferenceNo] = useState('');
  const [bookSr, setBookSr] = useState('');
  const [periodKey, setPeriodKey] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<SupplementaryBillLineInputDto[]>([emptyLine()]);
  const [interestOverride, setInterestOverride] = useState<number | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [remark, setRemark] = useState('');
  const [settlements, setSettlements] = useState<BillSettlementDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [accountPickerLineIndex, setAccountPickerLineIndex] = useState<number | null>(null);

  const loadBase = useCallback(async (): Promise<void> => {
    const [periodRes, memberRes, tenantRes, paramRes, nextRes] = await Promise.all([
      window.sams.billing.listPeriods(),
      window.sams.member.list(),
      window.sams.tenant.list(undefined, true),
      window.sams.society.getParameters(),
      window.sams.billing.getNextPeriod(),
    ]);
    if (periodRes.success && periodRes.data) setPeriods(periodRes.data);
    if (memberRes.success && memberRes.data) {
      setMembers(memberRes.data);
      if (!memberId && memberRes.data[0]) setMemberId(memberRes.data[0].id);
    }
    if (tenantRes.success && tenantRes.data) {
      setTenants(tenantRes.data);
      if (!tenantId && tenantRes.data[0]) setTenantId(tenantRes.data[0].id);
    }
    if (paramRes.success && paramRes.data) setParameters(paramRes.data);
    if (nextRes.success && nextRes.data) setPeriodKey(nextRes.data.periodKey);
    else if (periodRes.success && periodRes.data?.[0]) setPeriodKey(periodRes.data[0].periodKey);
  }, [memberId, tenantId]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  const buildPayload = () => ({
    billToType,
    memberId: billToType === BillToType.MEMBER ? memberId : undefined,
    tenantId: billToType === BillToType.TENANT ? tenantId : undefined,
    generalPartyName: billToType === BillToType.GENERAL ? generalPartyName : undefined,
    generalReferenceNo: billToType === BillToType.GENERAL ? generalReferenceNo : undefined,
    billForPeriodKey: periodKey,
    billDate,
    dueDate: dueDate || undefined,
    bookSr: bookSr || null,
    lines: lines.filter((line) => line.accountMasterId && line.chargeName),
    interestOverride,
    adjustmentAmount,
    remark: remark || null,
  });

  const preview = async (): Promise<void> => {
    if (!periodKey) {
      setError('Select bill period.');
      return;
    }
    setError(null);
    setMessage(null);
    const response = await window.sams.billing.previewSupplementaryBill(buildPayload());
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setBill(response.data);
    if (!dueDate) setDueDate(response.data.dueDate);
    setMessage('Supplementary bill preview calculated.');
  };

  const saveBill = async (): Promise<void> => {
    if (!periodKey) return;
    setError(null);
    const response = await window.sams.billing.saveSupplementaryBill(buildPayload());
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

  const addLine = (): void => {
    setLines((current) => [...current, { ...emptyLine(), srNo: current.length + 1 }]);
  };

  const updateLine = (
    index: number,
    patch: Partial<SupplementaryBillLineInputDto>,
  ): void => {
    setLines((current) =>
      current.map((line, rowIndex) => (rowIndex === index ? { ...line, ...patch } : line)),
    );
  };

  const removeLine = (index: number): void => {
    setLines((current) =>
      current
        .filter((_, rowIndex) => rowIndex !== index)
        .map((line, rowIndex) => ({ ...line, srNo: rowIndex + 1 })),
    );
  };

  const selectAccount = (account: AccountPickerItem): void => {
    if (accountPickerLineIndex == null) return;
    updateLine(accountPickerLineIndex, {
      accountMasterId: account.id,
      chargeName: account.particulars,
    });
    setAccountPickerOpen(false);
    setAccountPickerLineIndex(null);
  };

  const selectedPeriod = periods.find((row) => row.periodKey === periodKey);
  const selectedTenant = tenants.find((row) => row.id === tenantId);

  return (
    <section className="form-screen master-browse-screen">
      <h2>Supplementary Bill Entry</h2>
      {selectedPeriod && (
        <p className="info-banner">
          Bill For: <strong>{selectedPeriod.periodLabel}</strong> ({selectedPeriod.periodKey})
        </p>
      )}

      <MasterFormToolbar
        onSave={() => setConfirmSave(true)}
        onBrowse={() => void preview()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="form-grid">
        <label>
          Bill To *
          <select
            value={billToType}
            onChange={(event) => setBillToType(event.target.value as BillToType)}
          >
            <option value={BillToType.MEMBER}>Member</option>
            <option value={BillToType.TENANT}>Tenant</option>
            <option value={BillToType.GENERAL}>General</option>
          </select>
        </label>
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
          Book Sr. (Manual No.)
          <input value={bookSr} onChange={(event) => setBookSr(event.target.value)} />
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

      {billToType === BillToType.MEMBER && (
        <div className="form-grid">
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
        </div>
      )}

      {billToType === BillToType.TENANT && (
        <div className="form-grid">
          <label>
            Tenant *
            <select value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
              {tenants.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.tenantName} — {row.buildingShortName}/{row.wingShortName}/{row.unitNo}
                </option>
              ))}
            </select>
          </label>
          {selectedTenant && (
            <p className="muted">
              Unit: {selectedTenant.buildingShortName}/{selectedTenant.wingShortName}/
              {selectedTenant.unitNo}
            </p>
          )}
        </div>
      )}

      {billToType === BillToType.GENERAL && (
        <div className="form-grid">
          <label>
            Party Name *
            <input
              value={generalPartyName}
              onChange={(event) => setGeneralPartyName(event.target.value)}
            />
          </label>
          <label>
            Reference No. *
            <input
              value={generalReferenceNo}
              onChange={(event) => setGeneralReferenceNo(event.target.value)}
            />
          </label>
        </div>
      )}

      <h3>Charge Lines</h3>
      <table className="data-grid">
        <thead>
          <tr>
            <th>Sr.</th>
            <th>Charge</th>
            <th>Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.srNo ?? index}>
              <td>{index + 1}</td>
              <td>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setAccountPickerLineIndex(index);
                    setAccountPickerOpen(true);
                  }}
                >
                  {line.chargeName || 'Select account…'}
                </button>
              </td>
              <td>
                <MoneyInput
                  value={line.amount}
                  decimalPlaces={parameters?.tariffDecimalPlaces ?? 2}
                  onChange={(value) => updateLine(index, { amount: value })}
                />
              </td>
              <td>
                <button type="button" onClick={() => removeLine(index)} disabled={lines.length <= 1}>
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

      <div className="inline-actions">
        <button type="button" onClick={() => void preview()}>
          Preview / Calculate
        </button>
        <button type="button" onClick={() => setInterestOpen(true)} disabled={!bill}>
          Interest Detail
        </button>
      </div>

      {bill && (
        <div className="bill-summary-panel">
          <p>
            <strong>Bill No:</strong> {bill.systemBillNo || '(preview)'}
            {bill.bookSr ? ` · Book Sr.: ${bill.bookSr}` : ''}
          </p>
          {bill.billToType !== BillToType.GENERAL && (
            <p>
              {bill.buildingShortName}/{bill.wingShortName}/{bill.unitNo} · Area: {bill.areaSnapshot}
            </p>
          )}
          {bill.billToType === BillToType.GENERAL && (
            <p>
              {bill.generalPartyName} · Ref: {bill.generalReferenceNo}
            </p>
          )}
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
              <tbody>
                {settlements.map((row) => (
                  <tr key={row.id}>
                    <td>{row.settlementDate}</td>
                    <td>{row.principalAllocated.toFixed(2)}</td>
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
        allowOverride={parameters?.supplementaryAllowManualOverride ?? false}
        overrideValue={interestOverride}
        onOverrideChange={setInterestOverride}
        onClose={() => setInterestOpen(false)}
      />

      <ConfirmDialog
        open={confirmSave}
        title="Save supplementary bill"
        message="Post this supplementary bill to the register?"
        onConfirm={() => {
          setConfirmSave(false);
          void saveBill();
        }}
        onCancel={() => setConfirmSave(false)}
      />

      <AuditIdentityModal open={auditOpen} record={bill} onClose={() => setAuditOpen(false)} />

      <AccountPickerModal
        open={accountPickerOpen}
        kind="ACCOUNT"
        title="Select charge account"
        onSelect={selectAccount}
        onClose={() => {
          setAccountPickerOpen(false);
          setAccountPickerLineIndex(null);
        }}
      />
    </section>
  );
}
