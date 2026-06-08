import { copyFile } from 'node:fs/promises';
import type { Prisma, PrismaClient } from '@prisma/client';
import { BillStatus, OpeningBalanceType, VoucherStatus } from '@prisma/client';
import type { YearEndChecklistDto, YearEndCloseResultDto } from '@sams/shared-types';
import { AccountCategoryType, BillFrequency } from '@sams/shared-types';
import {
  generateFinancialYearLabel,
  getActiveFinancialYear,
  parseIsoDate,
} from './financial-year.js';
import { validateFinancialYearInput } from './startup-service.js';
import { getClosingBalance } from './ledger-balance-service.js';
import { computeMemberArrearsBreakdown } from './settlement-service.js';
import { regenerateBillingPeriodCalendar } from './billing-period-service.js';
import { assertWritable } from './assert-writable.js';

type TxClient = Prisma.TransactionClient;

/** SDD §27.13 — masters that carry forward are repointed to the new FY row. */
async function repointFinancialYearScopedMasters(
  tx: TxClient,
  oldFyId: string,
  newFyId: string,
  actorId: string,
): Promise<void> {
  const data = { financialYearId: newFyId, updatedBy: actorId };
  await tx.building.updateMany({ where: { financialYearId: oldFyId }, data });
  await tx.tariffDefinition.updateMany({ where: { financialYearId: oldFyId }, data });
  await tx.tariffSettlementSequence.updateMany({ where: { financialYearId: oldFyId }, data });
  await tx.tariffBillRegisterMapping.updateMany({ where: { financialYearId: oldFyId }, data });
}

export function incomeExpensePreviousYearAmount(
  category: AccountCategoryType,
  closing: { dr: number; cr: number },
): number {
  if (category === AccountCategoryType.INCOME) {
    return closing.cr;
  }
  if (category === AccountCategoryType.EXPENSE) {
    return closing.dr;
  }
  return 0;
}

export async function getYearEndChecklist(client: PrismaClient): Promise<YearEndChecklistDto> {
  const fy = await getActiveFinancialYear(client);

  const unclearedCheques = await client.chequeDetail.count({
    where: {
      clearedOnDate: null,
      cancelledOn: null,
      voucherLine: { voucher: { financialYearId: fy.id, status: VoucherStatus.POSTED } },
    },
  });

  const draftBills = await client.bill.count({
    where: { financialYearId: fy.id, status: BillStatus.DRAFT },
  });

  const meta = await client.systemMeta.findFirst();

  return {
    financialYearLabel: fy.label,
    unclearedCheques,
    draftBills,
    draftVouchers: 0,
    isReadOnly: meta?.isReadOnly ?? false,
    isYearClosed: fy.isClosed,
  };
}

export async function closeYear(
  client: PrismaClient,
  actorId: string,
): Promise<YearEndCloseResultDto> {
  await assertWritable(client);

  const checklist = await getYearEndChecklist(client);
  if (checklist.draftBills > 0) {
    throw new Error(
      `Cannot close year: ${checklist.draftBills} draft bill(s) remain. Post or delete them first.`,
    );
  }
  if (checklist.unclearedCheques > 0) {
    throw new Error(
      `Cannot close year: ${checklist.unclearedCheques} uncleared cheque(s) remain.`,
    );
  }
  const fy = await getActiveFinancialYear(client);
  if (fy.isClosed) throw new Error('Financial year is already closed.');

  await client.$transaction([
    client.financialYear.update({
      where: { id: fy.id },
      data: { isClosed: true, updatedBy: actorId },
    }),
    client.systemMeta.update({
      where: { id: 1 },
      data: {
        isReadOnly: true,
        closedAt: new Date(),
        closedById: actorId,
      },
    }),
  ]);

  return { isReadOnly: true, financialYearLabel: fy.label, closedAt: new Date().toISOString() };
}

export async function reopenYear(
  client: PrismaClient,
  actorId: string,
  confirmationText: string,
): Promise<{ isReadOnly: boolean }> {
  const identity = await client.societyIdentity.findFirst();
  const expected = identity?.societyName?.trim() ?? 'REOPEN YEAR';
  if (confirmationText.trim() !== expected) {
    throw new Error(`Type the society name exactly (${expected}) to reopen the year.`);
  }

  const meta = await client.systemMeta.findFirst();
  const fy = await getActiveFinancialYear(client);

  if (!meta?.isReadOnly) {
    throw new Error('The database is not in read-only mode.');
  }
  if (!fy.isClosed) {
    throw new Error('The financial year is not marked closed.');
  }

  await client.$transaction([
    client.financialYear.update({
      where: { id: fy.id },
      data: { isClosed: false, updatedBy: actorId },
    }),
    client.systemMeta.update({
      where: { id: 1 },
      data: {
        isReadOnly: false,
        closedAt: null,
        closedById: null,
      },
    }),
  ]);

  return { isReadOnly: false };
}

/** Purge old-FY transactional data and year-scoped registers (SDD §27.13). FK-safe order. */
async function clearTransactionalData(tx: TxClient, financialYearId: string): Promise<void> {
  await tx.billSettlement.deleteMany({
    where: { bill: { financialYearId } },
  });
  await tx.generalBillSettlement.deleteMany({
    where: { voucher: { financialYearId } },
  });
  await tx.billInterestDetail.deleteMany({
    where: { bill: { financialYearId } },
  });
  await tx.billLine.deleteMany({
    where: { bill: { financialYearId } },
  });
  await tx.bill.deleteMany({ where: { financialYearId } });

  const voucherIds = (
    await tx.voucher.findMany({
      where: { financialYearId },
      select: { id: true },
    })
  ).map((row) => row.id);

  if (voucherIds.length > 0) {
    await tx.chequeDetail.deleteMany({
      where: { voucherLine: { voucherId: { in: voucherIds } } },
    });
    await tx.voucherLine.deleteMany({ where: { voucherId: { in: voucherIds } } });
    await tx.tdsRecord.deleteMany({ where: { voucherId: { in: voucherIds } } });
    await tx.voucher.deleteMany({ where: { id: { in: voucherIds } } });
  }

  await tx.tdsRecord.deleteMany({ where: { financialYearId } });
  await tx.tdsChallan.deleteMany({ where: { financialYearId } });
  await tx.sinkingFundRegisterEntry.deleteMany({ where: { financialYearId } });
  await tx.generatedLetter.deleteMany({ where: { financialYearId } });
  await tx.committeeMember.deleteMany({ where: { financialYearId } });
  await tx.meetingMinutes.deleteMany({ where: { financialYearId } });
  await tx.fixedDepositRegister.deleteMany({ where: { financialYearId } });
  await tx.propertyRegisterEntry.deleteMany({ where: { financialYearId } });
  await tx.iFormRegister.deleteMany({ where: { financialYearId } });
  await tx.billingPeriodCalendar.deleteMany({ where: { financialYearId } });
  await tx.memberOpeningBalance.deleteMany({});
  await tx.voucherNumberSeries.deleteMany({ where: { financialYearId } });
}

export async function carryForwardToNewYear(
  targetClient: PrismaClient,
  newFyStart: string,
  newFyEnd: string,
  actorId: string,
  sourceDbPath?: string | null,
): Promise<{ financialYearId: string; fyLabel: string }> {
  const dateErrors = validateFinancialYearInput({ startDate: newFyStart, endDate: newFyEnd });
  if (Object.keys(dateErrors).length > 0) {
    throw new Error(Object.values(dateErrors).join(' '));
  }

  const oldFy = await getActiveFinancialYear(targetClient);
  const startDate = parseIsoDate(newFyStart, 'startDate');
  const endDate = parseIsoDate(newFyEnd, 'endDate');
  const fyLabel = generateFinancialYearLabel(startDate, endDate);

  const accounts = await targetClient.accountMaster.findMany({
    include: { subgroup: { include: { group: true } } },
  });

  const closings = new Map<string, { dr: number; cr: number; category: AccountCategoryType }>();
  for (const account of accounts) {
    const closing = await getClosingBalance(
      targetClient,
      account.id,
      oldFy.endDate,
      oldFy.id,
    );
    closings.set(account.id, {
      dr: closing.closingBalanceDr,
      cr: closing.closingBalanceCr,
      category: account.subgroup.group.categoryId as AccountCategoryType,
    });
  }

  const members = await targetClient.member.findMany({
    where: { disposedAt: null },
    select: { id: true },
  });

  const memberArrears: Array<{
    memberId: string;
    regularPrincipal: number;
    regularInterest: number;
    regularServiceTax: number;
    suppPrincipal: number;
    suppInterest: number;
  }> = [];

  for (const member of members) {
    const regular = await computeMemberArrearsBreakdown(targetClient, member.id, 'REGULAR');
    const supplementary = await computeMemberArrearsBreakdown(
      targetClient,
      member.id,
      'SUPPLEMENTARY',
    );
    if (
      regular.principal + regular.interest + regular.serviceTax <= 0.01 &&
      supplementary.principal + supplementary.interest <= 0.01
    ) {
      continue;
    }

    memberArrears.push({
      memberId: member.id,
      regularPrincipal: regular.principal,
      regularInterest: regular.interest,
      regularServiceTax: regular.serviceTax,
      suppPrincipal: supplementary.principal,
      suppInterest: supplementary.interest,
    });
  }

  let newFinancialYearId = '';

  await targetClient.$transaction(async (tx) => {
    await clearTransactionalData(tx, oldFy.id);

    await tx.financialYear.update({
      where: { id: oldFy.id },
      data: { isClosed: true, updatedBy: actorId },
    });

    const newFy = await tx.financialYear.create({
      data: {
        label: fyLabel,
        startDate,
        endDate,
        isClosed: false,
        previousYearDbPath: sourceDbPath ?? null,
        societyIdentityId: oldFy.societyIdentityId,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    newFinancialYearId = newFy.id;

    await repointFinancialYearScopedMasters(tx, oldFy.id, newFy.id, actorId);

    for (const account of accounts) {
      const closing = closings.get(account.id);
      if (!closing) continue;

      if (
        closing.category === AccountCategoryType.ASSET ||
        closing.category === AccountCategoryType.LIABILITY
      ) {
        await tx.accountMaster.update({
          where: { id: account.id },
          data: {
            openingBalanceDr: closing.dr,
            openingBalanceCr: closing.cr,
            previousYearAmount: 0,
            updatedBy: actorId,
          },
        });
      } else {
        const activity = incomeExpensePreviousYearAmount(closing.category, closing);
        await tx.accountMaster.update({
          where: { id: account.id },
          data: {
            openingBalanceDr: 0,
            openingBalanceCr: 0,
            previousYearAmount: activity,
            updatedBy: actorId,
          },
        });
      }
    }

    for (const arrears of memberArrears) {
      if (
        arrears.regularPrincipal + arrears.regularInterest + arrears.regularServiceTax > 0.01
      ) {
        await tx.memberOpeningBalance.create({
          data: {
            memberId: arrears.memberId,
            balanceType: OpeningBalanceType.REGULAR,
            principalOB: arrears.regularPrincipal,
            interestOB: arrears.regularInterest,
            serviceTaxOB: arrears.regularServiceTax,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
      }
      if (arrears.suppPrincipal + arrears.suppInterest > 0.01) {
        await tx.memberOpeningBalance.create({
          data: {
            memberId: arrears.memberId,
            balanceType: OpeningBalanceType.SUPPLEMENTARY,
            principalOB: arrears.suppPrincipal,
            interestOB: arrears.suppInterest,
            serviceTaxOB: 0,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
      }
    }

    const parameters = await tx.societyParameters.findFirst();
    if (parameters) {
      await regenerateBillingPeriodCalendar(tx as PrismaClient, {
        financialYearId: newFy.id,
        startDate,
        endDate,
        billFrequency: parameters.billFrequency as BillFrequency,
        actorId,
      });
    }

    await tx.systemMeta.update({
      where: { id: 1 },
      data: { isReadOnly: false, closedAt: null, closedById: null },
    });
  });

  if (!newFinancialYearId) throw new Error('Failed to create new financial year.');

  return { financialYearId: newFinancialYearId, fyLabel };
}

export async function markSourceDatabaseReadOnly(
  sourceClient: PrismaClient,
  actorId: string,
): Promise<void> {
  const fy = await getActiveFinancialYear(sourceClient);
  await sourceClient.$transaction([
    sourceClient.financialYear.update({
      where: { id: fy.id },
      data: { isClosed: true, updatedBy: actorId },
    }),
    sourceClient.systemMeta.update({
      where: { id: 1 },
      data: {
        isReadOnly: true,
        closedAt: new Date(),
        closedById: actorId,
      },
    }),
  ]);
}

export type EphemeralDatabaseFn = <T>(
  dbPath: string,
  fn: (client: PrismaClient) => Promise<T>,
) => Promise<T>;

export async function carryForwardDatabaseFiles(
  sourcePath: string,
  targetPath: string,
  newFyStart: string,
  newFyEnd: string,
  actorId: string,
  connect: (path: string) => Promise<PrismaClient>,
  withEphemeral?: EphemeralDatabaseFn,
): Promise<{
  dbPath: string;
  societyName: string;
  fyLabel: string;
  financialYearId: string;
  warning?: string;
}> {
  await copyFile(sourcePath, targetPath);

  const targetClient = await connect(targetPath);
  const result = await carryForwardToNewYear(
    targetClient,
    newFyStart,
    newFyEnd,
    actorId,
    sourcePath,
  );

  const identity = await targetClient.societyIdentity.findFirstOrThrow();

  let warning: string | undefined;
  try {
    const lockSource = withEphemeral ?? (async (path, fn) => fn(await connect(path)));
    await lockSource(sourcePath, async (sourceClient) => {
      await markSourceDatabaseReadOnly(sourceClient, actorId);
    });
  } catch (error) {
    warning =
      error instanceof Error
        ? `New year created but source database could not be locked: ${error.message}`
        : 'New year created but source database could not be locked.';
    console.error(warning);
  }

  return {
    dbPath: targetPath,
    societyName: identity.societyName,
    fyLabel: result.fyLabel,
    financialYearId: result.financialYearId,
    ...(warning ? { warning } : {}),
  };
}
