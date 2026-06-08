import { PermissionAction } from '@sams/shared-types';
import type {
  BillInterestDetailDto,
  BillPrintDto,
  BillSettlementDto,
  BillSummaryDto,
  BillToType,
  BillingPeriodDto,
  BulkRegularBillGenerateDto,
  BulkRegularBillResult,
  RegularBillDetailDto,
  RegularBillPreviewDto,
  RegularBillSaveDto,
  SupplementaryBillDetailDto,
  SupplementaryBillPreviewDto,
  SupplementaryBillSaveDto,
  SupplementaryBillSummaryDto,
} from '@sams/shared-types';
import {
  generateBulkRegular,
  getBillSettlements,
  getNextOpenPeriod,
  getRegularBill,
  getSupplementaryBill,
  listBillingPeriods,
  listRegularBills,
  listSupplementaryBills,
  previewRegularBill,
  previewSupplementaryBill,
  saveRegularBill,
  saveSupplementaryBill,
  prepareRegularBillPrintData,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const billingHandlers = {
  listPeriods: (async (ctx) => {
    const financialYearId = ctx.session.financialYearId;
    if (!financialYearId) throw new Error('No active financial year in session.');
    return listBillingPeriods(getActivePrisma(), financialYearId);
  }) as IpcHandler<{ financialYearId?: string }, BillingPeriodDto[]>,

  getNextPeriod: (async () =>
    getNextOpenPeriod(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    { periodKey: string; periodLabel: string } | null
  >,

  listRegularBills: (async (
    _ctx,
    payload: { memberId?: string; periodKey?: string; search?: string },
  ) => listRegularBills(getActivePrisma(), payload)) as IpcHandler<
    { memberId?: string; periodKey?: string; search?: string },
    { items: BillSummaryDto[]; total: number }
  >,

  getRegularBill: (async (_ctx, payload: { id: string }) =>
    getRegularBill(getActivePrisma(), payload.id)) as IpcHandler<
    { id: string },
    RegularBillDetailDto
  >,

  previewRegularBill: (async (_ctx, payload: RegularBillPreviewDto) =>
    previewRegularBill(getActivePrisma(), payload)) as IpcHandler<
    RegularBillPreviewDto,
    RegularBillDetailDto
  >,

  saveRegularBill: (async (_ctx, payload: RegularBillSaveDto) =>
    saveRegularBill(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    RegularBillSaveDto,
    RegularBillDetailDto
  >,

  getInterestDetail: (async (_ctx, payload: { id: string }) => {
    const bill = await getRegularBill(getActivePrisma(), payload.id);
    return bill.interestDetails;
  }) as IpcHandler<{ id: string }, BillInterestDetailDto[]>,

  generateBulkRegular: (async (_ctx, payload: BulkRegularBillGenerateDto) =>
    generateBulkRegular(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    BulkRegularBillGenerateDto,
    BulkRegularBillResult
  >,

  getBillSettlements: (async (_ctx, payload: { billId: string }) =>
    getBillSettlements(getActivePrisma(), payload.billId)) as IpcHandler<
    { billId: string },
    BillSettlementDto[]
  >,

  listSupplementaryBills: (async (
    _ctx,
    payload: {
      billToType?: BillToType;
      memberId?: string;
      tenantId?: string;
      periodKey?: string;
      search?: string;
    },
  ) => listSupplementaryBills(getActivePrisma(), payload)) as IpcHandler<
    {
      billToType?: BillToType;
      memberId?: string;
      tenantId?: string;
      periodKey?: string;
      search?: string;
    },
    { items: SupplementaryBillSummaryDto[]; total: number }
  >,

  getSupplementaryBill: (async (_ctx, payload: { id: string }) =>
    getSupplementaryBill(getActivePrisma(), payload.id)) as IpcHandler<
    { id: string },
    SupplementaryBillDetailDto
  >,

  previewSupplementaryBill: (async (_ctx, payload: SupplementaryBillPreviewDto) =>
    previewSupplementaryBill(getActivePrisma(), payload)) as IpcHandler<
    SupplementaryBillPreviewDto,
    SupplementaryBillDetailDto
  >,

  saveSupplementaryBill: (async (_ctx, payload: SupplementaryBillSaveDto) =>
    saveSupplementaryBill(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    SupplementaryBillSaveDto,
    SupplementaryBillDetailDto
  >,

  printRegularBill: (async (_ctx, payload: { billId: string }) =>
    prepareRegularBillPrintData(getActivePrisma(), payload.billId)) as IpcHandler<
    { billId: string },
    BillPrintDto
  >,
};

export const billingReadOptions = {
  resource: 'billing',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const billingWriteOptions = {
  resource: 'billing',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const billingCreateOptions = {
  resource: 'billing',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};
