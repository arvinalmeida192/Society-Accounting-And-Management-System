import type { PrismaClient } from '@prisma/client';
import {
  BillToType,
  BillType,
  VoucherStatus as PrismaVoucherStatus,
  VoucherSubType as PrismaVoucherSubType,
  VoucherType as PrismaVoucherType,
} from '@prisma/client';
import {
  ChequeType,
  ErrorCodes,
  SeriesType,
  VoucherSubType,
  VoucherType,
  type BillSettlementDto,
  type GeneralBillSettlementDto,
  type GeneralBillSettlementInputDto,
  type OpenBillDto,
  type RegularSettlementInputDto,
  type SettlementAllocationResultDto,
  type VoucherDetailDto,
  type VoucherLineDto,
  type VoucherPreviewResultDto,
  type VoucherSaveDto,
  type VoucherSummaryDto,
  VoucherStatus as SharedVoucherStatus,
} from '@sams/shared-types';
import { parseIsoDate } from './financial-year.js';
import { lookupMicr } from './masters-service.js';
import { Money } from './money.js';
import { numberSeriesService } from './number-series-service.js';
import {
  allocateRegularSettlement,
  allocateSupplementarySettlement,
  getOpenBillsForMember,
} from './settlement-service.js';
import { onReceiptPosted } from './statutory-register-service.js';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

async function getActiveFinancialYearId(client: PrismaClient): Promise<string> {
  const fy = await client.financialYear.findFirst({ orderBy: { startDate: 'desc' } });
  if (!fy) throw new Error('No financial year configured.');
  return fy.id;
}

function resolveSeriesType(
  voucherType: VoucherType,
  subType?: VoucherSubType,
): SeriesType {
  if (voucherType === VoucherType.RECEIPT) {
    return subType === VoucherSubType.GENERAL_RECEIPT ? SeriesType.GR : SeriesType.MR;
  }
  if (voucherType === VoucherType.PAYMENT) {
    return subType === VoucherSubType.BANK_PAYMENT ? SeriesType.BP : SeriesType.CP;
  }
  if (voucherType === VoucherType.JV) return SeriesType.JV;
  if (voucherType === VoucherType.DN) return SeriesType.DN;
  if (voucherType === VoucherType.CN) return SeriesType.CN;
  if (voucherType === VoucherType.PETTY_CASH) return SeriesType.CP;
  return SeriesType.CO;
}

function validateSubType(voucherType: VoucherType, subType?: VoucherSubType): void {
  if (
    [VoucherType.JV, VoucherType.DN, VoucherType.CN, VoucherType.PETTY_CASH, VoucherType.CONTRA].includes(
      voucherType,
    )
  ) {
    return;
  }
  if (voucherType === VoucherType.RECEIPT) {
    if (!subType || ![VoucherSubType.MEMBER_RECEIPT, VoucherSubType.GENERAL_RECEIPT].includes(subType)) {
      throw new Error('Receipt vouchers require Member Receipt or General Receipt sub-type.');
    }
  }
  if (voucherType === VoucherType.PAYMENT) {
    if (!subType || ![VoucherSubType.CASH_PAYMENT, VoucherSubType.BANK_PAYMENT].includes(subType)) {
      throw new Error('Payment vouchers require Cash Payment or Bank Payment sub-type.');
    }
  }
}

export function validateVoucherBalance(lines: VoucherSaveDto['lines']): {
  drTotal: number;
  crTotal: number;
  balanced: boolean;
  difference: number;
} {
  const drTotal = lines.reduce((sum, line) => sum + (line.drAmount ?? 0), 0);
  const crTotal = lines.reduce((sum, line) => sum + (line.crAmount ?? 0), 0);
  const difference = Money.fromRupees(drTotal).subtract(Money.fromRupees(crTotal)).toRupees();
  return {
    drTotal,
    crTotal,
    balanced: Math.abs(difference) < 0.01,
    difference,
  };
}

export async function validateManualVoucherNo(
  client: PrismaClient,
  voucherType: VoucherType,
  subType: VoucherSubType | undefined,
  manualNo: string,
  excludeVoucherId?: string,
): Promise<{ duplicate: boolean; warning?: string }> {
  if (!manualNo.trim()) return { duplicate: false };

  const existing = await client.voucher.findFirst({
    where: {
      manualVoucherNo: manualNo.trim(),
      voucherType: voucherType as PrismaVoucherType,
      ...(subType ? { subType: subType as PrismaVoucherSubType } : {}),
      ...(excludeVoucherId ? { NOT: { id: excludeVoucherId } } : {}),
    },
  });

  if (existing) {
    return {
      duplicate: true,
      warning: `Manual voucher number "${manualNo}" already exists on ${existing.systemVoucherNo}.`,
    };
  }
  return { duplicate: false };
}

async function mapVoucherDetail(
  record: {
    id: string;
    voucherType: string;
    subType: string | null;
    systemVoucherNo: string;
    manualVoucherNo: string | null;
    voucherDate: Date;
    narration: string;
    narrationMasterId: string | null;
    reconciliationAudited: boolean;
    recordAudited: boolean;
    status: string;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    lines: Array<{
      id: string;
      lineNo: number;
      accountMasterId: string;
      memberId: string | null;
      drAmount: { toString(): string };
      crAmount: { toString(): string };
      particulars: string | null;
      bankAccountId: string | null;
      createdAt: Date;
      createdBy: string;
      updatedAt: Date;
      updatedBy: string;
      accountMaster: { particulars: string };
      member?: { memberName: string } | null;
      chequeDetail?: {
        id: string;
        voucherLineId: string;
        chequeNo: string;
        chequeDate: Date;
        isPostDated: boolean;
        bankSlipNo: string | null;
        micrCode: string | null;
        chequeType: string | null;
        bankName: string | null;
        branchName: string | null;
        drawerName: string | null;
        bankMasterId: string | null;
        clearedOnDate: Date | null;
        createdAt: Date;
        createdBy: string;
        updatedAt: Date;
        updatedBy: string;
      } | null;
    }>;
    billSettlements: Array<{
      id: string;
      billId: string;
      voucherId: string | null;
      settlementDate: Date;
      principalAllocated: { toString(): string };
      interestAllocated: { toString(): string };
      serviceTaxAllocated: { toString(): string };
      createdAt: Date;
      createdBy: string;
      updatedAt: Date;
      updatedBy: string;
    }>;
    generalBillSettlements: Array<{
      id: string;
      voucherId: string;
      supplementaryBillId: string;
      amountAllocated: { toString(): string };
      settlementDate: Date;
      createdAt: Date;
      createdBy: string;
      updatedAt: Date;
      updatedBy: string;
      supplementaryBill: { systemBillNo: string; generalPartyName: string | null };
    }>;
  },
): Promise<VoucherDetailDto> {
  const lines: VoucherLineDto[] = record.lines.map((line) => ({
    id: line.id,
    lineNo: line.lineNo,
    accountMasterId: line.accountMasterId,
    accountParticulars: line.accountMaster.particulars,
    memberId: line.memberId,
    memberName: line.member?.memberName ?? null,
    drAmount: toNumber(line.drAmount),
    crAmount: toNumber(line.crAmount),
    particulars: line.particulars,
    bankAccountId: line.bankAccountId,
    cheque: line.chequeDetail
      ? {
          id: line.chequeDetail.id,
          voucherLineId: line.chequeDetail.voucherLineId,
          chequeNo: line.chequeDetail.chequeNo,
          chequeDate: line.chequeDetail.chequeDate.toISOString().slice(0, 10),
          isPostDated: line.chequeDetail.isPostDated,
          bankSlipNo: line.chequeDetail.bankSlipNo,
          micrCode: line.chequeDetail.micrCode,
          chequeType: (line.chequeDetail.chequeType as ChequeType | null) ?? null,
          bankName: line.chequeDetail.bankName,
          branchName: line.chequeDetail.branchName,
          drawerName: line.chequeDetail.drawerName,
          bankMasterId: line.chequeDetail.bankMasterId,
          clearedOnDate: line.chequeDetail.clearedOnDate
            ? line.chequeDetail.clearedOnDate.toISOString().slice(0, 10)
            : null,
          createdAt: line.chequeDetail.createdAt.toISOString(),
          createdBy: line.chequeDetail.createdBy,
          updatedAt: line.chequeDetail.updatedAt.toISOString(),
          updatedBy: line.chequeDetail.updatedBy,
        }
      : null,
    createdAt: line.createdAt.toISOString(),
    createdBy: line.createdBy,
    updatedAt: line.updatedAt.toISOString(),
    updatedBy: line.updatedBy,
  }));

  const drTotal = lines.reduce((sum, line) => sum + line.drAmount, 0);
  const crTotal = lines.reduce((sum, line) => sum + line.crAmount, 0);

  const billSettlements: BillSettlementDto[] = record.billSettlements.map((row) => ({
    id: row.id,
    billId: row.billId,
    voucherId: row.voucherId,
    settlementDate: row.settlementDate.toISOString().slice(0, 10),
    principalAllocated: toNumber(row.principalAllocated),
    interestAllocated: toNumber(row.interestAllocated),
    serviceTaxAllocated: toNumber(row.serviceTaxAllocated),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  }));

  const generalBillSettlements: GeneralBillSettlementDto[] = record.generalBillSettlements.map(
    (row) => ({
      id: row.id,
      voucherId: row.voucherId,
      supplementaryBillId: row.supplementaryBillId,
      systemBillNo: row.supplementaryBill.systemBillNo,
      generalPartyName: row.supplementaryBill.generalPartyName,
      amountAllocated: toNumber(row.amountAllocated),
      settlementDate: row.settlementDate.toISOString().slice(0, 10),
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    }),
  );

  return {
    id: record.id,
    voucherType: record.voucherType as VoucherType,
    subType: record.subType as VoucherSubType | null,
    systemVoucherNo: record.systemVoucherNo,
    manualVoucherNo: record.manualVoucherNo,
    voucherDate: record.voucherDate.toISOString().slice(0, 10),
    narration: record.narration,
    narrationMasterId: record.narrationMasterId,
    reconciliationAudited: record.reconciliationAudited,
    recordAudited: record.recordAudited,
    status: record.status as SharedVoucherStatus,
    drTotal,
    crTotal,
    lines,
    billSettlements,
    generalBillSettlements,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

const voucherInclude = {
  lines: {
    orderBy: { lineNo: 'asc' as const },
    include: {
      accountMaster: { select: { particulars: true } },
      member: { select: { memberName: true } },
      chequeDetail: true,
    },
  },
  billSettlements: true,
  generalBillSettlements: {
    include: {
      supplementaryBill: { select: { systemBillNo: true, generalPartyName: true } },
    },
  },
} as const;

export async function previewVoucherPost(
  client: PrismaClient,
  dto: VoucherSaveDto,
): Promise<VoucherPreviewResultDto> {
  validateSubType(dto.voucherType, dto.subType);
  const balance = validateVoucherBalance(dto.lines);
  const warnings: string[] = [];

  if (!balance.balanced) {
    return {
      balanced: false,
      drTotal: balance.drTotal,
      crTotal: balance.crTotal,
      difference: balance.difference,
      warnings: ['Voucher is not balanced. ΣDr must equal ΣCr.'],
    };
  }

  if (dto.manualVoucherNo) {
    const manual = await validateManualVoucherNo(
      client,
      dto.voucherType,
      dto.subType,
      dto.manualVoucherNo,
      dto.id,
    );
    if (manual.warning) warnings.push(manual.warning);
  }

  let settlementPreview: SettlementAllocationResultDto | undefined;
  if (dto.regularSettlement && dto.regularSettlement.amount > 0) {
    settlementPreview = await allocateRegularSettlement(client, {
      ...dto.regularSettlement,
      autoFifo: dto.regularSettlement.autoFifo ?? true,
    }, dto.voucherDate);
    if (settlementPreview.unallocated > 0.01) {
      warnings.push(
        `₹${settlementPreview.unallocated.toFixed(2)} of settlement amount could not be allocated to open bills.`,
      );
    }
  }

  return {
    balanced: true,
    drTotal: balance.drTotal,
    crTotal: balance.crTotal,
    difference: 0,
    warnings,
    settlementPreview,
  };
}

async function persistGeneralBillSettlement(
  tx: PrismaClient,
  voucherId: string,
  settlementDate: Date,
  input: GeneralBillSettlementInputDto,
  actorId: string,
): Promise<void> {
  const bill = await tx.bill.findFirstOrThrow({
    where: {
      id: input.supplementaryBillId,
      billType: BillType.SUPPLEMENTARY,
      billToType: BillToType.GENERAL,
      status: 'POSTED',
    },
    include: { settlements: true, generalSettlements: true },
  });

  const billSettled = bill.settlements.reduce(
    (sum, row) =>
      sum + toNumber(row.principalAllocated) + toNumber(row.interestAllocated) + toNumber(row.serviceTaxAllocated),
    0,
  );
  const generalSettled = bill.generalSettlements.reduce(
    (sum, row) => sum + toNumber(row.amountAllocated),
    0,
  );
  const outstanding = Math.max(0, toNumber(bill.billAmount) - billSettled - generalSettled);
  const amount = Math.min(input.amount, outstanding);

  if (amount <= 0) {
    throw new Error('General supplementary bill has no outstanding balance to settle.');
  }

  await tx.generalBillSettlement.create({
    data: {
      voucherId,
      supplementaryBillId: bill.id,
      amountAllocated: amount,
      settlementDate,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
}

export async function postVoucher(
  client: PrismaClient,
  dto: VoucherSaveDto,
  actorId: string,
): Promise<VoucherDetailDto> {
  validateSubType(dto.voucherType, dto.subType);
  const balance = validateVoucherBalance(dto.lines);
  if (!balance.balanced) {
    throw Object.assign(new Error('Voucher is not balanced. ΣDr must equal ΣCr.'), {
      code: ErrorCodes.ACCOUNTING_IMBALANCE,
    });
  }

  const financialYearId = await getActiveFinancialYearId(client);
  const voucherDate = parseIsoDate(dto.voucherDate, 'voucherDate');
  const seriesType = resolveSeriesType(dto.voucherType, dto.subType);

  const record = await client.$transaction(async (tx) => {
    const systemVoucherNo = await numberSeriesService.next(
      tx as PrismaClient,
      seriesType,
      financialYearId,
      actorId,
      tx as never,
    );

    const voucher = await tx.voucher.create({
      data: {
        financialYearId,
        voucherType: dto.voucherType as PrismaVoucherType,
        subType: dto.subType as PrismaVoucherSubType | undefined,
        systemVoucherNo,
        manualVoucherNo: dto.manualVoucherNo?.trim() || null,
        voucherDate,
        narration: dto.narration?.trim() ?? '',
        narrationMasterId: dto.narrationMasterId ?? null,
        reconciliationAudited: dto.reconciliationAudited ?? false,
        recordAudited: dto.recordAudited ?? false,
        status: PrismaVoucherStatus.POSTED,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    for (const line of dto.lines) {
      const createdLine = await tx.voucherLine.create({
        data: {
          voucherId: voucher.id,
          lineNo: line.lineNo,
          accountMasterId: line.accountMasterId,
          memberId: line.memberId ?? null,
          drAmount: line.drAmount,
          crAmount: line.crAmount,
          particulars: line.particulars ?? null,
          bankAccountId: line.bankAccountId ?? null,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      if (line.cheque?.chequeNo) {
        await tx.chequeDetail.create({
          data: {
            voucherLineId: createdLine.id,
            chequeNo: line.cheque.chequeNo,
            chequeDate: parseIsoDate(line.cheque.chequeDate, 'chequeDate'),
            isPostDated: line.cheque.isPostDated ?? false,
            bankSlipNo: line.cheque.bankSlipNo ?? null,
            micrCode: line.cheque.micrCode ?? null,
            chequeType: line.cheque.chequeType ?? null,
            bankName: line.cheque.bankName ?? null,
            branchName: line.cheque.branchName ?? null,
            drawerName: line.cheque.drawerName ?? null,
            bankMasterId: line.cheque.bankMasterId ?? null,
            clearedOnDate: line.cheque.clearedOnDate
              ? parseIsoDate(line.cheque.clearedOnDate, 'clearedOnDate')
              : null,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
      }
    }

    if (dto.regularSettlement && dto.regularSettlement.amount > 0) {
      const allocation = await allocateRegularSettlement(
        tx as PrismaClient,
        {
          ...dto.regularSettlement,
          autoFifo: dto.regularSettlement.autoFifo ?? true,
        },
        dto.voucherDate,
      );

      for (const row of allocation.allocations) {
        await tx.billSettlement.create({
          data: {
            billId: row.billId,
            voucherId: voucher.id,
            settlementDate: voucherDate,
            principalAllocated: row.principalAllocated,
            interestAllocated: row.interestAllocated,
            serviceTaxAllocated: row.serviceTaxAllocated,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
      }
    }

    if (dto.supplementarySettlements?.length) {
      for (const item of dto.supplementarySettlements) {
        const row = await allocateSupplementarySettlement(
          tx as PrismaClient,
          item,
          dto.voucherDate,
        );
        if (row.allocated > 0) {
          await tx.billSettlement.create({
            data: {
              billId: row.billId,
              voucherId: voucher.id,
              settlementDate: voucherDate,
              principalAllocated: row.principalAllocated,
              interestAllocated: row.interestAllocated,
              serviceTaxAllocated: row.serviceTaxAllocated,
              createdBy: actorId,
              updatedBy: actorId,
            },
          });
        }
      }
    }

    if (dto.generalBillSettlement && dto.generalBillSettlement.amount > 0) {
      await persistGeneralBillSettlement(
        tx as PrismaClient,
        voucher.id,
        voucherDate,
        dto.generalBillSettlement,
        actorId,
      );
    }

    const posted = await tx.voucher.findUniqueOrThrow({
      where: { id: voucher.id },
      include: voucherInclude,
    });

    await onReceiptPosted(tx as PrismaClient, posted, actorId);

    return posted;
  });

  return mapVoucherDetail(record);
}

export async function listVouchers(
  client: PrismaClient,
  filter?: {
    voucherType?: VoucherType;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  },
): Promise<{ items: VoucherSummaryDto[]; total: number }> {
  const where = {
    ...(filter?.voucherType ? { voucherType: filter.voucherType as PrismaVoucherType } : {}),
    ...(filter?.dateFrom || filter?.dateTo
      ? {
          voucherDate: {
            ...(filter.dateFrom ? { gte: parseIsoDate(filter.dateFrom, 'dateFrom') } : {}),
            ...(filter.dateTo ? { lte: parseIsoDate(filter.dateTo, 'dateTo') } : {}),
          },
        }
      : {}),
    ...(filter?.search?.trim()
      ? {
          OR: [
            { systemVoucherNo: { contains: filter.search.trim() } },
            { narration: { contains: filter.search.trim() } },
            { manualVoucherNo: { contains: filter.search.trim() } },
          ],
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    client.voucher.findMany({
      where,
      include: { lines: true },
      orderBy: [{ voucherDate: 'desc' }, { systemVoucherNo: 'desc' }],
      take: 200,
    }),
    client.voucher.count({ where }),
  ]);

  const items = records.map((row) => ({
    id: row.id,
    systemVoucherNo: row.systemVoucherNo,
    voucherType: row.voucherType as VoucherType,
    subType: row.subType as VoucherSubType | null,
    voucherDate: row.voucherDate.toISOString().slice(0, 10),
    narration: row.narration,
    drTotal: row.lines.reduce((sum, line) => sum + toNumber(line.drAmount), 0),
    crTotal: row.lines.reduce((sum, line) => sum + toNumber(line.crAmount), 0),
    status: row.status as SharedVoucherStatus,
  }));

  return { items, total };
}

export async function getVoucher(
  client: PrismaClient,
  id: string,
): Promise<VoucherDetailDto> {
  const record = await client.voucher.findUniqueOrThrow({
    where: { id },
    include: voucherInclude,
  });
  return mapVoucherDetail(record);
}

export async function linkGeneralBill(
  client: PrismaClient,
  voucherId: string,
  supplementaryBillId: string,
  amount: number,
  actorId: string,
): Promise<GeneralBillSettlementDto> {
  const voucher = await client.voucher.findUniqueOrThrow({ where: { id: voucherId } });
  const settlementDate = voucher.voucherDate;

  await persistGeneralBillSettlement(client, voucherId, settlementDate, {
    supplementaryBillId,
    amount,
  }, actorId);

  const row = await client.generalBillSettlement.findFirstOrThrow({
    where: { voucherId, supplementaryBillId },
    include: { supplementaryBill: { select: { systemBillNo: true, generalPartyName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return {
    id: row.id,
    voucherId: row.voucherId,
    supplementaryBillId: row.supplementaryBillId,
    systemBillNo: row.supplementaryBill.systemBillNo,
    generalPartyName: row.supplementaryBill.generalPartyName,
    amountAllocated: toNumber(row.amountAllocated),
    settlementDate: row.settlementDate.toISOString().slice(0, 10),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

export async function listOpenBills(
  client: PrismaClient,
  memberId: string,
  billType: 'REGULAR' | 'SUPPLEMENTARY',
): Promise<OpenBillDto[]> {
  return getOpenBillsForMember(client, memberId, billType);
}

export async function allocateSettlementPreview(
  client: PrismaClient,
  input: RegularSettlementInputDto,
  asOfDate?: string,
): Promise<SettlementAllocationResultDto> {
  return allocateRegularSettlement(client, input, asOfDate);
}

export async function cancelVoucher(
  client: PrismaClient,
  voucherId: string,
  cancelDate: string,
  actorId: string,
  options?: { reasonId?: string; updateCheque?: boolean },
): Promise<{ original: VoucherDetailDto; reversal: VoucherDetailDto }> {
  const original = await client.voucher.findUniqueOrThrow({
    where: { id: voucherId },
    include: {
      ...voucherInclude,
      lines: {
        orderBy: { lineNo: 'asc' },
        include: {
          accountMaster: { select: { particulars: true } },
          member: { select: { memberName: true } },
          chequeDetail: true,
        },
      },
    },
  });

  if (original.status === PrismaVoucherStatus.CANCELLED) {
    throw new Error('Voucher is already cancelled.');
  }

  const parsedCancelDate = parseIsoDate(cancelDate, 'cancelDate');
  const financialYearId = original.financialYearId;
  const seriesType = resolveSeriesType(
    original.voucherType as VoucherType,
    original.subType as VoucherSubType | undefined,
  );

  const record = await client.$transaction(async (tx) => {
    if (options?.updateCheque) {
      for (const line of original.lines) {
        if (line.chequeDetail && !line.chequeDetail.cancelledOn) {
          await tx.chequeDetail.update({
            where: { id: line.chequeDetail.id },
            data: {
              cancelledOn: parsedCancelDate,
              cancellationReasonId: options.reasonId ?? null,
              updatedBy: actorId,
            },
          });
        }
      }
    }

    const systemVoucherNo = await numberSeriesService.next(
      tx as PrismaClient,
      seriesType,
      financialYearId,
      actorId,
      tx as never,
    );

    const reversal = await tx.voucher.create({
      data: {
        financialYearId,
        voucherType: original.voucherType,
        subType: original.subType,
        systemVoucherNo,
        manualVoucherNo: null,
        voucherDate: parsedCancelDate,
        narration: `Reversal of ${original.systemVoucherNo}`,
        narrationMasterId: null,
        reconciliationAudited: false,
        recordAudited: false,
        status: PrismaVoucherStatus.POSTED,
        reversalOfVoucherId: original.id,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    for (const line of original.lines) {
      await tx.voucherLine.create({
        data: {
          voucherId: reversal.id,
          lineNo: line.lineNo,
          accountMasterId: line.accountMasterId,
          memberId: line.memberId,
          drAmount: line.crAmount,
          crAmount: line.drAmount,
          particulars: line.particulars,
          bankAccountId: line.bankAccountId,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }

    for (const settlement of original.billSettlements) {
      await tx.billSettlement.create({
        data: {
          billId: settlement.billId,
          voucherId: reversal.id,
          settlementDate: parsedCancelDate,
          principalAllocated: -toNumber(settlement.principalAllocated),
          interestAllocated: -toNumber(settlement.interestAllocated),
          serviceTaxAllocated: -toNumber(settlement.serviceTaxAllocated),
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }

    for (const settlement of original.generalBillSettlements) {
      await tx.generalBillSettlement.create({
        data: {
          voucherId: reversal.id,
          supplementaryBillId: settlement.supplementaryBillId,
          amountAllocated: -toNumber(settlement.amountAllocated),
          settlementDate: parsedCancelDate,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }

    await tx.voucher.update({
      where: { id: original.id },
      data: {
        status: PrismaVoucherStatus.CANCELLED,
        reversedByVoucherId: reversal.id,
        updatedBy: actorId,
      },
    });

    const [updatedOriginal, updatedReversal] = await Promise.all([
      tx.voucher.findUniqueOrThrow({ where: { id: original.id }, include: voucherInclude }),
      tx.voucher.findUniqueOrThrow({ where: { id: reversal.id }, include: voucherInclude }),
    ]);

    return { original: updatedOriginal, reversal: updatedReversal };
  });

  return {
    original: await mapVoucherDetail(record.original),
    reversal: await mapVoucherDetail(record.reversal),
  };
}

export { lookupMicr };
