import { describe, expect, it } from 'vitest';
import { allocateToBill } from './settlement-service.js';

describe('partial waiver allocation AJ-005', () => {
  const sampleBill = {
    id: 'b1',
    systemBillNo: 'RB-2025-0001',
    billType: 'REGULAR',
    billDate: new Date('2025-04-01'),
    billAmount: { toString: () => '1100' },
    totalCharges: { toString: () => '1000' },
    interestAmount: { toString: () => '100' },
    serviceTaxAmount: { toString: () => '0' },
    adjustmentAmount: { toString: () => '0' },
    settlements: [],
  };

  it('creates proportional component breakdown for partial waiver amount', () => {
    const result = allocateToBill(sampleBill, 550);
    expect(result.allocated).toBe(550);
    expect(result.interestAllocated).toBe(100);
    expect(result.principalAllocated).toBe(450);
  });
});
