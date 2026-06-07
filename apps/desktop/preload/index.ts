import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels, type GetSessionPayload, type IpcRequest, type IpcResponse, type SessionDto } from '@sams/shared-types';

async function invoke<TPayload, TResult>(
  channel: string,
  payload: TPayload,
): Promise<IpcResponse<TResult>> {
  const request: IpcRequest<TPayload> = {
    requestId: crypto.randomUUID(),
    payload,
  };
  return ipcRenderer.invoke(channel, request) as Promise<IpcResponse<TResult>>;
}

/** SDD §2.9 — typed preload bridge; renderer uses window.sams only */
contextBridge.exposeInMainWorld('sams', {
  auth: {
    getSession: (): Promise<IpcResponse<SessionDto>> =>
      invoke<GetSessionPayload, SessionDto>(IpcChannels.AUTH_GET_SESSION, {}),
  },
});

export type SamApi = typeof window.sams;

declare global {
  interface Window {
    sams: {
      auth: {
        getSession: () => Promise<IpcResponse<SessionDto>>;
      };
    };
  }
}
