import { PrintPreviewModal } from './PrintPreviewModal';

export interface ChequePrintPreviewModalProps {
  open: boolean;
  title?: string;
  payee: string;
  amount: number;
  amountWords: string;
  chequeDate: string;
  chequeNo: string;
  bankName: string | null;
  branchName: string | null;
  signatory1: string | null;
  signatory2: string | null;
  templateHtml: string;
  onClose: () => void;
}

/** VCH-003 — cheque print preview (GAP-016–019, SP-020). */
export function ChequePrintPreviewModal({
  open,
  title = 'Cheque Print Preview',
  payee,
  amount,
  amountWords,
  chequeDate,
  chequeNo,
  bankName,
  branchName,
  signatory1,
  signatory2,
  templateHtml,
  onClose,
}: ChequePrintPreviewModalProps): React.ReactElement | null {
  if (!open) return null;

  const html =
    templateHtml ||
    `
      <div class="cheque-print-preview">
        <p><strong>Pay:</strong> ${payee}</p>
        <p><strong>Date:</strong> ${chequeDate}</p>
        <p><strong>Cheque No:</strong> ${chequeNo}</p>
        <p><strong>Bank:</strong> ${bankName ?? ''}${branchName ? ` — ${branchName}` : ''}</p>
        <p><strong>Amount:</strong> ₹${amount.toFixed(2)}</p>
        <p><strong>Amount in words:</strong> ${amountWords}</p>
        <p>${signatory1 ?? ''}${signatory2 ? `<br />${signatory2}` : ''}</p>
      </div>
    `;

  return (
    <PrintPreviewModal
      open={open}
      title={title}
      html={html}
      onClose={onClose}
      onPrint={() => window.print()}
    />
  );
}
