import { useCallback, useEffect, useState } from 'react';
import type { AccountPickerItem, ParkingSpaceDto, ParkingTariffTypeDto } from '@sams/shared-types';
import { AccountPickerModal, AuditIdentityModal, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptySpace = (): ParkingSpaceDto => ({
  id: '',
  parkingNo: '',
  parkingTariffTypeId: '',
  chargeAccountId: '',
  isActive: true,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function ParkingSpacesScreen(): React.ReactElement {
  const form = useFormState(emptySpace());
  const [items, setItems] = useState<ParkingSpaceDto[]>([]);
  const [tariffTypes, setTariffTypes] = useState<ParkingTariffTypeDto[]>([]);
  const [chargeLabel, setChargeLabel] = useState('');
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const [spaceRes, typeRes] = await Promise.all([
      window.sams.property.listParkingSpaces(),
      window.sams.property.listParkingTariffTypes(),
    ]);
    if (spaceRes.success && spaceRes.data) setItems(spaceRes.data);
    if (typeRes.success && typeRes.data) setTariffTypes(typeRes.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectItem = (item: ParkingSpaceDto): void => {
    form.commit(item);
    setEditing(false);
    setChargeLabel(item.chargeAccountId);
    setError(null);
    setMessage(null);
  };

  const save = async (): Promise<void> => {
    if (!form.value.parkingTariffTypeId || !form.value.chargeAccountId) {
      setError('Tariff type and charge account are required.');
      return;
    }
    setError(null);
    const response = await window.sams.property.saveParkingSpace(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Parking space saved.');
    await load();
  };

  const onAccountSelect = (item: AccountPickerItem): void => {
    form.setValue({ ...form.value, chargeAccountId: item.id });
    setChargeLabel(item.label);
    setPickerOpen(false);
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Parking Spaces</h2>
      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptySpace());
          setChargeLabel('');
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onBrowse={() => void load()}
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
                  <strong>{item.parkingNo}</strong>
                  {!item.isActive && <span> (inactive)</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Parking No. *
              <input
                disabled={disabled}
                value={form.value.parkingNo}
                onChange={(event) =>
                  form.setValue({ ...form.value, parkingNo: event.target.value })
                }
              />
            </label>
            <label>
              Tariff Type *
              <select
                disabled={disabled}
                value={form.value.parkingTariffTypeId}
                onChange={(event) =>
                  form.setValue({ ...form.value, parkingTariffTypeId: event.target.value })
                }
              >
                <option value="">Select…</option>
                {tariffTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.typeName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Charge Account *
              <div className="linkage-picker-row">
                <span className="linkage-picker-value">{chargeLabel || 'Not selected'}</span>
                <button type="button" disabled={disabled} onClick={() => setPickerOpen(true)}>
                  Pick…
                </button>
              </div>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                disabled={disabled}
                checked={form.value.isActive}
                onChange={(event) =>
                  form.setValue({ ...form.value, isActive: event.target.checked })
                }
              />
              Active
            </label>
          </div>
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <AccountPickerModal
        open={pickerOpen}
        title="Select parking charge account"
        kind="ACCOUNT"
        onClose={() => setPickerOpen(false)}
        onSelect={onAccountSelect}
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
