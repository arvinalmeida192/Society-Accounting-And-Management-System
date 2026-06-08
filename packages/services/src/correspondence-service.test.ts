import { describe, expect, it } from 'vitest';
import {
  formatMcAct101ReferenceNo,
  renderPlaceholders,
} from './correspondence-service.js';

describe('correspondence-service', () => {
  it('replaces amount and date placeholders CL-002', () => {
    const template =
      'Outstanding dues of {amount} as on [date] for {memberName} in unit {unitNo}.';
    const rendered = renderPlaceholders(template, {
      amount: 1234.5,
      balanceAsOnDate: '2026-06-08',
      memberName: 'A. Member',
      unitNo: '101',
    });
    expect(rendered).toContain('1,234.50');
    expect(rendered).toContain('2026-06-08');
    expect(rendered).toContain('A. Member');
    expect(rendered).toContain('101');
  });

  it('formats MCACT-101 reference numbers CL-003', () => {
    expect(formatMcAct101ReferenceNo(2026, 1)).toBe('MCACT-101/2026/0001');
    expect(formatMcAct101ReferenceNo(2026, 42)).toBe('MCACT-101/2026/0042');
  });
});
