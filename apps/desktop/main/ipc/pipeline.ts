import { randomUUID } from 'node:crypto';
import type { IpcMainInvokeEvent } from 'electron';
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  type IpcRequest,
  type IpcResponse,
  PermissionAction,
} from '@sams/shared-types';
import type { SessionState } from '../session/session-manager.js';

export interface IpcPipelineContext {
  event: IpcMainInvokeEvent;
  session: SessionState;
  resource: string;
  action: PermissionAction;
}

export type IpcHandler<TPayload, TResult> = (
  ctx: IpcPipelineContext,
  payload: TPayload,
) => Promise<TResult>;

export interface IpcPipelineOptions<TPayload> {
  resource: string;
  action: PermissionAction;
  requireSession?: boolean;
  validatePayload?: (payload: TPayload) => void;
  handler: IpcHandler<TPayload, unknown>;
}

function hasPermission(session: SessionState, resource: string, action: PermissionAction): boolean {
  const key = `${resource}:${action}`;
  return session.permissions.includes(key);
}

/** SDD §2.7 — validateSession → checkPermission → validatePayload → invokeService */
export async function withIpcPipeline<TPayload, TResult>(
  request: IpcRequest<TPayload>,
  session: SessionState,
  event: IpcMainInvokeEvent,
  options: IpcPipelineOptions<TPayload>,
): Promise<IpcResponse<TResult>> {
  const { requestId } = request;

  try {
    if (options.requireSession !== false && !session.userId) {
      return createErrorResponse(requestId, {
        code: ErrorCodes.PERMISSION_DENIED,
        message: 'No active session',
      });
    }

    if (session.isReadOnly && options.action !== PermissionAction.READ) {
      return createErrorResponse(requestId, {
        code: ErrorCodes.YEAR_CLOSED,
        message: 'Financial year is closed for modifications',
      });
    }

    if (session.userId && !hasPermission(session, options.resource, options.action)) {
      return createErrorResponse(requestId, {
        code: ErrorCodes.PERMISSION_DENIED,
        message: `Missing permission ${options.resource}:${options.action}`,
      });
    }

    if (options.validatePayload) {
      options.validatePayload(request.payload);
    }

    const data = (await options.handler(
      { event, session, resource: options.resource, action: options.action },
      request.payload,
    )) as TResult;

    return createSuccessResponse(requestId, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(requestId, {
      code: ErrorCodes.INTERNAL_ERROR,
      message,
    });
  }
}

export function createIpcRequest<T>(payload: T): IpcRequest<T> {
  return { requestId: randomUUID(), payload };
}
