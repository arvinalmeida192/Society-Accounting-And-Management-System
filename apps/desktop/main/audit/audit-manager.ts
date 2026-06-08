import type { PrismaClient } from '@prisma/client';
import { AuditService, createPrismaAuditWriter, noopAuditService } from '@sams/services';

let auditService: AuditService = noopAuditService;

export function bindAuditService(client: PrismaClient): void {
  auditService = new AuditService(createPrismaAuditWriter(client));
}

export function clearAuditService(): void {
  auditService = noopAuditService;
}

export function getAuditService(): AuditService {
  return auditService;
}
