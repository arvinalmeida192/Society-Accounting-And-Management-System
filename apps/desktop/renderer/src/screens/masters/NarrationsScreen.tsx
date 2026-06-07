import { useCallback, useEffect, useState } from 'react';
import { VoucherType, type NarrationMasterDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyNarration = (): NarrationMasterDto => ({
  id: '',
  voucherTableType: VoucherType.RECEIPT,
  shortCode: '',
  narrationText: '',
  isActive: true,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function NarrationsScreen(): React.ReactElement {
  const form = useFormState(emptyNarration());
  const [items, setItems] = useState<NarrationMasterDto[]>([]);
  const [typeFilter, setTypeFilter] = useState<VoucherType | ''>('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.masters.listNarrations(typeFilter || undefined);
    if (response.success && response.data) setItems(response.data);
  }, [typeFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.masters.saveNarration(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Narration saved.');
    await loadList();
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Narration Master</h2>
      <p className="muted">Shortcodes scoped by voucher type for quick narration entry.</p>

      <label>
        Filter by voucher type
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as VoucherType | '')}>
          <option value="">All types</option>
          {Object.values(VoucherType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyNarration());
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
                  <strong>{item.shortCode}</strong>
                  <span>
                    {item.voucherTableType} — {item.narrationText.slice(0, 40)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Voucher Type *
              <select
                disabled={disabled}
                value={form.value.voucherTableType}
                onChange={(e) =>
                  form.setValue({
                    ...form.value,
                    voucherTableType: e.target.value as VoucherType,
                  })
                }
              >
                {Object.values(VoucherType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Short Code *
              <input
                disabled={disabled}
                maxLength={10}
                value={form.value.shortCode}
                onChange={(e) => form.setValue({ ...form.value, shortCode: e.target.value })}
              />
            </label>
            <label className="full-width">
              Narration Text *
              <textarea
                disabled={disabled}
                rows={3}
                value={form.value.narrationText}
                onChange={(e) => form.setValue({ ...form.value, narrationText: e.target.value })}
              />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.value.isActive}
                onChange={(e) => form.setValue({ ...form.value, isActive: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete narration?"
        message="This narration shortcode will be removed."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          if (!form.value.id) return;
          await window.sams.masters.deleteNarration(form.value.id);
          form.commit(emptyNarration());
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
