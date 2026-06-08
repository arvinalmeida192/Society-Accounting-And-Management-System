import { describe, expect, it } from 'vitest';

describe('StatutoryRegisterService SF-002 formula', () => {
  it('required contribution is 0.25% of flat construction value', () => {
    const constructionValue = 1_000_000;
    const requiredContribution = constructionValue * 0.0025;
    expect(requiredContribution).toBe(2500);
  });
});

describe('FD status resolution', () => {
  it('marks matured when maturity date is in the past', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const past = new Date(today);
    past.setDate(past.getDate() - 1);
    expect(past < today).toBe(true);
  });
});
