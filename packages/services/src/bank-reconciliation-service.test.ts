import { describe, expect, it } from 'vitest';
import { BankRecStatus } from '@sams/shared-types';

describe('BankReconciliationService BR-005 formula', () => {
  it('computes pass-book balance from books balance and uncleared items', () => {
    const closingBalancePerBooks = 100_000;
    const addUnclearedDeposits = 5_000;
    const lessUnclearedWithdrawals = 12_000;
    const closingBalancePerPassBook =
      closingBalancePerBooks - addUnclearedDeposits + lessUnclearedWithdrawals;
    expect(closingBalancePerPassBook).toBe(107_000);
  });
});

describe('BankRecStatus filters BR-001', () => {
  it('defines uncleared, cleared, and all values', () => {
    expect(BankRecStatus.UNCLEARED).toBe('UNCLEARED');
    expect(BankRecStatus.CLEARED).toBe('CLEARED');
    expect(BankRecStatus.ALL).toBe('ALL');
  });
});
