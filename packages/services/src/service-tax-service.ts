import type { PrismaClient } from '@prisma/client';
import { BillChargeLineType, type BillDraftLineDto } from '@sams/shared-types';
import { Money } from './money.js';

export interface ServiceTaxResult {
  totalTax: number;
  serviceTax: number;
  educationCess: number;
}

export async function calculateServiceTax(
  client: PrismaClient,
  chargeLines: BillDraftLineDto[],
  serviceTaxPercent: number,
  educationCessPercent: number,
): Promise<ServiceTaxResult> {
  if (serviceTaxPercent <= 0) {
    return { totalTax: 0, serviceTax: 0, educationCess: 0 };
  }

  const accountIds = chargeLines
    .filter((line) => line.lineType === BillChargeLineType.CHARGE || line.lineType === BillChargeLineType.PARKING)
    .map((line) => line.accountMasterId);

  const accounts = await client.accountMaster.findMany({
    where: { id: { in: accountIds } },
  });
  const taxableAccounts = new Set(
    accounts.filter((row) => row.serviceTaxApplicable).map((row) => row.id),
  );

  const taxable = chargeLines
    .filter((line) => taxableAccounts.has(line.accountMasterId))
    .reduce((sum, line) => sum + line.amount, 0);

  const serviceTax = Money.fromRupees((taxable * serviceTaxPercent) / 100).toRupees();
  const educationCess = Money.fromRupees((serviceTax * educationCessPercent) / 100).toRupees();

  return {
    serviceTax,
    educationCess,
    totalTax: Money.fromRupees(serviceTax + educationCess).toRupees(),
  };
}
