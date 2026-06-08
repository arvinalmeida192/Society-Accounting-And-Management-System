import type { Prisma, PrismaClient } from '@prisma/client';
import { VoucherType as PrismaVoucherType } from '@prisma/client';
import type { TdsChallanDto, TdsRecordDto } from '@sams/shared-types';
import { parseIsoDate } from './financial-year.js';

type TxClient = Prisma.TransactionClient | PrismaClient;

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

function formatDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function isTdsPayableAccount(particulars: string): boolean {
  return /tds\s*payable/i.test(particulars);
}

function mapTdsRecord(record: {
  id: string;
  financialYearId: string;
  voucherId: string;
  voucherLineId: string;
  paymentDate: Date;
  natureOfPayment: string | null;
  partyAccountId: string | null;
  partyName: string;
  billNo: string | null;
  billDate: Date | null;
  billAmount: { toString(): string };
  taxableAmount: { toString(): string };
  tdsRate: { toString(): string };
  tdsAmount: { toString(): string };
  surchargeRate: { toString(): string };
  surchargeAmount: { toString(): string };
  educationCessRate: { toString(): string };
  educationCessAmount: { toString(): string };
  totalRate: { toString(): string };
  totalAmount: { toString(): string };
  challanId: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  voucher?: { systemVoucherNo: string } | null;
  challan?: {
    id: string;
    bsrCode: string | null;
    bankName: string | null;
    branchName: string | null;
    challanNo: string | null;
    challanDate: Date | null;
    chequeNo: string | null;
    chequeDate: Date | null;
  } | null;
}): TdsRecordDto {
  return {
    id: record.id,
    financialYearId: record.financialYearId,
    voucherId: record.voucherId,
    voucherLineId: record.voucherLineId,
    systemVoucherNo: record.voucher?.systemVoucherNo ?? null,
    paymentDate: formatDate(record.paymentDate) ?? '',
    natureOfPayment: record.natureOfPayment,
    partyAccountId: record.partyAccountId,
    partyName: record.partyName,
    billNo: record.billNo,
    billDate: formatDate(record.billDate),
    billAmount: toNumber(record.billAmount),
    taxableAmount: toNumber(record.taxableAmount),
    tdsRate: toNumber(record.tdsRate),
    tdsAmount: toNumber(record.tdsAmount),
    surchargeRate: toNumber(record.surchargeRate),
    surchargeAmount: toNumber(record.surchargeAmount),
    educationCessRate: toNumber(record.educationCessRate),
    educationCessAmount: toNumber(record.educationCessAmount),
    totalRate: toNumber(record.totalRate),
    totalAmount: toNumber(record.totalAmount),
    challanId: record.challanId,
    challan: record.challan
      ? {
          id: record.challan.id,
          financialYearId: record.financialYearId,
          bsrCode: record.challan.bsrCode,
          bankName: record.challan.bankName,
          branchName: record.challan.branchName,
          challanNo: record.challan.challanNo,
          challanDate: formatDate(record.challan.challanDate),
          chequeNo: record.challan.chequeNo,
          chequeDate: formatDate(record.challan.chequeDate),
          createdAt: record.createdAt.toISOString(),
          createdBy: record.createdBy,
          updatedAt: record.updatedAt.toISOString(),
          updatedBy: record.updatedBy,
        }
      : null,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function resolvePartyLine(
  lines: Array<{
    id: string;
    accountMasterId: string;
    drAmount: { toString(): string };
    crAmount: { toString(): string };
    particulars: string | null;
    accountMaster: { particulars: string };
  }>,
  tdsLineId: string,
): (typeof lines)[number] | null {
  const candidates = lines.filter((line) => {
    if (line.id === tdsLineId) return false;
    if (isTdsPayableAccount(line.accountMaster.particulars)) return false;
    return toNumber(line.drAmount) > 0;
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((best, line) =>
    toNumber(line.drAmount) > toNumber(best.drAmount) ? line : best,
  );
}

export async function createTdsFromPaymentVoucher(
  client: TxClient,
  voucher: {
    id: string;
    financialYearId: string;
    voucherType: string;
    voucherDate: Date;
    lines: Array<{
      id: string;
      accountMasterId: string;
      drAmount: { toString(): string };
      crAmount: { toString(): string };
      particulars: string | null;
      accountMaster: { particulars: string };
    }>;
  },
  actorId: string,
): Promise<void> {
  if (voucher.voucherType !== PrismaVoucherType.PAYMENT) {
    return;
  }

  for (const line of voucher.lines) {
    if (!isTdsPayableAccount(line.accountMaster.particulars)) {
      continue;
    }

    const existing = await client.tdsRecord.findUnique({
      where: { voucherLineId: line.id },
    });
    if (existing) {
      continue;
    }

    const tdsAmount = toNumber(line.crAmount) || toNumber(line.drAmount);
    if (tdsAmount <= 0) {
      continue;
    }

    const partyLine = resolvePartyLine(voucher.lines, line.id);
    const taxableAmount = partyLine ? toNumber(partyLine.drAmount) : 0;
    const partyName =
      partyLine?.particulars?.trim() ||
      partyLine?.accountMaster.particulars ||
      'Unknown Party';
    const tdsRate = taxableAmount > 0 ? (tdsAmount / taxableAmount) * 100 : 0;

    await client.tdsRecord.create({
      data: {
        financialYearId: voucher.financialYearId,
        voucherId: voucher.id,
        voucherLineId: line.id,
        paymentDate: voucher.voucherDate,
        natureOfPayment: partyLine?.accountMaster.particulars ?? null,
        partyAccountId: partyLine?.accountMasterId ?? null,
        partyName,
        billAmount: taxableAmount,
        taxableAmount,
        tdsRate,
        tdsAmount,
        totalRate: tdsRate,
        totalAmount: tdsAmount,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }
}

const tdsInclude = {
  voucher: { select: { systemVoucherNo: true } },
  challan: true,
} as const;

export async function listTdsRecords(
  client: PrismaClient,
  filter?: {
    financialYearId?: string;
    partyAccountId?: string;
    search?: string;
    unlinkedChallanOnly?: boolean;
  },
): Promise<TdsRecordDto[]> {
  const records = await client.tdsRecord.findMany({
    where: {
      ...(filter?.financialYearId ? { financialYearId: filter.financialYearId } : {}),
      ...(filter?.partyAccountId ? { partyAccountId: filter.partyAccountId } : {}),
      ...(filter?.unlinkedChallanOnly ? { challanId: null } : {}),
      ...(filter?.search?.trim()
        ? {
            OR: [
              { partyName: { contains: filter.search.trim() } },
              { natureOfPayment: { contains: filter.search.trim() } },
              { billNo: { contains: filter.search.trim() } },
            ],
          }
        : {}),
    },
    include: tdsInclude,
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
  });

  return records.map(mapTdsRecord);
}

export async function getTdsRecord(client: PrismaClient, id: string): Promise<TdsRecordDto> {
  const record = await client.tdsRecord.findUniqueOrThrow({
    where: { id },
    include: tdsInclude,
  });
  return mapTdsRecord(record);
}

export async function updateTdsRecord(
  client: PrismaClient,
  dto: TdsRecordDto,
  actorId: string,
): Promise<TdsRecordDto> {
  const record = await client.tdsRecord.update({
    where: { id: dto.id },
    data: {
      natureOfPayment: dto.natureOfPayment,
      partyAccountId: dto.partyAccountId,
      partyName: dto.partyName,
      billNo: dto.billNo,
      billDate: dto.billDate ? parseIsoDate(dto.billDate, 'billDate') : null,
      billAmount: dto.billAmount,
      taxableAmount: dto.taxableAmount,
      tdsRate: dto.tdsRate,
      tdsAmount: dto.tdsAmount,
      surchargeRate: dto.surchargeRate,
      surchargeAmount: dto.surchargeAmount,
      educationCessRate: dto.educationCessRate,
      educationCessAmount: dto.educationCessAmount,
      totalRate: dto.totalRate,
      totalAmount: dto.totalAmount,
      updatedBy: actorId,
    },
    include: tdsInclude,
  });
  return mapTdsRecord(record);
}

export async function saveTdsChallan(
  client: PrismaClient,
  dto: TdsChallanDto,
  actorId: string,
): Promise<TdsChallanDto> {
  const financialYearId = dto.financialYearId;
  const data = {
    financialYearId,
    bsrCode: dto.bsrCode?.trim() || null,
    bankName: dto.bankName?.trim() || null,
    branchName: dto.branchName?.trim() || null,
    challanNo: dto.challanNo?.trim() || null,
    challanDate: dto.challanDate ? parseIsoDate(dto.challanDate, 'challanDate') : null,
    chequeNo: dto.chequeNo?.trim() || null,
    chequeDate: dto.chequeDate ? parseIsoDate(dto.chequeDate, 'chequeDate') : null,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.tdsChallan.update({
        where: { id: dto.id },
        data,
      })
    : await client.tdsChallan.create({
        data: { ...data, createdBy: actorId },
      });

  if (dto.tdsRecordIds?.length) {
    await client.tdsRecord.updateMany({
      where: { id: { in: dto.tdsRecordIds } },
      data: { challanId: record.id, updatedBy: actorId },
    });
  }

  return {
    id: record.id,
    financialYearId: record.financialYearId,
    bsrCode: record.bsrCode,
    bankName: record.bankName,
    branchName: record.branchName,
    challanNo: record.challanNo,
    challanDate: formatDate(record.challanDate),
    chequeNo: record.chequeNo,
    chequeDate: formatDate(record.chequeDate),
    tdsRecordIds: dto.tdsRecordIds,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function listTdsChallans(
  client: PrismaClient,
  financialYearId?: string,
): Promise<TdsChallanDto[]> {
  const records = await client.tdsChallan.findMany({
    where: financialYearId ? { financialYearId } : undefined,
    orderBy: [{ challanDate: 'desc' }, { createdAt: 'desc' }],
  });

  return records.map((record) => ({
    id: record.id,
    financialYearId: record.financialYearId,
    bsrCode: record.bsrCode,
    bankName: record.bankName,
    branchName: record.branchName,
    challanNo: record.challanNo,
    challanDate: formatDate(record.challanDate),
    chequeNo: record.chequeNo,
    chequeDate: formatDate(record.chequeDate),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  }));
}

export { isTdsPayableAccount };
