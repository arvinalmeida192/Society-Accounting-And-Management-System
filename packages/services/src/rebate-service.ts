import { RebateType } from '@sams/shared-types';
import { Money } from './money.js';

export function calculateRebate(
  totalCharges: number,
  rebateType: RebateType,
  rebateValue: number,
  overrideAmount?: number | null,
): number {
  if (overrideAmount != null) {
    return Math.max(0, Math.min(overrideAmount, totalCharges));
  }

  let rebate = 0;
  if (rebateType === RebateType.PERCENT) {
    rebate = (totalCharges * rebateValue) / 100;
  } else {
    rebate = rebateValue;
  }

  return Math.max(0, Math.min(Money.fromRupees(rebate).toRupees(), totalCharges));
}
