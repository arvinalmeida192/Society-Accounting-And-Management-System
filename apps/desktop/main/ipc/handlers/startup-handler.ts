import { randomUUID } from 'node:crypto';
import { dialog } from 'electron';
import {
  ErrorCodes,
  type CreateSocietyResult,
  type CreateSocietyWizardDto,
  type OpenDatabaseResult,
  type OpenNewFinancialYearPayload,
  type PickDatabaseResult,
  type RecentDatabaseEntry,
  type ValidateDatabasePayload,
  type ValidateDatabaseResult,
} from '@sams/shared-types';
import {
  assertValidSamsDatabase,
  carryForwardDatabaseFiles,
  createSocietyInDatabase,
  ensurePermissions,
  ensureSocietyConfiguration,
  finalizeSocietyBootstrap,
  validateCreateSocietyWizardDto,
  validateSamsDatabase,
} from '@sams/services';
import type { AppConfigStore } from '../../config/app-config.js';
import {
  closeDatabase,
  connectDatabase,
  createEmptyDatabaseFile,
  getActivePrisma,
  withEphemeralClient,
} from '../../database/database-manager.js';
import type { IpcHandler } from '../pipeline.js';
import { sessionManager } from '../../session/session-manager.js';

export function createStartupHandlers(appConfig: AppConfigStore): {
  getRecentDatabases: IpcHandler<Record<string, never>, { paths: RecentDatabaseEntry[] }>;
  validateDatabase: IpcHandler<ValidateDatabasePayload, ValidateDatabaseResult>;
  openDatabase: IpcHandler<{ path: string }, OpenDatabaseResult>;
  createSociety: IpcHandler<CreateSocietyWizardDto, CreateSocietyResult>;
  openNewFinancialYear: IpcHandler<
    OpenNewFinancialYearPayload,
    { dbPath: string; sessionToken: string; warning?: string }
  >;
  closeDatabaseSession: IpcHandler<Record<string, never>, { success: boolean }>;
  pickOpenDatabase: IpcHandler<Record<string, never>, PickDatabaseResult>;
  pickSaveDatabase: IpcHandler<{ defaultName?: string }, PickDatabaseResult>;
} {
  const bindDatabaseSession = async (dbPath: string): Promise<OpenDatabaseResult> => {
    await connectDatabase(dbPath);
    const client = getActivePrisma();
    await ensurePermissions(client);
    await ensureSocietyConfiguration(client);
    const info = await assertValidSamsDatabase(client);
    const sessionToken = randomUUID();

    sessionManager.bindDatabase({
      sessionToken,
      databasePath: dbPath,
      financialYearId: info.financialYearId,
      fyLabel: info.fyLabel,
      societyName: info.societyName,
      isReadOnly: info.isReadOnly,
    });

    appConfig.rememberDatabase(dbPath, `${info.societyName} (${info.fyLabel})`);

    return {
      sessionToken,
      societyName: info.societyName,
      fyLabel: info.fyLabel,
      isReadOnly: info.isReadOnly,
    };
  };

  return {
    getRecentDatabases: async () => ({
      paths: appConfig.getRecentDatabases(),
    }),

    validateDatabase: async (_ctx, payload) => {
      try {
        return await withEphemeralClient(payload.path, (client) => validateSamsDatabase(client));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to validate database.';
        const code =
          error instanceof Error && 'code' in error && typeof error.code === 'string'
            ? error.code
            : ErrorCodes.INVALID_DB;
        return {
          valid: false,
          errorMessage: message,
          errorCode: code,
        };
      }
    },

    openDatabase: async (_ctx, payload) => bindDatabaseSession(payload.path),

    createSociety: async (_ctx, payload) => {
      const fieldErrors = validateCreateSocietyWizardDto(payload);
      if (Object.keys(fieldErrors).length > 0) {
        throw Object.assign(new Error(Object.values(fieldErrors).join(' ')), {
          code: ErrorCodes.VALIDATION_ERROR,
          fieldErrors,
        });
      }

      await createEmptyDatabaseFile(payload.dbPath);
      const created = await createSocietyInDatabase(getActivePrisma(), payload);
      await finalizeSocietyBootstrap(
        getActivePrisma(),
        (await getActivePrisma().societyIdentity.findFirstOrThrow()).id,
        created.financialYearId,
      );
      const sessionToken = randomUUID();

      sessionManager.bindDatabase({
        sessionToken,
        databasePath: payload.dbPath,
        financialYearId: created.financialYearId,
        fyLabel: created.fyLabel,
        societyName: created.societyName,
        isReadOnly: false,
      });

      appConfig.rememberDatabase(
        payload.dbPath,
        `${created.societyName} (${created.fyLabel})`,
      );

      return {
        dbPath: payload.dbPath,
        sessionToken,
        societyName: created.societyName,
        fyLabel: created.fyLabel,
      };
    },

    openNewFinancialYear: async (ctx, payload) => {
      if (!ctx.session.userId) {
        throw Object.assign(new Error('Authentication is required to open a new financial year.'), {
          code: ErrorCodes.PERMISSION_DENIED,
        });
      }

      const sourceValidation = await withEphemeralClient(payload.sourceDbPath, (client) =>
        validateSamsDatabase(client),
      );
      if (!sourceValidation.valid) {
        throw Object.assign(
          new Error(sourceValidation.errorMessage ?? 'Source database is invalid.'),
          { code: ErrorCodes.INVALID_DB },
        );
      }

      if (payload.targetDbPath === payload.sourceDbPath) {
        throw Object.assign(new Error('Target database must differ from the source file.'), {
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }

      if (!payload.newFyStartDate || !payload.newFyEndDate) {
        throw Object.assign(new Error('New financial year start and end dates are required.'), {
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }

      const actorId = ctx.session.userId;
      const result = await carryForwardDatabaseFiles(
        payload.sourceDbPath,
        payload.targetDbPath,
        payload.newFyStartDate,
        payload.newFyEndDate,
        actorId,
        connectDatabase,
        withEphemeralClient,
      );

      const sessionToken = randomUUID();
      await connectDatabase(result.dbPath);
      await ensurePermissions(getActivePrisma());
      await ensureSocietyConfiguration(getActivePrisma());

      sessionManager.bindDatabase({
        sessionToken,
        databasePath: result.dbPath,
        financialYearId: result.financialYearId,
        fyLabel: result.fyLabel,
        societyName: result.societyName,
        isReadOnly: false,
      });

      appConfig.rememberDatabase(result.dbPath, `${result.societyName} (${result.fyLabel})`);

      return {
        dbPath: result.dbPath,
        sessionToken,
        ...(result.warning ? { warning: result.warning } : {}),
      };
    },

    closeDatabaseSession: async () => {
      sessionManager.clearDatabase();
      await closeDatabase();
      return { success: true };
    },

    pickOpenDatabase: async () => {
      const result = await dialog.showOpenDialog({
        title: 'Open Society Database',
        properties: ['openFile'],
        filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
      });

      return { path: result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0] };
    },

    pickSaveDatabase: async (_ctx, payload) => {
      const result = await dialog.showSaveDialog({
        title: 'Save New Society Database',
        defaultPath: payload.defaultName ?? 'society.sqlite',
        filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
      });

      if (result.canceled || !result.filePath) {
        return { path: null };
      }

      const normalized = result.filePath.endsWith('.sqlite')
        ? result.filePath
        : `${result.filePath}.sqlite`;

      return { path: normalized };
    },
  };
}
