import { useCallback, useEffect, useState } from 'react';
import type {
  FloorMasterDto,
  ReferenceMasterType,
  UnitAreaDto,
  UnitCompositionDto,
  UnitTypeDto,
} from '@sams/shared-types';
import { AuditIdentityModal, MasterFormToolbar } from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

type TabId = ReferenceMasterType;

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'UNIT_AREA', label: 'Unit Areas' },
  { id: 'UNIT_TYPE', label: 'Unit Types' },
  { id: 'COMPOSITION', label: 'Compositions' },
  { id: 'FLOOR', label: 'Floors' },
];

export function ReferenceMastersScreen(): React.ReactElement {
  const [tab, setTab] = useState<TabId>('UNIT_AREA');
  const [areas, setAreas] = useState<UnitAreaDto[]>([]);
  const [types, setTypes] = useState<UnitTypeDto[]>([]);
  const [compositions, setCompositions] = useState<UnitCompositionDto[]>([]);
  const [floors, setFloors] = useState<FloorMasterDto[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const [areaForm, setAreaForm] = useState({ areaSqFt: 0, description: '', isActive: true });
  const [typeForm, setTypeForm] = useState({ typeName: '', isActive: true });
  const [compositionForm, setCompositionForm] = useState({ compositionName: '', isActive: true });
  const [floorForm, setFloorForm] = useState({ srNo: 0, floorName: '', isActive: true });

  const load = useCallback(async (): Promise<void> => {
    const response = await window.sams.property.listReferenceMasters(tab);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    switch (tab) {
      case 'UNIT_AREA':
        setAreas(response.data as UnitAreaDto[]);
        break;
      case 'UNIT_TYPE':
        setTypes(response.data as UnitTypeDto[]);
        break;
      case 'COMPOSITION':
        setCompositions(response.data as UnitCompositionDto[]);
        break;
      case 'FLOOR':
        setFloors(response.data as FloorMasterDto[]);
        break;
    }
  }, [tab]);

  useEffect(() => {
    setSelectedId('');
    setEditing(false);
    void load();
  }, [load]);

  const resetForm = (): void => {
    setAreaForm({ areaSqFt: 0, description: '', isActive: true });
    setTypeForm({ typeName: '', isActive: true });
    setCompositionForm({ compositionName: '', isActive: true });
    setFloorForm({ srNo: floors.length, floorName: '', isActive: true });
  };

  const selectArea = (item: UnitAreaDto): void => {
    setSelectedId(item.id);
    setAreaForm({
      areaSqFt: item.areaSqFt,
      description: item.description ?? '',
      isActive: item.isActive,
    });
    setEditing(false);
  };

  const selectType = (item: UnitTypeDto): void => {
    setSelectedId(item.id);
    setTypeForm({ typeName: item.typeName, isActive: item.isActive });
    setEditing(false);
  };

  const selectComposition = (item: UnitCompositionDto): void => {
    setSelectedId(item.id);
    setCompositionForm({ compositionName: item.compositionName, isActive: item.isActive });
    setEditing(false);
  };

  const selectFloor = (item: FloorMasterDto): void => {
    setSelectedId(item.id);
    setFloorForm({ srNo: item.srNo, floorName: item.floorName, isActive: item.isActive });
    setEditing(false);
  };

  const save = async (): Promise<void> => {
    setError(null);
    setMessage(null);
    let payload: Record<string, unknown>;
    switch (tab) {
      case 'UNIT_AREA':
        payload = { id: selectedId || undefined, ...areaForm };
        break;
      case 'UNIT_TYPE':
        payload = { id: selectedId || undefined, ...typeForm };
        break;
      case 'COMPOSITION':
        payload = { id: selectedId || undefined, ...compositionForm };
        break;
      case 'FLOOR':
        payload = { id: selectedId || undefined, ...floorForm };
        break;
    }
    const response = await window.sams.property.saveReferenceMaster(tab, payload);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setEditing(false);
    setMessage('Reference master saved.');
    await load();
    const saved = response.data as { id: string };
    setSelectedId(saved.id);
  };

  const auditRecord = (): {
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  } | null => {
    if (!selectedId) return null;
    if (tab === 'UNIT_AREA') {
      const item = areas.find((row) => row.id === selectedId);
      return item ?? null;
    }
    if (tab === 'UNIT_TYPE') {
      const item = types.find((row) => row.id === selectedId);
      return item ?? null;
    }
    if (tab === 'COMPOSITION') {
      const item = compositions.find((row) => row.id === selectedId);
      return item ?? null;
    }
    const item = floors.find((row) => row.id === selectedId);
    return item ?? null;
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Reference Masters</h2>
      <MasterFormToolbar
        disabled={{ save: !editing, cancel: !editing }}
        onAdd={() => {
          setSelectedId('');
          resetForm();
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          setEditing(false);
          if (selectedId) void load();
          else resetForm();
        }}
        onBrowse={() => void load()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="tab-bar-inline">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={tab === entry.id ? 'tab-inline active' : 'tab-inline'}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <ul>
            {tab === 'UNIT_AREA' &&
              areas.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={selectedId === item.id ? 'active' : undefined}
                    onClick={() => selectArea(item)}
                  >
                    <strong>{item.areaSqFt} sq.ft.</strong>
                    <span>{item.description ?? '—'}</span>
                  </button>
                </li>
              ))}
            {tab === 'UNIT_TYPE' &&
              types.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={selectedId === item.id ? 'active' : undefined}
                    onClick={() => selectType(item)}
                  >
                    {item.typeName}
                  </button>
                </li>
              ))}
            {tab === 'COMPOSITION' &&
              compositions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={selectedId === item.id ? 'active' : undefined}
                    onClick={() => selectComposition(item)}
                  >
                    {item.compositionName}
                  </button>
                </li>
              ))}
            {tab === 'FLOOR' &&
              floors.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={selectedId === item.id ? 'active' : undefined}
                    onClick={() => selectFloor(item)}
                  >
                    <strong>{item.srNo}</strong>
                    <span>{item.floorName}</span>
                  </button>
                </li>
              ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          {tab === 'UNIT_AREA' && (
            <div className="form-grid">
              <label>
                Area (sq.ft.) *
                <input
                  type="number"
                  min={0}
                  disabled={disabled}
                  value={areaForm.areaSqFt}
                  onChange={(event) =>
                    setAreaForm({ ...areaForm, areaSqFt: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                Description
                <input
                  disabled={disabled}
                  value={areaForm.description}
                  onChange={(event) =>
                    setAreaForm({ ...areaForm, description: event.target.value })
                  }
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={areaForm.isActive}
                  onChange={(event) =>
                    setAreaForm({ ...areaForm, isActive: event.target.checked })
                  }
                />
                Active
              </label>
            </div>
          )}

          {tab === 'UNIT_TYPE' && (
            <div className="form-grid">
              <label>
                Type Name *
                <input
                  disabled={disabled}
                  value={typeForm.typeName}
                  onChange={(event) =>
                    setTypeForm({ ...typeForm, typeName: event.target.value })
                  }
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={typeForm.isActive}
                  onChange={(event) =>
                    setTypeForm({ ...typeForm, isActive: event.target.checked })
                  }
                />
                Active
              </label>
            </div>
          )}

          {tab === 'COMPOSITION' && (
            <div className="form-grid">
              <label>
                Composition Name *
                <input
                  disabled={disabled}
                  value={compositionForm.compositionName}
                  onChange={(event) =>
                    setCompositionForm({
                      ...compositionForm,
                      compositionName: event.target.value,
                    })
                  }
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={compositionForm.isActive}
                  onChange={(event) =>
                    setCompositionForm({
                      ...compositionForm,
                      isActive: event.target.checked,
                    })
                  }
                />
                Active
              </label>
            </div>
          )}

          {tab === 'FLOOR' && (
            <div className="form-grid">
              <label>
                Serial No. *
                <input
                  type="number"
                  disabled={disabled}
                  value={floorForm.srNo}
                  onChange={(event) =>
                    setFloorForm({ ...floorForm, srNo: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                Floor Name *
                <input
                  disabled={disabled}
                  value={floorForm.floorName}
                  onChange={(event) =>
                    setFloorForm({ ...floorForm, floorName: event.target.value })
                  }
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={floorForm.isActive}
                  onChange={(event) =>
                    setFloorForm({ ...floorForm, isActive: event.target.checked })
                  }
                />
                Active
              </label>
            </div>
          )}
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      {auditRecord() && (
        <AuditIdentityModal
          open={auditOpen}
          audit={auditRecord()!}
          onClose={() => setAuditOpen(false)}
        />
      )}
    </section>
  );
}
