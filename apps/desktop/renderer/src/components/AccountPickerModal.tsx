interface AccountPickerModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSelect?: (accountId: string) => void;
}

/** Phase 4 will connect this to Chart of Accounts pickers (SP-012). */
export function AccountPickerModal({
  open,
  title,
  onClose,
}: AccountPickerModalProps): React.ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <p className="muted">
          Account picker integration is scheduled for Phase 4 (Chart of Accounts). Linkage IDs
          can still be stored as text in Society Parameters until then.
        </p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
