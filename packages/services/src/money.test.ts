import { describe, expect, it } from 'vitest';
import { Money } from './money.js';

describe('Money', () => {
  it('rounds to whole rupees when decimalPlaces is 0', () => {
    const m = Money.fromRupees(123.45);
    expect(m.round(0).toRupees()).toBe(123);
  });

  it('keeps paise when decimalPlaces is 2', () => {
    const m = Money.fromRupees(123.45);
    expect(m.round(2).format(2)).toBe('123.45');
  });

  it('rounds interest to nearest rupee', () => {
    const m = Money.fromRupees(99.6);
    expect(m.roundToRupee().toRupees()).toBe(100);
  });

  it('adds and subtracts in paise without float drift', () => {
    const a = Money.fromRupees(10.1);
    const b = Money.fromRupees(20.2);
    expect(a.add(b).format(2)).toBe('30.30');
    expect(b.subtract(a).format(2)).toBe('10.10');
  });
});
