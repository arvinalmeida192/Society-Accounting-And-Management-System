import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccountCategoryType,
  TariffBasisFlag,
  TariffLineType,
  TariffScopeLevel,
  type BuildingDto,
  type ReferenceMasterType,
  type SocietyParametersDto,
  type TariffDefinitionDto,
  type TariffLineDto,
  type UnitDto,
  type WingDto,
} from '@sams/shared-types';
import {
  AccountPickerModal,
  AuditIdentityModal,
  MasterFormToolbar,
  MoneyInput,
} from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

const SCOPE_LABELS: Record<TariffScopeLevel, string> = {
  [TariffScopeLevel.BUILDING]: 'Building',
  [TariffScopeLevel.WING]: 'Wing',
  [TariffScopeLevel.UNIT]: 'Unit',
  [TariffScopeLevel.COMPOSITION]: 'Composition',
  [TariffScopeLevel.TYPE]: 'Unit Type',
  [TariffScopeLevel.AREA]: 'Unit Area',
  [TariffScopeLevel.PERSON]: 'Per Person',
  [TariffScopeLevel.FLOOR]: 'Floor',
};

const BASIS_TO_SCOPE: Record<TariffBasisFlag, TariffScopeLevel> = {
  [TariffBasisFlag.BUILDING]: TariffScopeLevel.BUILDING,
  [TariffBasisFlag.WING]: TariffScopeLevel.WING,
  [TariffBasisFlag.UNIT]: TariffScopeLevel.UNIT,
  [TariffBasisFlag.COMPOSITION]: TariffScopeLevel.COMPOSITION,
  [TariffBasisFlag.TYPE]: TariffScopeLevel.TYPE,
  [TariffBasisFlag.AREA]: TariffScopeLevel.AREA,
  [TariffBasisFlag.PERSON]: TariffScopeLevel.PERSON,
  [TariffBasisFlag.FLOOR]: TariffScopeLevel.FLOOR,
};

const emptyLine = (srNo: number): TariffLineDto => ({
  id: '',
  tariffDefinitionId: '',
  srNo,
  accountMasterId: '',
  accountParticulars: '',
  accountShortCode: null,
  amount: 0,
  tariffType: TariffLineType.BOTH,
  remark: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function TariffDefinitionScreen(): React.ReactElement {
  const [parameters, setParameters] = useState<SocietyParametersDto | null>(null);
  const [scopeLevel, setScopeLevel] = useState<TariffScopeLevel>(TariffScopeLevel.UNIT);
  const [scopeRefId, setScopeRefId] = useState('');
  const [definitions, setDefinitions] = useState<TariffDefinitionDto[]>([]);
  const [selected, setSelected] = useState<TariffDefinitionDto | null>(null);
  const [lines, setLines] = useState<TariffLineDto[]>([emptyLine(1)]);
  const [editing, setEditing] = useState(false);
  const [newEffectiveDate, setNewEffectiveDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLineIndex, setPickerLineIndex] = useState<number | null>(null);

  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [wings, setWings] = useState<WingDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [referenceOptions, setReferenceOptions] = useState<Array<{ id: string; label: string }>>([]);

  const enabledScopes = useMemo(() => {
    if (!parameters) return [TariffScopeLevel.UNIT, TariffScopeLevel.BUILDING];
    return parameters.tariffStructureBasis.map((basis) => BASIS_TO_SCOPE[basis]);
  }, [parameters]);

  const loadParameters = useCallback(async (): Promise<void> => {
    const response = await window.sams.society.getParameters();
    if (response.success && response.data) {
      setParameters(response.data);
      const firstScope = response.data.tariffStructureBasis[0]
        ? BASIS_TO_SCOPE[response.data.tariffStructureBasis[0]]
        : TariffScopeLevel.UNIT;
      setScopeLevel(firstScope);
    }
  }, []);

  const loadScopeRefs = useCallback(async (level: TariffScopeLevel): Promise<void> => {
    if (level === TariffScopeLevel.BUILDING) {
      const response = await window.sams.property.listBuildings();
      if (response.success && response.data) {
        setBuildings(response.data);
        setScopeRefId(response.data[0]?.id ?? '');
      }
      return;
    }
    if (level === TariffScopeLevel.WING) {
      const bld = await window.sams.property.listBuildings();
      if (!bld.success || !bld.data?.[0]) return;
      const response = await window.sams.property.listWings(bld.data[0].id);
      if (response.success && response.data) {
        setWings(response.data);
        setScopeRefId(response.data[0]?.id ?? '');
      }
      return;
    }
    if (level === TariffScopeLevel.UNIT) {
      const response = await window.sams.property.listUnits();
      if (response.success && response.data) {
        setUnits(response.data.items);
        setScopeRefId(response.data.items[0]?.id ?? '');
      }
      return;
    }

    const refTypeMap: Partial<Record<TariffScopeLevel, ReferenceMasterType>> = {
      [TariffScopeLevel.COMPOSITION]: 'COMPOSITION',
      [TariffScopeLevel.TYPE]: 'UNIT_TYPE',
      [TariffScopeLevel.AREA]: 'UNIT_AREA',
      [TariffScopeLevel.FLOOR]: 'FLOOR',
    };
    const refType = refTypeMap[level];
    if (refType) {
      const response = await window.sams.property.listReferenceMasters(refType);
      if (response.success && response.data) {
        const options = response.data.map((row) => ({
          id: row.id,
          label:
            'compositionName' in row
              ? row.compositionName
              : 'typeName' in row
                ? row.typeName
                : 'floorName' in row
                  ? row.floorName
                  : `${row.areaSqFt} sq.ft.`,
        }));
        setReferenceOptions(options);
        setScopeRefId(options[0]?.id ?? '');
      }
      return;
    }

    if (level === TariffScopeLevel.PERSON) {
      setReferenceOptions(
        [1, 2, 3, 4, 5, 6].map((count) => ({
          id: String(count),
          label: `${count} family members`,
        })),
      );
      setScopeRefId('1');
    }
  }, []);

  const loadDefinitions = useCallback(async (): Promise<void> => {
    const response = await window.sams.tariff.listDefinitions({ scopeLevel });
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    const scoped = response.data.filter(
      (row) => (row.scopeRefId ?? '') === (scopeRefId || ''),
    );
    setDefinitions(scoped);
    if (scoped[0]) {
      setSelected(scoped[0]);
      setLines(scoped[0].lines.length > 0 ? scoped[0].lines : [emptyLine(1)]);
      setEditing(false);
    } else {
      setSelected(null);
      setLines([emptyLine(1)]);
    }
  }, [scopeLevel, scopeRefId]);

  useEffect(() => {
    void loadParameters();
  }, [loadParameters]);

  useEffect(() => {
    void loadScopeRefs(scopeLevel);
  }, [scopeLevel, loadScopeRefs]);

  useEffect(() => {
    if (scopeRefId) {
      void loadDefinitions();
    }
  }, [scopeRefId, loadDefinitions]);

  const selectDefinition = (definition: TariffDefinitionDto): void => {
    setSelected(definition);
    setLines(definition.lines.length > 0 ? definition.lines : [emptyLine(1)]);
    setEditing(false);
    setError(null);
    setMessage(null);
  };

  const addLine = (): void => {
    setLines((current) => [...current, emptyLine(current.length + 1)]);
    setEditing(true);
  };

  const removeLine = (index: number): void => {
    setLines((current) =>
      current
        .filter((_, rowIndex) => rowIndex !== index)
        .map((line, rowIndex) => ({ ...line, srNo: rowIndex + 1 })),
    );
    setEditing(true);
  };

  const moveLine = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines];
    const temp = next[index];
    next[index] = next[target]!;
    next[target] = temp!;
    setLines(next.map((line, rowIndex) => ({ ...line, srNo: rowIndex + 1 })));
    setEditing(true);
  };

  const saveDefinition = async (): Promise<void> => {
    if (!scopeRefId && scopeLevel !== TariffScopeLevel.PERSON) {
      setError('Select a scope reference.');
      return;
    }
    setError(null);
    setMessage(null);

    const payload = {
      id: selected?.isReadOnly ? undefined : selected?.id,
      effectiveDate: selected?.effectiveDate ?? new Date().toISOString().slice(0, 10),
      scopeLevel,
      scopeRefId: scopeRefId || null,
      lines: lines.map((line) => ({
        id: line.id || undefined,
        srNo: line.srNo,
        accountMasterId: line.accountMasterId,
        amount: line.amount,
        tariffType: line.tariffType,
        remark: line.remark,
      })),
    };

    const response = await window.sams.tariff.saveDefinition(payload);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setSelected(response.data);
    setLines(response.data.lines);
    setEditing(false);
    setMessage('Tariff definition saved.');
    await loadDefinitions();
  };

  const cloneDefinition = async (): Promise<void> => {
    if (!selected?.id || !newEffectiveDate) {
      setError('Select a definition and enter a new effective date.');
      return;
    }
    setError(null);
    const response = await window.sams.tariff.cloneDefinition(selected.id, newEffectiveDate);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setNewEffectiveDate('');
    setMessage('New tariff version created.');
    await loadDefinitions();
    selectDefinition(response.data);
  };

  const readOnly = selected?.isReadOnly ?? false;
  const disabled = !editing || readOnly;

  const scopeRefControl = (): React.ReactElement => {
    if (scopeLevel === TariffScopeLevel.BUILDING) {
      return (
        <select value={scopeRefId} onChange={(event) => setScopeRefId(event.target.value)}>
          {buildings.map((row) => (
            <option key={row.id} value={row.id}>
              {row.shortName} — {row.fullName}
            </option>
          ))}
        </select>
      );
    }
    if (scopeLevel === TariffScopeLevel.WING) {
      return (
        <select value={scopeRefId} onChange={(event) => setScopeRefId(event.target.value)}>
          {wings.map((row) => (
            <option key={row.id} value={row.id}>
              {row.shortName} — {row.fullName}
            </option>
          ))}
        </select>
      );
    }
    if (scopeLevel === TariffScopeLevel.UNIT) {
      return (
        <select value={scopeRefId} onChange={(event) => setScopeRefId(event.target.value)}>
          {units.map((row) => (
            <option key={row.id} value={row.id}>
              {row.unitNo} (Sr. {row.serialNo})
            </option>
          ))}
        </select>
      );
    }
    return (
      <select value={scopeRefId} onChange={(event) => setScopeRefId(event.target.value)}>
        {referenceOptions.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label}
          </option>
        ))}
      </select>
    );
  };

  return (
    <section className="form-screen master-browse-screen">
      <h2>Tariff Definition</h2>
      {parameters?.tariffMethod === 'ADVANCE' && (
        <p className="info-banner">
          Advance tariff method is enabled. Line amounts represent budget totals distributed by
          rateable value.
        </p>
      )}

      <MasterFormToolbar
        disabled={{ save: !editing, cancel: !editing }}
        onAdd={() => {
          setSelected(null);
          setLines([emptyLine(1)]);
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void saveDefinition()}
        onCancel={() => {
          if (selected) {
            setLines(selected.lines.length > 0 ? selected.lines : [emptyLine(1)]);
          } else {
            setLines([emptyLine(1)]);
          }
          setEditing(false);
        }}
        onBrowse={() => void loadDefinitions()}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="form-grid">
        <label>
          Scope Level
          <select
            value={scopeLevel}
            onChange={(event) => setScopeLevel(event.target.value as TariffScopeLevel)}
          >
            {enabledScopes.map((level) => (
              <option key={level} value={level}>
                {SCOPE_LABELS[level]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scope Reference
          {scopeRefControl()}
        </label>
      </div>

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <p className="muted">Effective dates (newest first)</p>
          <ul>
            {definitions.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={selected?.id === row.id ? 'active' : undefined}
                  onClick={() => selectDefinition(row)}
                >
                  {row.effectiveDate}
                  {row.isReadOnly && <span> (historical)</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          {selected?.isReadOnly && (
            <p className="info-banner">
              Historical tariff — read only. Use &quot;New Rate Effective From&quot; to create a new
              version.
            </p>
          )}

          <div className="inline-actions">
            <label>
              New Rate Effective From
              <input
                type="date"
                value={newEffectiveDate}
                onChange={(event) => setNewEffectiveDate(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => void cloneDefinition()} disabled={!selected}>
              Clone to New Date
            </button>
          </div>

          <table className="data-grid">
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Charge Account</th>
                <th>Amount</th>
                <th>Tariff Type</th>
                <th>Remark</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.id || 'new'}-${index}`}>
                  <td>{line.srNo}</td>
                  <td>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setPickerLineIndex(index);
                        setPickerOpen(true);
                      }}
                    >
                      {line.accountParticulars || 'Select account…'}
                    </button>
                  </td>
                  <td>
                    <MoneyInput
                      disabled={disabled}
                      value={line.amount}
                      decimalPlaces={parameters?.tariffDecimalPlaces ?? 2}
                      onChange={(amount) => {
                        setLines((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, amount } : row,
                          ),
                        );
                        setEditing(true);
                      }}
                    />
                  </td>
                  <td>
                    <select
                      disabled={disabled}
                      value={line.tariffType}
                      onChange={(event) => {
                        setLines((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, tariffType: event.target.value as TariffLineType }
                              : row,
                          ),
                        );
                        setEditing(true);
                      }}
                    >
                      <option value={TariffLineType.BOTH}>Both</option>
                      <option value={TariffLineType.TENANT}>Tenant</option>
                    </select>
                  </td>
                  <td>
                    <input
                      disabled={disabled}
                      value={line.remark ?? ''}
                      onChange={(event) => {
                        setLines((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, remark: event.target.value } : row,
                          ),
                        );
                        setEditing(true);
                      }}
                    />
                  </td>
                  <td className="grid-actions">
                    <button type="button" disabled={disabled} onClick={() => moveLine(index, -1)}>
                      ↑
                    </button>
                    <button type="button" disabled={disabled} onClick={() => moveLine(index, 1)}>
                      ↓
                    </button>
                    <button type="button" disabled={disabled} onClick={() => removeLine(index)}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" disabled={disabled} onClick={addLine}>
            Add Line
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <AccountPickerModal
        open={pickerOpen}
        title="Select billing charge account"
        categoryId={AccountCategoryType.INCOME}
        onClose={() => {
          setPickerOpen(false);
          setPickerLineIndex(null);
        }}
        onSelect={(item) => {
          if (pickerLineIndex === null) return;
          setLines((current) =>
            current.map((row, rowIndex) =>
              rowIndex === pickerLineIndex
                ? {
                    ...row,
                    accountMasterId: item.id,
                    accountParticulars: item.label,
                    accountShortCode: item.shortCode,
                  }
                : row,
            ),
          );
          setEditing(true);
          setPickerOpen(false);
          setPickerLineIndex(null);
        }}
      />

      <AuditIdentityModal
        open={auditOpen}
        record={selected}
        onClose={() => setAuditOpen(false)}
      />
    </section>
  );
}
