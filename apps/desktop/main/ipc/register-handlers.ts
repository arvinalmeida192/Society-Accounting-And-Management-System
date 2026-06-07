import { ipcMain } from 'electron';
import { IpcChannels, type IpcRequest } from '@sams/shared-types';
import { withIpcPipeline } from './pipeline.js';
import { authGetSessionOptions } from './handlers/auth-handler.js';
import { sessionManager } from '../session/session-manager.js';

export function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.AUTH_GET_SESSION, async (event, request: IpcRequest<Record<string, never>>) => {
    return withIpcPipeline(request, sessionManager.get(), event, authGetSessionOptions);
  });
}
