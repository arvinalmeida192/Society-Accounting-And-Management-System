import type { PrismaClient } from '@prisma/client';
import type { AuditAction, AuditLogDto, AuditLogFilterDto } from '@sams/shared-types';

export async function listAuditLogs(
  client: PrismaClient,
  filter: AuditLogFilterDto = {},
): Promise<AuditLogDto[]> {
  const rows = await client.auditLog.findMany({
    where: {
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.entityName ? { entityName: filter.entityName } : {}),
      ...(filter.action ? { action: filter.action as AuditAction } : {}),
      ...(filter.dateFrom || filter.dateTo
        ? {
            timestamp: {
              ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
              ...(filter.dateTo ? { lte: new Date(`${filter.dateTo}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { timestamp: 'desc' },
    take: filter.limit ?? 500,
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    username: row.user.username,
    displayName: row.user.displayName,
    action: row.action as AuditAction,
    entityName: row.entityName,
    entityId: row.entityId,
    oldValueJson: row.oldValueJson,
    newValueJson: row.newValueJson,
    timestamp: row.timestamp.toISOString(),
    ipAddress: row.ipAddress,
  }));
}

export function auditLogsToCsv(rows: AuditLogDto[]): string {
  const header = [
    'timestamp',
    'username',
    'displayName',
    'action',
    'entityName',
    'entityId',
    'ipAddress',
    'oldValueJson',
    'newValueJson',
  ].join(',');
  const lines = rows.map((row) =>
    [
      row.timestamp,
      row.username,
      row.displayName,
      row.action,
      row.entityName,
      row.entityId,
      row.ipAddress ?? '',
      JSON.stringify(row.oldValueJson ?? ''),
      JSON.stringify(row.newValueJson ?? ''),
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','),
  );
  return [header, ...lines].join('\n');
}

export function createPrismaAuditWriter(client: PrismaClient) {
  return {
    async create(entry: {
      userId: string;
      action: string;
      entityName: string;
      entityId: string;
      oldValueJson: string | null;
      newValueJson: string | null;
      ipAddress: string | null;
    }): Promise<void> {
      await client.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action as AuditAction,
          entityName: entry.entityName,
          entityId: entry.entityId,
          oldValueJson: entry.oldValueJson,
          newValueJson: entry.newValueJson,
          ipAddress: entry.ipAddress,
        },
      });
    },
  };
}
