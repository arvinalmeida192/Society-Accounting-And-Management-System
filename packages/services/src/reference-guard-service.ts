import type { PrismaClient } from '@prisma/client';
import { VoucherStatus } from '@prisma/client';

export interface ReferenceGuardResult {
  allowed: boolean;
  references: string[];
}

/** COA-008 — block archive when posted voucher lines exist in current FY */
export async function canArchiveAccount(
  client: PrismaClient,
  accountId: string,
  financialYearId?: string,
): Promise<ReferenceGuardResult> {
  const references: string[] = [];

  const voucherCount = await client.voucherLine.count({
    where: {
      accountMasterId: accountId,
      voucher: {
        status: VoucherStatus.POSTED,
        ...(financialYearId ? { financialYearId } : {}),
      },
    },
  });

  if (voucherCount > 0) {
    references.push(`${voucherCount} posted voucher line(s)`);
  }

  const parameters = await client.societyParameters.findFirst();
  if (parameters) {
    const linkageFields: Array<[string, string | null]> = [
      ['interest account', parameters.interestAccountId],
      ['adjustment account', parameters.adjustmentAccountId],
      ['non-occupancy account', parameters.nonOccupancyAccountId],
      ['service tax account', parameters.serviceTaxAccountId],
      ['education cess account', parameters.educationCessAccountId],
    ];

    for (const [label, linkedId] of linkageFields) {
      if (linkedId === accountId) {
        references.push(`linked as ${label} in society parameters`);
      }
    }
  }

  return { allowed: references.length === 0, references };
}

/** BU-003 — block building delete when units or active members exist */
export async function canDeleteBuilding(
  client: PrismaClient,
  buildingId: string,
): Promise<ReferenceGuardResult> {
  const references: string[] = [];
  const unitCount = await client.unit.count({
    where: { buildingId, deletedAt: null },
  });
  if (unitCount > 0) {
    references.push(`${unitCount} unit(s)`);
  }

  const memberCount = await client.member.count({
    where: { unit: { buildingId }, disposedAt: null },
  });
  if (memberCount > 0) {
    references.push(`${memberCount} active member(s)`);
  }

  return { allowed: references.length === 0, references };
}

/** Wing delete guard */
export async function canDeleteWing(
  client: PrismaClient,
  wingId: string,
): Promise<ReferenceGuardResult> {
  const references: string[] = [];
  const unitCount = await client.unit.count({
    where: { wingId, deletedAt: null },
  });
  if (unitCount > 0) {
    references.push(`${unitCount} unit(s)`);
  }
  return { allowed: references.length === 0, references };
}

/** SDD §26.32 foundation — extensible delete guard */
export async function canDelete(
  _client: PrismaClient,
  _entity: string,
  _id: string,
): Promise<ReferenceGuardResult> {
  void _client;
  void _entity;
  void _id;
  return { allowed: false, references: ['Delete not supported for this entity.'] };
}
