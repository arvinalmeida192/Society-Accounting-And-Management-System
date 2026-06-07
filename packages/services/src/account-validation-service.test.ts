import { describe, expect, it } from 'vitest';
import { AccountCategoryType, AccountNature } from '@sams/shared-types';
import {
  validateGroupNature,
  validateShortCode,
} from './account-validation-service.js';

describe('account-validation-service', () => {
  it('accepts valid short codes', () => {
    expect(validateShortCode('WATR')).toBeNull();
    expect(validateShortCode('STAX')).toBeNull();
  });

  it('rejects invalid short codes', () => {
    expect(validateShortCode('TOOLONG')).not.toBeNull();
    expect(validateShortCode('ABC')).not.toBeNull();
    expect(validateShortCode('ab')).not.toBeNull();
  });

  it('validates group nature per category COA-009', () => {
    expect(validateGroupNature(AccountCategoryType.ASSET, AccountNature.DEBIT)).toBeNull();
    expect(validateGroupNature(AccountCategoryType.LIABILITY, AccountNature.CREDIT)).toBeNull();
    expect(validateGroupNature(AccountCategoryType.ASSET, AccountNature.CREDIT)).not.toBeNull();
  });
});
