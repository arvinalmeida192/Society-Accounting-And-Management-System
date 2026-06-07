import type { PrismaClient } from '@prisma/client';

const SYSTEM_ACTOR = 'SYSTEM';

/** Default settlement sequence: Service Tax → Interest → Principal charge heads */
export async function seedDefaultTariffConfiguration(
  client: PrismaClient,
  actorId: string = SYSTEM_ACTOR,
): Promise<void> {
  const financialYear = await client.financialYear.findFirst({ orderBy: { startDate: 'desc' } });
  if (!financialYear) {
    return;
  }

  const sequenceCount = await client.tariffSettlementSequence.count({
    where: { financialYearId: financialYear.id },
  });

  if (sequenceCount > 0) {
    return;
  }

  const accounts = await client.accountMaster.findMany({
    where: {
      shortCode: { in: ['STAX', 'INTR', 'MNCE'] },
      isArchived: false,
    },
  });

  const byCode = Object.fromEntries(
    accounts.filter((row) => row.shortCode).map((row) => [row.shortCode!, row.id]),
  );

  const lineAccounts = [byCode.STAX, byCode.INTR, byCode.MNCE].filter(Boolean) as string[];
  if (lineAccounts.length === 0) {
    return;
  }

  const fyStart = financialYear.startDate;

  await client.tariffSettlementSequence.create({
    data: {
      financialYearId: financialYear.id,
      effectiveDate: fyStart,
      createdBy: actorId,
      updatedBy: actorId,
      lines: {
        create: lineAccounts.map((accountMasterId, index) => ({
          srNo: index + 1,
          accountMasterId,
          remark: null,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      },
    },
  });
}
