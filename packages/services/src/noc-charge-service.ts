import type { PrismaClient } from '@prisma/client';
import { BillChargeLineType, type BillDraftLineDto } from '@sams/shared-types';
import { Money, type TariffDecimalPlaces } from './money.js';

export interface NocChargeLine {
  lineType: BillChargeLineType;
  accountMasterId: string;
  chargeName: string;
  amount: number;
}

export async function calculateNocLines(
  client: PrismaClient,
  member: {
    tenantOccupancy: boolean;
    tenantOccupancyEffectiveFrom: Date | null;
  },
  chargeLines: BillDraftLineDto[],
  billDate: Date,
  nonOccupancyPercent: number,
  nonOccupancyAccountId: string | null,
  suppressZeroTariffs: boolean,
  decimalPlaces: TariffDecimalPlaces,
): Promise<NocChargeLine[]> {
  if (!member.tenantOccupancy || !nonOccupancyAccountId) {
    return [];
  }

  if (
    member.tenantOccupancyEffectiveFrom &&
    billDate < member.tenantOccupancyEffectiveFrom
  ) {
    return [];
  }

  const accountIds = chargeLines.map((line) => line.accountMasterId);
  const accounts = await client.accountMaster.findMany({
    where: { id: { in: accountIds } },
  });
  const accountMap = Object.fromEntries(accounts.map((row) => [row.id, row]));

  const eligible = chargeLines
    .filter((line) => {
      const account = accountMap[line.accountMasterId];
      return (
        line.lineType === BillChargeLineType.CHARGE ||
        line.lineType === BillChargeLineType.PARKING
      ) && (account?.serviceTaxApplicable || account?.rebateApplicable);
    })
    .reduce((sum, line) => sum + line.amount, 0);

  const nocAmount = Money.fromRupees((eligible * nonOccupancyPercent) / 100).round(
    decimalPlaces,
  ).toRupees();

  if (nocAmount === 0 && suppressZeroTariffs) {
    return [];
  }

  const account = await client.accountMaster.findUniqueOrThrow({
    where: { id: nonOccupancyAccountId },
  });

  return [
    {
      lineType: BillChargeLineType.NOC,
      accountMasterId: nonOccupancyAccountId,
      chargeName: account.particulars,
      amount: nocAmount,
    },
  ];
}
