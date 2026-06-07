import { useCallback, useEffect, useState } from 'react';
import {
  UnitStatus,
  type BuildingDto,
  type FloorMasterDto,
  type UnitCompositionDto,
  type UnitDto,
  type UnitSaveDto,
  type UnitTypeDto,
  type WingDto,
} from '@sams/shared-types';
import {
  AuditIdentityModal,
  ConfirmDialog,
  MasterFormToolbar,
  MoneyInput,
  OpeningBalanceModal,
} from '../../components';
import type { MemberFullDto } from '@sams/shared-types';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyUnit = (buildingId: string, wingId: string): UnitSaveDto => ({
  buildingId,
  wingId,
  unitNo: '',
  floorMasterId: null,
  unitTypeId: null,
  unitCompositionId: null,
  unitAreaId: null,
  carpetAreaSqFt: null,
  residentialAreaSqFt: null,
  commercialAreaSqFt: null,
  residentialRateableValue: null,
  commercialRateableValue: null,
  status: UnitStatus.VACANT,
  constructionValue: null,
  landValue: null,
});

export function UnitsScreen(): React.ReactElement {
  const form = useFormState(emptyUnit('', ''));
  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [wings, setWings] = useState<WingDto[]>([]);
  const [floors, setFloors] = useState<FloorMasterDto[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitTypeDto[]>([]);
  const [compositions, setCompositions] = useState<UnitCompositionDto[]>([]);
  const [items, setItems] = useState<UnitDto[]>([]);
  const [filterBuildingId, setFilterBuildingId] = useState('');
  const [filterWingId, setFilterWingId] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [unitHint, setUnitHint] = useState<string | null>(null);
  const [serialNo, setSerialNo] = useState<number | null>(null);
  const [audit, setAudit] = useState<{
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  } | null>(null);
  const [unitMember, setUnitMember] = useState<MemberFullDto | null>(null);
  const [obModalOpen, setObModalOpen] = useState(false);

  const loadMasters = useCallback(async (): Promise<void> => {
    const [buildingRes, floorRes, typeRes, compRes] = await Promise.all([
      window.sams.property.listBuildings(),
      window.sams.property.listReferenceMasters('FLOOR'),
      window.sams.property.listReferenceMasters('UNIT_TYPE'),
      window.sams.property.listReferenceMasters('COMPOSITION'),
    ]);
    if (buildingRes.success && buildingRes.data) {
      setBuildings(buildingRes.data.items);
      if (!filterBuildingId && buildingRes.data.items[0]) {
        setFilterBuildingId(buildingRes.data.items[0].id);
      }
    }
    if (floorRes.success && floorRes.data) setFloors(floorRes.data as FloorMasterDto[]);
    if (typeRes.success && typeRes.data) setUnitTypes(typeRes.data as UnitTypeDto[]);
    if (compRes.success && compRes.data) setCompositions(compRes.data as UnitCompositionDto[]);
  }, [filterBuildingId]);

  const loadWings = useCallback(async (buildingId: string): Promise<void> => {
    if (!buildingId) {
      setWings([]);
      return;
    }
    const response = await window.sams.property.listWings(buildingId);
    if (response.success && response.data) {
      setWings(response.data);
      if (!filterWingId && response.data[0]) {
        setFilterWingId(response.data[0].id);
      }
    }
  }, [filterWingId]);

  const loadUnits = useCallback(async (): Promise<void> => {
    const response = await window.sams.property.listUnits(
      filterBuildingId || undefined,
      filterWingId || undefined,
      search || undefined,
    );
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setItems(response.data.items);
  }, [filterBuildingId, filterWingId, search]);

  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    void loadWings(filterBuildingId);
  }, [filterBuildingId, loadWings]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const selectItem = async (id: string): Promise<void> => {
    const response = await window.sams.property.getUnit(id);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    const detail = response.data;
    form.commit({
      id: detail.id,
      buildingId: detail.buildingId,
      wingId: detail.wingId,
      unitNo: detail.unitNo,
      floorMasterId: detail.floorMasterId,
      unitTypeId: detail.unitTypeId,
      unitCompositionId: detail.unitCompositionId,
      unitAreaId: detail.unitAreaId,
      carpetAreaSqFt: detail.carpetAreaSqFt,
      residentialAreaSqFt: detail.residentialAreaSqFt,
      commercialAreaSqFt: detail.commercialAreaSqFt,
      residentialRateableValue: detail.residentialRateableValue,
      commercialRateableValue: detail.commercialRateableValue,
      status: detail.status,
      constructionValue: detail.constructionValue,
      landValue: detail.landValue,
    });
    setSerialNo(detail.serialNo);
    setAudit({
      createdAt: detail.createdAt,
      createdBy: detail.createdBy,
      updatedAt: detail.updatedAt,
      updatedBy: detail.updatedBy,
    });
    setEditing(false);
    setError(null);
    setMessage(null);

    const vacancy = await window.sams.member.checkUnitVacancy(detail.id);
    if (vacancy.success && vacancy.data && !vacancy.data.vacant && vacancy.data.currentMember) {
      const memberRes = await window.sams.member.get(vacancy.data.currentMember.id);
      setUnitMember(memberRes.success && memberRes.data ? memberRes.data : null);
    } else {
      setUnitMember(null);
    }
  };

  const addNew = (): void => {
    if (!filterBuildingId || !filterWingId) return;
    form.commit(emptyUnit(filterBuildingId, filterWingId));
    setSerialNo(null);
    setAudit(null);
    setEditing(true);
    setUnitHint(null);
  };

  const validateUnitNumber = async (): Promise<void> => {
    if (!form.value.buildingId || !form.value.wingId || !form.value.unitNo) return;
    const response = await window.sams.property.validateUnitNo(
      form.value.buildingId,
      form.value.wingId,
      form.value.unitNo,
      form.value.id,
    );
    if (response.success && response.data) {
      if (!response.data.unique) {
        setUnitHint(
          response.data.suggestion
            ? `Duplicate unit number. Suggested: ${response.data.suggestion}`
            : 'Duplicate unit number for this building and wing.',
        );
      } else {
        setUnitHint(null);
      }
    }
  };

  const save = async (): Promise<void> => {
    setError(null);
    setMessage(null);
    const response = await window.sams.property.saveUnit(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    const detail = response.data;
    form.commit({
      id: detail.id,
      buildingId: detail.buildingId,
      wingId: detail.wingId,
      unitNo: detail.unitNo,
      floorMasterId: detail.floorMasterId,
      unitTypeId: detail.unitTypeId,
      unitCompositionId: detail.unitCompositionId,
      unitAreaId: detail.unitAreaId,
      carpetAreaSqFt: detail.carpetAreaSqFt,
      residentialAreaSqFt: detail.residentialAreaSqFt,
      commercialAreaSqFt: detail.commercialAreaSqFt,
      residentialRateableValue: detail.residentialRateableValue,
      commercialRateableValue: detail.commercialRateableValue,
      status: detail.status,
      constructionValue: detail.constructionValue,
      landValue: detail.landValue,
    });
    setEditing(false);
    setSerialNo(detail.serialNo);
    setAudit({
      createdAt: detail.createdAt,
      createdBy: detail.createdBy,
      updatedAt: detail.updatedAt,
      updatedBy: detail.updatedBy,
    });
    setMessage(`Unit saved (serial no. ${detail.serialNo}).`);
    await loadUnits();
  };

  const archive = async (): Promise<void> => {
    if (!form.value.id) return;
    setConfirmArchive(false);
    const response = await window.sams.property.archiveUnit(form.value.id);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage('Unit archived.');
    form.commit(emptyUnit(filterBuildingId, filterWingId));
    setSerialNo(null);
    setAudit(null);
    setEditing(false);
    await loadUnits();
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Units</h2>
      <MasterFormToolbar
        disabled={{
          save: !editing || !form.dirty,
          cancel: !editing,
          delete: !form.value.id || form.value.status === UnitStatus.ARCHIVED,
          add: !filterBuildingId || !filterWingId,
        }}
        onAdd={addNew}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onDelete={() => setConfirmArchive(true)}
        onFind={() => {
          const value = window.prompt('Search unit number:', search) ?? search;
          setSearch(value);
        }}
        onBrowse={() => void loadUnits()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="form-grid master-filters">
        <label className="field-label">
          Building
          <select
            value={filterBuildingId}
            onChange={(event) => {
              setFilterBuildingId(event.target.value);
              setFilterWingId('');
            }}
          >
            <option value="">All</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.shortName}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Wing
          <select
            value={filterWingId}
            onChange={(event) => setFilterWingId(event.target.value)}
          >
            <option value="">All</option>
            {wings.map((wing) => (
              <option key={wing.id} value={wing.id}>
                {wing.shortName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <p className="muted">{items.length} unit(s)</p>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={form.value.id === item.id ? 'active' : undefined}
                  onClick={() => void selectItem(item.id)}
                >
                  <strong>{item.unitNo}</strong>
                  <span>
                    #{item.serialNo} · {item.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          {serialNo != null && <p className="muted">Serial No.: {serialNo}</p>}
          <div className="form-grid">
            <label>
              Unit No. *
              <input
                disabled={disabled}
                value={form.value.unitNo}
                onChange={(event) =>
                  form.setValue({ ...form.value, unitNo: event.target.value })
                }
                onBlur={() => void validateUnitNumber()}
              />
            </label>
            <label>
              Status
              <select
                disabled={disabled}
                value={form.value.status}
                onChange={(event) =>
                  form.setValue({ ...form.value, status: event.target.value as UnitStatus })
                }
              >
                {Object.values(UnitStatus)
                  .filter((value) => value !== UnitStatus.ARCHIVED || form.value.id)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Floor
              <select
                disabled={disabled}
                value={form.value.floorMasterId ?? ''}
                onChange={(event) =>
                  form.setValue({
                    ...form.value,
                    floorMasterId: event.target.value || null,
                  })
                }
              >
                <option value="">—</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.floorName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unit Type
              <select
                disabled={disabled}
                value={form.value.unitTypeId ?? ''}
                onChange={(event) =>
                  form.setValue({
                    ...form.value,
                    unitTypeId: event.target.value || null,
                  })
                }
              >
                <option value="">—</option>
                {unitTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.typeName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Composition
              <select
                disabled={disabled}
                value={form.value.unitCompositionId ?? ''}
                onChange={(event) =>
                  form.setValue({
                    ...form.value,
                    unitCompositionId: event.target.value || null,
                  })
                }
              >
                <option value="">—</option>
                {compositions.map((composition) => (
                  <option key={composition.id} value={composition.id}>
                    {composition.compositionName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Carpet Area (sq.ft.)
              <input
                type="number"
                min={0}
                disabled={disabled}
                value={form.value.carpetAreaSqFt ?? ''}
                onChange={(event) =>
                  form.setValue({
                    ...form.value,
                    carpetAreaSqFt: event.target.value ? Number(event.target.value) : null,
                  })
                }
              />
            </label>
            <label>
              Residential Area (sq.ft.)
              <input
                type="number"
                min={0}
                disabled={disabled}
                value={form.value.residentialAreaSqFt ?? ''}
                onChange={(event) =>
                  form.setValue({
                    ...form.value,
                    residentialAreaSqFt: event.target.value ? Number(event.target.value) : null,
                  })
                }
              />
            </label>
            <label>
              Commercial Area (sq.ft.)
              <input
                type="number"
                min={0}
                disabled={disabled}
                value={form.value.commercialAreaSqFt ?? ''}
                onChange={(event) =>
                  form.setValue({
                    ...form.value,
                    commercialAreaSqFt: event.target.value ? Number(event.target.value) : null,
                  })
                }
              />
            </label>
            <MoneyInput
              label="Residential Rateable Value"
              disabled={disabled}
              value={form.value.residentialRateableValue ?? 0}
              onChange={(value) =>
                form.setValue({ ...form.value, residentialRateableValue: value })
              }
            />
            <MoneyInput
              label="Commercial Rateable Value"
              disabled={disabled}
              value={form.value.commercialRateableValue ?? 0}
              onChange={(value) =>
                form.setValue({ ...form.value, commercialRateableValue: value })
              }
            />
            <MoneyInput
              label="Construction Value"
              disabled={disabled}
              value={form.value.constructionValue ?? 0}
              onChange={(value) => form.setValue({ ...form.value, constructionValue: value })}
            />
            <MoneyInput
              label="Land Value"
              disabled={disabled}
              value={form.value.landValue ?? 0}
              onChange={(value) => form.setValue({ ...form.value, landValue: value })}
            />
          </div>

          {unitHint && <p className="form-error">{unitHint}</p>}

          <div className="form-section">
            <h3>Opening Balance &amp; Tariff</h3>
            <p className="muted">
              Opening balance is entered against the unit&apos;s current member. Embedded simple
              tariffs remain scheduled for the billing phase.
            </p>
            <button
              type="button"
              disabled={!unitMember}
              title={unitMember ? undefined : 'Assign an active member to this unit first'}
              onClick={() => setObModalOpen(true)}
            >
              Opening Balance…
            </button>
            {unitMember && (
              <span className="muted"> Current member: {unitMember.memberName}</span>
            )}
          </div>
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <ConfirmDialog
        open={confirmArchive}
        title="Archive unit?"
        message="Archived units are soft-deleted and cannot accept new members. Continue?"
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => void archive()}
      />

      <AuditIdentityModal
        open={auditOpen}
        audit={audit}
        onClose={() => setAuditOpen(false)}
      />

      {unitMember && (
        <OpeningBalanceModal
          open={obModalOpen}
          memberId={unitMember.id}
          memberName={unitMember.memberName}
          existing={unitMember.openingBalances}
          onClose={() => setObModalOpen(false)}
          onSaved={async () => {
            const memberRes = await window.sams.member.get(unitMember.id);
            if (memberRes.success && memberRes.data) setUnitMember(memberRes.data);
          }}
        />
      )}
    </section>
  );
}
