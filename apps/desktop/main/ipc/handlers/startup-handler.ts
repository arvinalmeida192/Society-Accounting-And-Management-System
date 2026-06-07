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
  createSocietyInDatabase,
  ensureSocietyConfiguration,
  finalizeSocietyBootstrap,
  validateCreateSocietyWizardDto,
  validateSamsDatabase,
} from '@sams/services';
import type { AppConfigStore } from '../../config/app-config.js';
import {
  connectDatabase,
  createEmptyDatabaseFile,
  deployMigrations,
  getActivePrisma,
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
    { dbPath: string; sessionToken: string }
  >;
  pickOpenDatabase: IpcHandler<Record<string, never>, PickDatabaseResult>;
  pickSaveDatabase: IpcHandler<{ defaultName?: string }, PickDatabaseResult>;
} {
  const bindDatabaseSession = async (dbPath: string): Promise<OpenDatabaseResult> => {
    await connectDatabase(dbPath);
    const client = getActivePrisma();
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
        await connectDatabase(payload.path);
        const result = await validateSamsDatabase(getActivePrisma());
        return result;
      } catch (error) {
        return {
          valid: false,
          errorMessage: error instanceof Error ? error.message : 'Unable to validate database.',
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

    openNewFinancialYear: async (_ctx, payload) => {
      await connectDatabase(payload.sourceDbPath);
      const sourceValidation = await validateSamsDatabase(getActivePrisma());
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

      await deployMigrations(payload.targetDbPath);

      throw Object.assign(
        new Error(
          'New financial year carry-forward is not yet implemented. Complete setup in Phase 17.',
        ),
        { code: ErrorCodes.NOT_IMPLEMENTED },
      );
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
