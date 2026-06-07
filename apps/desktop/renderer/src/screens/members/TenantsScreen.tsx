import { useCallback, useEffect, useState } from 'react';
import type { BuildingDto, TenantDto, TenantSaveDto, UnitDto, WingDto } from '@sams/shared-types';
import { AuditIdentityModal, ConfirmDialog, MasterFormToolbar } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyTenant = (unitId: string): TenantSaveDto => ({
  unitId,
  tenantName: '',
  phone: null,
  email: null,
  licenseAgreementDate: new Date().toISOString().slice(0, 10),
  licenseExpiryDate: new Date().toISOString().slice(0, 10),
  monthlyRent: null,
  isActive: true,
});

export function TenantsScreen(): React.ReactElement {
  const [items, setItems] = useState<TenantDto[]>([]);
  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [wings, setWings] = useState<WingDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [wingId, setWingId] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const form = useFormState(emptyTenant(''));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [audit, setAudit] = useState<{
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  } | null>(null);

  const loadMasters = useCallback(async (): Promise<void> => {
    const buildingRes = await window.sams.property.listBuildings();
    if (buildingRes.success && buildingRes.data) {
      setBuildings(buildingRes.data.items);
      if (!buildingId && buildingRes.data.items[0]) {
        setBuildingId(buildingRes.data.items[0].id);
      }
    }
  }, [buildingId]);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.tenant.list(undefined, activeOnly || undefined);
    if (response.success && response.data) {
      setItems(response.data);
    }
  }, [activeOnly]);

  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!buildingId) return;
    void window.sams.property.listWings(buildingId).then((res) => {
      if (res.success && res.data) {
        setWings(res.data);
        if (!wingId && res.data[0]) setWingId(res.data[0].id);
      }
    });
  }, [buildingId, wingId]);

  useEffect(() => {
    if (!buildingId) return;
    void window.sams.property.listUnits(buildingId, wingId || undefined).then((res) => {
      if (res.success && res.data) setUnits(res.data.items);
    });
  }, [buildingId, wingId]);

  const selectItem = (item: TenantDto): void => {
    form.commit({
      id: item.id,
      unitId: item.unitId,
      tenantName: item.tenantName,
      phone: item.phone,
      email: item.email,
      licenseAgreementDate: item.licenseAgreementDate.slice(0, 10),
      licenseExpiryDate: item.licenseExpiryDate.slice(0, 10),
      monthlyRent: item.monthlyRent,
      isActive: item.isActive,
    });
    setAudit({
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      updatedAt: item.updatedAt,
      updatedBy: item.updatedBy,
    });
    setEditing(false);
    setError(null);
  };

  const save = async (): Promise<void> => {
    if (!form.value.tenantName?.trim() || !form.value.unitId) {
      setError('Tenant name and unit are required.');
      return;
    }
    setError(null);
    const response = await window.sams.tenant.save({
      ...form.value,
      licenseAgreementDate: new Date(form.value.licenseAgreementDate).toISOString(),
      licenseExpiryDate: new Date(form.value.licenseExpiryDate).toISOString(),
    });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit({
      ...response.data,
      licenseAgreementDate: response.data.licenseAgreementDate.slice(0, 10),
      licenseExpiryDate: response.data.licenseExpiryDate.slice(0, 10),
    });
    setEditing(false);
    setMessage('Tenant saved.');
    await loadList();
  };

  const archive = async (): Promise<void> => {
    if (!form.value.id) return;
    setConfirmArchive(false);
    const response = await window.sams.tenant.archive(form.value.id);
    if (!response.success) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage('Tenant archived.');
    await loadList();
    if (response.data) selectItem(response.data);
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Tenant Register</h2>
      <p className="muted">One active tenant per unit. Supplementary billing uses active tenants only.</p>

      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyTenant(units[0]?.id ?? ''));
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onDelete={form.value.id && form.value.isActive ? () => setConfirmArchive(true) : undefined}
        onBrowse={() => void loadList()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={activeOnly}
          onChange={(event) => setActiveOnly(event.target.checked)}
        />
        Show active tenants only
      </label>

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
                  <strong>{item.tenantName}</strong>
                  <span>
                    {item.buildingShortName}-{item.wingShortName}-{item.unitNo}
                    {!item.isActive ? ' (archived)' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Building (filter)
              <select
                value={buildingId}
                onChange={(event) => setBuildingId(event.target.value)}
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.shortName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Wing (filter)
              <select value={wingId} onChange={(event) => setWingId(event.target.value)}>
                {wings.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unit *
              <select
                disabled={disabled}
                value={form.value.unitId}
                onChange={(event) => form.setValue({ ...form.value, unitId: event.target.value })}
              >
                <option value="">Select…</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unitNo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tenant Name *
              <input
                disabled={disabled}
                value={form.value.tenantName}
                onChange={(event) =>
                  form.setValue({ ...form.value, tenantName: event.target.value })
                }
              />
            </label>
            <label>
              Phone
              <input
                disabled={disabled}
                value={form.value.phone ?? ''}
                onChange={(event) => form.setValue({ ...form.value, phone: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                disabled={disabled}
                value={form.value.email ?? ''}
                onChange={(event) => form.setValue({ ...form.value, email: event.target.value })}
              />
            </label>
            <label>
              License Agreement Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.licenseAgreementDate}
                onChange={(event) =>
                  form.setValue({ ...form.value, licenseAgreementDate: event.target.value })
                }
              />
            </label>
            <label>
              License Expiry Date
              <input
                type="date"
                disabled={disabled}
                value={form.value.licenseExpiryDate}
                onChange={(event) =>
                  form.setValue({ ...form.value, licenseExpiryDate: event.target.value })
                }
              />
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

      <ConfirmDialog
        open={confirmArchive}
        title="Archive tenant?"
        message="Archived tenants are excluded from supplementary bill pickers."
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => void archive()}
      />

      <AuditIdentityModal
        open={auditOpen}
        audit={audit}
        onClose={() => setAuditOpen(false)}
      />
    </section>
  );
}
