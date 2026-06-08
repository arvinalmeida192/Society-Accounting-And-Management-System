import { describe, expect, it } from 'vitest';
import { allocateToBill, computeBillOutstanding } from './settlement-service.js';

function makeBill(overrides: {
  billAmount: number;
  totalCharges: number;
  interestAmount?: number;
  serviceTaxAmount?: number;
  adjustmentAmount?: number;
  settlements?: Array<{
    principalAllocated: number;
    interestAllocated: number;
    serviceTaxAllocated: number;
  }>;
}) {
  return {
    id: 'bill-1',
    systemBillNo: 'RB-2025-0001',
    billType: 'REGULAR',
    billDate: new Date('2025-04-01'),
    billAmount: { toString: () => String(overrides.billAmount) },
    totalCharges: { toString: () => String(overrides.totalCharges) },
    interestAmount: { toString: () => String(overrides.interestAmount ?? 0) },
    serviceTaxAmount: { toString: () => String(overrides.serviceTaxAmount ?? 0) },
    adjustmentAmount: { toString: () => String(overrides.adjustmentAmount ?? 0) },
    settlements: (overrides.settlements ?? []).map((s) => ({
      principalAllocated: { toString: () => String(s.principalAllocated) },
      interestAllocated: { toString: () => String(s.interestAllocated) },
      serviceTaxAllocated: { toString: () => String(s.serviceTaxAllocated) },
    })),
  };
}

describe('computeBillOutstanding', () => {
  it('caps bucket sum to billAmount minus settled when rebate reduces billAmount', () => {
    // charges 3000 + interest 150 + ST 45 - rebate 150 = 3045 bill amount
    const bill = makeBill({
      totalCharges: 3000,
      interestAmount: 150,
      serviceTaxAmount: 45,
      billAmount: 3045,
    });

    const breakdown = computeBillOutstanding(bill);

    expect(breakdown.total).toBe(3045);
    expect(breakdown.principal + breakdown.interest + breakdown.serviceTax).toBeCloseTo(3045, 2);
    expect(breakdown.principal).toBeLessThan(3000);
  });

  it('returns zero when fully settled', () => {
    const bill = makeBill({
      totalCharges: 1000,
      billAmount: 1000,
      settlements: [{ principalAllocated: 1000, interestAllocated: 0, serviceTaxAllocated: 0 }],
    });

    const breakdown = computeBillOutstanding(bill);
    expect(breakdown.total).toBe(0);
  });

  it('scales buckets after partial settlement on rebated bill', () => {
    const bill = makeBill({
      totalCharges: 3000,
      interestAmount: 150,
      serviceTaxAmount: 45,
      billAmount: 3045,
      settlements: [{ principalAllocated: 1500, interestAllocated: 0, serviceTaxAllocated: 0 }],
    });

    const breakdown = computeBillOutstanding(bill);
    expect(breakdown.total).toBeCloseTo(1545, 2);
    expect(breakdown.principal + breakdown.interest + breakdown.serviceTax).toBeCloseTo(1545, 2);
  });
});

describe('allocateToBill with rebate', () => {
  it('does not over-allocate beyond bill outstanding', () => {
    const bill = makeBill({
      totalCharges: 3000,
      interestAmount: 150,
      serviceTaxAmount: 45,
      billAmount: 3045,
    });

    const result = allocateToBill(bill, 5000);
    expect(result.allocated).toBeCloseTo(3045, 2);
    expect(result.principalAllocated + result.interestAllocated + result.serviceTaxAllocated).toBeCloseTo(
      3045,
      2,
    );
  });
});
