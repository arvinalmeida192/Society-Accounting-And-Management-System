import { useCallback, useEffect, useState } from 'react';
import type { ContractorDetailDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyContractor = (): ContractorDetailDto => ({
  id: '',
  contractorName: '',
  contractType: null,
  contractDate: null,
  buildingName: null,
  address: null,
  telephone: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function ContractorsScreen(): React.ReactElement {
  const form = useFormState(emptyContractor());
  const [items, setItems] = useState<ContractorDetailDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.masters.listContractors();
    if (response.success && response.data) setItems(response.data);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.masters.saveContractor({
      ...form.value,
      contractDate: form.value.contractDate
        ? new Date(form.value.contractDate).toISOString()
        : null,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit({
      ...response.data,
      contractDate: response.data.contractDate?.slice(0, 10) ?? null,
    });
    setEditing(false);
    setMessage('Contractor saved.');
    await loadList();
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Contractors</h2>
      <p className="muted">Contractor details for society maintenance and project records.</p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyContractor());
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
                    form.commit({
                      ...item,
                      contractDate: item.contractDate?.slice(0, 10) ?? null,
                    });
                    setEditing(false);
                  }}
                >
                  <strong>{item.contractorName}</strong>
                  <span>{item.contractType ?? '—'}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Contractor Name *
              <input
                disabled={disabled}
                value={form.value.contractorName}
                onChange={(e) =>
                  form.setValue({ ...form.value, contractorName: e.target.value })
                }
              />
            </label>
            <label>
              Type of Contract
              <input
                disabled={disabled}
                value={form.value.contractType ?? ''}
                onChange={(e) =>
                  form.setValue({ ...form.value, contractType: e.target.value || null })
                }
              />
            </label>
            <label>
              Contract Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.contractDate ?? ''}
                onChange={(e) =>
                  form.setValue({ ...form.value, contractDate: e.target.value || null })
                }
              />
            </label>
            <label>
              Building Name
              <input
                disabled={disabled}
                value={form.value.buildingName ?? ''}
                onChange={(e) =>
                  form.setValue({ ...form.value, buildingName: e.target.value || null })
                }
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
                onChange={(e) =>
                  form.setValue({ ...form.value, telephone: e.target.value || null })
                }
              />
            </label>
          </div>
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete contractor?"
        message="This contractor record will be removed."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          if (!form.value.id) return;
          await window.sams.masters.deleteContractor(form.value.id);
          form.commit(emptyContractor());
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
