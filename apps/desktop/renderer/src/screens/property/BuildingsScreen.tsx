import { useCallback, useEffect, useState } from 'react';
import type { BuildingDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';
import { useSession } from '../../hooks/SessionContext';

const emptyBuilding = (financialYearId: string): BuildingDto => ({
  id: '',
  financialYearId,
  shortName: '',
  fullName: '',
  totalUnits: 0,
  numberOfFloors: 0,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function BuildingsScreen(): React.ReactElement {
  const { session } = useSession();
  const fyId = session?.financialYearId ?? '';
  const form = useFormState(emptyBuilding(fyId));
  const [items, setItems] = useState<BuildingDto[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.property.listBuildings(filter || undefined);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setItems(response.data.items);
  }, [filter]);

  useEffect(() => {
    if (!fyId) return;
    void loadList();
  }, [fyId, loadList]);

  const selectItem = (item: BuildingDto): void => {
    form.commit(item);
    setEditing(false);
    setError(null);
    setMessage(null);
  };

  const addNew = (): void => {
    form.commit(emptyBuilding(fyId));
    setEditing(true);
    setError(null);
    setMessage(null);
  };

  const save = async (): Promise<void> => {
    setError(null);
    setMessage(null);
    const response = await window.sams.property.saveBuilding({
      ...form.value,
      financialYearId: fyId,
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Building saved.');
    await loadList();
  };

  const remove = async (): Promise<void> => {
    if (!form.value.id) return;
    setConfirmDelete(false);
    const response = await window.sams.property.deleteBuilding(form.value.id);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    if (!response.data.deleted) {
      setError(response.data.blockReason ?? 'Cannot delete this building.');
      return;
    }
    form.commit(emptyBuilding(fyId));
    setEditing(false);
    setMessage('Building deleted.');
    await loadList();
  };

  const currentIndex = items.findIndex((item) => item.id === form.value.id);
  const navigateRecord = (index: number): void => {
    const item = items[index];
    if (item) selectItem(item);
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Buildings</h2>
      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing, delete: !form.value.id }}
        onAdd={addNew}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onDelete={() => setConfirmDelete(true)}
        onFind={() => {
          const value = window.prompt('Filter by short or full name:', filter) ?? filter;
          setFilter(value);
        }}
        onBrowse={() => void loadList()}
        onFirst={() => navigateRecord(0)}
        onPrevious={() => navigateRecord(Math.max(0, currentIndex - 1))}
        onNext={() => navigateRecord(Math.min(items.length - 1, currentIndex + 1))}
        onLast={() => navigateRecord(items.length - 1)}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <p className="muted">{items.length} building(s)</p>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={form.value.id === item.id ? 'active' : undefined}
                  onClick={() => selectItem(item)}
                >
                  <strong>{item.shortName}</strong>
                  <span>{item.fullName}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Short Name * (max 10)
              <input
                disabled={disabled}
                maxLength={10}
                value={form.value.shortName}
                onChange={(event) =>
                  form.setValue({ ...form.value, shortName: event.target.value.toUpperCase() })
                }
              />
            </label>
            <label>
              Full Name *
              <input
                disabled={disabled}
                value={form.value.fullName}
                onChange={(event) =>
                  form.setValue({ ...form.value, fullName: event.target.value })
                }
              />
            </label>
            <label>
              Total Units
              <input
                type="number"
                min={0}
                disabled={disabled}
                value={form.value.totalUnits}
                onChange={(event) =>
                  form.setValue({ ...form.value, totalUnits: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Number of Floors
              <input
                type="number"
                min={0}
                disabled={disabled}
                value={form.value.numberOfFloors}
                onChange={(event) =>
                  form.setValue({ ...form.value, numberOfFloors: Number(event.target.value) })
                }
              />
            </label>
          </div>
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

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

      <ConfirmDialog
        open={confirmDelete}
        title="Delete building?"
        message="This cannot be undone if the building has no references. Continue?"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </section>
  );
}
