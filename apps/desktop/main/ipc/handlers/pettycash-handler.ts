import { PermissionAction } from '@sams/shared-types';
import type { PettyCashVoucherDto, VoucherDetailDto, VoucherSummaryDto } from '@sams/shared-types';
import { listPettyCashVouchers, postPettyCashVoucher } from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const pettyCashHandlers = {
  list: (async (
    _ctx,
    payload: { dateFrom?: string; dateTo?: string; search?: string },
  ) => listPettyCashVouchers(getActivePrisma(), payload)) as IpcHandler<
    { dateFrom?: string; dateTo?: string; search?: string },
    { items: VoucherSummaryDto[]; total: number }
  >,

  post: (async (_ctx, payload: PettyCashVoucherDto) =>
    postPettyCashVoucher(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    PettyCashVoucherDto,
    VoucherDetailDto
  >,
};

export const pettyCashReadOptions = {
  resource: 'vouchers',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const pettyCashCreateOptions = {
  resource: 'vouchers',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};
