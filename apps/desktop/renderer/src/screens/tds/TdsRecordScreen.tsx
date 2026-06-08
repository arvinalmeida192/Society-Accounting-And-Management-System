import { useCallback, useEffect, useState } from 'react';
import type { TdsChallanDto, TdsRecordDto } from '@sams/shared-types';
import { AuditIdentityModal, MasterFormToolbar, MoneyInput } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyChallan = (financialYearId: string): TdsChallanDto => ({
  id: '',
  financialYearId,
  bsrCode: null,
  bankName: null,
  branchName: null,
  challanNo: null,
  challanDate: null,
  chequeNo: null,
  chequeDate: null,
  tdsRecordIds: [],
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

/** TDS-001 / TDS-002 — TDS record view/edit and challan linkage. */
export function TdsRecordScreen(): React.ReactElement {
  const form = useFormState<TdsRecordDto | null>(null);
  const [items, setItems] = useState<TdsRecordDto[]>([]);
  const [challanForm, setChallanForm] = useState<TdsChallanDto | null>(null);
  const [search, setSearch] = useState('');
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.tds.list({
      search: search || undefined,
      unlinkedChallanOnly: unlinkedOnly || undefined,
    });
    if (response.success && response.data) setItems(response.data);
  }, [search, unlinkedOnly]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const selectItem = (item: TdsRecordDto): void => {
    form.commit(item);
    setChallanForm(
      item.challan ??
        emptyChallan(item.financialYearId),
    );
    setEditing(false);
    setError(null);
  };

  const saveRecord = async (): Promise<void> => {
    if (!form.value) return;
    setError(null);
    const response = await window.sams.tds.update(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('TDS record saved.');
    await loadList();
  };

  const saveChallan = async (): Promise<void> => {
    if (!form.value || !challanForm) return;
    setError(null);
    const response = await window.sams.tds.saveChallan({
      ...challanForm,
      financialYearId: form.value.financialYearId,
      tdsRecordIds: [form.value.id],
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage('Challan saved and linked.');
    await loadList();
    const refreshed = await window.sams.tds.get(form.value.id);
    if (refreshed.success && refreshed.data) {
      form.commit(refreshed.data);
      setChallanForm(refreshed.data.challan ?? emptyChallan(refreshed.data.financialYearId));
    }
  };

  const record = form.value;
  const disabled = !editing || !record;

  return (
    <section className="form-screen master-browse-screen">
      <h2>TDS Records</h2>
      <p className="muted">
        Auto-created when payment vouchers include a TDS Payable account line (TDS-001). Amount fields
        remain editable until challan is filed (TDS-002).
      </p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onEdit={() => setEditing(true)}
        onSave={() => void saveRecord()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onBrowse={() => void loadList()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="filter-row">
        <label>
          Search
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={unlinkedOnly}
            onChange={(e) => setUnlinkedOnly(e.target.checked)}
          />
          Unlinked challan only
        </label>
        <button type="button" onClick={() => void loadList()}>
          Refresh
        </button>
      </div>

      <div className="master-browse-layout">
        <table className="data-table browse-list">
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher</th>
              <th>Party</th>
              <th>TDS</th>
              <th>Challan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.id}
                className={record?.id === row.id ? 'selected' : ''}
                onClick={() => selectItem(row)}
              >
                <td>{row.paymentDate}</td>
                <td>{row.systemVoucherNo ?? row.voucherId.slice(0, 8)}</td>
                <td>{row.partyName}</td>
                <td>{row.totalAmount.toFixed(2)}</td>
                <td>{row.challan?.challanNo ?? '—'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No TDS records yet. Post a payment voucher with a TDS Payable line to auto-create.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {record && (
          <div className="form-panel">
            <h3>Record Detail</h3>
            <div className="form-grid">
              <label>
                Payment Date
                <input type="date" value={record.paymentDate} disabled />
              </label>
              <label>
                Voucher No.
                <input value={record.systemVoucherNo ?? ''} disabled />
              </label>
              <label>
                Party Name
                <input
                  disabled={disabled}
                  value={record.partyName}
                  onChange={(e) => form.patch({ ...record, partyName: e.target.value })}
                />
              </label>
              <label>
                Nature of Payment
                <input
                  disabled={disabled}
                  value={record.natureOfPayment ?? ''}
                  onChange={(e) =>
                    form.patch({ ...record, natureOfPayment: e.target.value || null })
                  }
                />
              </label>
              <label>
                Bill No.
                <input
                  disabled={disabled}
                  value={record.billNo ?? ''}
                  onChange={(e) => form.patch({ ...record, billNo: e.target.value || null })}
                />
              </label>
              <label>
                Bill Date
                <input
                  type="date"
                  disabled={disabled}
                  value={record.billDate ?? ''}
                  onChange={(e) => form.patch({ ...record, billDate: e.target.value || null })}
                />
              </label>
              <MoneyInput
                label="Bill Amount"
                value={record.billAmount}
                disabled={disabled}
                onChange={(value) => form.patch({ ...record, billAmount: value })}
              />
              <MoneyInput
                label="Taxable Amount"
                value={record.taxableAmount}
                disabled={disabled}
                onChange={(value) => form.patch({ ...record, taxableAmount: value })}
              />
              <MoneyInput
                label="TDS Amount"
                value={record.tdsAmount}
                disabled={disabled}
                onChange={(value) => form.patch({ ...record, tdsAmount: value, totalAmount: value })}
              />
              <MoneyInput
                label="Surcharge"
                value={record.surchargeAmount}
                disabled={disabled}
                onChange={(value) => form.patch({ ...record, surchargeAmount: value })}
              />
              <MoneyInput
                label="Education Cess"
                value={record.educationCessAmount}
                disabled={disabled}
                onChange={(value) => form.patch({ ...record, educationCessAmount: value })}
              />
              <MoneyInput
                label="Total TDS"
                value={record.totalAmount}
                disabled={disabled}
                onChange={(value) => form.patch({ ...record, totalAmount: value })}
              />
            </div>

            <h3>Challan Details (TDS-003)</h3>
            {challanForm && (
              <div className="form-grid">
                <label>
                  Challan No.
                  <input
                    value={challanForm.challanNo ?? ''}
                    onChange={(e) =>
                      setChallanForm({ ...challanForm, challanNo: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  Challan Date
                  <input
                    type="date"
                    value={challanForm.challanDate ?? ''}
                    onChange={(e) =>
                      setChallanForm({ ...challanForm, challanDate: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  BSR Code
                  <input
                    value={challanForm.bsrCode ?? ''}
                    onChange={(e) =>
                      setChallanForm({ ...challanForm, bsrCode: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  Bank
                  <input
                    value={challanForm.bankName ?? ''}
                    onChange={(e) =>
                      setChallanForm({ ...challanForm, bankName: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  Branch
                  <input
                    value={challanForm.branchName ?? ''}
                    onChange={(e) =>
                      setChallanForm({ ...challanForm, branchName: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  Cheque No.
                  <input
                    value={challanForm.chequeNo ?? ''}
                    onChange={(e) =>
                      setChallanForm({ ...challanForm, chequeNo: e.target.value || null })
                    }
                  />
                </label>
                <button type="button" onClick={() => void saveChallan()}>
                  Save Challan & Link
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <AuditIdentityModal
        open={auditOpen}
        audit={record?.id ? record : null}
        onClose={() => setAuditOpen(false)}
      />
    </section>
  );
}
