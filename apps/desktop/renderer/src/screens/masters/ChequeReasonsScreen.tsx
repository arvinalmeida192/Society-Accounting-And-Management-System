import { useCallback, useEffect, useState } from 'react';
import type { ChequeCancellationReasonDto, DishonouredChequeDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyReason = (): ChequeCancellationReasonDto => ({
  id: '',
  reasonCode: '',
  reasonDescription: '',
  category: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function ChequeReasonsScreen(): React.ReactElement {
  const form = useFormState(emptyReason());
  const [items, setItems] = useState<ChequeCancellationReasonDto[]>([]);
  const [dishonoured, setDishonoured] = useState<DishonouredChequeDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.masters.listChequeReasons();
    if (response.success && response.data) setItems(response.data);
  }, []);

  const loadDishonoured = useCallback(async (reasonId: string): Promise<void> => {
    if (!reasonId) {
      setDishonoured([]);
      return;
    }
    const response = await window.sams.masters.listDishonoured(reasonId);
    if (response.success && response.data) setDishonoured(response.data);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const selectItem = (item: ChequeCancellationReasonDto): void => {
    form.commit(item);
    setEditing(false);
    void loadDishonoured(item.id);
  };

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.masters.saveChequeReason(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Reason saved.');
    await loadList();
    void loadDishonoured(response.data.id);
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Cheque Cancellation Reasons</h2>
      <p className="muted">Reason codes for dishonoured cheques. Linked cheques appear below.</p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyReason());
          setDishonoured([]);
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
                  <strong>{item.reasonCode}</strong>
                  <span>{item.reasonDescription}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Reason Code *
              <input
                disabled={disabled}
                value={form.value.reasonCode}
                onChange={(e) => form.setValue({ ...form.value, reasonCode: e.target.value })}
              />
            </label>
            <label>
              Description *
              <input
                disabled={disabled}
                value={form.value.reasonDescription}
                onChange={(e) =>
                  form.setValue({ ...form.value, reasonDescription: e.target.value })
                }
              />
            </label>
            <label>
              Category
              <input
                disabled={disabled}
                value={form.value.category ?? ''}
                onChange={(e) => form.setValue({ ...form.value, category: e.target.value || null })}
              />
            </label>
          </div>

          {form.value.id && (
            <div className="form-section">
              <h3>Dishonoured Cheques</h3>
              {dishonoured.length === 0 ? (
                <p className="muted">No dishonoured cheques linked to this reason yet.</p>
              ) : (
                <ul>
                  {dishonoured.map((row) => (
                    <li key={row.id}>
                      Cheque {row.chequeNo} — ₹{row.amount.toFixed(2)} — cancelled{' '}
                      {row.cancelledOn?.slice(0, 10)} — Voucher {row.voucherId.slice(0, 8)}…
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete reason?"
        message="This removes the cancellation reason code."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          if (!form.value.id) return;
          await window.sams.masters.deleteChequeReason(form.value.id);
          form.commit(emptyReason());
          setDishonoured([]);
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
