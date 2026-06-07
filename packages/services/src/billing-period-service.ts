import type { PrismaClient } from '@prisma/client';
import { BillFrequency } from '@sams/shared-types';

export interface BillingPeriodInput {
  financialYearId: string;
  startDate: Date;
  endDate: Date;
  billFrequency: BillFrequency;
  actorId: string;
}

export interface GeneratedBillingPeriod {
  periodKey: string;
  periodLabel: string;
  periodStartDate: Date;
  periodEndDate: Date;
  sequenceNo: number;
}

function monthsForFrequency(frequency: BillFrequency): number {
  switch (frequency) {
    case BillFrequency.MONTHLY:
      return 1;
    case BillFrequency.BI_MONTHLY:
      return 2;
    case BillFrequency.QUARTERLY:
      return 3;
    case BillFrequency.QUADRUPLE:
      return 4;
    case BillFrequency.HALF_YEARLY:
      return 6;
    case BillFrequency.YEARLY:
      return 12;
    default:
      return 1;
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatPeriodLabel(
  start: Date,
  end: Date,
  frequency: BillFrequency,
  fyStart: Date,
): string {
  if (frequency === BillFrequency.MONTHLY) {
    return formatMonthYear(start);
  }

  if (frequency === BillFrequency.QUARTERLY) {
    const quarter =
      Math.floor((start.getMonth() - fyStart.getMonth() + 12) % 12) / 3 + 1;
    const fyLabel =
      fyStart.getMonth() >= 3
        ? `${fyStart.getFullYear()}-${String(fyStart.getFullYear() + 1).slice(-2)}`
        : `${fyStart.getFullYear() - 1}-${String(fyStart.getFullYear()).slice(-2)}`;
    return `Q${quarter} ${fyLabel}`;
  }

  if (frequency === BillFrequency.HALF_YEARLY) {
    const half = start.getMonth() < fyStart.getMonth() + 6 ? 1 : 2;
    const fyLabel =
      fyStart.getMonth() >= 3
        ? `${fyStart.getFullYear()}-${String(fyStart.getFullYear() + 1).slice(-2)}`
        : `${fyStart.getFullYear() - 1}-${String(fyStart.getFullYear()).slice(-2)}`;
    return `H${half} ${fyLabel}`;
  }

  if (frequency === BillFrequency.YEARLY) {
    return `Year ${start.getFullYear()}-${String(end.getFullYear()).slice(-2)}`;
  }

  return `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
}

/** SDD §27.1 — generate billing period calendar rows */
export function generateBillingPeriodCalendar(
  input: Omit<BillingPeriodInput, 'financialYearId' | 'actorId'>,
): GeneratedBillingPeriod[] {
  const fyStart = startOfDay(input.startDate);
  const fyEnd = startOfDay(input.endDate);
  const months = monthsForFrequency(input.billFrequency);
  const periods: GeneratedBillingPeriod[] = [];

  let cursor = fyStart;
  let sequenceNo = 1;

  while (cursor <= fyEnd) {
    const periodEndCandidate = addMonths(cursor, months);
    periodEndCandidate.setDate(periodEndCandidate.getDate() - 1);
    const periodEnd = periodEndCandidate > fyEnd ? fyEnd : periodEndCandidate;
    const periodKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

    periods.push({
      periodKey,
      periodLabel: formatPeriodLabel(cursor, periodEnd, input.billFrequency, fyStart),
      periodStartDate: cursor,
      periodEndDate: periodEnd,
      sequenceNo,
    });

    cursor = startOfDay(new Date(periodEnd));
    cursor.setDate(cursor.getDate() + 1);
    sequenceNo += 1;
  }

  return periods;
}

export async function regenerateBillingPeriodCalendar(
  client: PrismaClient,
  input: BillingPeriodInput,
): Promise<number> {
  const periods = generateBillingPeriodCalendar(input);

  await client.billingPeriodCalendar.deleteMany({
    where: { financialYearId: input.financialYearId },
  });

  for (const period of periods) {
    await client.billingPeriodCalendar.create({
      data: {
        financialYearId: input.financialYearId,
        periodKey: period.periodKey,
        periodLabel: period.periodLabel,
        periodStartDate: period.periodStartDate,
        periodEndDate: period.periodEndDate,
        sequenceNo: period.sequenceNo,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
    });
  }

  return periods.length;
}
