import { useEffect, useState } from 'react';
import type { VoucherDetailDto } from '@sams/shared-types';
import { getIpcErrorMessage } from '../hooks/session';

export interface VoucherReadonlyModalProps {
  open: boolean;
  voucherId: string | null;
  onClose: () => void;
}

/** BR-006 — readonly voucher drill-down from bank reconciliation. */
export function VoucherReadonlyModal({
  open,
  voucherId,
  onClose,
}: VoucherReadonlyModalProps): React.ReactElement | null {
  const [voucher, setVoucher] = useState<VoucherDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !voucherId) {
      setVoucher(null);
      setError(null);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      const response = await window.sams.voucher.get(voucherId);
      setLoading(false);
      if (!response.success || !response.data) {
        setError(getIpcErrorMessage(response.error));
        setVoucher(null);
        return;
      }
      setVoucher(response.data);
    })();
  }, [open, voucherId]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card voucher-readonly"
        role="dialog"
        aria-label="Voucher details"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>Voucher (Read Only)</h3>
        {loading && <p className="muted">Loading voucher…</p>}
        {error && <p className="error-text">{error}</p>}
        {voucher && (
          <>
            <p>
              <strong>{voucher.systemVoucherNo}</strong> · {voucher.voucherType}{' '}
              {voucher.subType ?? ''} · {voucher.voucherDate} · {voucher.status}
            </p>
            <p>{voucher.narration}</p>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Particulars</th>
                  <th>Dr</th>
                  <th>Cr</th>
                </tr>
              </thead>
              <tbody>
                {voucher.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.accountParticulars}</td>
                    <td>{line.particulars}</td>
                    <td>{line.drAmount.toFixed(2)}</td>
                    <td>{line.crAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Dr {voucher.drTotal.toFixed(2)} · Cr {voucher.crTotal.toFixed(2)}
            </p>
          </>
        )}
        <div className="drawer-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
