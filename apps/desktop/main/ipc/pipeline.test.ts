import { describe, expect, it } from 'vitest';
import { PermissionAction, UserRole } from '@sams/shared-types';
import { createIpcRequest, withIpcPipeline } from './pipeline.js';
import type { SessionState } from '../session/session-manager.js';

const baseSession = (): SessionState => ({
  sessionToken: 'token-1',
  userId: 'user-1',
  username: 'admin',
  displayName: 'Admin',
  role: UserRole.ADMIN,
  permissions: ['auth:READ'],
  databasePath: '/tmp/test.sqlite',
  financialYearId: 'fy-1',
  fyLabel: '2025-26',
  societyName: 'Test Society',
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

  it('allows startup open-database without authenticated user', async () => {
    const response = await withIpcPipeline(
      createIpcRequest({ path: '/tmp/society.sqlite' }),
      {
        ...baseSession(),
        userId: null,
        username: null,
        displayName: null,
        role: null,
        permissions: [],
        databasePath: null,
      },
      {} as never,
      {
        resource: 'startup',
        action: PermissionAction.READ,
        requireSession: false,
        handler: async () => ({
          sessionToken: 'new-token',
          societyName: 'Test Society',
          fyLabel: '2025-26',
          isReadOnly: false,
        }),
      },
    );

    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({ sessionToken: 'new-token' });
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
