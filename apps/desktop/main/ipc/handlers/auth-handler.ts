import {
  ErrorCodes,
  type LoginPayload,
  type LoginResult,
  type LogoutResult,
  type SessionDto,
} from '@sams/shared-types';
import { PermissionAction } from '@sams/shared-types';
import { AuthError, changePassword, loginUser } from '@sams/services';
import { getActivePrisma, hasActiveDatabase } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

export const getSessionHandler: IpcHandler<Record<string, never>, SessionDto> = async () => {
  return sessionManager.toDto();
};

export const loginHandler: IpcHandler<LoginPayload, LoginResult> = async (_ctx, payload) => {
  if (!hasActiveDatabase()) {
    throw Object.assign(new Error('Open a society database before signing in.'), {
      code: ErrorCodes.NO_DATABASE,
    });
  }

  try {
    const result = await loginUser(
      getActivePrisma(),
      payload.username,
      payload.password,
    );
    sessionManager.bindUser(result.user, result.permissions);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      throw Object.assign(new Error(error.message), { code: error.code });
    }
    throw error;
  }
};

export const logoutHandler: IpcHandler<Record<string, never>, LogoutResult> = async () => {
  sessionManager.clearUser();
  return { success: true };
};

export const changePasswordHandler: IpcHandler<
  { currentPassword: string; newPassword: string },
  { success: boolean }
> = async (ctx, payload) => {
  if (!ctx.session.userId) {
    throw new Error('User session is required.');
  }
  try {
    return await changePassword(
      getActivePrisma(),
      ctx.session.userId,
      payload.currentPassword,
      payload.newPassword,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      throw Object.assign(new Error(error.message), { code: error.code });
    }
    throw error;
  }
};

export const authGetSessionOptions = {
  resource: 'auth',
  action: PermissionAction.READ,
  requireSession: false,
  handler: getSessionHandler,
};

export const authLoginOptions = {
  resource: 'auth',
  action: PermissionAction.READ,
  requireSession: false,
  requireDatabase: true,
  handler: loginHandler,
};

export const authLogoutOptions = {
  resource: 'auth',
  action: PermissionAction.READ,
  requireSession: true,
  handler: logoutHandler,
};

export const authChangePasswordOptions = {
  resource: 'auth',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
  handler: changePasswordHandler,
};
