import { randomUUID } from 'node:crypto';
import { app, dialog } from 'electron';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PermissionAction } from '@sams/shared-types';
import type {
  AuditLogDto,
  AuditLogFilterDto,
  BackupResultDto,
  RestoreResultDto,
  ScheduledBackupConfigDto,
  UserDto,
  UserSaveDto,
  YearEndChecklistDto,
  YearEndCloseResultDto,
} from '@sams/shared-types';
import {
  auditLogsToCsv,
  backupDatabase,
  closeYear,
  getYearEndChecklist,
  listAuditLogs,
  listUsers,
  reopenYear,
  resetUserPassword,
  restoreDatabase,
  saveUser,
} from '@sams/services';
import type { AppConfigStore } from '../../config/app-config.js';
import {
  connectDatabase,
  getActiveDatabasePath,
  getActivePrisma,
} from '../../database/database-manager.js';
import { restartScheduledBackupJob } from '../../scheduled-backup-job.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export function createAdminHandlers(appConfig: AppConfigStore) {
  return {
    listUsers: (async () => listUsers(getActivePrisma())) as IpcHandler<Record<string, never>, UserDto[]>,

    saveUser: (async (_ctx, payload: UserSaveDto) =>
      saveUser(getActivePrisma(), payload, requireUserId())) as IpcHandler<UserSaveDto, UserDto>,

    resetPassword: (async (_ctx, payload: { userId: string; newPassword: string }) =>
      resetUserPassword(getActivePrisma(), payload.userId, payload.newPassword, requireUserId())) as IpcHandler<
      { userId: string; newPassword: string },
      { success: boolean }
    >,

    backup: (async (_ctx, payload: { targetPath?: string }) => {
      const dbPath = getActiveDatabasePath();
      if (!dbPath) throw new Error('No database is connected.');
      const session = sessionManager.get();
      return backupDatabase(dbPath, payload.targetPath, {
        societyName: session.societyName ?? undefined,
        fyLabel: session.fyLabel ?? undefined,
      });
    }) as IpcHandler<{ targetPath?: string }, BackupResultDto>,

    restore: (async (_ctx, payload: { backupPath: string; targetPath?: string }) => {
      const currentPath = getActiveDatabasePath();
      const targetPath = payload.targetPath ?? currentPath;
      if (!targetPath) {
        throw new Error('No target database path. Open a society database first or specify targetPath.');
      }

      const result = await restoreDatabase(payload.backupPath, targetPath);

      if (currentPath && targetPath === currentPath) {
        await connectDatabase(targetPath);
        const client = getActivePrisma();
        const info = await client.financialYear.findFirst({
          orderBy: { startDate: 'desc' },
          include: { societyIdentity: true },
        });
        const meta = await client.systemMeta.findFirst();
        if (info) {
          sessionManager.bindDatabase({
            sessionToken: sessionManager.get().sessionToken ?? randomUUID(),
            databasePath: targetPath,
            financialYearId: info.id,
            fyLabel: info.label,
            societyName: info.societyIdentity.societyName,
            isReadOnly: meta?.isReadOnly ?? false,
          });
        }
        return { ...result, reconnected: true };
      }

      return { ...result, reconnected: false };
    }) as IpcHandler<
      { backupPath: string; targetPath?: string },
      RestoreResultDto & { reconnected?: boolean }
    >,

    getScheduledBackup: (async () => ({
      config: appConfig.get().scheduledBackup ?? {
        enabled: false,
        intervalHours: 24,
        targetDir: join(app.getPath('userData'), 'backups'),
        lastRunAt: null,
      },
    })) as IpcHandler<Record<string, never>, { config: ScheduledBackupConfigDto }>,

    scheduleBackup: (async (_ctx, payload: ScheduledBackupConfigDto) => {
      appConfig.setScheduledBackup(payload);
      restartScheduledBackupJob(appConfig);
      return { config: payload };
    }) as IpcHandler<ScheduledBackupConfigDto, { config: ScheduledBackupConfigDto }>,

    yearEndChecklist: (async () =>
      getYearEndChecklist(getActivePrisma())) as IpcHandler<Record<string, never>, YearEndChecklistDto>,

    yearEndClose: (async () => {
      const result = await closeYear(getActivePrisma(), requireUserId());
      sessionManager.updateReadOnly(true);
      return result;
    }) as IpcHandler<Record<string, never>, YearEndCloseResultDto>,

    reopenYear: (async (_ctx, payload: { confirmationText: string }) => {
      const result = await reopenYear(getActivePrisma(), requireUserId(), payload.confirmationText);
      sessionManager.updateReadOnly(false);
      return result;
    }) as IpcHandler<{ confirmationText: string }, { isReadOnly: boolean }>,

    listAuditLog: (async (_ctx, payload: AuditLogFilterDto) =>
      listAuditLogs(getActivePrisma(), payload)) as IpcHandler<AuditLogFilterDto, AuditLogDto[]>,

    exportAuditLog: (async (_ctx, payload: AuditLogFilterDto) => {
      const rows = await listAuditLogs(getActivePrisma(), payload);
      const csv = auditLogsToCsv(rows);
      const result = await dialog.showSaveDialog({
        title: 'Export Audit Log',
        defaultPath: `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (result.canceled || !result.filePath) {
        return { exported: false, path: null };
      }
      await writeFile(result.filePath, csv, 'utf8');
      return { exported: true, path: result.filePath };
    }) as IpcHandler<AuditLogFilterDto, { exported: boolean; path: string | null }>,
  };
}

export const adminUsersReadOptions = {
  resource: 'admin.users',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const adminUsersWriteOptions = {
  resource: 'admin.users',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const adminUsersCreateOptions = {
  resource: 'admin.users',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};

export const adminBackupReadOptions = {
  resource: 'admin.backup',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const adminBackupWriteOptions = {
  resource: 'admin.backup',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};

export const adminYearEndReadOptions = {
  resource: 'admin.yearEnd',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const adminYearEndWriteOptions = {
  resource: 'admin.yearEnd',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const adminAuditReadOptions = {
  resource: 'admin.audit',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const adminAuditExportOptions = {
  resource: 'admin.audit',
  action: PermissionAction.EXPORT,
  requireDatabase: true,
};
