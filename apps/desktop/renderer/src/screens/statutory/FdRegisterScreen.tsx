import { useCallback, useEffect, useState } from 'react';
import { FdStatus, type FdRegisterDto, type UpcomingFdMaturityDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyFd = (): FdRegisterDto => ({
  id: '',
  financialYearId: '',
  fdDate: new Date().toISOString().slice(0, 10),
  fdrNo: '',
  bankName: '',
  amount: 0,
  fdType: null,
  durationMonths: 12,
  interestRate: 0,
  effectiveDate: new Date().toISOString().slice(0, 10),
  maturityDate: new Date().toISOString().slice(0, 10),
  remarks: null,
  status: FdStatus.ACTIVE,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

/** REG-001 — Fixed Deposit Register (SRS 3.10.1). */
export function FdRegisterScreen(): React.ReactElement {
  const form = useFormState(emptyFd());
  const [items, setItems] = useState<FdRegisterDto[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingFdMaturityDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<FdStatus | ''>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.registers.listFd({
      status: statusFilter || undefined,
      search: search || undefined,
    });
    if (response.success && response.data) setItems(response.data);
  }, [statusFilter, search]);

  const loadUpcoming = useCallback(async (): Promise<void> => {
    const response = await window.sams.registers.upcomingFdMaturities(30);
    if (response.success && response.data) setUpcoming(response.data);
  }, []);

  useEffect(() => {
    void loadList();
    void loadUpcoming();
  }, [loadList, loadUpcoming]);

  const selectItem = (item: FdRegisterDto): void => {
    form.commit(item);
    setEditing(false);
    setError(null);
  };

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.registers.saveFd(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('FD entry saved.');
    await loadList();
    await loadUpcoming();
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Fixed Deposit Register</h2>
      <p className="muted">Statutory FD register per MCS Act. Status auto-updates to Matured past maturity date.</p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyFd());
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onDelete={form.value.id ? () => setConfirmDelete(true) : undefined}
        onBrowse={() => void loadList()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="filter-row">
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FdStatus | '')}
          >
            <option value="">All</option>
            <option value={FdStatus.ACTIVE}>Active</option>
            <option value={FdStatus.MATURED}>Matured</option>
          </select>
        </label>
        <label>
          Search
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="FDR no. or bank" />
        </label>
        <button type="button" onClick={() => void loadList()}>
          Apply
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => selectItem(item)}>
                  {item.fdrNo} — {item.bankName} ({item.status})
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              FD Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.fdDate}
                onChange={(e) => form.patch({ fdDate: e.target.value })}
              />
            </label>
            <label>
              FDR No.
              <input
                disabled={disabled}
                value={form.value.fdrNo}
                onChange={(e) => form.patch({ fdrNo: e.target.value })}
              />
            </label>
            <label>
              Bank Name
              <input
                disabled={disabled}
                value={form.value.bankName}
                onChange={(e) => form.patch({ bankName: e.target.value })}
              />
            </label>
            <label>
              Amount
              <input
                type="number"
                disabled={disabled}
                value={form.value.amount}
                onChange={(e) => form.patch({ amount: Number(e.target.value) })}
              />
            </label>
            <label>
              FD Type
              <input
                disabled={disabled}
                value={form.value.fdType ?? ''}
                onChange={(e) => form.patch({ fdType: e.target.value || null })}
              />
            </label>
            <label>
              Duration (months)
              <input
                type="number"
                disabled={disabled}
                value={form.value.durationMonths}
                onChange={(e) => form.patch({ durationMonths: Number(e.target.value) })}
              />
            </label>
            <label>
              Interest Rate %
              <input
                type="number"
                step="0.01"
                disabled={disabled}
                value={form.value.interestRate}
                onChange={(e) => form.patch({ interestRate: Number(e.target.value) })}
              />
            </label>
            <label>
              Effective Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.effectiveDate}
                onChange={(e) => form.patch({ effectiveDate: e.target.value })}
              />
            </label>
            <label>
              Maturity Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.maturityDate}
                onChange={(e) => form.patch({ maturityDate: e.target.value })}
              />
            </label>
            <label>
              Status
              <input disabled value={form.value.status} readOnly />
            </label>
            <label className="full-width">
              Remarks
              <textarea
                disabled={disabled}
                value={form.value.remarks ?? ''}
                onChange={(e) => form.patch({ remarks: e.target.value || null })}
              />
            </label>
          </div>
        </div>
      </div>

      {upcoming.length > 0 && (
        <section className="sub-panel">
          <h3>Upcoming Maturities (30 days)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>FDR No.</th>
                <th>Bank</th>
                <th>Amount</th>
                <th>Maturity</th>
                <th>Days</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((row) => (
                <tr key={row.id}>
                  <td>{row.fdrNo}</td>
                  <td>{row.bankName}</td>
                  <td>{row.amount.toFixed(2)}</td>
                  <td>{row.maturityDate}</td>
                  <td>{row.daysRemaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <AuditIdentityModal
        open={auditOpen}
        audit={form.value.id ? form.value : null}
        onClose={() => setAuditOpen(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete FD entry?"
        message="This action cannot be undone."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          const response = await window.sams.registers.deleteFd(form.value.id);
          if (!response.success) {
            setError(getIpcErrorMessage(response.error));
            return;
          }
          form.commit(emptyFd());
          setMessage('FD entry deleted.');
          await loadList();
        }}
      />
    </section>
  );
}
