import type { FinancialYear, PrismaClient } from '@prisma/client';

/** Resolve the current open FY, or latest FY if all are closed. */
export async function getActiveFinancialYear(client: PrismaClient): Promise<FinancialYear> {
  const open = await client.financialYear.findFirst({
    where: { isClosed: false },
    orderBy: { startDate: 'desc' },
  });
  if (open) return open;

  const latest = await client.financialYear.findFirst({ orderBy: { startDate: 'desc' } });
  if (!latest) throw new Error('No financial year found.');
  return latest;
}

export async function getActiveFinancialYearId(client: PrismaClient): Promise<string> {
  const fy = await getActiveFinancialYear(client);
  return fy.id;
}

/** Generate FY label e.g. "2025-26" from start/end dates — SDD §24.6 */
export function generateFinancialYearLabel(startDate: Date, endDate: Date): string {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (endYear <= startYear) {
    return String(startYear);
  }

  return `${startYear}-${String(endYear).slice(-2)}`;
}

export function parseIsoDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${fieldName}`);
  }
  return date;
}
