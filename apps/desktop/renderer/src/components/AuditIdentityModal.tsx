import type { AuditFieldsDto } from '@sams/shared-types';

interface AuditIdentityModalProps {
  open: boolean;
  audit: AuditFieldsDto | null;
  onClose: () => void;
}

export function AuditIdentityModal({
  open,
  audit,
  onClose,
}: AuditIdentityModalProps): React.ReactElement | null {
  if (!open || !audit) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" onClick={(event) => event.stopPropagation()}>
        <h3>User Identity</h3>
        <dl className="audit-list">
          <dt>Created By</dt>
          <dd>{audit.createdBy}</dd>
          <dt>Created At</dt>
          <dd>{new Date(audit.createdAt).toLocaleString()}</dd>
          <dt>Updated By</dt>
          <dd>{audit.updatedBy}</dd>
          <dt>Updated At</dt>
          <dd>{new Date(audit.updatedAt).toLocaleString()}</dd>
        </dl>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
