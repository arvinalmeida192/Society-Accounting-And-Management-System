import type { PrismaClient } from '@prisma/client';
import { BillLineType as PrismaBillLineType, BillStatus, BillType } from '@prisma/client';
import {
  BillChargeLineType,
  BillStatus as SharedBillStatus,
  BillToType,
  BillType as SharedBillType,
  SeriesType,
  type BillSettlementDto,
  type BillSummaryDto,
  type BillingPeriodDto,
  type BulkRegularBillGenerateDto,
  type BulkRegularBillResult,
  type RegularBillDetailDto,
  type RegularBillPreviewDto,
  type RegularBillSaveDto,
  type SupplementaryBillDetailDto,
  type SupplementaryBillPreviewDto,
  type SupplementaryBillSaveDto,
  type SupplementaryBillSummaryDto,
} from '@sams/shared-types';
import { parseIsoDate } from './financial-year.js';
import { computeArrears, computeSupplementaryArrears } from './arrears-service.js';
import {
  calculateInterest,
  collectSupplementaryInterestSources,
} from './interest-calculation-service.js';
import { calculateNocLines } from './noc-charge-service.js';
import { calculateRebate } from './rebate-service.js';
import { calculateServiceTax } from './service-tax-service.js';
import { Money } from './money.js';
import { numberSeriesService } from './number-series-service.js';
import { calculateParkingCharges } from './parking-service.js';
import { resolveTariffForMember } from './tariff-service.js';

const CHARGE_LINE_MAP: Record<BillChargeLineType, PrismaBillLineType> = {
  [BillChargeLineType.CHARGE]: PrismaBillLineType.CHARGE,
  [BillChargeLineType.PARKING]: PrismaBillLineType.PARKING,
  [BillChargeLineType.NOC]: PrismaBillLineType.NOC,
  [BillChargeLineType.SERVICE_TAX]: PrismaBillLineType.SERVICE_TAX,
  [BillChargeLineType.REBATE]: PrismaBillLineType.REBATE,
  [BillChargeLineType.ADJUSTMENT]: PrismaBillLineType.ADJUSTMENT,
  [BillChargeLineType.INTEREST]: PrismaBillLineType.INTEREST,
};

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

async function getActiveFinancialYearId(client: PrismaClient): Promise<string> {
  const fy = await client.financialYear.findFirst({ orderBy: { startDate: 'desc' } });
  if (!fy) throw new Error('No financial year configured.');
  return fy.id;
}

export async function listBillingPeriods(
  client: PrismaClient,
  financialYearId?: string,
): Promise<BillingPeriodDto[]> {
  const fyId = financialYearId ?? (await getActiveFinancialYearId(client));
  const rows = await client.billingPeriodCalendar.findMany({
    where: { financialYearId: fyId },
    orderBy: { sequenceNo: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    financialYearId: row.financialYearId,
    periodKey: row.periodKey,
    periodLabel: row.periodLabel,
    periodStartDate: row.periodStartDate.toISOString().slice(0, 10),
    periodEndDate: row.periodEndDate.toISOString().slice(0, 10),
    sequenceNo: row.sequenceNo,
  }));
}

export async function getNextOpenPeriod(
  client: PrismaClient,
): Promise<{ periodKey: string; periodLabel: string } | null> {
  const periods = await listBillingPeriods(client);
  if (periods.length === 0) return null;

  const billed = await client.bill.findMany({
    where: { billType: BillType.REGULAR },
    select: { billForPeriodKey: true },
    distinct: ['billForPeriodKey'],
  });
  const billedKeys = new Set(billed.map((row) => row.billForPeriodKey));

  const next = periods.find((period) => !billedKeys.has(period.periodKey));
  return next
    ? { periodKey: next.periodKey, periodLabel: next.periodLabel }
    : { periodKey: periods[periods.length - 1]!.periodKey, periodLabel: periods[periods.length - 1]!.periodLabel };
}

export async function assertNotDuplicateBill(
  client: PrismaClient,
  memberId: string,
  billForPeriodKey: string,
  excludeBillId?: string,
): Promise<void> {
  const existing = await client.bill.findFirst({
    where: {
      memberId,
      billForPeriodKey,
      billType: BillType.REGULAR,
      ...(excludeBillId ? { NOT: { id: excludeBillId } } : {}),
    },
  });
  if (existing) {
    throw Object.assign(new Error('A bill already exists for this member and period.'), {
      fieldErrors: { billForPeriodKey: 'Duplicate bill for member+period (GAP-001).' },
    });
  }
}

async function loadMemberForBilling(client: PrismaClient, memberId: string) {
  const member = await client.member.findFirst({
    where: { id: memberId, disposedAt: null },
    include: {
      unit: { include: { building: true, wing: true, unitArea: true } },
    },
  });
  if (!member) {
    throw new Error('Member not found or disposed.');
  }
  if (!member.generateRegularBills) {
    throw new Error('Regular bill generation is disabled for this member.');
  }
  return member;
}

export async function buildRegularBillDraft(
  client: PrismaClient,
  input: RegularBillPreviewDto,
): Promise<RegularBillDetailDto> {
  const member = await loadMemberForBilling(client, input.memberId);
  const parameters = await client.societyParameters.findFirstOrThrow();
  const decimalPlaces = (parameters.tariffDecimalPlaces === 0 ? 0 : 2) as 0 | 2;

  const period = await client.billingPeriodCalendar.findFirst({
    where: { periodKey: input.billForPeriodKey },
  });
  if (!period) {
    throw new Error('Invalid bill period.');
  }

  const billDate = parseIsoDate(input.billDate, 'billDate');
  const dueDate = input.dueDate
    ? parseIsoDate(input.dueDate, 'dueDate')
    : new Date(billDate.getTime() + parameters.dueDateOffsetDays * 86400000);

  const tariff = await resolveTariffForMember(
    client,
    member.id,
    billDate.toISOString().slice(0, 10),
  );

  const lines: RegularBillDetailDto['lines'] = [];
  let srNo = 1;

  for (const line of tariff.lines) {
    lines.push({
      id: '',
      lineType: BillChargeLineType.CHARGE,
      accountMasterId: line.accountMasterId,
      chargeName: line.accountParticulars,
      amount: line.amount,
      srNo: srNo++,
    });
  }

  const parkingLines = await calculateParkingCharges(
    client,
    member.id,
    billDate,
    parameters.mergeParkingOnBill,
    decimalPlaces,
  );
  for (const parking of parkingLines) {
    lines.push({
      id: '',
      lineType: BillChargeLineType.PARKING,
      accountMasterId: parking.accountMasterId,
      chargeName: parking.chargeName,
      amount: parking.amount,
      srNo: srNo++,
    });
  }

  const nocLines = await calculateNocLines(
    client,
    member,
    lines,
    billDate,
    toNumber(parameters.nonOccupancyChargePercent),
    parameters.nonOccupancyAccountId,
    parameters.suppressZeroTariffs,
    decimalPlaces,
  );
  for (const noc of nocLines) {
    lines.push({ id: '', ...noc, srNo: srNo++ });
  }

  const totalCharges = lines.reduce((sum, line) => sum + line.amount, 0);

  const interestResult = await calculateInterest(client, {
    billType: 'REGULAR',
    memberId: member.id,
    billDate,
    interestPattern: parameters.regularInterestPattern as never,
    simpleSubType: parameters.regularSimpleSubType as never,
    annualRate: toNumber(parameters.regularInterestRate),
    roundToRupee: parameters.regularInterestRoundToRupee,
    allowOverride: parameters.regularAllowManualOverride,
    overrideAmount: input.interestOverride,
    chargeInterest: member.chargeInterest,
  });

  const rebateAmount = calculateRebate(
    totalCharges,
    parameters.rebateType as never,
    toNumber(parameters.rebateValue),
    input.rebateOverride,
  );

  const taxResult = await calculateServiceTax(
    client,
    lines,
    toNumber(parameters.serviceTaxPercent),
    toNumber(parameters.educationCessPercent),
  );

  const adjustmentAmount = input.adjustmentAmount ?? 0;
  const billAmount = Money.fromRupees(
    totalCharges + interestResult.totalInterest + taxResult.totalTax - rebateAmount - adjustmentAmount,
  ).round(decimalPlaces).toRupees();

  const arrears = await computeArrears(client, member.id, 'REGULAR', billDate);

  const areaSnapshot =
    toNumber(member.unit.carpetAreaSqFt) ||
    toNumber(member.unit.residentialAreaSqFt) ||
    toNumber(member.unit.unitArea?.areaSqFt);

  return {
    id: input.id ?? '',
    billType: SharedBillType.REGULAR,
    systemBillNo: input.systemBillNo ?? '',
    manualBillNo: input.manualBillNo ?? null,
    billForPeriodKey: period.periodKey,
    billForPeriodLabel: period.periodLabel,
    billDate: billDate.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    memberId: member.id,
    memberName: member.memberName,
    buildingShortName: member.unit.building.shortName,
    wingShortName: member.unit.wing.shortName,
    unitNo: member.unit.unitNo,
    areaSnapshot,
    totalCharges,
    interestAmount: interestResult.totalInterest,
    interestOverride: input.interestOverride ?? null,
    serviceTaxAmount: taxResult.totalTax,
    rebateAmount,
    adjustmentAmount,
    billAmount,
    principalArrears: arrears.principalArrears,
    interestArrears: arrears.interestArrears,
    remark: input.remark ?? null,
    status: SharedBillStatus.POSTED,
    isManualEntry: input.isManualEntry ?? false,
    lines,
    interestDetails: interestResult.details,
    settlements: [],
    createdAt: '',
    createdBy: '',
    updatedAt: '',
    updatedBy: '',
  };
}

async function persistBill(
  client: PrismaClient,
  draft: RegularBillDetailDto,
  actorId: string,
  financialYearId: string,
  systemBillNo: string,
  billSerialNo: number,
): Promise<RegularBillDetailDto> {
  const billDate = parseIsoDate(draft.billDate, 'billDate');
  const dueDate = parseIsoDate(draft.dueDate, 'dueDate');
  const member = await client.member.findUniqueOrThrow({
    where: { id: draft.memberId },
    include: { unit: true },
  });

  const record = await client.bill.create({
    data: {
      financialYearId,
      billType: BillType.REGULAR,
      systemBillNo,
      manualBillNo: draft.manualBillNo,
      billSerialNo,
      billForPeriodKey: draft.billForPeriodKey,
      billForPeriodLabel: draft.billForPeriodLabel,
      billDate,
      dueDate,
      memberId: draft.memberId,
      billToType: 'MEMBER',
      buildingId: member.unit.buildingId,
      wingId: member.unit.wingId,
      unitId: member.unitId,
      areaSnapshot: draft.areaSnapshot,
      totalCharges: draft.totalCharges,
      interestAmount: draft.interestAmount,
      interestOverride: draft.interestOverride,
      serviceTaxAmount: draft.serviceTaxAmount,
      rebateAmount: draft.rebateAmount,
      adjustmentAmount: draft.adjustmentAmount,
      billAmount: draft.billAmount,
      principalArrears: draft.principalArrears,
      interestArrears: draft.interestArrears,
      remark: draft.remark,
      status: BillStatus.POSTED,
      isManualEntry: draft.isManualEntry,
      createdBy: actorId,
      updatedBy: actorId,
      lines: {
        create: draft.lines.map((line) => ({
          lineType: CHARGE_LINE_MAP[line.lineType],
          accountMasterId: line.accountMasterId,
          chargeName: line.chargeName,
          amount: line.amount,
          srNo: line.srNo,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      },
      interestDetails: {
        create: draft.interestDetails.map((detail) => ({
          sourceBillId: detail.sourceBillId,
          sourceDescription: detail.sourceDescription,
          method: detail.method,
          baseAmount: detail.baseAmount,
          ratePercent: detail.ratePercent,
          periodFrom: parseIsoDate(detail.periodFrom, 'periodFrom'),
          periodTo: parseIsoDate(detail.periodTo, 'periodTo'),
          daysOrMonths: detail.daysOrMonths,
          computedInterest: detail.computedInterest,
          overriddenInterest: detail.overriddenInterest,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      },
    },
    include: { lines: true, interestDetails: true, settlements: true, member: { include: { unit: { include: { building: true, wing: true } } } } },
  });

  return mapBillDetail(record);
}

function mapBillDetail(record: {
  id: string;
  billType: string;
  systemBillNo: string;
  manualBillNo: string | null;
  billForPeriodKey: string;
  billForPeriodLabel: string;
  billDate: Date;
  dueDate: Date;
  memberId: string | null;
  member?: { memberName: string; unit: { unitNo: string; building: { shortName: string }; wing: { shortName: string } } } | null;
  areaSnapshot: { toString(): string } | null;
  totalCharges: { toString(): string };
  interestAmount: { toString(): string };
  interestOverride: { toString(): string } | null;
  serviceTaxAmount: { toString(): string };
  rebateAmount: { toString(): string };
  adjustmentAmount: { toString(): string };
  billAmount: { toString(): string };
  principalArrears: { toString(): string };
  interestArrears: { toString(): string };
  remark: string | null;
  status: string;
  isManualEntry: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  lines: Array<{
    id: string;
    lineType: string;
    accountMasterId: string | null;
    chargeName: string;
    amount: { toString(): string };
    srNo: number;
  }>;
  interestDetails: Array<{
    id: string;
    billId: string;
    sourceBillId: string | null;
    sourceDescription: string | null;
    method: string;
    baseAmount: { toString(): string };
    ratePercent: { toString(): string };
    periodFrom: Date;
    periodTo: Date;
    daysOrMonths: number;
    computedInterest: { toString(): string };
    overriddenInterest: { toString(): string } | null;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
  }>;
  settlements: Array<{
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
}): RegularBillDetailDto {
  return {
    id: record.id,
    billType: record.billType as SharedBillType,
    systemBillNo: record.systemBillNo,
    manualBillNo: record.manualBillNo,
    billForPeriodKey: record.billForPeriodKey,
    billForPeriodLabel: record.billForPeriodLabel,
    billDate: record.billDate.toISOString().slice(0, 10),
    dueDate: record.dueDate.toISOString().slice(0, 10),
    memberId: record.memberId ?? '',
    memberName: record.member?.memberName ?? '',
    buildingShortName: record.member?.unit.building.shortName ?? '',
    wingShortName: record.member?.unit.wing.shortName ?? '',
    unitNo: record.member?.unit.unitNo ?? '',
    areaSnapshot: toNumber(record.areaSnapshot),
    totalCharges: toNumber(record.totalCharges),
    interestAmount: toNumber(record.interestAmount),
    interestOverride: record.interestOverride ? toNumber(record.interestOverride) : null,
    serviceTaxAmount: toNumber(record.serviceTaxAmount),
    rebateAmount: toNumber(record.rebateAmount),
    adjustmentAmount: toNumber(record.adjustmentAmount),
    billAmount: toNumber(record.billAmount),
    principalArrears: toNumber(record.principalArrears),
    interestArrears: toNumber(record.interestArrears),
    remark: record.remark,
    status: record.status as SharedBillStatus,
    isManualEntry: record.isManualEntry,
    lines: record.lines.map((line) => ({
      id: line.id,
      lineType: line.lineType as BillChargeLineType,
      accountMasterId: line.accountMasterId ?? '',
      chargeName: line.chargeName,
      amount: toNumber(line.amount),
      srNo: line.srNo,
    })),
    interestDetails: record.interestDetails.map((detail) => ({
      id: detail.id,
      billId: detail.billId,
      sourceBillId: detail.sourceBillId,
      sourceDescription: detail.sourceDescription,
      method: detail.method,
      baseAmount: toNumber(detail.baseAmount),
      ratePercent: toNumber(detail.ratePercent),
      periodFrom: detail.periodFrom.toISOString().slice(0, 10),
      periodTo: detail.periodTo.toISOString().slice(0, 10),
      daysOrMonths: detail.daysOrMonths,
      computedInterest: toNumber(detail.computedInterest),
      overriddenInterest: detail.overriddenInterest ? toNumber(detail.overriddenInterest) : null,
      createdAt: detail.createdAt.toISOString(),
      createdBy: detail.createdBy,
      updatedAt: detail.updatedAt.toISOString(),
      updatedBy: detail.updatedBy,
    })),
    settlements: record.settlements.map((row) => ({
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
    })),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function previewRegularBill(
  client: PrismaClient,
  input: RegularBillPreviewDto,
): Promise<RegularBillDetailDto> {
  await assertNotDuplicateBill(client, input.memberId, input.billForPeriodKey, input.id);
  return buildRegularBillDraft(client, input);
}

export async function saveRegularBill(
  client: PrismaClient,
  dto: RegularBillSaveDto,
  actorId: string,
): Promise<RegularBillDetailDto> {
  await assertNotDuplicateBill(client, dto.memberId, dto.billForPeriodKey, dto.id);

  const draft = await buildRegularBillDraft(client, dto);
  const financialYearId = await getActiveFinancialYearId(client);

  const maxSerial = await client.bill.aggregate({ _max: { billSerialNo: true } });
  const billSerialNo = (maxSerial._max.billSerialNo ?? 0) + 1;

  const systemBillNo = await numberSeriesService.next(
    client,
    SeriesType.RB,
    financialYearId,
    actorId,
  );

  return persistBill(client, draft, actorId, financialYearId, systemBillNo, billSerialNo);
}

export async function listRegularBills(
  client: PrismaClient,
  filter?: { memberId?: string; periodKey?: string; search?: string },
): Promise<{ items: BillSummaryDto[]; total: number }> {
  const where = {
    billType: BillType.REGULAR,
    ...(filter?.memberId ? { memberId: filter.memberId } : {}),
    ...(filter?.periodKey ? { billForPeriodKey: filter.periodKey } : {}),
  };

  const [records, total] = await Promise.all([
    client.bill.findMany({
      where,
      include: { member: { include: { unit: { include: { building: true, wing: true } } } } },
      orderBy: [{ billDate: 'desc' }, { billSerialNo: 'desc' }],
      take: 200,
    }),
    client.bill.count({ where }),
  ]);

  const items = records.map((row) => ({
    id: row.id,
    systemBillNo: row.systemBillNo,
    billForPeriodLabel: row.billForPeriodLabel,
    billDate: row.billDate.toISOString().slice(0, 10),
    memberName: row.member?.memberName ?? '',
    unitNo: row.member?.unit.unitNo ?? '',
    buildingShortName: row.member?.unit.building.shortName ?? '',
    billAmount: toNumber(row.billAmount),
    status: row.status as SharedBillStatus,
  }));

  return { items, total };
}

export async function getRegularBill(
  client: PrismaClient,
  id: string,
): Promise<RegularBillDetailDto> {
  const record = await client.bill.findUniqueOrThrow({
    where: { id },
    include: {
      lines: { orderBy: { srNo: 'asc' } },
      interestDetails: true,
      settlements: true,
      member: { include: { unit: { include: { building: true, wing: true } } } },
    },
  });
  return mapBillDetail(record);
}

export async function getBillSettlements(
  client: PrismaClient,
  billId: string,
): Promise<BillSettlementDto[]> {
  const rows = await client.billSettlement.findMany({
    where: { billId },
    include: { voucher: { select: { systemVoucherNo: true } } },
    orderBy: { settlementDate: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    billId: row.billId,
    voucherId: row.voucherId,
    voucherSystemNo: row.voucher?.systemVoucherNo ?? null,
    settlementDate: row.settlementDate.toISOString().slice(0, 10),
    principalAllocated: toNumber(row.principalAllocated),
    interestAllocated: toNumber(row.interestAllocated),
    serviceTaxAllocated: toNumber(row.serviceTaxAllocated),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  }));
}

export async function generateBulkRegular(
  client: PrismaClient,
  dto: BulkRegularBillGenerateDto,
  actorId: string,
): Promise<BulkRegularBillResult> {
  const period = await client.billingPeriodCalendar.findFirst({
    where: { periodKey: dto.billForPeriodKey },
  });
  if (!period) {
    throw new Error('Invalid bill period.');
  }

  const members = await client.member.findMany({
    where: {
      disposedAt: null,
      generateRegularBills: true,
      ...(dto.buildingId ? { unit: { buildingId: dto.buildingId } } : {}),
    },
    select: { id: true },
  });

  const billIds: string[] = [];

  await client.$transaction(async (tx) => {
    const financialYearId = await getActiveFinancialYearId(client);
    let serial = (await tx.bill.aggregate({ _max: { billSerialNo: true } }))._max.billSerialNo ?? 0;

    for (const member of members) {
      const duplicate = await tx.bill.findFirst({
        where: {
          memberId: member.id,
          billForPeriodKey: dto.billForPeriodKey,
          billType: BillType.REGULAR,
        },
      });
      if (duplicate) {
        throw Object.assign(
          new Error(`Duplicate bill for member ${member.id} in period ${dto.billForPeriodKey}.`),
          { code: 'DUPLICATE_BILL' },
        );
      }

      const draft = await buildRegularBillDraft(tx as PrismaClient, {
        memberId: member.id,
        billForPeriodKey: dto.billForPeriodKey,
        billDate: dto.billDate,
        dueDate: dto.dueDate,
      });

      serial += 1;
      const systemBillNo = await numberSeriesService.next(
        tx as PrismaClient,
        SeriesType.RB,
        financialYearId,
        actorId,
        tx as never,
      );

      const saved = await persistBill(
        tx as PrismaClient,
        draft,
        actorId,
        financialYearId,
        systemBillNo,
        serial,
      );
      billIds.push(saved.id);
    }
  });

  return { created: billIds.length, billIds, periodLabel: period.periodLabel };
}

async function loadMemberForSupplementaryBilling(client: PrismaClient, memberId: string) {
  const member = await client.member.findFirst({
    where: { id: memberId, disposedAt: null },
    include: {
      unit: { include: { building: true, wing: true, unitArea: true } },
    },
  });
  if (!member) {
    throw new Error('Member not found or disposed.');
  }
  if (!member.generateSupplementaryBills) {
    throw new Error('Supplementary bill generation is disabled for this member.');
  }
  return member;
}

async function loadTenantForBilling(client: PrismaClient, tenantId: string) {
  const tenant = await client.tenant.findFirst({
    where: { id: tenantId, isActive: true },
    include: {
      unit: {
        include: {
          building: true,
          wing: true,
          unitArea: true,
        },
      },
    },
  });
  if (!tenant) {
    throw new Error('Active tenant not found.');
  }
  return tenant;
}

export async function assertNotDuplicateSupplementaryBill(
  client: PrismaClient,
  input: {
    billToType: BillToType;
    memberId?: string;
    tenantId?: string;
    billForPeriodKey: string;
    excludeBillId?: string;
  },
): Promise<void> {
  if (input.billToType === BillToType.MEMBER && input.memberId) {
    const existing = await client.bill.findFirst({
      where: {
        memberId: input.memberId,
        billForPeriodKey: input.billForPeriodKey,
        billType: BillType.SUPPLEMENTARY,
        ...(input.excludeBillId ? { NOT: { id: input.excludeBillId } } : {}),
      },
    });
    if (existing) {
      throw Object.assign(new Error('A supplementary bill already exists for this member and period.'), {
        fieldErrors: { billForPeriodKey: 'Duplicate supplementary bill for member+period.' },
      });
    }
    return;
  }

  if (input.billToType === BillToType.TENANT && input.tenantId) {
    const existing = await client.bill.findFirst({
      where: {
        tenantId: input.tenantId,
        billForPeriodKey: input.billForPeriodKey,
        billType: BillType.SUPPLEMENTARY,
        ...(input.excludeBillId ? { NOT: { id: input.excludeBillId } } : {}),
      },
    });
    if (existing) {
      throw Object.assign(new Error('A supplementary bill already exists for this tenant and period.'), {
        fieldErrors: { billForPeriodKey: 'Duplicate supplementary bill for tenant+period.' },
      });
    }
  }
}

function validateSupplementaryInput(input: SupplementaryBillPreviewDto): void {
  if (!input.lines.length) {
    throw new Error('At least one charge line is required.');
  }
  if (input.billToType === BillToType.MEMBER && !input.memberId) {
    throw new Error('Member is required for member supplementary bills.');
  }
  if (input.billToType === BillToType.TENANT && !input.tenantId) {
    throw new Error('Tenant is required for tenant supplementary bills.');
  }
  if (input.billToType === BillToType.GENERAL) {
    if (!input.generalPartyName?.trim()) {
      throw new Error('Party name is required for general supplementary bills.');
    }
    if (!input.generalReferenceNo?.trim()) {
      throw new Error('Reference number is required for general supplementary bills.');
    }
  }
}

function mapSupplementaryBillDetail(record: {
  id: string;
  billType: string;
  billToType: string;
  systemBillNo: string;
  manualBillNo: string | null;
  bookSr: string | null;
  billForPeriodKey: string;
  billForPeriodLabel: string;
  billDate: Date;
  dueDate: Date;
  memberId: string | null;
  tenantId: string | null;
  generalPartyName: string | null;
  generalReferenceNo: string | null;
  areaSnapshot: { toString(): string } | null;
  totalCharges: { toString(): string };
  interestAmount: { toString(): string };
  interestOverride: { toString(): string } | null;
  serviceTaxAmount: { toString(): string };
  rebateAmount: { toString(): string };
  adjustmentAmount: { toString(): string };
  billAmount: { toString(): string };
  principalArrears: { toString(): string };
  interestArrears: { toString(): string };
  remark: string | null;
  status: string;
  isManualEntry: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  member?: {
    memberName: string;
    unit: { unitNo: string; building: { shortName: string }; wing: { shortName: string } };
  } | null;
  lines: Array<{
    id: string;
    lineType: string;
    accountMasterId: string | null;
    chargeName: string;
    amount: { toString(): string };
    srNo: number;
  }>;
  interestDetails: Array<{
    id: string;
    billId: string;
    sourceBillId: string | null;
    sourceDescription: string | null;
    method: string;
    baseAmount: { toString(): string };
    ratePercent: { toString(): string };
    periodFrom: Date;
    periodTo: Date;
    daysOrMonths: number;
    computedInterest: { toString(): string };
    overriddenInterest: { toString(): string } | null;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
  }>;
  settlements: Array<{
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
  tenant?: {
    tenantName: string;
    unit: { unitNo: string; building: { shortName: string }; wing: { shortName: string } };
  } | null;
  building?: { shortName: string } | null;
  wing?: { shortName: string } | null;
  unit?: { unitNo: string } | null;
}): SupplementaryBillDetailDto {
  const unitNo =
    record.member?.unit.unitNo ??
    record.tenant?.unit.unitNo ??
    record.unit?.unitNo ??
    '';
  const buildingShortName =
    record.member?.unit.building.shortName ??
    record.tenant?.unit.building.shortName ??
    record.building?.shortName ??
    '';
  const wingShortName =
    record.member?.unit.wing.shortName ??
    record.tenant?.unit.wing.shortName ??
    record.wing?.shortName ??
    '';

  return {
    id: record.id,
    billType: record.billType as SharedBillType,
    billToType: record.billToType as BillToType,
    systemBillNo: record.systemBillNo,
    manualBillNo: record.manualBillNo,
    bookSr: record.bookSr,
    billForPeriodKey: record.billForPeriodKey,
    billForPeriodLabel: record.billForPeriodLabel,
    billDate: record.billDate.toISOString().slice(0, 10),
    dueDate: record.dueDate.toISOString().slice(0, 10),
    memberId: record.memberId,
    memberName: record.member?.memberName ?? '',
    tenantId: record.tenantId,
    tenantName: record.tenant?.tenantName ?? '',
    generalPartyName: record.generalPartyName,
    generalReferenceNo: record.generalReferenceNo,
    buildingShortName,
    wingShortName,
    unitNo,
    areaSnapshot: toNumber(record.areaSnapshot),
    totalCharges: toNumber(record.totalCharges),
    interestAmount: toNumber(record.interestAmount),
    interestOverride: record.interestOverride ? toNumber(record.interestOverride) : null,
    serviceTaxAmount: toNumber(record.serviceTaxAmount),
    rebateAmount: toNumber(record.rebateAmount),
    adjustmentAmount: toNumber(record.adjustmentAmount),
    billAmount: toNumber(record.billAmount),
    principalArrears: toNumber(record.principalArrears),
    interestArrears: toNumber(record.interestArrears),
    remark: record.remark,
    status: record.status as SharedBillStatus,
    isManualEntry: record.isManualEntry,
    lines: record.lines.map((line) => ({
      id: line.id,
      lineType: line.lineType as BillChargeLineType,
      accountMasterId: line.accountMasterId ?? '',
      chargeName: line.chargeName,
      amount: toNumber(line.amount),
      srNo: line.srNo,
    })),
    interestDetails: record.interestDetails.map((detail) => ({
      id: detail.id,
      billId: detail.billId,
      sourceBillId: detail.sourceBillId,
      sourceDescription: detail.sourceDescription,
      method: detail.method,
      baseAmount: toNumber(detail.baseAmount),
      ratePercent: toNumber(detail.ratePercent),
      periodFrom: detail.periodFrom.toISOString().slice(0, 10),
      periodTo: detail.periodTo.toISOString().slice(0, 10),
      daysOrMonths: detail.daysOrMonths,
      computedInterest: toNumber(detail.computedInterest),
      overriddenInterest: detail.overriddenInterest ? toNumber(detail.overriddenInterest) : null,
      createdAt: detail.createdAt.toISOString(),
      createdBy: detail.createdBy,
      updatedAt: detail.updatedAt.toISOString(),
      updatedBy: detail.updatedBy,
    })),
    settlements: record.settlements.map((row) => ({
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
    })),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

const supplementaryBillInclude = {
  lines: { orderBy: { srNo: 'asc' as const } },
  interestDetails: true,
  settlements: true,
  member: { include: { unit: { include: { building: true, wing: true } } } },
} as const;

async function resolveSupplementaryRecipient(
  client: PrismaClient,
  input: SupplementaryBillPreviewDto,
): Promise<{
  memberId: string | null;
  tenantId: string | null;
  generalPartyName: string | null;
  generalReferenceNo: string | null;
  memberName: string;
  tenantName: string;
  buildingId: string | null;
  wingId: string | null;
  unitId: string | null;
  buildingShortName: string;
  wingShortName: string;
  unitNo: string;
  areaSnapshot: number;
  chargeInterest: boolean;
}> {
  if (input.billToType === BillToType.MEMBER && input.memberId) {
    const member = await loadMemberForSupplementaryBilling(client, input.memberId);
    const areaSnapshot =
      toNumber(member.unit.carpetAreaSqFt) ||
      toNumber(member.unit.residentialAreaSqFt) ||
      toNumber(member.unit.unitArea?.areaSqFt);
    return {
      memberId: member.id,
      tenantId: null,
      generalPartyName: null,
      generalReferenceNo: null,
      memberName: member.memberName,
      tenantName: '',
      buildingId: member.unit.buildingId,
      wingId: member.unit.wingId,
      unitId: member.unitId,
      buildingShortName: member.unit.building.shortName,
      wingShortName: member.unit.wing.shortName,
      unitNo: member.unit.unitNo,
      areaSnapshot,
      chargeInterest: member.chargeInterest,
    };
  }

  if (input.billToType === BillToType.TENANT && input.tenantId) {
    const tenant = await loadTenantForBilling(client, input.tenantId);
    const areaSnapshot =
      toNumber(tenant.unit.carpetAreaSqFt) ||
      toNumber(tenant.unit.residentialAreaSqFt) ||
      toNumber(tenant.unit.unitArea?.areaSqFt);
    return {
      memberId: null,
      tenantId: tenant.id,
      generalPartyName: null,
      generalReferenceNo: null,
      memberName: '',
      tenantName: tenant.tenantName,
      buildingId: tenant.unit.buildingId,
      wingId: tenant.unit.wingId,
      unitId: tenant.unit.id,
      buildingShortName: tenant.unit.building.shortName,
      wingShortName: tenant.unit.wing.shortName,
      unitNo: tenant.unit.unitNo,
      areaSnapshot,
      chargeInterest: true,
    };
  }

  return {
    memberId: null,
    tenantId: null,
    generalPartyName: input.generalPartyName?.trim() ?? null,
    generalReferenceNo: input.generalReferenceNo?.trim() ?? null,
    memberName: '',
    tenantName: '',
    buildingId: null,
    wingId: null,
    unitId: null,
    buildingShortName: '',
    wingShortName: '',
    unitNo: '',
    areaSnapshot: 0,
    chargeInterest: true,
  };
}

export async function buildSupplementaryBillDraft(
  client: PrismaClient,
  input: SupplementaryBillPreviewDto,
): Promise<SupplementaryBillDetailDto> {
  validateSupplementaryInput(input);

  const parameters = await client.societyParameters.findFirstOrThrow();
  const decimalPlaces = (parameters.tariffDecimalPlaces === 0 ? 0 : 2) as 0 | 2;

  const period = await client.billingPeriodCalendar.findFirst({
    where: { periodKey: input.billForPeriodKey },
  });
  if (!period) {
    throw new Error('Invalid bill period.');
  }

  const billDate = parseIsoDate(input.billDate, 'billDate');
  const dueDate = input.dueDate
    ? parseIsoDate(input.dueDate, 'dueDate')
    : new Date(billDate.getTime() + parameters.dueDateOffsetDays * 86400000);

  const recipient = await resolveSupplementaryRecipient(client, input);

  const lines: SupplementaryBillDetailDto['lines'] = input.lines.map((line, index) => ({
    id: '',
    lineType: BillChargeLineType.CHARGE,
    accountMasterId: line.accountMasterId,
    chargeName: line.chargeName,
    amount: line.amount,
    srNo: line.srNo ?? index + 1,
  }));

  const totalCharges = lines.reduce((sum, line) => sum + line.amount, 0);

  const interestSources = await collectSupplementaryInterestSources(
    client,
    {
      billToType: input.billToType,
      memberId: recipient.memberId ?? undefined,
      tenantId: recipient.tenantId ?? undefined,
      generalReferenceNo: recipient.generalReferenceNo ?? undefined,
    },
    billDate,
  );

  const interestResult = await calculateInterest(
    client,
    {
      billType: 'SUPPLEMENTARY',
      memberId: recipient.memberId ?? '',
      billDate,
      interestPattern: parameters.supplementaryInterestPattern as never,
      simpleSubType: parameters.supplementarySimpleSubType as never,
      annualRate: toNumber(parameters.supplementaryInterestRate),
      roundToRupee: parameters.supplementaryInterestRoundToRupee,
      allowOverride: parameters.supplementaryAllowManualOverride,
      overrideAmount: input.interestOverride,
      chargeInterest: recipient.chargeInterest,
    },
    interestSources,
  );

  const rebateAmount = calculateRebate(
    totalCharges,
    parameters.rebateType as never,
    toNumber(parameters.rebateValue),
    input.rebateOverride,
  );

  const taxResult = await calculateServiceTax(
    client,
    lines,
    toNumber(parameters.serviceTaxPercent),
    toNumber(parameters.educationCessPercent),
  );

  const adjustmentAmount = input.adjustmentAmount ?? 0;
  const billAmount = Money.fromRupees(
    totalCharges + interestResult.totalInterest + taxResult.totalTax - rebateAmount - adjustmentAmount,
  )
    .round(decimalPlaces)
    .toRupees();

  const arrears = await computeSupplementaryArrears(
    client,
    {
      billToType: input.billToType,
      memberId: recipient.memberId ?? undefined,
      tenantId: recipient.tenantId ?? undefined,
      generalReferenceNo: recipient.generalReferenceNo ?? undefined,
    },
    billDate,
  );

  return {
    id: input.id ?? '',
    billType: SharedBillType.SUPPLEMENTARY,
    billToType: input.billToType,
    systemBillNo: '',
    manualBillNo: input.manualBillNo ?? null,
    bookSr: input.bookSr ?? null,
    billForPeriodKey: period.periodKey,
    billForPeriodLabel: period.periodLabel,
    billDate: billDate.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    memberId: recipient.memberId,
    memberName: recipient.memberName,
    tenantId: recipient.tenantId,
    tenantName: recipient.tenantName,
    generalPartyName: recipient.generalPartyName,
    generalReferenceNo: recipient.generalReferenceNo,
    buildingShortName: recipient.buildingShortName,
    wingShortName: recipient.wingShortName,
    unitNo: recipient.unitNo,
    areaSnapshot: recipient.areaSnapshot,
    totalCharges,
    interestAmount: interestResult.totalInterest,
    interestOverride: input.interestOverride ?? null,
    serviceTaxAmount: taxResult.totalTax,
    rebateAmount,
    adjustmentAmount,
    billAmount,
    principalArrears: arrears.principalArrears,
    interestArrears: arrears.interestArrears,
    remark: input.remark ?? null,
    status: SharedBillStatus.POSTED,
    isManualEntry: input.isManualEntry ?? true,
    lines,
    interestDetails: interestResult.details,
    settlements: [],
    createdAt: '',
    createdBy: '',
    updatedAt: '',
    updatedBy: '',
  };
}

async function persistSupplementaryBill(
  client: PrismaClient,
  draft: SupplementaryBillDetailDto,
  actorId: string,
  financialYearId: string,
  systemBillNo: string,
  billSerialNo: number,
  recipient: Awaited<ReturnType<typeof resolveSupplementaryRecipient>>,
): Promise<SupplementaryBillDetailDto> {
  const billDate = parseIsoDate(draft.billDate, 'billDate');
  const dueDate = parseIsoDate(draft.dueDate, 'dueDate');

  const record = await client.bill.create({
    data: {
      financialYearId,
      billType: BillType.SUPPLEMENTARY,
      systemBillNo,
      manualBillNo: draft.manualBillNo,
      bookSr: draft.bookSr,
      billSerialNo,
      billForPeriodKey: draft.billForPeriodKey,
      billForPeriodLabel: draft.billForPeriodLabel,
      billDate,
      dueDate,
      memberId: recipient.memberId,
      tenantId: recipient.tenantId,
      billToType: draft.billToType,
      generalPartyName: recipient.generalPartyName,
      generalReferenceNo: recipient.generalReferenceNo,
      buildingId: recipient.buildingId,
      wingId: recipient.wingId,
      unitId: recipient.unitId,
      areaSnapshot: draft.areaSnapshot,
      totalCharges: draft.totalCharges,
      interestAmount: draft.interestAmount,
      interestOverride: draft.interestOverride,
      serviceTaxAmount: draft.serviceTaxAmount,
      rebateAmount: draft.rebateAmount,
      adjustmentAmount: draft.adjustmentAmount,
      billAmount: draft.billAmount,
      principalArrears: draft.principalArrears,
      interestArrears: draft.interestArrears,
      remark: draft.remark,
      status: BillStatus.POSTED,
      isManualEntry: draft.isManualEntry,
      createdBy: actorId,
      updatedBy: actorId,
      lines: {
        create: draft.lines.map((line) => ({
          lineType: CHARGE_LINE_MAP[line.lineType],
          accountMasterId: line.accountMasterId,
          chargeName: line.chargeName,
          amount: line.amount,
          srNo: line.srNo,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      },
      interestDetails: {
        create: draft.interestDetails.map((detail) => ({
          sourceBillId: detail.sourceBillId,
          sourceDescription: detail.sourceDescription,
          method: detail.method,
          baseAmount: detail.baseAmount,
          ratePercent: detail.ratePercent,
          periodFrom: parseIsoDate(detail.periodFrom, 'periodFrom'),
          periodTo: parseIsoDate(detail.periodTo, 'periodTo'),
          daysOrMonths: detail.daysOrMonths,
          computedInterest: detail.computedInterest,
          overriddenInterest: detail.overriddenInterest,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      },
    },
    include: supplementaryBillInclude,
  });

  let tenantInfo: {
    tenantName: string;
    unit: { unitNo: string; building: { shortName: string }; wing: { shortName: string } };
  } | null = null;
  if (record.tenantId) {
    tenantInfo = await client.tenant.findUnique({
      where: { id: record.tenantId },
      include: { unit: { include: { building: true, wing: true } } },
    });
  }

  return mapSupplementaryBillDetail({ ...record, tenant: tenantInfo });
}

export async function previewSupplementaryBill(
  client: PrismaClient,
  input: SupplementaryBillPreviewDto,
): Promise<SupplementaryBillDetailDto> {
  await assertNotDuplicateSupplementaryBill(client, {
    billToType: input.billToType,
    memberId: input.memberId,
    tenantId: input.tenantId,
    billForPeriodKey: input.billForPeriodKey,
    excludeBillId: input.id,
  });
  return buildSupplementaryBillDraft(client, input);
}

export async function saveSupplementaryBill(
  client: PrismaClient,
  dto: SupplementaryBillSaveDto,
  actorId: string,
): Promise<SupplementaryBillDetailDto> {
  await assertNotDuplicateSupplementaryBill(client, {
    billToType: dto.billToType,
    memberId: dto.memberId,
    tenantId: dto.tenantId,
    billForPeriodKey: dto.billForPeriodKey,
    excludeBillId: dto.id,
  });

  const draft = await buildSupplementaryBillDraft(client, dto);
  const recipient = await resolveSupplementaryRecipient(client, dto);
  const financialYearId = await getActiveFinancialYearId(client);

  const maxSerial = await client.bill.aggregate({ _max: { billSerialNo: true } });
  const billSerialNo = (maxSerial._max.billSerialNo ?? 0) + 1;

  const systemBillNo = await numberSeriesService.next(
    client,
    SeriesType.SB,
    financialYearId,
    actorId,
  );

  return persistSupplementaryBill(
    client,
    draft,
    actorId,
    financialYearId,
    systemBillNo,
    billSerialNo,
    recipient,
  );
}

export async function listSupplementaryBills(
  client: PrismaClient,
  filter?: {
    billToType?: BillToType;
    memberId?: string;
    tenantId?: string;
    periodKey?: string;
    search?: string;
  },
): Promise<{ items: SupplementaryBillSummaryDto[]; total: number }> {
  const where = {
    billType: BillType.SUPPLEMENTARY,
    ...(filter?.billToType ? { billToType: filter.billToType } : {}),
    ...(filter?.memberId ? { memberId: filter.memberId } : {}),
    ...(filter?.tenantId ? { tenantId: filter.tenantId } : {}),
    ...(filter?.periodKey ? { billForPeriodKey: filter.periodKey } : {}),
  };

  const [records, total] = await Promise.all([
    client.bill.findMany({
      where,
      include: { member: { include: { unit: { include: { building: true, wing: true } } } } },
      orderBy: [{ billDate: 'desc' }, { billSerialNo: 'desc' }],
      take: 200,
    }),
    client.bill.count({ where }),
  ]);

  const tenantIds = records.map((row) => row.tenantId).filter((id): id is string => Boolean(id));
  const tenants =
    tenantIds.length > 0
      ? await client.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, tenantName: true },
        })
      : [];
  const tenantMap = new Map(tenants.map((row) => [row.id, row.tenantName]));

  const items = records.map((row) => ({
    id: row.id,
    systemBillNo: row.systemBillNo,
    billForPeriodLabel: row.billForPeriodLabel,
    billDate: row.billDate.toISOString().slice(0, 10),
    memberName: row.member?.memberName ?? row.generalPartyName ?? '',
    unitNo: row.member?.unit.unitNo ?? '',
    buildingShortName: row.member?.unit.building.shortName ?? '',
    billAmount: toNumber(row.billAmount),
    status: row.status as SharedBillStatus,
    billToType: row.billToType as BillToType,
    tenantName: row.tenantId ? (tenantMap.get(row.tenantId) ?? '') : '',
    generalPartyName: row.generalPartyName,
    bookSr: row.bookSr,
  }));

  return { items, total };
}

export async function getSupplementaryBill(
  client: PrismaClient,
  id: string,
): Promise<SupplementaryBillDetailDto> {
  const record = await client.bill.findFirstOrThrow({
    where: { id, billType: BillType.SUPPLEMENTARY },
    include: supplementaryBillInclude,
  });

  let tenantInfo: {
    tenantName: string;
    unit: { unitNo: string; building: { shortName: string }; wing: { shortName: string } };
  } | null = null;
  if (record.tenantId) {
    tenantInfo = await client.tenant.findUnique({
      where: { id: record.tenantId },
      include: { unit: { include: { building: true, wing: true } } },
    });
  }

  return mapSupplementaryBillDetail({ ...record, tenant: tenantInfo });
}
