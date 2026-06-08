import { useCallback, useEffect, useState } from 'react';
import type { BillingPeriodDto, BuildingDto } from '@sams/shared-types';
import { ConfirmDialog } from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

export function BulkRegularBillsScreen(): React.ReactElement {
  const [periods, setPeriods] = useState<BillingPeriodDto[]>([]);
  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [periodKey, setPeriodKey] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const [periodRes, buildingRes, nextRes] = await Promise.all([
      window.sams.billing.listPeriods(),
      window.sams.property.listBuildings(),
      window.sams.billing.getNextPeriod(),
    ]);
    if (periodRes.success && periodRes.data) setPeriods(periodRes.data);
    if (buildingRes.success && buildingRes.data) setBuildings(buildingRes.data.items);
    if (nextRes.success && nextRes.data) setPeriodKey(nextRes.data.periodKey);
    else if (periodRes.success && periodRes.data?.[0]) setPeriodKey(periodRes.data[0].periodKey);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runBulk = async (): Promise<void> => {
    setRunning(true);
    setError(null);
    setMessage(null);
    const response = await window.sams.billing.generateBulkRegular({
      billForPeriodKey: periodKey,
      billDate,
      dueDate: dueDate || undefined,
      buildingId: buildingId || undefined,
    });
    setRunning(false);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage(
      `Generated ${response.data.created} bills for period ${response.data.periodLabel}.`,
    );
  };

  const selectedPeriod = periods.find((row) => row.periodKey === periodKey);

  return (
    <section className="form-screen">
      <h2>Bulk Regular Bill Generation</h2>
      {selectedPeriod && (
        <p className="info-banner prominent">
          Generating bills for period: <strong>{selectedPeriod.periodLabel}</strong>
        </p>
      )}

      <div className="form-grid">
        <label>
          Bill For Period *
          <select value={periodKey} onChange={(event) => setPeriodKey(event.target.value)}>
            {periods.map((row) => (
              <option key={row.periodKey} value={row.periodKey}>
                {row.periodLabel}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bill Date
          <input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} />
        </label>
        <label>
          Due Date
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label>
          Building filter (optional)
          <select value={buildingId} onChange={(event) => setBuildingId(event.target.value)}>
            <option value="">All buildings</option>
            {buildings.map((row) => (
              <option key={row.id} value={row.id}>
                {row.shortName} — {row.fullName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" disabled={running || !periodKey} onClick={() => setConfirmOpen(true)}>
        {running ? 'Generating…' : 'Generate Bulk Bills'}
      </button>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm bulk bill generation"
        message={`Generate regular bills for all eligible members in ${selectedPeriod?.periodLabel ?? periodKey}? This runs in a single transaction.`}
        onConfirm={() => {
          setConfirmOpen(false);
          void runBulk();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
