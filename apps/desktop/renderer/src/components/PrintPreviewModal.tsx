/** SDD §4.7, NF-020 — print preview modal stub */
export interface PrintPreviewModalProps {
  open: boolean;
  title?: string;
  html: string;
  onClose: () => void;
  onPrint: () => void;
}

export function PrintPreviewModal({
  open,
  title = 'Print Preview',
  html,
  onClose,
  onPrint,
}: PrintPreviewModalProps): React.ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay" role="dialog" aria-label={title}>
      <div className="dialog print-preview">
        <h2>{title}</h2>
        <div className="preview-frame" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="drawer-actions">
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" onClick={onPrint}>Print</button>
        </div>
      </div>
    </div>
  );
}
