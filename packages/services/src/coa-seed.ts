import type { PrismaClient } from '@prisma/client';
import { AccountCategoryType, AccountNature } from '@prisma/client';

const SYSTEM_ACTOR = 'SYSTEM';

export interface CoaLinkageIds {
  shareCapitalGroupId: string;
  shareCapitalSubgroupId: string;
  bankSubgroupId: string;
  cashSubgroupId: string;
  memberSubgroupId: string;
  tenantSubgroupId: string;
  incomeExpenseSubgroupId: string;
  interestAccountId: string;
  adjustmentAccountId: string;
  nonOccupancyAccountId: string;
  serviceTaxAccountId: string;
  educationCessAccountId: string;
  cashBankGroupId: string;
}

const CATEGORIES = [
  { id: AccountCategoryType.ASSET, name: 'Assets', sortOrder: 1 },
  { id: AccountCategoryType.LIABILITY, name: 'Liabilities', sortOrder: 2 },
  { id: AccountCategoryType.INCOME, name: 'Income', sortOrder: 3 },
  { id: AccountCategoryType.EXPENSE, name: 'Expenses', sortOrder: 4 },
] as const;

/** SDD §30.3 — default CoA groups, subgroups, and billing ledger short codes */
export async function seedDefaultChartOfAccounts(
  client: PrismaClient,
  actorId: string = SYSTEM_ACTOR,
): Promise<CoaLinkageIds | null> {
  const existing = await client.accountCategory.count();
  if (existing > 0) {
    return resolveLinkageIds(client);
  }

  for (const category of CATEGORIES) {
    await client.accountCategory.create({
      data: {
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
      },
    });
  }

  const currentAssets = await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.ASSET,
      groupName: 'Current Assets',
      balanceSheetSr: 10,
      nature: AccountNature.DEBIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.ASSET,
      groupName: 'Fixed Assets',
      balanceSheetSr: 20,
      nature: AccountNature.DEBIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.ASSET,
      groupName: 'Investments',
      balanceSheetSr: 30,
      nature: AccountNature.DEBIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const membersDues = await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.ASSET,
      groupName: "Members' Dues",
      balanceSheetSr: 40,
      nature: AccountNature.DEBIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const shareCapital = await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.LIABILITY,
      groupName: 'Share Capital',
      balanceSheetSr: 10,
      nature: AccountNature.CREDIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.LIABILITY,
      groupName: 'Reserves & Surplus',
      balanceSheetSr: 20,
      nature: AccountNature.CREDIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const sinkingFundGroup = await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.LIABILITY,
      groupName: 'Sinking Fund',
      balanceSheetSr: 30,
      nature: AccountNature.CREDIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.LIABILITY,
      groupName: 'Current Liabilities',
      balanceSheetSr: 40,
      nature: AccountNature.CREDIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const incomeGroup = await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.INCOME,
      groupName: 'Income',
      balanceSheetSr: 10,
      nature: AccountNature.CREDIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const expenseGroup = await client.accountGroup.create({
    data: {
      categoryId: AccountCategoryType.EXPENSE,
      groupName: 'Expenses',
      balanceSheetSr: 10,
      nature: AccountNature.DEBIT,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const cashSubgroup = await client.accountSubgroup.create({
    data: {
      groupId: currentAssets.id,
      subgroupName: 'Cash',
      subgroupSr: 10,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const bankSubgroup = await client.accountSubgroup.create({
    data: {
      groupId: currentAssets.id,
      subgroupName: 'Bank',
      subgroupSr: 20,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const memberSubgroup = await client.accountSubgroup.create({
    data: {
      groupId: membersDues.id,
      subgroupName: 'Members',
      subgroupSr: 10,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const tenantSubgroup = await client.accountSubgroup.create({
    data: {
      groupId: membersDues.id,
      subgroupName: 'Tenants',
      subgroupSr: 20,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const shareCapitalSubgroup = await client.accountSubgroup.create({
    data: {
      groupId: shareCapital.id,
      subgroupName: 'Share Capital',
      subgroupSr: 10,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const incomeSubgroup = await client.accountSubgroup.create({
    data: {
      groupId: incomeGroup.id,
      subgroupName: 'Maintenance Income',
      subgroupSr: 10,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const expenseSubgroup = await client.accountSubgroup.create({
    data: {
      groupId: expenseGroup.id,
      subgroupName: 'Society Expenses',
      subgroupSr: 10,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.accountSubgroup.create({
    data: {
      groupId: sinkingFundGroup.id,
      subgroupName: 'Sinking Fund Reserve',
      subgroupSr: 10,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.accountMaster.create({
    data: {
      subgroupId: cashSubgroup.id,
      particulars: 'Cash in Hand',
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.accountMaster.create({
    data: {
      subgroupId: bankSubgroup.id,
      particulars: 'Society Bank Account',
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.accountMaster.create({
    data: {
      subgroupId: shareCapitalSubgroup.id,
      particulars: 'Share Capital',
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const billingAccounts = [
    { particulars: 'Maintenance Charges', shortCode: 'MNCE', rebateApplicable: true },
    { particulars: 'Water Charges', shortCode: 'WATR', rebateApplicable: true },
    { particulars: 'Sinking Fund Contribution', shortCode: 'SINK', rebateApplicable: true },
    { particulars: 'Parking Charges', shortCode: 'PARK', rebateApplicable: true },
    { particulars: 'Interest on Arrears', shortCode: 'INTR', interestFree: false },
    { particulars: 'Non-Occupancy Charge', shortCode: 'NOCC' },
    { particulars: 'Service Tax', shortCode: 'STAX', serviceTaxApplicable: true },
    { particulars: 'Education Cess', shortCode: 'EDCS', serviceTaxApplicable: true },
  ] as const;

  const accountIds: Record<string, string> = {};

  for (const account of billingAccounts) {
    const created = await client.accountMaster.create({
      data: {
        subgroupId: incomeSubgroup.id,
        particulars: account.particulars,
        shortCode: account.shortCode,
        serviceTaxApplicable: 'serviceTaxApplicable' in account ? account.serviceTaxApplicable : false,
        rebateApplicable: 'rebateApplicable' in account ? account.rebateApplicable : false,
        interestFree: 'interestFree' in account ? account.interestFree : false,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    accountIds[account.shortCode] = created.id;
  }

  const adjustmentAccount = await client.accountMaster.create({
    data: {
      subgroupId: expenseSubgroup.id,
      particulars: 'Bill Adjustments',
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  return {
    shareCapitalGroupId: shareCapital.id,
    shareCapitalSubgroupId: shareCapitalSubgroup.id,
    bankSubgroupId: bankSubgroup.id,
    cashSubgroupId: cashSubgroup.id,
    memberSubgroupId: memberSubgroup.id,
    tenantSubgroupId: tenantSubgroup.id,
    incomeExpenseSubgroupId: incomeSubgroup.id,
    interestAccountId: accountIds.INTR!,
    adjustmentAccountId: adjustmentAccount.id,
    nonOccupancyAccountId: accountIds.NOC!,
    serviceTaxAccountId: accountIds.STAX!,
    educationCessAccountId: accountIds.EDCS!,
    cashBankGroupId: currentAssets.id,
  };
}

async function resolveLinkageIds(client: PrismaClient): Promise<CoaLinkageIds | null> {
  const shareCapitalGroup = await client.accountGroup.findFirst({
    where: { groupName: 'Share Capital' },
  });
  const currentAssets = await client.accountGroup.findFirst({
    where: { groupName: 'Current Assets' },
  });
  if (!shareCapitalGroup || !currentAssets) {
    return null;
  }

  const subgroup = async (groupId: string, name: string) =>
    client.accountSubgroup.findFirst({ where: { groupId, subgroupName: name } });

  const shareCapitalSubgroup = await subgroup(shareCapitalGroup.id, 'Share Capital');
  const cashSubgroup = await subgroup(currentAssets.id, 'Cash');
  const bankSubgroup = await subgroup(currentAssets.id, 'Bank');

  const membersDues = await client.accountGroup.findFirst({ where: { groupName: "Members' Dues" } });
  const memberSubgroup = membersDues ? await subgroup(membersDues.id, 'Members') : null;
  const tenantSubgroup = membersDues ? await subgroup(membersDues.id, 'Tenants') : null;

  const incomeGroup = await client.accountGroup.findFirst({ where: { groupName: 'Income' } });
  const incomeSubgroup = incomeGroup
    ? await subgroup(incomeGroup.id, 'Maintenance Income')
    : null;

  const accountByCode = async (code: string) =>
    client.accountMaster.findFirst({ where: { shortCode: code } });

  const intr = await accountByCode('INTR');
  const noc = await accountByCode('NOCC');
  const stax = await accountByCode('STAX');
  const edcs = await accountByCode('EDCS');
  const adjustment = await client.accountMaster.findFirst({
    where: { particulars: 'Bill Adjustments' },
  });

  if (
    !shareCapitalSubgroup ||
    !cashSubgroup ||
    !bankSubgroup ||
    !memberSubgroup ||
    !tenantSubgroup ||
    !incomeSubgroup ||
    !intr ||
    !noc ||
    !stax ||
    !edcs ||
    !adjustment
  ) {
    return null;
  }

  return {
    shareCapitalGroupId: shareCapitalGroup.id,
    shareCapitalSubgroupId: shareCapitalSubgroup.id,
    bankSubgroupId: bankSubgroup.id,
    cashSubgroupId: cashSubgroup.id,
    memberSubgroupId: memberSubgroup.id,
    tenantSubgroupId: tenantSubgroup.id,
    incomeExpenseSubgroupId: incomeSubgroup.id,
    interestAccountId: intr.id,
    adjustmentAccountId: adjustment.id,
    nonOccupancyAccountId: noc.id,
    serviceTaxAccountId: stax.id,
    educationCessAccountId: edcs.id,
    cashBankGroupId: currentAssets.id,
  };
}

export async function ensureDefaultChartOfAccounts(
  client: PrismaClient,
  actorId: string = SYSTEM_ACTOR,
): Promise<CoaLinkageIds | null> {
  const linkages = await seedDefaultChartOfAccounts(client, actorId);
  if (!linkages) {
    return null;
  }

  const parameters = await client.societyParameters.findFirst();
  if (parameters && !parameters.shareCapitalGroupId) {
    await client.societyParameters.update({
      where: { id: parameters.id },
      data: {
        shareCapitalGroupId: linkages.shareCapitalGroupId,
        shareCapitalSubgroupId: linkages.shareCapitalSubgroupId,
        bankSubgroupId: linkages.bankSubgroupId,
        cashSubgroupId: linkages.cashSubgroupId,
        memberSubgroupId: linkages.memberSubgroupId,
        tenantSubgroupId: linkages.tenantSubgroupId,
        incomeExpenseSubgroupId: linkages.incomeExpenseSubgroupId,
        interestAccountId: linkages.interestAccountId,
        adjustmentAccountId: linkages.adjustmentAccountId,
        nonOccupancyAccountId: linkages.nonOccupancyAccountId,
        serviceTaxAccountId: linkages.serviceTaxAccountId,
        educationCessAccountId: linkages.educationCessAccountId,
        cashBankGroupId: linkages.cashBankGroupId,
        updatedBy: actorId,
      },
    });
  }

  return linkages;
}
