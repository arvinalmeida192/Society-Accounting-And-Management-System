import { useCallback, useEffect, useState } from 'react';
import type { ParkingTariffRateDto, ParkingTariffTypeDto } from '@sams/shared-types';
import { AuditIdentityModal, MasterFormToolbar, MoneyInput } from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyType = (): ParkingTariffTypeDto => ({
  id: '',
  typeName: '',
  isActive: true,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function ParkingTariffsScreen(): React.ReactElement {
  const form = useFormState(emptyType());
  const [items, setItems] = useState<ParkingTariffTypeDto[]>([]);
  const [rates, setRates] = useState<ParkingTariffRateDto[]>([]);
  const [editing, setEditing] = useState(false);
  const [rateEditing, setRateEditing] = useState(false);
  const [newRate, setNewRate] = useState({ effectiveDate: '', monthlyRate: 0 });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const loadTypes = useCallback(async (): Promise<void> => {
    const response = await window.sams.property.listParkingTariffTypes();
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setItems(response.data);
  }, []);

  const loadRates = useCallback(async (typeId: string): Promise<void> => {
    if (!typeId) {
      setRates([]);
      return;
    }
    const response = await window.sams.property.listTariffRates(typeId);
    if (response.success && response.data) {
      setRates(response.data);
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    void loadRates(form.value.id);
  }, [form.value.id, loadRates]);

  const selectItem = (item: ParkingTariffTypeDto): void => {
    form.commit(item);
    setEditing(false);
    setRateEditing(false);
    setError(null);
    setMessage(null);
  };

  const saveType = async (): Promise<void> => {
    setError(null);
    setMessage(null);
    const response = await window.sams.property.saveParkingTariffType(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
    setMessage('Parking tariff type saved.');
    await loadTypes();
  };

  const addRate = async (): Promise<void> => {
    if (!form.value.id || !newRate.effectiveDate) {
      setError('Select a tariff type and effective date.');
      return;
    }
    setError(null);
    const response = await window.sams.property.addParkingTariffRate(
      form.value.id,
      newRate.effectiveDate,
      newRate.monthlyRate,
    );
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setRateEditing(false);
    setNewRate({ effectiveDate: '', monthlyRate: 0 });
    setMessage('Rate added (history is immutable).');
    await loadRates(form.value.id);
  };

  const disabled = !editing;

  return (
    <section className="form-screen master-browse-screen">
      <h2>Parking Tariff Types</h2>
      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing }}
        onAdd={() => {
          form.commit(emptyType());
          setEditing(true);
        }}
        onEdit={() => setEditing(true)}
        onSave={() => void saveType()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onBrowse={() => void loadTypes()}
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
                  {item.typeName}
                  {!item.isActive && <span> (inactive)</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          <div className="form-grid">
            <label>
              Type Name *
              <input
                disabled={disabled}
                value={form.value.typeName}
                onChange={(event) =>
                  form.setValue({ ...form.value, typeName: event.target.value })
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

          {form.value.id && (
            <div className="form-section">
              <h3>Effective-Dated Rates</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Effective Date</th>
                    <th>Monthly Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.id}>
                      <td>{rate.effectiveDate.slice(0, 10)}</td>
                      <td>{rate.monthlyRate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rateEditing ? (
                <div className="form-grid">
                  <label>
                    Effective Date *
                    <input
                      type="date"
                      value={newRate.effectiveDate}
                      onChange={(event) =>
                        setNewRate({ ...newRate, effectiveDate: event.target.value })
                      }
                    />
                  </label>
                  <MoneyInput
                    label="Monthly Rate"
                    value={newRate.monthlyRate}
                    onChange={(value) => setNewRate({ ...newRate, monthlyRate: value })}
                  />
                  <div className="form-actions-inline">
                    <button type="button" onClick={() => void addRate()}>
                      Save Rate
                    </button>
                    <button type="button" onClick={() => setRateEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setRateEditing(true)}>
                  Add New Rate
                </button>
              )}
            </div>
          )}
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
    </section>
  );
}
