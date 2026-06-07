import { ipcMain } from 'electron';
import { IpcChannels, PermissionAction, type IpcRequest } from '@sams/shared-types';
import { AppConfigStore } from '../config/app-config.js';
import { withIpcPipeline } from './pipeline.js';
import {
  authGetSessionOptions,
  authLoginOptions,
  authLogoutOptions,
} from './handlers/auth-handler.js';
import { createStartupHandlers } from './handlers/startup-handler.js';
import {
  societyHandlers,
  societyReadOptions,
  societyUpdateOptions,
} from './handlers/society-handler.js';
import { sessionManager } from '../session/session-manager.js';

const publicOptions = {
  resource: 'startup',
  action: PermissionAction.READ,
  requireSession: false,
};

export function registerIpcHandlers(appConfig: AppConfigStore): void {
  const startup = createStartupHandlers(appConfig);

  ipcMain.handle(
    IpcChannels.STARTUP_GET_RECENT_DATABASES,
    async (event, request: IpcRequest<Record<string, never>>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.getRecentDatabases,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_VALIDATE_DATABASE,
    async (event, request: IpcRequest<{ path: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.validateDatabase,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_OPEN_DATABASE,
    async (event, request: IpcRequest<{ path: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.openDatabase,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_CREATE_SOCIETY,
    async (event, request: IpcRequest<Parameters<typeof startup.createSociety>[1]>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.createSociety,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_OPEN_NEW_FINANCIAL_YEAR,
    async (event, request: IpcRequest<Parameters<typeof startup.openNewFinancialYear>[1]>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.openNewFinancialYear,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_PICK_OPEN_DATABASE,
    async (event, request: IpcRequest<Record<string, never>>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.pickOpenDatabase,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_PICK_SAVE_DATABASE,
    async (event, request: IpcRequest<{ defaultName?: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.pickSaveDatabase,
      }),
  );

  ipcMain.handle(IpcChannels.AUTH_GET_SESSION, async (event, request: IpcRequest<Record<string, never>>) =>
    withIpcPipeline(request, sessionManager.get(), event, authGetSessionOptions),
  );

  ipcMain.handle(IpcChannels.AUTH_LOGIN, async (event, request: IpcRequest<{ username: string; password: string }>) =>
    withIpcPipeline(request, sessionManager.get(), event, authLoginOptions),
  );

  ipcMain.handle(IpcChannels.AUTH_LOGOUT, async (event, request: IpcRequest<Record<string, never>>) =>
    withIpcPipeline(request, sessionManager.get(), event, authLogoutOptions),
  );

  const societyOptions = {
    ...societyReadOptions,
    requireSession: true,
  };

  ipcMain.handle(IpcChannels.SOCIETY_GET_IDENTITY, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.getIdentity,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_UPDATE_IDENTITY, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyUpdateOptions,
      requireSession: true,
      handler: societyHandlers.updateIdentity,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_GET_PARAMETERS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.getParameters,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_UPDATE_PARAMETERS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyUpdateOptions,
      requireSession: true,
      handler: societyHandlers.updateParameters,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_VALIDATE_BILL_FREQUENCY, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.validateBillFrequencyChange,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_GET_PROPERTY_INFO, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.getPropertyInfo,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_UPDATE_PROPERTY_INFO, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyUpdateOptions,
      requireSession: true,
      handler: societyHandlers.updatePropertyInfo,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_GET_REPORT_FORMATS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.getReportFormats,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_UPDATE_REPORT_FORMATS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyUpdateOptions,
      requireSession: true,
      handler: societyHandlers.updateReportFormats,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_LIST_REPORT_TEMPLATES, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.listReportTemplates,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_GET_INTEREST_HELP, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      requireSession: true,
      handler: societyHandlers.getInterestHelpText,
    }),
  );
}
