import type { BillReferenceType } from '@sams/shared-types';

interface BillReferencePanelProps {
  open: boolean;
  billId: string | null;
  onClose: () => void;
  onNavigate?: (refType: BillReferenceType) => void;
}

const REFERENCE_ITEMS: Array<{ type: BillReferenceType; label: string }> = [
  { type: 'OPENING_BILL', label: 'Opening Bill' },
  { type: 'ALL_BILLS', label: 'All Bills' },
  { type: 'CONTRIBUTION', label: 'Contribution Summary' },
  { type: 'MEMBER_LEDGER', label: 'Member Ledger' },
  { type: 'RECEIPTS', label: 'Receipts' },
  { type: 'ADJUSTMENTS', label: 'Adjustments' },
];

export function BillReferencePanel({
  open,
  billId,
  onClose,
  onNavigate,
}: BillReferencePanelProps): React.ReactElement | null {
  if (!open) return null;

  return (
    <aside className="slide-over-panel">
      <header>
        <h3>Bill Reference</h3>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </header>
      <p className="muted">Shortcuts to related reports and registers (Phase 11/18).</p>
      <ul>
        {REFERENCE_ITEMS.map((item) => (
          <li key={item.type}>
            <button
              type="button"
              disabled={!billId}
              onClick={() => onNavigate?.(item.type)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
