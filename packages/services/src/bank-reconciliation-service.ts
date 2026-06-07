import type { PrismaClient } from '@prisma/client';
import { VoucherStatus } from '@prisma/client';
import {
  BankRecStatus,
  type BankRecGridRow,
  type BankReconciliationStatementDto,
} from '@sams/shared-types';
import { parseIsoDate } from './financial-year.js';
import { getClosingBalance } from './ledger-balance-service.js';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

function signedBookBalance(closing: { closingBalanceDr: number; closingBalanceCr: number }): number {
  return closing.closingBalanceDr - closing.closingBalanceCr;
}

export async function listBankRecItems(
  client: PrismaClient,
  filter: {
    bankAccountId: string;
    dateFrom: string;
    dateTo: string;
    status?: BankRecStatus;
  },
): Promise<BankRecGridRow[]> {
  const dateFrom = parseIsoDate(filter.dateFrom, 'dateFrom');
  const dateTo = parseIsoDate(filter.dateTo, 'dateTo');
  const status = filter.status ?? BankRecStatus.ALL;

  const lines = await client.voucherLine.findMany({
    where: {
      accountMasterId: filter.bankAccountId,
      voucher: {
        status: VoucherStatus.POSTED,
        voucherDate: { gte: dateFrom, lte: dateTo },
      },
    },
    include: {
      chequeDetail: true,
      voucher: { select: { id: true, systemVoucherNo: true, voucherDate: true, narration: true } },
    },
    orderBy: [{ voucher: { voucherDate: 'asc' } }, { lineNo: 'asc' }],
  });

  return lines
    .map((line) => {
      const deposits = toNumber(line.crAmount);
      const withdrawals = toNumber(line.drAmount);
      const clearedOnDate = line.chequeDetail?.clearedOnDate;

      return {
        voucherLineId: line.id,
        voucherId: line.voucher.id,
        voucherNo: line.voucher.systemVoucherNo,
        voucherDate: line.voucher.voucherDate.toISOString().slice(0, 10),
        chequeNo: line.chequeDetail?.chequeNo ?? null,
        chequeDate: line.chequeDetail?.chequeDate
          ? line.chequeDetail.chequeDate.toISOString().slice(0, 10)
          : null,
        clearedOnDate: clearedOnDate ? clearedOnDate.toISOString().slice(0, 10) : null,
        deposits,
        withdrawals,
        remark: line.voucher.narration || line.particulars,
        hasChequeDetail: Boolean(line.chequeDetail),
      };
    })
    .filter((row) => {
      if (status === BankRecStatus.ALL) return true;
      if (!row.hasChequeDetail) return status === BankRecStatus.UNCLEARED;
      if (status === BankRecStatus.CLEARED) return Boolean(row.clearedOnDate);
      return !row.clearedOnDate;
    })
    .map(({ hasChequeDetail: _ignored, ...row }) => row);
}

export async function bulkUpdateClearingDates(
  client: PrismaClient,
  voucherLineIds: string[],
  clearingDate: string,
  actorId: string,
): Promise<{ updated: number }> {
  if (!voucherLineIds.length) return { updated: 0 };

  const parsedDate = parseIsoDate(clearingDate, 'clearingDate');
  const lines = await client.voucherLine.findMany({
    where: { id: { in: voucherLineIds } },
    include: { chequeDetail: true },
  });

  let updated = 0;
  await client.$transaction(async (tx) => {
    for (const line of lines) {
      if (!line.chequeDetail) continue;
      await tx.chequeDetail.update({
        where: { id: line.chequeDetail.id },
        data: {
          clearedOnDate: parsedDate,
          updatedBy: actorId,
        },
      });
      updated += 1;
    }
  });

  return { updated };
}

export async function generateBankReconciliationStatement(
  client: PrismaClient,
  bankAccountId: string,
  asOnDate: string,
): Promise<BankReconciliationStatementDto> {
  const cutoff = parseIsoDate(asOnDate, 'asOnDate');
  const account = await client.accountMaster.findUniqueOrThrow({
    where: { id: bankAccountId },
  });

  const closing = await getClosingBalance(client, bankAccountId, cutoff);
  const closingBalancePerBooks = signedBookBalance(closing);
  const openingBalancePerBooks =
    toNumber(account.openingBalanceDr) - toNumber(account.openingBalanceCr);

  const lines = await client.voucherLine.findMany({
    where: {
      accountMasterId: bankAccountId,
      voucher: {
        status: VoucherStatus.POSTED,
        voucherDate: { lte: cutoff },
      },
    },
    include: { chequeDetail: true },
  });

  let addUnclearedDeposits = 0;
  let lessUnclearedWithdrawals = 0;

  for (const line of lines) {
    const isUncleared = !line.chequeDetail?.clearedOnDate || line.chequeDetail.clearedOnDate > cutoff;
    if (!isUncleared) continue;

    addUnclearedDeposits += toNumber(line.crAmount);
    lessUnclearedWithdrawals += toNumber(line.drAmount);
  }

  const closingBalancePerPassBook =
    closingBalancePerBooks - addUnclearedDeposits + lessUnclearedWithdrawals;

  return {
    bankAccountId,
    bankAccountName: account.particulars,
    asOnDate,
    openingBalancePerBooks,
    closingBalancePerBooks,
    addUnclearedDeposits,
    lessUnclearedWithdrawals,
    closingBalancePerPassBook,
  };
}
