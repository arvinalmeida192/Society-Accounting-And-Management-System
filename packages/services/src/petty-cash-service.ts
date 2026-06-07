import type { PrismaClient } from '@prisma/client';
import { ErrorCodes, VoucherType, type PettyCashVoucherDto, type VoucherDetailDto } from '@sams/shared-types';
import { listVouchers, postVoucher, validateVoucherBalance } from './voucher-service.js';

async function assertPettyCashAccounts(
  client: PrismaClient,
  accountMasterIds: string[],
): Promise<void> {
  const accounts = await client.accountMaster.findMany({
    where: { id: { in: accountMasterIds } },
    select: { id: true, particulars: true, pettyCash: true, isActive: true, isArchived: true },
  });

  for (const accountId of accountMasterIds) {
    const account = accounts.find((row) => row.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} was not found.`);
    }
    if (!account.pettyCash) {
      throw Object.assign(
        new Error(`Account "${account.particulars}" is not flagged as petty cash (GAP-012).`),
        { code: ErrorCodes.VALIDATION_ERROR },
      );
    }
    if (!account.isActive || account.isArchived) {
      throw new Error(`Account "${account.particulars}" is inactive or archived.`);
    }
  }
}

/** SDD §25.22 — petty cash posting wrapper (GAP-012–013). */
export async function postPettyCashVoucher(
  client: PrismaClient,
  dto: PettyCashVoucherDto,
  actorId: string,
): Promise<VoucherDetailDto> {
  const balance = validateVoucherBalance(dto.lines);
  if (!balance.balanced) {
    throw Object.assign(new Error('Petty cash voucher is not balanced. ΣDr must equal ΣCr.'), {
      code: ErrorCodes.ACCOUNTING_IMBALANCE,
    });
  }

  const accountIds = [...new Set(dto.lines.map((line) => line.accountMasterId).filter(Boolean))];
  await assertPettyCashAccounts(client, accountIds);

  return postVoucher(
    client,
    {
      ...dto,
      voucherType: VoucherType.PETTY_CASH,
      subType: undefined,
    },
    actorId,
  );
}

export async function listPettyCashVouchers(
  client: PrismaClient,
  filter?: { dateFrom?: string; dateTo?: string; search?: string },
): Promise<{ items: Awaited<ReturnType<typeof listVouchers>>['items']; total: number }> {
  return listVouchers(client, { ...filter, voucherType: VoucherType.PETTY_CASH });
}
