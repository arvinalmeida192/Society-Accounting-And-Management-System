import { app } from 'electron';
import { join } from 'node:path';
import { PermissionAction } from '@sams/shared-types';
import type { Form16AResultDto, TdsChallanDto, TdsRecordDto } from '@sams/shared-types';
import {
  generateForm16A,
  getTdsRecord,
  listTdsChallans,
  listTdsRecords,
  saveTdsChallan,
  updateTdsRecord,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

function requireFinancialYearId(): string {
  const fyId = sessionManager.get().financialYearId;
  if (!fyId) throw new Error('Financial year context is required.');
  return fyId;
}

export const tdsHandlers = {
  list: (async (
    _ctx,
    payload: {
      partyAccountId?: string;
      search?: string;
      unlinkedChallanOnly?: boolean;
    },
  ) =>
    listTdsRecords(getActivePrisma(), {
      financialYearId: requireFinancialYearId(),
      partyAccountId: payload.partyAccountId,
      search: payload.search,
      unlinkedChallanOnly: payload.unlinkedChallanOnly,
    })) as IpcHandler<
    { partyAccountId?: string; search?: string; unlinkedChallanOnly?: boolean },
    TdsRecordDto[]
  >,

  get: (async (_ctx, payload: { id: string }) =>
    getTdsRecord(getActivePrisma(), payload.id)) as IpcHandler<{ id: string }, TdsRecordDto>,

  update: (async (_ctx, payload: TdsRecordDto) =>
    updateTdsRecord(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    TdsRecordDto,
    TdsRecordDto
  >,

  listChallans: (async () =>
    listTdsChallans(getActivePrisma(), requireFinancialYearId())) as IpcHandler<
    Record<string, never>,
    TdsChallanDto[]
  >,

  saveChallan: (async (_ctx, payload: TdsChallanDto) =>
    saveTdsChallan(
      getActivePrisma(),
      { ...payload, financialYearId: payload.financialYearId || requireFinancialYearId() },
      requireUserId(),
    )) as IpcHandler<TdsChallanDto, TdsChallanDto>,

  generateForm16A: (async (
    _ctx,
    payload: { partyAccountId: string; financialYearId?: string },
  ) => {
    const outputDir = join(app.getPath('userData'), 'form16a');
    return generateForm16A(
      getActivePrisma(),
      payload.partyAccountId,
      payload.financialYearId ?? requireFinancialYearId(),
      outputDir,
    );
  }) as IpcHandler<
    { partyAccountId: string; financialYearId?: string },
    Form16AResultDto
  >,
};

export const tdsReadOptions = {
  resource: 'tds',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const tdsWriteOptions = {
  resource: 'tds',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const tdsPrintOptions = {
  resource: 'tds',
  action: PermissionAction.PRINT,
  requireDatabase: true,
};
