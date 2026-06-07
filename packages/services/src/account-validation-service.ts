import {
  AccountCategoryType,
  AccountNature,
} from '@sams/shared-types';

const CATEGORY_NATURE: Record<AccountCategoryType, AccountNature> = {
  [AccountCategoryType.ASSET]: AccountNature.DEBIT,
  [AccountCategoryType.LIABILITY]: AccountNature.CREDIT,
  [AccountCategoryType.INCOME]: AccountNature.CREDIT,
  [AccountCategoryType.EXPENSE]: AccountNature.DEBIT,
};

export const SHORT_CODE_PATTERN = /^[A-Z0-9]{4}$/;

export function validateShortCode(shortCode: string | null | undefined): string | null {
  if (!shortCode?.trim()) {
    return null;
  }
  const normalized = shortCode.trim().toUpperCase();
  if (!SHORT_CODE_PATTERN.test(normalized)) {
    return 'Short code must be exactly 4 uppercase letters or digits.';
  }
  return null;
}

/** COA-009 — group nature must align with category */
export function validateGroupNature(
  categoryId: AccountCategoryType,
  nature: AccountNature,
): string | null {
  const expected = CATEGORY_NATURE[categoryId];
  if (nature !== expected) {
    return `Group nature must be ${expected} for ${categoryId} category.`;
  }
  return null;
}

export function isBalanceSheetCategory(categoryId: AccountCategoryType): boolean {
  return categoryId === AccountCategoryType.ASSET || categoryId === AccountCategoryType.LIABILITY;
}

export function isIncomeExpenseCategory(categoryId: AccountCategoryType): boolean {
  return categoryId === AccountCategoryType.INCOME || categoryId === AccountCategoryType.EXPENSE;
}
