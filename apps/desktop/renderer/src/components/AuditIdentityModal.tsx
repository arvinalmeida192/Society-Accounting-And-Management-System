import type { AuditFieldsDto } from '@sams/shared-types';

interface AuditIdentityModalProps {
  open: boolean;
  audit?: AuditFieldsDto | null;
  /** @deprecated Use `audit` instead */
  record?: AuditFieldsDto | null;
  onClose: () => void;
}

function resolveAudit(
  audit?: AuditFieldsDto | null,
  record?: AuditFieldsDto | null,
): AuditFieldsDto | null {
  const source = audit ?? record;
  if (!source?.createdAt || !source.createdBy || !source.updatedAt || !source.updatedBy) {
    return null;
  }
  return source;
}

export function AuditIdentityModal({
  open,
  audit,
  record,
  onClose,
}: AuditIdentityModalProps): React.ReactElement | null {
  const resolved = resolveAudit(audit, record);
  if (!open || !resolved) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" onClick={(event) => event.stopPropagation()}>
        <h3>User Identity</h3>
        <dl className="audit-list">
          <dt>Created By</dt>
          <dd>{resolved.createdBy}</dd>
          <dt>Created At</dt>
          <dd>{new Date(resolved.createdAt).toLocaleString()}</dd>
          <dt>Updated By</dt>
          <dd>{resolved.updatedBy}</dd>
          <dt>Updated At</dt>
          <dd>{new Date(resolved.updatedAt).toLocaleString()}</dd>
        </dl>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
