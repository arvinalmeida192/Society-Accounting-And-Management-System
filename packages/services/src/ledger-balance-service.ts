import type { Prisma, PrismaClient } from '@prisma/client';
import { VoucherStatus } from '@prisma/client';
import { AccountCategoryType } from '@sams/shared-types';
import { isIncomeExpenseCategory } from './account-validation-service.js';

export interface ClosingBalance {
  closingBalanceDr: number;
  closingBalanceCr: number;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

function toSignedBalance(dr: number, cr: number): ClosingBalance {
  const net = dr - cr;
  if (net >= 0) {
    return { closingBalanceDr: net, closingBalanceCr: 0 };
  }
  return { closingBalanceDr: 0, closingBalanceCr: -net };
}

/** COA-007 — OB ± posted voucher lines */
export async function getClosingBalance(
  client: PrismaClient,
  accountId: string,
  asOnDate?: Date,
  financialYearId?: string,
): Promise<ClosingBalance> {
  const account = await client.accountMaster.findUniqueOrThrow({
    where: { id: accountId },
    include: {
      subgroup: { include: { group: true } },
    },
  });

  const categoryId = account.subgroup.group.categoryId as AccountCategoryType;
  const cutoff = asOnDate ?? new Date();

  const lineWhere: Prisma.VoucherLineWhereInput = {
    accountMasterId: accountId,
    voucher: {
      status: VoucherStatus.POSTED,
      voucherDate: { lte: cutoff },
      ...(financialYearId ? { financialYearId } : {}),
    },
  };

  const aggregates = await client.voucherLine.aggregate({
    where: lineWhere,
    _sum: { drAmount: true, crAmount: true },
  });

  const postedDr = decimalToNumber(aggregates._sum.drAmount);
  const postedCr = decimalToNumber(aggregates._sum.crAmount);

  if (isIncomeExpenseCategory(categoryId)) {
    if (categoryId === AccountCategoryType.INCOME) {
      return toSignedBalance(postedCr, postedDr);
    }
    return toSignedBalance(postedDr, postedCr);
  }

  const obDr = decimalToNumber(account.openingBalanceDr);
  const obCr = decimalToNumber(account.openingBalanceCr);
  return toSignedBalance(obDr + postedDr, obCr + postedCr);
}

export interface TrialBalanceRow {
  accountId: string;
  particulars: string;
  shortCode: string | null;
  debitTotal: number;
  creditTotal: number;
}

export interface BalanceSheetRow {
  level: 'group' | 'subgroup' | 'account';
  label: string;
  amount: number;
  indent: number;
}

export interface IncomeExpenditureRow {
  accountId: string;
  particulars: string;
  amount: number;
  category: AccountCategoryType.INCOME | AccountCategoryType.EXPENSE;
}

export interface ReceiptPaymentRow {
  accountId: string;
  particulars: string;
  openingBalance: number;
  receipts: number;
  payments: number;
  closingBalance: number;
}

async function aggregatePostedLines(
  client: PrismaClient,
  accountId: string,
  from?: Date,
  to?: Date,
  financialYearId?: string,
): Promise<{ dr: number; cr: number }> {
  const aggregates = await client.voucherLine.aggregate({
    where: {
      accountMasterId: accountId,
      voucher: {
        status: VoucherStatus.POSTED,
        ...(from || to
          ? {
              voucherDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        ...(financialYearId ? { financialYearId } : {}),
      },
    },
    _sum: { drAmount: true, crAmount: true },
  });
  return {
    dr: decimalToNumber(aggregates._sum.drAmount),
    cr: decimalToNumber(aggregates._sum.crAmount),
  };
}

/** RPT-A05 — trial balance as-on date. */
export async function getTrialBalance(
  client: PrismaClient,
  asOnDate?: Date,
  financialYearId?: string,
): Promise<TrialBalanceRow[]> {
  const accounts = await client.accountMaster.findMany({
    where: { isArchived: false },
    orderBy: [{ subgroup: { group: { balanceSheetSr: 'asc' } } }, { particulars: 'asc' }],
    select: { id: true, particulars: true, shortCode: true },
  });

  const rows: TrialBalanceRow[] = [];
  for (const account of accounts) {
    const closing = await getClosingBalance(client, account.id, asOnDate, financialYearId);
    if (closing.closingBalanceDr === 0 && closing.closingBalanceCr === 0) continue;
    rows.push({
      accountId: account.id,
      particulars: account.particulars,
      shortCode: account.shortCode,
      debitTotal: closing.closingBalanceDr,
      creditTotal: closing.closingBalanceCr,
    });
  }
  return rows;
}

/** RPT-A06 — balance sheet hierarchy with substitute names (COA-002). */
export async function getBalanceSheet(
  client: PrismaClient,
  asOnDate?: Date,
  financialYearId?: string,
): Promise<BalanceSheetRow[]> {
  const groups = await client.accountGroup.findMany({
    where: {
      categoryId: { in: [AccountCategoryType.ASSET, AccountCategoryType.LIABILITY] },
    },
    include: {
      subgroups: {
        orderBy: { subgroupSr: 'asc' },
        include: {
          accounts: {
            where: { isArchived: false },
            orderBy: { particulars: 'asc' },
          },
        },
      },
    },
    orderBy: { balanceSheetSr: 'asc' },
  });

  const rows: BalanceSheetRow[] = [];
  for (const group of groups) {
    let groupTotal = 0;
    const groupLabel = group.substituteGroupName ?? group.groupName;
    const subgroupRows: BalanceSheetRow[] = [];

    for (const subgroup of group.subgroups) {
      let subgroupTotal = 0;
      const subgroupLabel = subgroup.substituteSubgroupName ?? subgroup.subgroupName;
      const accountRows: BalanceSheetRow[] = [];

      for (const account of subgroup.accounts) {
        const closing = await getClosingBalance(client, account.id, asOnDate, financialYearId);
        const amount = closing.closingBalanceDr - closing.closingBalanceCr;
        if (Math.abs(amount) < 0.005) continue;
        subgroupTotal += amount;
        accountRows.push({
          level: 'account',
          label: account.particulars,
          amount,
          indent: 3,
        });
      }

      if (accountRows.length === 0) continue;
      subgroupRows.push({
        level: 'subgroup',
        label: subgroupLabel,
        amount: subgroupTotal,
        indent: 2,
      });
      subgroupRows.push(...accountRows);
      groupTotal += subgroupTotal;
    }

    if (subgroupRows.length === 0) continue;
    rows.push({ level: 'group', label: groupLabel, amount: groupTotal, indent: 1 });
    rows.push(...subgroupRows);
  }

  return rows;
}

/** RPT-A07 — income and expenditure for a date range. */
export async function getIncomeExpenditure(
  client: PrismaClient,
  dateFrom: Date,
  dateTo: Date,
  financialYearId?: string,
): Promise<{ rows: IncomeExpenditureRow[]; netSurplus: number }> {
  const accounts = await client.accountMaster.findMany({
    where: {
      isArchived: false,
      subgroup: {
        group: {
          categoryId: { in: [AccountCategoryType.INCOME, AccountCategoryType.EXPENSE] },
        },
      },
    },
    include: { subgroup: { include: { group: true } } },
    orderBy: [{ subgroup: { group: { balanceSheetSr: 'asc' } } }, { particulars: 'asc' }],
  });

  const rows: IncomeExpenditureRow[] = [];
  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const account of accounts) {
    const category = account.subgroup.group.categoryId as
      | AccountCategoryType.INCOME
      | AccountCategoryType.EXPENSE;
    const posted = await aggregatePostedLines(
      client,
      account.id,
      dateFrom,
      dateTo,
      financialYearId,
    );
    const amount =
      category === AccountCategoryType.INCOME
        ? posted.cr - posted.dr
        : posted.dr - posted.cr;
    if (Math.abs(amount) < 0.005) continue;
    rows.push({
      accountId: account.id,
      particulars: account.particulars,
      amount,
      category,
    });
    if (category === AccountCategoryType.INCOME) incomeTotal += amount;
    else expenseTotal += amount;
  }

  return { rows, netSurplus: incomeTotal - expenseTotal };
}

/** RPT-A08 — receipt and payment summary for cash-bank group (SP-018). */
export async function getReceiptPaymentStatement(
  client: PrismaClient,
  cashBankGroupId: string,
  dateFrom: Date,
  dateTo: Date,
  financialYearId?: string,
): Promise<ReceiptPaymentRow[]> {
  const accounts = await client.accountMaster.findMany({
    where: {
      isArchived: false,
      isActive: true,
      subgroup: { groupId: cashBankGroupId },
    },
    orderBy: { particulars: 'asc' },
  });

  const rows: ReceiptPaymentRow[] = [];
  for (const account of accounts) {
    const openingClosing = await getClosingBalance(client, account.id, dateTo, financialYearId);
    const opening = await getClosingBalance(
      client,
      account.id,
      new Date(dateFrom.getTime() - 86_400_000),
      financialYearId,
    );
    const openingBalance = opening.closingBalanceDr - opening.closingBalanceCr;
    const closingBalance = openingClosing.closingBalanceDr - openingClosing.closingBalanceCr;
    const period = await aggregatePostedLines(
      client,
      account.id,
      dateFrom,
      dateTo,
      financialYearId,
    );
    rows.push({
      accountId: account.id,
      particulars: account.particulars,
      openingBalance,
      receipts: period.cr,
      payments: period.dr,
      closingBalance,
    });
  }
  return rows;
}
