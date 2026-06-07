import { describe, expect, it } from 'vitest';
import { calculateRebate } from './rebate-service.js';
import { Money } from './money.js';
import { RebateType } from '@sams/shared-types';

describe('bill amount formula RB-007', () => {
  it('computes charges + interest + ST - rebate - adjustment', () => {
    const totalCharges = 3000;
    const interest = 150;
    const serviceTax = 45;
    const rebate = calculateRebate(totalCharges, RebateType.PERCENT, 5);
    const adjustment = 100;

    const billAmount = Money.fromRupees(
      totalCharges + interest + serviceTax - rebate - adjustment,
    ).toRupees();

    expect(rebate).toBe(150);
    expect(billAmount).toBe(2945);
  });
});

describe('supplementary bill validation SB-001', () => {
  it('requires party and reference for general bill-to type', async () => {
    const { previewSupplementaryBill } = await import('./billing-service.js');
    const mockClient = {} as never;

    await expect(
      previewSupplementaryBill(mockClient, {
        billToType: 'GENERAL',
        billForPeriodKey: '2025-04',
        billDate: '2025-04-01',
        lines: [{ accountMasterId: 'acc1', chargeName: 'Water', amount: 500 }],
      }),
    ).rejects.toThrow('Party name is required');
  });
});
