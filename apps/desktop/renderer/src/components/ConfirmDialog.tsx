/** SDD §4.1, NF-021 — confirmation dialog stub */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay" role="alertdialog" aria-labelledby="confirm-title">
      <div className="dialog">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="drawer-actions">
          <button type="button" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
