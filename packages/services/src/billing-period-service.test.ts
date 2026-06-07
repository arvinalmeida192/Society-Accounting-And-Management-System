import { describe, expect, it } from 'vitest';
import { BillFrequency } from '@sams/shared-types';
import { generateBillingPeriodCalendar } from './billing-period-service.js';

describe('generateBillingPeriodCalendar', () => {
  it('generates 12 monthly periods for a standard FY', () => {
    const periods = generateBillingPeriodCalendar({
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      billFrequency: BillFrequency.MONTHLY,
    });

    expect(periods).toHaveLength(12);
    expect(periods[0]?.periodLabel).toContain('2025');
    expect(periods[11]?.sequenceNo).toBe(12);
  });

  it('generates quarterly periods', () => {
    const periods = generateBillingPeriodCalendar({
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      billFrequency: BillFrequency.QUARTERLY,
    });

    expect(periods).toHaveLength(4);
  });
});
