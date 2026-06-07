import { useCallback, useEffect, useState } from 'react';
import { PartyType, type AddressBookEntryDto } from '@sams/shared-types';
import { AccountPickerModal, AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyEntry = (): AddressBookEntryDto => ({
  id: '',
  accountMasterId: '',
  accountParticulars: '',
  partyType: PartyType.VENDOR,
  officeAddress: null,
  otherAddress: null,
  bankBranchName: null,
  bankAccountNo: null,
  pan: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function AddressBookScreen(): React.ReactElement {
  const form = useFormState(emptyEntry());
  const [items, setItems] = useState<AddressBookEntryDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.masters.listAddressBook();
    if (response.success && response.data) setItems(response.data);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.masters.saveAddressBook(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Address book entry saved.');
    await loadList();
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Address Book</h2>
      <p className="muted">
        Party addresses linked to ledger accounts. Use SOCIETY_BANK for TDS Form 16A and deposit slips.
      </p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyEntry());
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
                  onClick={() => {
                    form.commit(item);
                    setEditing(false);
                  }}
                >
                  <strong>{item.accountParticulars}</strong>
                  <span>{item.partyType}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Account *
              <div className="picker-row">
                <input readOnly value={form.value.accountParticulars || 'Select account…'} />
                <button type="button" disabled={disabled} onClick={() => setPickerOpen(true)}>
                  Pick
                </button>
              </div>
            </label>
            <label>
              Party Type *
              <select
                disabled={disabled}
                value={form.value.partyType}
                onChange={(e) =>
                  form.setValue({ ...form.value, partyType: e.target.value as PartyType })
                }
              >
                {Object.values(PartyType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-width">
              Office Address
              <textarea
                disabled={disabled}
                rows={2}
                value={form.value.officeAddress ?? ''}
                onChange={(e) =>
                  form.setValue({ ...form.value, officeAddress: e.target.value || null })
                }
              />
            </label>
            <label>
              Bank Branch
              <input
                disabled={disabled}
                value={form.value.bankBranchName ?? ''}
                onChange={(e) =>
                  form.setValue({ ...form.value, bankBranchName: e.target.value || null })
                }
              />
            </label>
            <label>
              Bank Account No.
              <input
                disabled={disabled}
                value={form.value.bankAccountNo ?? ''}
                onChange={(e) =>
                  form.setValue({ ...form.value, bankAccountNo: e.target.value || null })
                }
              />
            </label>
            <label>
              PAN
              <input
                disabled={disabled}
                value={form.value.pan ?? ''}
                onChange={(e) => form.setValue({ ...form.value, pan: e.target.value || null })}
              />
            </label>
          </div>
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <AccountPickerModal
        open={pickerOpen}
        title="Select party account"
        kind="ACCOUNT"
        onClose={() => setPickerOpen(false)}
        onSelect={(item) => {
          form.setValue({
            ...form.value,
            accountMasterId: item.id,
            accountParticulars: item.particulars,
          });
          setPickerOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete address book entry?"
        message="This removes the party address record."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          if (!form.value.id) return;
          await window.sams.masters.deleteAddressBook(form.value.id);
          form.commit(emptyEntry());
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
