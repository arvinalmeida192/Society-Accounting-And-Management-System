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
