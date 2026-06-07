import { PermissionAction } from '@sams/shared-types';
import type {
  GeneralBillSettlementDto,
  MicrLookupResult,
  OpenBillDto,
  RegularSettlementInputDto,
  SettlementAllocationResultDto,
  ChequePrintDto,
  VoucherCancelInputDto,
  VoucherCancelResultDto,
  VoucherDetailDto,
  VoucherPreviewResultDto,
  VoucherSaveDto,
  VoucherSummaryDto,
  VoucherType,
} from '@sams/shared-types';
import {
  allocateSettlementPreview,
  cancelChequeVoucher,
  cancelVoucher,
  getVoucher,
  linkGeneralBill,
  listOpenBills,
  listVouchers,
  lookupMicr,
  postVoucher,
  prepareChequePrintData,
  previewVoucherPost,
  validateManualVoucherNo,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const voucherHandlers = {
  list: (async (
    _ctx,
    payload: { voucherType?: VoucherType; dateFrom?: string; dateTo?: string; search?: string },
  ) => listVouchers(getActivePrisma(), payload)) as IpcHandler<
    { voucherType?: VoucherType; dateFrom?: string; dateTo?: string; search?: string },
    { items: VoucherSummaryDto[]; total: number }
  >,

  get: (async (_ctx, payload: { id: string }) =>
    getVoucher(getActivePrisma(), payload.id)) as IpcHandler<{ id: string }, VoucherDetailDto>,

  previewPost: (async (_ctx, payload: VoucherSaveDto) =>
    previewVoucherPost(getActivePrisma(), payload)) as IpcHandler<
    VoucherSaveDto,
    VoucherPreviewResultDto
  >,

  post: (async (_ctx, payload: VoucherSaveDto) =>
    postVoucher(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    VoucherSaveDto,
    VoucherDetailDto
  >,

  lookupMicr: (async (_ctx, payload: { micrCode: string }) =>
    lookupMicr(getActivePrisma(), payload.micrCode)) as IpcHandler<
    { micrCode: string },
    MicrLookupResult | null
  >,

  validateManualNo: (async (
    _ctx,
    payload: {
      voucherType: VoucherType;
      subType?: VoucherSaveDto['subType'];
      manualNo: string;
      excludeVoucherId?: string;
    },
  ) =>
    validateManualVoucherNo(
      getActivePrisma(),
      payload.voucherType,
      payload.subType,
      payload.manualNo,
      payload.excludeVoucherId,
    )) as IpcHandler<
    {
      voucherType: VoucherType;
      subType?: VoucherSaveDto['subType'];
      manualNo: string;
      excludeVoucherId?: string;
    },
    { duplicate: boolean; warning?: string }
  >,

  getOpenBillsForMember: (async (
    _ctx,
    payload: { memberId: string; billType: 'REGULAR' | 'SUPPLEMENTARY' },
  ) => listOpenBills(getActivePrisma(), payload.memberId, payload.billType)) as IpcHandler<
    { memberId: string; billType: 'REGULAR' | 'SUPPLEMENTARY' },
    OpenBillDto[]
  >,

  allocateSettlement: (async (_ctx, payload: RegularSettlementInputDto & { asOfDate?: string }) =>
    allocateSettlementPreview(
      getActivePrisma(),
      payload,
      payload.asOfDate,
    )) as IpcHandler<
    RegularSettlementInputDto & { asOfDate?: string },
    SettlementAllocationResultDto
  >,

  linkGeneralBill: (async (
    _ctx,
    payload: { voucherId: string; supplementaryBillId: string; amount: number },
  ) =>
    linkGeneralBill(
      getActivePrisma(),
      payload.voucherId,
      payload.supplementaryBillId,
      payload.amount,
      requireUserId(),
    )) as IpcHandler<
    { voucherId: string; supplementaryBillId: string; amount: number },
    GeneralBillSettlementDto
  >,

  cancel: (async (_ctx, payload: VoucherCancelInputDto) => {
    const prisma = getActivePrisma();
    if (payload.reasonId) {
      return cancelChequeVoucher(
        prisma,
        payload.id,
        payload.cancelDate,
        requireUserId(),
        payload.reasonId,
      );
    }
    return cancelVoucher(prisma, payload.id, payload.cancelDate, requireUserId());
  }) as IpcHandler<VoucherCancelInputDto, VoucherCancelResultDto>,

  getChequePrintData: (async (_ctx, payload: { voucherId: string }) =>
    prepareChequePrintData(getActivePrisma(), payload.voucherId)) as IpcHandler<
    { voucherId: string },
    ChequePrintDto
  >,
};

export const voucherReadOptions = {
  resource: 'vouchers',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const voucherWriteOptions = {
  resource: 'vouchers',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const voucherCreateOptions = {
  resource: 'vouchers',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};
