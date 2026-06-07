import { describe, expect, it } from 'vitest';
import { PermissionAction, UserRole } from '@sams/shared-types';
import { createIpcRequest, withIpcPipeline } from './pipeline.js';
import type { SessionState } from '../session/session-manager.js';

const baseSession = (): SessionState => ({
  userId: 'user-1',
  username: 'admin',
  role: UserRole.ADMIN,
  permissions: ['auth:READ'],
  databasePath: null,
  isReadOnly: false,
});

describe('withIpcPipeline', () => {
  it('returns success when handler completes', async () => {
    const response = await withIpcPipeline(
      createIpcRequest({}),
      baseSession(),
      {} as never,
      {
        resource: 'auth',
        action: PermissionAction.READ,
        handler: async () => ({ ok: true }),
      },
    );

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ ok: true });
  });

  it('blocks when session is missing and required', async () => {
    const response = await withIpcPipeline(
      createIpcRequest({}),
      { ...baseSession(), userId: null, permissions: [] },
      {} as never,
      {
        resource: 'auth',
        action: PermissionAction.READ,
        requireSession: true,
        handler: async () => ({ ok: true }),
      },
    );

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('PERMISSION_DENIED');
  });

  it('blocks mutations when year is closed', async () => {
    const response = await withIpcPipeline(
      createIpcRequest({}),
      { ...baseSession(), isReadOnly: true, permissions: ['auth:UPDATE'] },
      {} as never,
      {
        resource: 'auth',
        action: PermissionAction.UPDATE,
        handler: async () => ({ ok: true }),
      },
    );

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('YEAR_CLOSED');
  });
});
