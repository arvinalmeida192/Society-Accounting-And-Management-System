import { PermissionAction } from '@sams/shared-types';
import type {
  BankRecGridRow,
  BankReconciliationStatementDto,
  BankRecStatus,
} from '@sams/shared-types';
import {
  bulkUpdateClearingDates,
  generateBankReconciliationStatement,
  listBankRecItems,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const bankRecHandlers = {
  listItems: (async (
    _ctx,
    payload: {
      bankAccountId: string;
      dateFrom: string;
      dateTo: string;
      status?: BankRecStatus;
    },
  ) => listBankRecItems(getActivePrisma(), payload)) as IpcHandler<
    {
      bankAccountId: string;
      dateFrom: string;
      dateTo: string;
      status?: BankRecStatus;
    },
    BankRecGridRow[]
  >,

  bulkSetClearingDate: (async (
    _ctx,
    payload: { voucherLineIds: string[]; clearingDate: string },
  ) =>
    bulkUpdateClearingDates(
      getActivePrisma(),
      payload.voucherLineIds,
      payload.clearingDate,
      requireUserId(),
    )) as IpcHandler<
    { voucherLineIds: string[]; clearingDate: string },
    { updated: number }
  >,

  getStatement: (async (
    _ctx,
    payload: { bankAccountId: string; asOnDate: string },
  ) =>
    generateBankReconciliationStatement(
      getActivePrisma(),
      payload.bankAccountId,
      payload.asOnDate,
    )) as IpcHandler<
    { bankAccountId: string; asOnDate: string },
    BankReconciliationStatementDto
  >,
};

export const bankRecReadOptions = {
  resource: 'vouchers',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const bankRecWriteOptions = {
  resource: 'vouchers',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};
