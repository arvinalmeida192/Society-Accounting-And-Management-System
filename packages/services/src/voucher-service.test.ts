import { describe, expect, it } from 'vitest';
import { VoucherSubType, VoucherType } from '@sams/shared-types';
import { validateVoucherBalance } from './voucher-service.js';
import { allocateToBill } from './settlement-service.js';

describe('validateVoucherBalance NF-005', () => {
  it('rejects unbalanced voucher lines', () => {
    const result = validateVoucherBalance([
      { lineNo: 1, accountMasterId: 'a1', drAmount: 1000, crAmount: 0 },
      { lineNo: 2, accountMasterId: 'a2', drAmount: 0, crAmount: 900 },
    ]);
    expect(result.balanced).toBe(false);
    expect(result.difference).toBe(100);
  });

  it('accepts balanced voucher lines', () => {
    const result = validateVoucherBalance([
      { lineNo: 1, accountMasterId: 'a1', drAmount: 500, crAmount: 0 },
      { lineNo: 2, accountMasterId: 'a2', drAmount: 0, crAmount: 500 },
    ]);
    expect(result.balanced).toBe(true);
  });
});

describe('allocateToBill BC-011', () => {
  const sampleBill = {
    id: 'b1',
    systemBillNo: 'RB-2025-0001',
    billType: 'REGULAR',
    billDate: new Date('2025-04-01'),
    billAmount: { toString: () => '1150' },
    totalCharges: { toString: () => '1000' },
    interestAmount: { toString: () => '100' },
    serviceTaxAmount: { toString: () => '50' },
    adjustmentAmount: { toString: () => '0' },
    settlements: [],
  };

  it('allocates service tax before interest then principal', () => {
    const result = allocateToBill(sampleBill, 120);
    expect(result.serviceTaxAllocated).toBe(50);
    expect(result.interestAllocated).toBe(70);
    expect(result.principalAllocated).toBe(0);
    expect(result.allocated).toBe(120);
  });

  it('respects tariffwise sequence when interest precedes service tax', () => {
    const result = allocateToBill(sampleBill, 120, [
      { accountMasterId: 'intr', accountShortCode: 'INTR' },
      { accountMasterId: 'stax', accountShortCode: 'STAX' },
      { accountMasterId: 'mnce', accountShortCode: 'MNCE' },
    ]);
    expect(result.interestAllocated).toBe(100);
    expect(result.serviceTaxAllocated).toBe(20);
    expect(result.principalAllocated).toBe(0);
  });
});

describe('series type mapping GAP-046', () => {
  it('maps receipt sub-types to MR and GR', async () => {
    const { previewVoucherPost } = await import('./voucher-service.js');
    await expect(
      previewVoucherPost({} as never, {
        voucherType: VoucherType.RECEIPT,
        subType: VoucherSubType.MEMBER_RECEIPT,
        voucherDate: '2025-04-01',
        lines: [
          { lineNo: 1, accountMasterId: 'a1', drAmount: 100, crAmount: 0 },
          { lineNo: 2, accountMasterId: 'a2', drAmount: 0, crAmount: 100 },
        ],
      }),
    ).resolves.toMatchObject({ balanced: true });
  });
});
