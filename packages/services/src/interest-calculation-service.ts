import type { PrismaClient } from '@prisma/client';
import {
  BillToType,
  InterestPattern,
  SimpleInterestSubType,
  type BillInterestDetailDto,
} from '@sams/shared-types';
import { Money } from './money.js';

export interface InterestSource {
  sourceBillId: string | null;
  sourceDescription: string;
  principal: number;
  dueDate: Date;
}

export interface InterestCalculationInput {
  billType: 'REGULAR' | 'SUPPLEMENTARY';
  memberId: string;
  billDate: Date;
  interestPattern: InterestPattern;
  simpleSubType: SimpleInterestSubType;
  annualRate: number;
  roundToRupee: boolean;
  allowOverride: boolean;
  overrideAmount?: number | null;
  chargeInterest: boolean;
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function completeMonthsBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

function roundInterest(amount: number, roundToRupee: boolean): number {
  const money = Money.fromRupees(amount);
  return roundToRupee ? money.roundToRupee().toRupees() : money.toRupees();
}

function calcDelayDays(principal: number, rate: number, dueDate: Date, billDate: Date): number {
  const days = daysBetween(dueDate, billDate);
  if (days <= 0) return 0;
  return (principal * rate) / 100 / 365 * days;
}

function calcDelayMonths(principal: number, rate: number, dueDate: Date, billDate: Date): number {
  const months = completeMonthsBetween(dueDate, billDate);
  if (months <= 0) return 0;
  return (principal * rate) / 100 / 12 * months;
}

function calcCompleteCycle(principal: number, rate: number, dueDate: Date, billDate: Date): number {
  if (billDate <= dueDate) return 0;
  return (principal * rate) / 100;
}

function calcSimpleInterest(
  principal: number,
  rate: number,
  dueDate: Date,
  billDate: Date,
  subType: SimpleInterestSubType,
): { interest: number; daysOrMonths: number } {
  switch (subType) {
    case SimpleInterestSubType.DELAY_DAYS: {
      const days = daysBetween(dueDate, billDate);
      return { interest: calcDelayDays(principal, rate, dueDate, billDate), daysOrMonths: days };
    }
    case SimpleInterestSubType.DELAY_MONTHS: {
      const months = completeMonthsBetween(dueDate, billDate);
      return {
        interest: calcDelayMonths(principal, rate, dueDate, billDate),
        daysOrMonths: months,
      };
    }
    case SimpleInterestSubType.COMPLETE_CYCLE:
      return {
        interest: calcCompleteCycle(principal, rate, dueDate, billDate),
        daysOrMonths: 1,
      };
    default:
      return { interest: 0, daysOrMonths: 0 };
  }
}

export async function collectInterestSources(
  client: PrismaClient,
  memberId: string,
  billType: 'REGULAR' | 'SUPPLEMENTARY',
  asOfDate: Date,
): Promise<InterestSource[]> {
  const sources: InterestSource[] = [];

  const obType = billType === 'REGULAR' ? 'REGULAR' : 'SUPPLEMENTARY';
  const ob = await client.memberOpeningBalance.findUnique({
    where: { memberId_balanceType: { memberId, balanceType: obType } },
  });

  if (ob && Number(ob.principalOB) > 0) {
    sources.push({
      sourceBillId: null,
      sourceDescription: 'Opening Balance',
      principal: Number(ob.principalOB),
      dueDate: asOfDate,
    });
  }

  const priorBills = await client.bill.findMany({
    where: {
      memberId,
      billType,
      status: 'POSTED',
      billDate: { lt: asOfDate },
    },
    include: { settlements: true },
    orderBy: { billDate: 'asc' },
  });

  for (const bill of priorBills) {
    const settled = bill.settlements.reduce(
      (sum, row) => sum + Number(row.principalAllocated) + Number(row.interestAllocated),
      0,
    );
    const outstanding = Number(bill.billAmount) - settled;
    if (outstanding > 0.01) {
      sources.push({
        sourceBillId: bill.id,
        sourceDescription: `Bill ${bill.systemBillNo}`,
        principal: outstanding,
        dueDate: bill.dueDate,
      });
    }
  }

  return sources;
}

export async function collectSupplementaryInterestSources(
  client: PrismaClient,
  context: {
    billToType: BillToType;
    memberId?: string;
    tenantId?: string;
    generalReferenceNo?: string;
  },
  asOfDate: Date,
): Promise<InterestSource[]> {
  if (context.billToType === BillToType.MEMBER && context.memberId) {
    return collectInterestSources(client, context.memberId, 'SUPPLEMENTARY', asOfDate);
  }

  const sources: InterestSource[] = [];
  const priorBills = await client.bill.findMany({
    where: {
      billType: 'SUPPLEMENTARY',
      status: 'POSTED',
      billDate: { lt: asOfDate },
      ...(context.billToType === BillToType.TENANT && context.tenantId
        ? { billToType: BillToType.TENANT, tenantId: context.tenantId }
        : {}),
      ...(context.billToType === BillToType.GENERAL && context.generalReferenceNo
        ? {
            billToType: BillToType.GENERAL,
            generalReferenceNo: context.generalReferenceNo,
          }
        : {}),
    },
    include: { settlements: true },
    orderBy: { billDate: 'asc' },
  });

  for (const bill of priorBills) {
    const settled = bill.settlements.reduce(
      (sum, row) => sum + Number(row.principalAllocated) + Number(row.interestAllocated),
      0,
    );
    const outstanding = Number(bill.billAmount) - settled;
    if (outstanding > 0.01) {
      sources.push({
        sourceBillId: bill.id,
        sourceDescription: `Bill ${bill.systemBillNo}`,
        principal: outstanding,
        dueDate: bill.dueDate,
      });
    }
  }

  return sources;
}

export async function calculateInterest(
  client: PrismaClient,
  input: InterestCalculationInput,
  sources?: InterestSource[],
): Promise<{ totalInterest: number; details: BillInterestDetailDto[] }> {
  if (!input.chargeInterest || input.interestPattern === InterestPattern.NONE || input.annualRate <= 0) {
    return { totalInterest: 0, details: [] };
  }

  const resolvedSources =
    sources ?? (await collectInterestSources(client, input.memberId, input.billType, input.billDate));

  const details: BillInterestDetailDto[] = [];
  let total = 0;

  if (input.interestPattern === InterestPattern.COMPOUND) {
    let accumulated = 0;
    for (const source of resolvedSources) {
      const accrued = ((source.principal + accumulated) * input.annualRate) / 100;
      accumulated += accrued;
      const interest = roundInterest(accrued, input.roundToRupee);
      total += interest;
      details.push({
        id: '',
        billId: '',
        sourceBillId: source.sourceBillId,
        sourceDescription: source.sourceDescription,
        method: 'COMPOUND',
        baseAmount: source.principal,
        ratePercent: input.annualRate,
        periodFrom: source.dueDate.toISOString().slice(0, 10),
        periodTo: input.billDate.toISOString().slice(0, 10),
        daysOrMonths: daysBetween(source.dueDate, input.billDate),
        computedInterest: interest,
        overriddenInterest: null,
        createdAt: '',
        createdBy: '',
        updatedAt: '',
        updatedBy: '',
      });
    }
  } else {
    for (const source of resolvedSources) {
      const { interest, daysOrMonths } = calcSimpleInterest(
        source.principal,
        input.annualRate,
        source.dueDate,
        input.billDate,
        input.simpleSubType,
      );
      const rounded = roundInterest(interest, input.roundToRupee);
      total += rounded;
      details.push({
        id: '',
        billId: '',
        sourceBillId: source.sourceBillId,
        sourceDescription: source.sourceDescription,
        method: input.simpleSubType,
        baseAmount: source.principal,
        ratePercent: input.annualRate,
        periodFrom: source.dueDate.toISOString().slice(0, 10),
        periodTo: input.billDate.toISOString().slice(0, 10),
        daysOrMonths,
        computedInterest: rounded,
        overriddenInterest: null,
        createdAt: '',
        createdBy: '',
        updatedAt: '',
        updatedBy: '',
      });
    }
  }

  if (input.allowOverride && input.overrideAmount != null) {
    return {
      totalInterest: input.overrideAmount,
      details: details.map((row, index) =>
        index === 0
          ? { ...row, overriddenInterest: input.overrideAmount!, computedInterest: row.computedInterest }
          : row,
      ),
    };
  }

  return { totalInterest: roundInterest(total, input.roundToRupee), details };
}
