import { describe, expect, it } from 'vitest';
import { isTdsPayableAccount } from './tds-service.js';

describe('TdsService TDS-001 detection', () => {
  it('matches TDS Payable account particulars case-insensitively', () => {
    expect(isTdsPayableAccount('TDS Payable')).toBe(true);
    expect(isTdsPayableAccount('tds payable - contractors')).toBe(true);
    expect(isTdsPayableAccount('Contractor Expense')).toBe(false);
  });
});
