import { AuditAction } from '@sams/shared-types';

export interface AuditLogInput {
  userId: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}

export interface AuditLogWriter {
  create(entry: {
    userId: string;
    action: AuditAction;
    entityName: string;
    entityId: string;
    oldValueJson: string | null;
    newValueJson: string | null;
    ipAddress: string | null;
  }): Promise<void>;
}

/**
 * Audit trail service stub — SDD §4.5, NF-014
 * Full Prisma integration wired in Phase 17.
 */
export class AuditService {
  constructor(private readonly writer: AuditLogWriter | null = null) {}

  async logMutation(input: AuditLogInput): Promise<void> {
    if (!this.writer) {
      return;
    }

    await this.writer.create({
      userId: input.userId,
      action: input.action,
      entityName: input.entityName,
      entityId: input.entityId,
      oldValueJson: input.oldValue ? JSON.stringify(input.oldValue) : null,
      newValueJson: input.newValue ? JSON.stringify(input.newValue) : null,
      ipAddress: input.ipAddress ?? null,
    });
  }
}

export const noopAuditService = new AuditService(null);
