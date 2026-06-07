import type { BillInterestDetailDto } from '@sams/shared-types';

interface InterestDetailModalProps {
  open: boolean;
  details: BillInterestDetailDto[];
  totalInterest: number;
  allowOverride: boolean;
  overrideValue: number | null;
  onOverrideChange?: (value: number | null) => void;
  onClose: () => void;
}

export function InterestDetailModal({
  open,
  details,
  totalInterest,
  allowOverride,
  overrideValue,
  onOverrideChange,
  onClose,
}: InterestDetailModalProps): React.ReactElement | null {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-panel wide-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
        <h3>Interest Detail</h3>
        <table className="data-grid">
          <thead>
            <tr>
              <th>Source</th>
              <th>Method</th>
              <th>Base</th>
              <th>Rate %</th>
              <th>Period</th>
              <th>Days/Mo</th>
              <th>Interest</th>
            </tr>
          </thead>
          <tbody>
            {details.map((row) => (
              <tr key={`${row.sourceBillId ?? 'ob'}-${row.periodFrom}`}>
                <td>{row.sourceDescription ?? '—'}</td>
                <td>{row.method}</td>
                <td>{row.baseAmount.toFixed(2)}</td>
                <td>{row.ratePercent}</td>
                <td>
                  {row.periodFrom} → {row.periodTo}
                </td>
                <td>{row.daysOrMonths}</td>
                <td>{row.computedInterest.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <strong>Total interest:</strong> {totalInterest.toFixed(2)}
        </p>
        {allowOverride && (
          <label>
            Manual override
            <input
              type="number"
              step="0.01"
              value={overrideValue ?? ''}
              onChange={(event) =>
                onOverrideChange?.(
                  event.target.value === '' ? null : Number.parseFloat(event.target.value),
                )
              }
            />
          </label>
        )}
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
