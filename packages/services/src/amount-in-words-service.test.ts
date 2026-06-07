import { describe, expect, it } from 'vitest';
import { toIndianRupeesWords } from './amount-in-words-service.js';

describe('toIndianRupeesWords GAP-019', () => {
  it('converts whole rupees', () => {
    expect(toIndianRupeesWords(1000)).toBe('One Thousand Rupees Only');
  });

  it('converts rupees with paise', () => {
    expect(toIndianRupeesWords(1234.56)).toBe(
      'One Thousand Two Hundred Thirty Four Rupees and Fifty Six Paise Only',
    );
  });

  it('handles zero paise without paise clause', () => {
    expect(toIndianRupeesWords(500)).toBe('Five Hundred Rupees Only');
  });

  it('handles large amounts with lakh and crore', () => {
    expect(toIndianRupeesWords(1_25_00_000.25)).toBe(
      'One Crore Twenty Five Lakh Rupees and Twenty Five Paise Only',
    );
  });
});
