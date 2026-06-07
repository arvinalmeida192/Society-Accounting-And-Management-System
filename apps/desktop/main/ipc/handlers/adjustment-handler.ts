import { PermissionAction } from '@sams/shared-types';
import type {
  AdjustmentVoucherDto,
  PartialWaiverInputDto,
  PartialWaiverPreviewDto,
  PartialWaiverResultDto,
  VoucherCancelInputDto,
  VoucherCancelResultDto,
  VoucherDetailDto,
} from '@sams/shared-types';
import {
  cancelAdjustmentVoucher,
  postAdjustmentVoucher,
  postPartialWaiver,
  previewPartialWaiver,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const adjustmentHandlers = {
  post: (async (_ctx, payload: AdjustmentVoucherDto) =>
    postAdjustmentVoucher(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    AdjustmentVoucherDto,
    VoucherDetailDto
  >,

  previewPartialWaiver: (async (_ctx, payload: PartialWaiverInputDto) =>
    previewPartialWaiver(getActivePrisma(), payload)) as IpcHandler<
    PartialWaiverInputDto,
    PartialWaiverPreviewDto
  >,

  partialWaiver: (async (_ctx, payload: PartialWaiverInputDto) =>
    postPartialWaiver(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    PartialWaiverInputDto,
    PartialWaiverResultDto
  >,

  cancel: (async (_ctx, payload: VoucherCancelInputDto) =>
    cancelAdjustmentVoucher(
      getActivePrisma(),
      payload.id,
      payload.cancelDate,
      requireUserId(),
    )) as IpcHandler<VoucherCancelInputDto, VoucherCancelResultDto>,
};

export const adjustmentReadOptions = {
  resource: 'vouchers',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const adjustmentCreateOptions = {
  resource: 'vouchers',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};

export const adjustmentDeleteOptions = {
  resource: 'vouchers',
  action: PermissionAction.DELETE,
  requireDatabase: true,
};
