import { useCallback, useEffect, useState } from 'react';
import type { BankMasterDto, BankMicrCodeDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyBank = (): BankMasterDto => ({
  id: '',
  bankName: '',
  branchName: '',
  address: null,
  telephone: null,
  fax: null,
  email: null,
  url: null,
  contactPerson: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

const emptyMicr = (bankMasterId: string): BankMicrCodeDto => ({
  id: '',
  bankMasterId,
  micrCode: '',
  isActive: true,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function BanksScreen(): React.ReactElement {
  const form = useFormState(emptyBank());
  const [items, setItems] = useState<BankMasterDto[]>([]);
  const [micrCodes, setMicrCodes] = useState<BankMicrCodeDto[]>([]);
  const [micrForm, setMicrForm] = useState<BankMicrCodeDto>(emptyMicr(''));
  const [editing, setEditing] = useState(false);
  const [micrEditing, setMicrEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.masters.listBanks();
    if (response.success && response.data) setItems(response.data);
  }, []);

  const loadMicr = useCallback(async (bankId: string): Promise<void> => {
    if (!bankId) {
      setMicrCodes([]);
      return;
    }
    const response = await window.sams.masters.listMicr(bankId);
    if (response.success && response.data) setMicrCodes(response.data);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const selectItem = (item: BankMasterDto): void => {
    form.commit(item);
    setMicrForm(emptyMicr(item.id));
    void loadMicr(item.id);
    setEditing(false);
    setMicrEditing(false);
    setError(null);
  };

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.masters.saveBank(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Bank saved.');
    await loadList();
    void loadMicr(response.data.id);
  };

  const saveMicr = async (): Promise<void> => {
    if (!form.value.id) return;
    setError(null);
    const response = await window.sams.masters.saveMicr({
      ...micrForm,
      bankMasterId: form.value.id,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMicrForm(response.data);
    setMicrEditing(false);
    setMessage('MICR code saved.');
    await loadMicr(form.value.id);
  };

  const lookup = async (): Promise<void> => {
    const response = await window.sams.masters.lookupMicr(lookupCode);
    if (!response.success) {
      setLookupResult(getIpcErrorMessage(response.error));
      return;
    }
    if (!response.data) {
      setLookupResult('No bank found for this MICR code.');
      return;
    }
    setLookupResult(
      `${response.data.bankName}, ${response.data.branchName}${response.data.address ? ` — ${response.data.address}` : ''}`,
    );
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Bank Master</h2>
      <p className="muted">Payee banks with 9-digit MICR codes for voucher auto-fill.</p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyBank());
          setMicrCodes([]);
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

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={form.value.id === item.id ? 'active' : undefined}
                  onClick={() => selectItem(item)}
                >
                  <strong>{item.bankName}</strong>
                  <span>{item.branchName}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Bank Name *
              <input
                disabled={disabled}
                value={form.value.bankName}
                onChange={(e) => form.setValue({ ...form.value, bankName: e.target.value })}
              />
            </label>
            <label>
              Branch Name *
              <input
                disabled={disabled}
                value={form.value.branchName}
                onChange={(e) => form.setValue({ ...form.value, branchName: e.target.value })}
              />
            </label>
            <label className="full-width">
              Address
              <textarea
                disabled={disabled}
                rows={2}
                value={form.value.address ?? ''}
                onChange={(e) => form.setValue({ ...form.value, address: e.target.value || null })}
              />
            </label>
            <label>
              Telephone
              <input
                disabled={disabled}
                value={form.value.telephone ?? ''}
                onChange={(e) => form.setValue({ ...form.value, telephone: e.target.value || null })}
              />
            </label>
            <label>
              Contact Person
              <input
                disabled={disabled}
                value={form.value.contactPerson ?? ''}
                onChange={(e) =>
                  form.setValue({ ...form.value, contactPerson: e.target.value || null })
                }
              />
            </label>
          </div>

          {form.value.id && (
            <div className="form-section">
              <h3>MICR Codes</h3>
              <div className="form-grid">
                <label>
                  MICR Code (9 digits)
                  <input
                    disabled={!micrEditing}
                    maxLength={9}
                    value={micrForm.micrCode}
                    onChange={(e) => setMicrForm({ ...micrForm, micrCode: e.target.value })}
                  />
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    disabled={!micrEditing}
                    checked={micrForm.isActive}
                    onChange={(e) => setMicrForm({ ...micrForm, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div className="drawer-actions">
                <button type="button" onClick={() => setMicrEditing(true)}>
                  Add MICR
                </button>
                <button
                  type="button"
                  disabled={!micrEditing}
                  onClick={() => void saveMicr()}
                >
                  Save MICR
                </button>
              </div>
              <ul>
                {micrCodes.map((code) => (
                  <li key={code.id}>
                    <button type="button" onClick={() => setMicrForm(code)}>
                      {code.micrCode} {code.isActive ? '' : '(inactive)'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-section">
            <h3>MICR Lookup Test</h3>
            <div className="form-grid">
              <label>
                Enter MICR
                <input
                  maxLength={9}
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                />
              </label>
              <button type="button" onClick={() => void lookup()}>
                Lookup
              </button>
            </div>
            {lookupResult && <p className="muted">{lookupResult}</p>}
          </div>
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete bank?"
        message="This removes the bank and all MICR codes."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          if (!form.value.id) return;
          await window.sams.masters.deleteBank(form.value.id);
          form.commit(emptyBank());
          setMicrCodes([]);
          await loadList();
        }}
      />

      <AuditIdentityModal
        open={auditOpen}
        audit={{
          createdAt: form.value.createdAt,
          createdBy: form.value.createdBy,
          updatedAt: form.value.updatedAt,
          updatedBy: form.value.updatedBy,
        }}
        onClose={() => setAuditOpen(false)}
      />
    </section>
  );
}
