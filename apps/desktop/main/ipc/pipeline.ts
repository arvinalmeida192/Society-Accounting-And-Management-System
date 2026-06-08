import { randomUUID } from 'node:crypto';
import type { IpcMainInvokeEvent } from 'electron';
import {
  AuditAction,
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  type IpcRequest,
  type IpcResponse,
  PermissionAction,
} from '@sams/shared-types';
import { getAuditService } from '../audit/audit-manager.js';
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
  requireDatabase?: boolean;
  /** Allow mutation when financial year is closed (e.g. backup, reopen year). */
  allowWhenReadOnly?: boolean;
  validatePayload?: (payload: TPayload) => void;
  handler: IpcHandler<TPayload, unknown>;
}

function toAuditAction(action: PermissionAction): AuditAction | null {
  switch (action) {
    case PermissionAction.CREATE:
      return AuditAction.CREATE;
    case PermissionAction.UPDATE:
      return AuditAction.UPDATE;
    case PermissionAction.DELETE:
      return AuditAction.DELETE;
    case PermissionAction.EXPORT:
    case PermissionAction.PRINT:
      return AuditAction.UPDATE;
    default:
      return null;
  }
}

const SENSITIVE_KEYS = new Set(['password', 'newPassword', 'currentPassword']);

function sanitizeAuditPayload(payload: unknown): unknown {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const record = payload as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    sanitized[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : value;
  }
  return sanitized;
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
    if (options.requireDatabase && !session.databasePath) {
      return createErrorResponse(requestId, {
        code: ErrorCodes.NO_DATABASE,
        message: 'No society database is open',
      });
    }

    if (options.requireSession !== false && !session.userId) {
      return createErrorResponse(requestId, {
        code: ErrorCodes.PERMISSION_DENIED,
        message: 'No active session',
      });
    }

    if (
      session.isReadOnly &&
      options.action !== PermissionAction.READ &&
      options.action !== PermissionAction.EXPORT &&
      !options.allowWhenReadOnly
    ) {
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

    const auditAction = toAuditAction(options.action);
    if (session.userId && auditAction) {
      void getAuditService()
        .logMutation({
          userId: session.userId,
          action: auditAction,
          entityName: options.resource,
          entityId: requestId,
          newValue: sanitizeAuditPayload(request.payload),
        })
        .catch((error) => {
          console.error('Audit log write failed:', error);
        });
    }

    return createSuccessResponse(requestId, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code =
      error instanceof Error && 'code' in error && typeof error.code === 'string'
        ? error.code
        : ErrorCodes.INTERNAL_ERROR;
    const fieldErrors =
      error instanceof Error &&
      'fieldErrors' in error &&
      typeof error.fieldErrors === 'object' &&
      error.fieldErrors
        ? (error.fieldErrors as Record<string, string>)
        : undefined;

    return createErrorResponse(requestId, {
      code,
      message,
      fieldErrors,
    });
  }
}

export function createIpcRequest<T>(payload: T): IpcRequest<T> {
  return { requestId: randomUUID(), payload };
}
