import { describe, expect, it } from 'vitest';
import { generateFinancialYearLabel } from './financial-year.js';

describe('generateFinancialYearLabel', () => {
  it('formats April-March financial years', () => {
    const label = generateFinancialYearLabel(new Date('2025-04-01'), new Date('2026-03-31'));
    expect(label).toBe('2025-26');
  });

  it('returns single year when end is not after start year', () => {
    const label = generateFinancialYearLabel(new Date('2025-01-01'), new Date('2025-12-31'));
    expect(label).toBe('2025');
  });
});
