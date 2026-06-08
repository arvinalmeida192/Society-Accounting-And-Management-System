import { useEffect, useState } from 'react';
import type { RegularBillDetailDto } from '@sams/shared-types';
import { getIpcErrorMessage } from '../hooks/session';

export interface BillReadonlyModalProps {
  open: boolean;
  billId: string | null;
  onClose: () => void;
}

/** Read-only bill drill-down from reports. */
export function BillReadonlyModal({
  open,
  billId,
  onClose,
}: BillReadonlyModalProps): React.ReactElement | null {
  const [bill, setBill] = useState<RegularBillDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !billId) {
      setBill(null);
      setError(null);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      const response = await window.sams.billing.getRegularBill(billId);
      setLoading(false);
      if (!response.success || !response.data) {
        setError(getIpcErrorMessage(response.error));
        setBill(null);
        return;
      }
      setBill(response.data);
    })();
  }, [open, billId]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card bill-readonly"
        role="dialog"
        aria-label="Bill details"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>Bill (Read Only)</h3>
        {loading && <p className="muted">Loading bill…</p>}
        {error && <p className="error-text">{error}</p>}
        {bill && (
          <>
            <p>
              <strong>{bill.systemBillNo}</strong> · {bill.billForPeriodLabel} · {bill.billDate}
            </p>
            <p>
              {bill.memberName} — {bill.buildingShortName}/{bill.wingShortName}/{bill.unitNo}
            </p>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Charge</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {bill.lines.map((line) => (
                  <tr key={line.srNo}>
                    <td>{line.srNo}</td>
                    <td>{line.chargeName}</td>
                    <td>{line.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              <strong>Bill Amount: {bill.billAmount.toFixed(2)}</strong>
            </p>
          </>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
