import type { PrismaClient } from '@prisma/client';
import { BillType } from '@prisma/client';
import type {
  BillSettlementAllocationDto,
  OpenBillDto,
  RegularSettlementInputDto,
  SettlementAllocationResultDto,
  SupplementarySettlementInputDto,
} from '@sams/shared-types';
import { Money } from './money.js';
import { parseIsoDate } from './financial-year.js';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

type BillWithSettlements = {
  id: string;
  systemBillNo: string;
  billType: string;
  billDate: Date;
  billAmount: { toString(): string };
  totalCharges: { toString(): string };
  interestAmount: { toString(): string };
  serviceTaxAmount: { toString(): string };
  adjustmentAmount: { toString(): string };
  settlements: Array<{
    principalAllocated: { toString(): string };
    interestAllocated: { toString(): string };
    serviceTaxAllocated: { toString(): string };
  }>;
};

function sumSettled(bill: BillWithSettlements): {
  principal: number;
  interest: number;
  serviceTax: number;
  total: number;
} {
  let principal = 0;
  let interest = 0;
  let serviceTax = 0;
  for (const row of bill.settlements) {
    principal += toNumber(row.principalAllocated);
    interest += toNumber(row.interestAllocated);
    serviceTax += toNumber(row.serviceTaxAllocated);
  }
  return { principal, interest, serviceTax, total: principal + interest + serviceTax };
}

function getOutstanding(bill: BillWithSettlements): number {
  const settled = sumSettled(bill);
  return Math.max(0, toNumber(bill.billAmount) - settled.total);
}

type SettlementBucket = 'serviceTax' | 'interest' | 'principal';

function resolveBucketOrder(
  sequenceLines?: Array<{ accountMasterId: string; accountShortCode?: string | null }>,
): SettlementBucket[] {
  if (!sequenceLines?.length) {
    return ['serviceTax', 'interest', 'principal'];
  }

  const buckets: SettlementBucket[] = [];
  for (const line of sequenceLines) {
    const code = line.accountShortCode?.toUpperCase();
    let bucket: SettlementBucket = 'principal';
    if (code === 'STAX') {
      bucket = 'serviceTax';
    } else if (code === 'INTR') {
      bucket = 'interest';
    }
    if (!buckets.includes(bucket)) {
      buckets.push(bucket);
    }
  }

  for (const fallback of ['serviceTax', 'interest', 'principal'] as SettlementBucket[]) {
    if (!buckets.includes(fallback)) {
      buckets.push(fallback);
    }
  }
  return buckets;
}

export function allocateToBill(
  bill: BillWithSettlements,
  amount: number,
  sequenceLines?: Array<{ accountMasterId: string; accountShortCode?: string | null }>,
): {
  allocated: number;
  principalAllocated: number;
  interestAllocated: number;
  serviceTaxAllocated: number;
} {
  const settled = sumSettled(bill);
  const outstanding: Record<SettlementBucket, number> = {
    serviceTax: Math.max(0, toNumber(bill.serviceTaxAmount) - settled.serviceTax),
    interest: Math.max(0, toNumber(bill.interestAmount) - settled.interest),
    principal: Math.max(
      0,
      toNumber(bill.totalCharges) + toNumber(bill.adjustmentAmount) - settled.principal,
    ),
  };

  let remaining = amount;
  let serviceTaxAllocated = 0;
  let interestAllocated = 0;
  let principalAllocated = 0;

  for (const bucket of resolveBucketOrder(sequenceLines)) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, outstanding[bucket]);
    if (bucket === 'serviceTax') serviceTaxAllocated = take;
    else if (bucket === 'interest') interestAllocated = take;
    else principalAllocated = take;
    remaining -= take;
  }

  const allocated = serviceTaxAllocated + interestAllocated + principalAllocated;
  return { allocated, principalAllocated, interestAllocated, serviceTaxAllocated };
}

export async function getOpenBillsForMember(
  client: PrismaClient,
  memberId: string,
  billType: 'REGULAR' | 'SUPPLEMENTARY',
): Promise<OpenBillDto[]> {
  const bills = await client.bill.findMany({
    where: {
      memberId,
      billType: billType === 'REGULAR' ? BillType.REGULAR : BillType.SUPPLEMENTARY,
      status: 'POSTED',
    },
    include: { settlements: true },
    orderBy: { billDate: 'asc' },
  });

  return bills
    .map((bill) => {
      const settled = sumSettled(bill).total;
      const outstanding = Math.max(0, toNumber(bill.billAmount) - settled);
      return {
        id: bill.id,
        systemBillNo: bill.systemBillNo,
        billType: bill.billType as OpenBillDto['billType'],
        billDate: bill.billDate.toISOString().slice(0, 10),
        billAmount: toNumber(bill.billAmount),
        settled,
        outstanding,
      };
    })
    .filter((row) => row.outstanding > 0.01);
}

async function loadEffectiveSequenceLines(
  client: PrismaClient,
  asOfDate: Date,
): Promise<Array<{ accountMasterId: string; accountShortCode?: string | null }>> {
  const sequence = await client.tariffSettlementSequence.findFirst({
    where: { effectiveDate: { lte: asOfDate } },
    orderBy: { effectiveDate: 'desc' },
    include: {
      lines: {
        orderBy: { srNo: 'asc' },
        include: { accountMaster: { select: { shortCode: true } } },
      },
    },
  });

  return (
    sequence?.lines.map((line) => ({
      accountMasterId: line.accountMasterId,
      accountShortCode: line.accountMaster.shortCode,
    })) ?? []
  );
}

export async function allocateRegularSettlement(
  client: PrismaClient,
  input: RegularSettlementInputDto,
  asOfDate?: string,
): Promise<SettlementAllocationResultDto> {
  const effectiveDate = asOfDate ? parseIsoDate(asOfDate, 'asOfDate') : new Date();
  const sequenceLines = await loadEffectiveSequenceLines(client, effectiveDate);

  const allOpen = await client.bill.findMany({
    where: {
      memberId: input.memberId,
      billType: BillType.REGULAR,
      status: 'POSTED',
    },
    include: { settlements: true },
    orderBy: { billDate: 'asc' },
  });

  const openBills = allOpen.filter((bill) => getOutstanding(bill) > 0.01);

  let billsToSettle = openBills;
  if (!input.autoFifo && input.billIds?.length) {
    const idSet = new Set(input.billIds);
    billsToSettle = openBills.filter((bill) => idSet.has(bill.id));
  }

  let remaining = input.amount;
  const allocations: BillSettlementAllocationDto[] = [];

  for (const bill of billsToSettle) {
    if (remaining <= 0.01) break;
    const outstanding = getOutstanding(bill);
    if (outstanding <= 0.01) continue;

    const target = Math.min(remaining, outstanding);
    const breakdown = allocateToBill(bill, target, sequenceLines);
    if (breakdown.allocated <= 0) continue;

    allocations.push({
      billId: bill.id,
      systemBillNo: bill.systemBillNo,
      billDate: bill.billDate.toISOString().slice(0, 10),
      billAmount: toNumber(bill.billAmount),
      outstanding,
      allocated: breakdown.allocated,
      principalAllocated: breakdown.principalAllocated,
      interestAllocated: breakdown.interestAllocated,
      serviceTaxAllocated: breakdown.serviceTaxAllocated,
    });
    remaining = Money.fromRupees(remaining - breakdown.allocated).toRupees();
  }

  const totalAllocated = allocations.reduce((sum, row) => sum + row.allocated, 0);
  return {
    allocations,
    totalAllocated,
    unallocated: Money.fromRupees(input.amount - totalAllocated).toRupees(),
  };
}

export async function allocateSupplementarySettlement(
  client: PrismaClient,
  input: SupplementarySettlementInputDto,
  asOfDate?: string,
): Promise<BillSettlementAllocationDto> {
  const effectiveDate = asOfDate ? parseIsoDate(asOfDate, 'asOfDate') : new Date();
  const sequenceLines = await loadEffectiveSequenceLines(client, effectiveDate);

  const bill = await client.bill.findFirstOrThrow({
    where: { id: input.billId, billType: BillType.SUPPLEMENTARY, status: 'POSTED' },
    include: { settlements: true },
  });

  const outstanding = getOutstanding(bill);
  const target = Math.min(input.amount, outstanding);
  const breakdown = allocateToBill(bill, target, sequenceLines);

  return {
    billId: bill.id,
    systemBillNo: bill.systemBillNo,
    billDate: bill.billDate.toISOString().slice(0, 10),
    billAmount: toNumber(bill.billAmount),
    outstanding,
    allocated: breakdown.allocated,
    principalAllocated: breakdown.principalAllocated,
    interestAllocated: breakdown.interestAllocated,
    serviceTaxAllocated: breakdown.serviceTaxAllocated,
  };
}
