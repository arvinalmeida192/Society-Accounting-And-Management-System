import { useEffect, useState } from 'react';
import {
  BillFrequency,
  InterestPattern,
  RebateType,
  SimpleInterestSubType,
  TariffBasisFlag,
  TariffMethod,
  BillNumberingMode,
  type SocietyParametersDto,
} from '@sams/shared-types';
import {
  AuditIdentityModal,
  ConfirmDialog,
  FilterDrawer,
  InlineHelpPopover,
  MasterFormToolbar,
  MoneyInput,
  PrintPreviewModal,
} from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const BASIS_OPTIONS = Object.values(TariffBasisFlag);

const defaultParameters = (): SocietyParametersDto => ({
  id: 'singleton',
  billFrequency: BillFrequency.MONTHLY,
  billFrequencyChangedAt: null,
  suppressZeroTariffs: true,
  mergeParkingOnBill: false,
  tariffDecimalPlaces: 2,
  regularInterestPattern: InterestPattern.NONE,
  regularSimpleSubType: SimpleInterestSubType.DELAY_DAYS,
  regularInterestRate: 0,
  regularInterestRoundToRupee: false,
  regularAllowManualOverride: false,
  supplementaryInterestPattern: InterestPattern.NONE,
  supplementarySimpleSubType: SimpleInterestSubType.DELAY_DAYS,
  supplementaryInterestRate: 0,
  supplementaryInterestRoundToRupee: false,
  supplementaryAllowManualOverride: false,
  tariffStructureBasis: [TariffBasisFlag.UNIT, TariffBasisFlag.BUILDING],
  tariffMethod: TariffMethod.SIMPLE,
  shareCapitalGroupId: null,
  shareCapitalSubgroupId: null,
  bankSubgroupId: null,
  cashSubgroupId: null,
  memberSubgroupId: null,
  tenantSubgroupId: null,
  incomeExpenseSubgroupId: null,
  interestAccountId: null,
  adjustmentAccountId: null,
  nonOccupancyAccountId: null,
  serviceTaxAccountId: null,
  educationCessAccountId: null,
  nonOccupancyChargePercent: 10,
  rebateType: RebateType.PERCENT,
  rebateValue: 0,
  serviceTaxPercent: 0,
  educationCessPercent: 0,
  gstPercent: 0,
  billNumberingMode: BillNumberingMode.AUTO_SERIAL,
  bulkBillStartingNumber: 1,
  dualTypeUnitSupport: true,
  cashBankGroupId: null,
  authorizedSignatory1: null,
  authorizedSignatory2: null,
  authorizedSignatory3: null,
  chequeSignatory1: null,
  chequeSignatory2: null,
  colourCodedGrids: false,
  dueDateOffsetDays: 15,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function SocietyParametersScreen(): React.ReactElement {
  const form = useFormState(defaultParameters());
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confirmFrequency, setConfirmFrequency] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    void window.sams.society.getParameters().then((response) => {
      if (response.success && response.data) {
        form.commit(response.data);
      } else {
        setError(getIpcErrorMessage(response.error));
      }
    });
  }, []);

  const save = async (acknowledgeFrequencyWarning = false): Promise<void> => {
    setError(null);
    setWarnings([]);
    const response = await window.sams.society.updateParameters({
      ...form.value,
      acknowledgeFrequencyWarning,
    });
    if (!response.success || !response.data) {
      if (response.error?.code === 'FREQUENCY_CHANGE_WARNING') {
        setConfirmFrequency(true);
        return;
      }
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data.parameters);
    setWarnings(response.data.warnings);
    setEditing(false);
    setConfirmFrequency(false);
  };

  const toggleBasis = (flag: TariffBasisFlag): void => {
    const current = form.value.tariffStructureBasis;
    const next = current.includes(flag)
      ? current.filter((item) => item !== flag)
      : [...current, flag];
    form.setValue({ ...form.value, tariffStructureBasis: next });
  };

  const disabled = !editing;
  const dp = form.value.tariffDecimalPlaces;

  return (
    <section className="form-screen">
      <h2>Society Parameters</h2>
      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing, edit: editing }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onFind={() => setFilterOpen(true)}
        onPrint={() => setPrintOpen(true)}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="form-section">
        <h3>Billing</h3>
        <div className="form-grid">
          <label>
            Bill Frequency
            <select
              disabled={disabled}
              value={form.value.billFrequency}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  billFrequency: event.target.value as BillFrequency,
                })
              }
            >
              {Object.values(BillFrequency).map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tariff Decimal Places
            <select
              disabled={disabled}
              value={form.value.tariffDecimalPlaces}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  tariffDecimalPlaces: Number(event.target.value) as 0 | 2,
                })
              }
            >
              <option value={0}>Whole rupees</option>
              <option value={2}>Paise (2 decimals)</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              disabled={disabled}
              checked={form.value.suppressZeroTariffs}
              onChange={(event) =>
                form.setValue({ ...form.value, suppressZeroTariffs: event.target.checked })
              }
            />
            Suppress Zero Value Tariffs
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              disabled={disabled}
              checked={form.value.mergeParkingOnBill}
              onChange={(event) =>
                form.setValue({ ...form.value, mergeParkingOnBill: event.target.checked })
              }
            />
            Merge Parking on Bill
          </label>
          <label>
            Due Date Offset (days)
            <input
              type="number"
              disabled={disabled}
              value={form.value.dueDateOffsetDays}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  dueDateOffsetDays: Number(event.target.value),
                })
              }
            />
          </label>
          <MoneyInput
            label="Non-Occupancy Charge %"
            decimalPlaces={2}
            disabled={disabled}
            value={form.value.nonOccupancyChargePercent}
            onChange={(value) =>
              form.setValue({ ...form.value, nonOccupancyChargePercent: value })
            }
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Regular Bill Interest</h3>
        <div className="form-grid">
          <label>
            Interest Pattern
            <select
              disabled={disabled}
              value={form.value.regularInterestPattern}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  regularInterestPattern: event.target.value as InterestPattern,
                })
              }
            >
              {Object.values(InterestPattern).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            <InlineHelpPopover
              label="Simple Interest Sub-Type"
              subType={form.value.regularSimpleSubType}
            />
            <select
              disabled={disabled}
              value={form.value.regularSimpleSubType}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  regularSimpleSubType: event.target.value as SimpleInterestSubType,
                })
              }
            >
              {Object.values(SimpleInterestSubType).map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <MoneyInput
            label="Interest Rate %"
            decimalPlaces={2}
            disabled={disabled}
            value={form.value.regularInterestRate}
            onChange={(value) => form.setValue({ ...form.value, regularInterestRate: value })}
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Supplementary Bill Interest</h3>
        <div className="form-grid">
          <label>
            Interest Pattern
            <select
              disabled={disabled}
              value={form.value.supplementaryInterestPattern}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  supplementaryInterestPattern: event.target.value as InterestPattern,
                })
              }
            >
              {Object.values(InterestPattern).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <MoneyInput
            label="Interest Rate %"
            decimalPlaces={2}
            disabled={disabled}
            value={form.value.supplementaryInterestRate}
            onChange={(value) =>
              form.setValue({ ...form.value, supplementaryInterestRate: value })
            }
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Tariff &amp; Tax</h3>
        <div className="basis-grid">
          {BASIS_OPTIONS.map((flag) => (
            <label key={flag} className="checkbox-field">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.value.tariffStructureBasis.includes(flag)}
                onChange={() => toggleBasis(flag)}
              />
              {flag}
            </label>
          ))}
        </div>
        <div className="form-grid">
          <label>
            Tariff Method
            <select
              disabled={disabled}
              value={form.value.tariffMethod}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  tariffMethod: event.target.value as TariffMethod,
                })
              }
            >
              {Object.values(TariffMethod).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <MoneyInput
            label="Service Tax %"
            decimalPlaces={2}
            disabled={disabled}
            value={form.value.serviceTaxPercent}
            onChange={(value) => form.setValue({ ...form.value, serviceTaxPercent: value })}
          />
          <MoneyInput
            label="Education Cess %"
            decimalPlaces={2}
            disabled={disabled}
            value={form.value.educationCessPercent}
            onChange={(value) => form.setValue({ ...form.value, educationCessPercent: value })}
          />
          <label>
            Rebate Type
            <select
              disabled={disabled}
              value={form.value.rebateType}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  rebateType: event.target.value as RebateType,
                })
              }
            >
              {Object.values(RebateType).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <MoneyInput
            label="Rebate Value"
            decimalPlaces={dp}
            disabled={disabled}
            value={form.value.rebateValue}
            onChange={(value) => form.setValue({ ...form.value, rebateValue: value })}
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Bill Numbering &amp; Signatories</h3>
        <div className="form-grid">
          <label>
            Bill Numbering Mode
            <select
              disabled={disabled}
              value={form.value.billNumberingMode}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  billNumberingMode: event.target.value as BillNumberingMode,
                })
              }
            >
              {Object.values(BillNumberingMode).map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bulk Starting Bill No.
            <input
              type="number"
              disabled={disabled}
              value={form.value.bulkBillStartingNumber}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  bulkBillStartingNumber: Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            Authorized Signatory 1
            <input
              disabled={disabled}
              value={form.value.authorizedSignatory1 ?? ''}
              onChange={(event) =>
                form.setValue({ ...form.value, authorizedSignatory1: event.target.value })
              }
            />
          </label>
          <label>
            Authorized Signatory 2
            <input
              disabled={disabled}
              value={form.value.authorizedSignatory2 ?? ''}
              onChange={(event) =>
                form.setValue({ ...form.value, authorizedSignatory2: event.target.value })
              }
            />
          </label>
          <label>
            Authorized Signatory 3
            <input
              disabled={disabled}
              value={form.value.authorizedSignatory3 ?? ''}
              onChange={(event) =>
                form.setValue({ ...form.value, authorizedSignatory3: event.target.value })
              }
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              disabled={disabled}
              checked={form.value.dualTypeUnitSupport}
              onChange={(event) =>
                form.setValue({ ...form.value, dualTypeUnitSupport: event.target.checked })
              }
            />
            Dual Type Unit Support
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              disabled={disabled}
              checked={form.value.colourCodedGrids}
              onChange={(event) =>
                form.setValue({ ...form.value, colourCodedGrids: event.target.checked })
              }
            />
            Colour Coded Grids
          </label>
        </div>
      </div>

      {warnings.map((warning) => (
        <p key={warning} className="form-info">
          {warning}
        </p>
      ))}
      {error && <p className="form-error">{error}</p>}

      <ConfirmDialog
        open={confirmFrequency}
        title="Change Bill Frequency?"
        message="Bills may already exist for the current year. Confirm to proceed with the frequency change."
        onConfirm={() => void save(true)}
        onCancel={() => setConfirmFrequency(false)}
      />
      <AuditIdentityModal
        open={auditOpen}
        audit={form.value.createdAt ? form.value : null}
        onClose={() => setAuditOpen(false)}
      />
      <FilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={() => setFilterOpen(false)} />
      <PrintPreviewModal
        open={printOpen}
        title="Society Parameters"
        html="<p>Society parameters print preview</p>"
        onClose={() => setPrintOpen(false)}
        onPrint={() => setPrintOpen(false)}
      />
    </section>
  );
}
