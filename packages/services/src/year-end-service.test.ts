import { describe, expect, it, vi } from 'vitest';
import { AccountCategoryType } from '@sams/shared-types';
import { closeYear, getYearEndChecklist, incomeExpensePreviousYearAmount } from './year-end-service.js';

function createMockClient(overrides: {
  draftBills?: number;
  unclearedCheques?: number;
  isClosed?: boolean;
  isReadOnly?: boolean;
}): Parameters<typeof getYearEndChecklist>[0] {
  const fy = {
    id: 'fy-1',
    label: '2024-25',
    isClosed: overrides.isClosed ?? false,
    startDate: new Date('2024-04-01'),
    endDate: new Date('2025-03-31'),
  };

  return {
    financialYear: {
      findFirst: vi.fn(async (args?: { where?: { isClosed?: boolean } }) => {
        if (args?.where?.isClosed === false) return fy;
        return fy;
      }),
    },
    chequeDetail: {
      count: vi.fn(async () => overrides.unclearedCheques ?? 0),
    },
    bill: {
      count: vi.fn(async () => overrides.draftBills ?? 0),
    },
    systemMeta: {
      findFirst: vi.fn(async () => ({
        isReadOnly: overrides.isReadOnly ?? false,
      })),
    },
    $transaction: vi.fn(async (ops: unknown) => {
      if (typeof ops === 'function') return ops({});
      return Promise.all(ops as Promise<unknown>[]);
    }),
    financialYear_update: vi.fn(),
  } as never;
}

describe('incomeExpensePreviousYearAmount', () => {
  it('uses credit balance for income accounts', () => {
    expect(
      incomeExpensePreviousYearAmount(AccountCategoryType.INCOME, { dr: 0, cr: 12500 }),
    ).toBe(12500);
  });

  it('uses debit balance for expense accounts', () => {
    expect(
      incomeExpensePreviousYearAmount(AccountCategoryType.EXPENSE, { dr: 8400, cr: 0 }),
    ).toBe(8400);
  });
});

describe('getYearEndChecklist', () => {
  it('reports draft bills count', async () => {
    const client = createMockClient({ draftBills: 3 });
    const checklist = await getYearEndChecklist(client);
    expect(checklist.draftBills).toBe(3);
    expect(checklist.draftVouchers).toBe(0);
  });
});

describe('closeYear', () => {
  it('rejects when draft bills remain', async () => {
    const client = createMockClient({ draftBills: 2 });
    await expect(closeYear(client, 'user-1')).rejects.toThrow(/draft bill/i);
  });

  it('rejects when uncleared cheques remain', async () => {
    const client = createMockClient({ unclearedCheques: 1 });
    await expect(closeYear(client, 'user-1')).rejects.toThrow(/uncleared cheque/i);
  });
});
