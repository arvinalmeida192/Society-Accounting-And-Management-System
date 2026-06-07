import { useEffect, useState } from 'react';
import { BillToType, type SupplementaryBillSummaryDto } from '@sams/shared-types';
import { MoneyInput } from './MoneyInput';

interface GeneralReferencePanelProps {
  amount: number;
  selectedBillId: string;
  onBillChange: (billId: string) => void;
  onAmountChange: (amount: number) => void;
}

export function GeneralReferencePanel({
  amount,
  selectedBillId,
  onBillChange,
  onAmountChange,
}: GeneralReferencePanelProps): React.ReactElement {
  const [bills, setBills] = useState<SupplementaryBillSummaryDto[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await window.sams.billing.listSupplementaryBills({
        billToType: BillToType.GENERAL,
      });
      if (response.success && response.data) {
        setBills(response.data.items);
        if (!selectedBillId && response.data.items[0]) {
          onBillChange(response.data.items[0].id);
        }
      }
    })();
  }, [onBillChange, selectedBillId]);

  return (
    <section className="settlement-panel">
      <h4>General Reference (GAP-004)</h4>
      <p className="muted">Link this receipt/payment to a general supplementary bill.</p>
      <div className="form-grid">
        <label>
          General Supplementary Bill *
          <select value={selectedBillId} onChange={(event) => onBillChange(event.target.value)}>
            <option value="">Select bill…</option>
            {bills.map((bill) => (
              <option key={bill.id} value={bill.id}>
                {bill.systemBillNo} — {bill.generalPartyName ?? bill.memberName} (₹
                {bill.billAmount.toFixed(2)})
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount to Settle
          <MoneyInput label="" value={amount} decimalPlaces={2} onChange={onAmountChange} />
        </label>
      </div>
    </section>
  );
}
