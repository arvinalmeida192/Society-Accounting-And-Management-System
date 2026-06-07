import type { GetSessionPayload, SessionDto } from '@sams/shared-types';
import { PermissionAction } from '@sams/shared-types';
import type { IpcHandler } from '../pipeline.js';
import { sessionManager } from '../../session/session-manager.js';

export const getSessionHandler: IpcHandler<GetSessionPayload, SessionDto> = async () => {
  return sessionManager.toDto();
};

export const authGetSessionOptions = {
  resource: 'auth',
  action: PermissionAction.READ,
  requireSession: false,
  handler: getSessionHandler,
};
