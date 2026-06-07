import { useCallback, useEffect, useState } from 'react';
import type { BuildingDto, WingDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyWing = (buildingId: string): WingDto => ({
  id: '',
  buildingId,
  shortName: '',
  fullName: '',
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function WingsScreen(): React.ReactElement {
  const form = useFormState(emptyWing(''));
  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [items, setItems] = useState<WingDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadBuildings = useCallback(async (): Promise<void> => {
    const response = await window.sams.property.listBuildings();
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setBuildings(response.data.items);
    if (!buildingId && response.data.items[0]) {
      setBuildingId(response.data.items[0].id);
    }
  }, [buildingId]);

  const loadWings = useCallback(async (): Promise<void> => {
    if (!buildingId) {
      setItems([]);
      return;
    }
    const response = await window.sams.property.listWings(buildingId);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setItems(response.data);
  }, [buildingId]);

  useEffect(() => {
    void loadBuildings();
  }, [loadBuildings]);

  useEffect(() => {
    void loadWings();
  }, [loadWings]);

  const selectItem = (item: WingDto): void => {
    form.commit(item);
    setEditing(false);
    setError(null);
    setMessage(null);
  };

  const addNew = (): void => {
    if (!buildingId) return;
    form.commit(emptyWing(buildingId));
    setEditing(true);
  };

  const save = async (): Promise<void> => {
    setError(null);
    setMessage(null);
    const response = await window.sams.property.saveWing({ ...form.value, buildingId });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Wing saved.');
    await loadWings();
  };

  const remove = async (): Promise<void> => {
    if (!form.value.id) return;
    setConfirmDelete(false);
    const response = await window.sams.property.deleteWing(form.value.id);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    if (!response.data.deleted) {
      setError(response.data.blockReason ?? 'Cannot delete this wing.');
      return;
    }
    form.commit(emptyWing(buildingId));
    setEditing(false);
    setMessage('Wing deleted.');
    await loadWings();
  };

  const currentIndex = items.findIndex((item) => item.id === form.value.id);
  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Wings</h2>
      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing, delete: !form.value.id, add: !buildingId }}
        onAdd={addNew}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onDelete={() => setConfirmDelete(true)}
        onBrowse={() => void loadWings()}
        onFirst={() => items[0] && selectItem(items[0])}
        onPrevious={() => currentIndex > 0 && selectItem(items[currentIndex - 1]!)}
        onNext={() => currentIndex < items.length - 1 && selectItem(items[currentIndex + 1]!)}
        onLast={() => items[items.length - 1] && selectItem(items[items.length - 1]!)}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <label className="field-label master-filter">
        Building
        <select
          value={buildingId}
          onChange={(event) => {
            setBuildingId(event.target.value);
            form.commit(emptyWing(event.target.value));
            setEditing(false);
          }}
        >
          <option value="">Select building…</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.shortName} — {building.fullName}
            </option>
          ))}
        </select>
      </label>

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <p className="muted">{items.length} wing(s)</p>
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
          <p className="muted">Use &quot;.&quot; as short name for societies without wings.</p>
          <div className="form-grid">
            <label>
              Short Name *
              <input
                disabled={disabled}
                value={form.value.shortName}
                onChange={(event) =>
                  form.setValue({ ...form.value, shortName: event.target.value })
                }
              />
            </label>
            <label>
              Full Name
              <input
                disabled={disabled}
                value={form.value.fullName}
                onChange={(event) =>
                  form.setValue({ ...form.value, fullName: event.target.value })
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
        title="Delete wing?"
        message="This cannot be undone if the wing has no references. Continue?"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </section>
  );
}
