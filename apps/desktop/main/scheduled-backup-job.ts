import { app } from 'electron';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { backupDatabase } from '@sams/services';
import type { AppConfigStore } from './config/app-config.js';
import { getActiveDatabasePath } from './database/database-manager.js';
import { sessionManager } from './session/session-manager.js';

let scheduledBackupTimer: ReturnType<typeof setInterval> | null = null;

export function restartScheduledBackupJob(appConfig: AppConfigStore): void {
  if (scheduledBackupTimer) {
    clearInterval(scheduledBackupTimer);
    scheduledBackupTimer = null;
  }

  const config = appConfig.get().scheduledBackup;
  if (!config?.enabled) return;

  const intervalMs = Math.max(1, config.intervalHours) * 60 * 60 * 1000;
  const targetDir = config.targetDir || join(app.getPath('userData'), 'backups');
  mkdirSync(targetDir, { recursive: true });

  scheduledBackupTimer = setInterval(() => {
    void (async () => {
      const dbPath = getActiveDatabasePath();
      if (!dbPath) return;
      const session = sessionManager.get();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const targetPath = join(targetDir, `scheduled-backup-${timestamp}.sqlite`);
      try {
        await backupDatabase(dbPath, targetPath, {
          societyName: session.societyName ?? undefined,
          fyLabel: session.fyLabel ?? undefined,
        });
        appConfig.updateScheduledBackupLastRun(new Date().toISOString());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Scheduled backup failed.';
        console.error('Scheduled backup failed:', message);
        appConfig.setScheduledBackupError(message);
      }
    })();
  }, intervalMs);
}
