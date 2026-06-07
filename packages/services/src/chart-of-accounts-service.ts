import type { Prisma, PrismaClient } from '@prisma/client';
import {
  AccountCategoryType as PrismaAccountCategoryType,
  AccountNature as PrismaAccountNature,
  VoucherStatus,
} from '@prisma/client';
import type {
  AccountCategoryType,
  AccountGroupDto,
  AccountMasterDetailDto,
  AccountMasterDto,
  AccountMasterSaveDto,
  AccountNature,
  AccountPickerItem,
  AccountSubgroupDto,
  ArchiveAccountResult,
  CoaTreeNode,
  CoaPickerKind,
} from '@sams/shared-types';
import {
  isBalanceSheetCategory,
  isIncomeExpenseCategory,
  validateGroupNature,
  validateShortCode,
} from './account-validation-service.js';
import { getClosingBalance } from './ledger-balance-service.js';
import { canArchiveAccount } from './reference-guard-service.js';

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

function mapGroup(record: {
  id: string;
  categoryId: string;
  groupName: string;
  balanceSheetSr: number;
  nature: string;
  substituteGroupName: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): AccountGroupDto {
  return {
    id: record.id,
    categoryId: record.categoryId as AccountCategoryType,
    groupName: record.groupName,
    balanceSheetSr: record.balanceSheetSr,
    nature: record.nature as AccountNature,
    substituteGroupName: record.substituteGroupName,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapSubgroup(record: {
  id: string;
  groupId: string;
  subgroupName: string;
  subgroupSr: number;
  substituteSubgroupName: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): AccountSubgroupDto {
  return {
    id: record.id,
    groupId: record.groupId,
    subgroupName: record.subgroupName,
    subgroupSr: record.subgroupSr,
    substituteSubgroupName: record.substituteSubgroupName,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapAccount(record: {
  id: string;
  subgroupId: string;
  particulars: string;
  openingBalanceDr: Prisma.Decimal;
  openingBalanceCr: Prisma.Decimal;
  previousYearAmount: Prisma.Decimal;
  estimateAmount: Prisma.Decimal;
  shortCode: string | null;
  serviceTaxApplicable: boolean;
  rebateApplicable: boolean;
  interestFree: boolean;
  pettyCash: boolean;
  isActive: boolean;
  isArchived: boolean;
  memberSubsidiaryId: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): AccountMasterDto {
  return {
    id: record.id,
    subgroupId: record.subgroupId,
    particulars: record.particulars,
    openingBalanceDr: decimalToNumber(record.openingBalanceDr),
    openingBalanceCr: decimalToNumber(record.openingBalanceCr),
    previousYearAmount: decimalToNumber(record.previousYearAmount),
    estimateAmount: decimalToNumber(record.estimateAmount),
    shortCode: record.shortCode,
    serviceTaxApplicable: record.serviceTaxApplicable,
    rebateApplicable: record.rebateApplicable,
    interestFree: record.interestFree,
    pettyCash: record.pettyCash,
    isActive: record.isActive,
    isArchived: record.isArchived,
    memberSubsidiaryId: record.memberSubsidiaryId,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function getCoaTree(
  client: PrismaClient,
  includeInactive = false,
): Promise<CoaTreeNode[]> {
  const categories = await client.accountCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const groups = await client.accountGroup.findMany({ orderBy: { balanceSheetSr: 'asc' } });
  const subgroups = await client.accountSubgroup.findMany({ orderBy: { subgroupSr: 'asc' } });
  const accounts = await client.accountMaster.findMany({
    where: includeInactive ? {} : { isArchived: false },
    orderBy: { particulars: 'asc' },
  });

  return categories.map((category) => ({
    id: category.id,
    nodeType: 'CATEGORY' as const,
    label: category.name,
    categoryId: category.id as AccountCategoryType,
    children: groups
      .filter((group) => group.categoryId === category.id)
      .map((group) => ({
        id: group.id,
        nodeType: 'GROUP' as const,
        label: group.groupName,
        categoryId: category.id as AccountCategoryType,
        children: subgroups
          .filter((subgroup) => subgroup.groupId === group.id)
          .map((subgroup) => ({
            id: subgroup.id,
            nodeType: 'SUBGROUP' as const,
            label: subgroup.subgroupName,
            categoryId: category.id as AccountCategoryType,
            groupId: group.id,
            children: accounts
              .filter((account) => account.subgroupId === subgroup.id)
              .filter((account) => includeInactive || account.isActive)
              .map((account) => ({
                id: account.id,
                nodeType: 'ACCOUNT' as const,
                label: account.shortCode
                  ? `${account.particulars} (${account.shortCode})`
                  : account.particulars,
                categoryId: category.id as AccountCategoryType,
                groupId: group.id,
                subgroupId: subgroup.id,
                isActive: account.isActive,
                isArchived: account.isArchived,
                pettyCash: account.pettyCash,
              })),
          })),
      })),
  }));
}

export async function listAccountGroups(
  client: PrismaClient,
  categoryId?: AccountCategoryType,
): Promise<AccountGroupDto[]> {
  const records = await client.accountGroup.findMany({
    where: categoryId
      ? { categoryId: categoryId as PrismaAccountCategoryType }
      : undefined,
    orderBy: [{ categoryId: 'asc' }, { balanceSheetSr: 'asc' }],
  });
  return records.map(mapGroup);
}

export async function saveAccountGroup(
  client: PrismaClient,
  dto: AccountGroupDto,
  actorId: string,
): Promise<AccountGroupDto> {
  const natureError = validateGroupNature(dto.categoryId, dto.nature);
  if (natureError) {
    throw Object.assign(new Error(natureError), { fieldErrors: { nature: natureError } });
  }

  if (!dto.groupName?.trim()) {
    throw Object.assign(new Error('Group name is required.'), {
      fieldErrors: { groupName: 'Group name is required.' },
    });
  }

  const data = {
    categoryId: dto.categoryId as PrismaAccountCategoryType,
    groupName: dto.groupName.trim(),
    balanceSheetSr: dto.balanceSheetSr,
    nature: dto.nature as PrismaAccountNature,
    substituteGroupName: dto.substituteGroupName?.trim() || null,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.accountGroup.update({ where: { id: dto.id }, data })
    : await client.accountGroup.create({
        data: { ...data, createdBy: actorId },
      });

  return mapGroup(record);
}

export async function listAccountSubgroups(
  client: PrismaClient,
  groupId: string,
): Promise<AccountSubgroupDto[]> {
  const records = await client.accountSubgroup.findMany({
    where: { groupId },
    orderBy: { subgroupSr: 'asc' },
  });
  return records.map(mapSubgroup);
}

export async function saveAccountSubgroup(
  client: PrismaClient,
  dto: AccountSubgroupDto,
  actorId: string,
): Promise<AccountSubgroupDto> {
  if (!dto.subgroupName?.trim()) {
    throw Object.assign(new Error('Subgroup name is required.'), {
      fieldErrors: { subgroupName: 'Subgroup name is required.' },
    });
  }

  const data = {
    groupId: dto.groupId,
    subgroupName: dto.subgroupName.trim(),
    subgroupSr: dto.subgroupSr,
    substituteSubgroupName: dto.substituteSubgroupName?.trim() || null,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.accountSubgroup.update({ where: { id: dto.id }, data })
    : await client.accountSubgroup.create({
        data: { ...data, createdBy: actorId },
      });

  return mapSubgroup(record);
}

export async function listAccountMasters(
  client: PrismaClient,
  subgroupId?: string,
  filter?: string,
): Promise<AccountMasterDto[]> {
  const records = await client.accountMaster.findMany({
    where: {
      ...(subgroupId ? { subgroupId } : {}),
      ...(filter
        ? {
            OR: [
              { particulars: { contains: filter } },
              { shortCode: { contains: filter.toUpperCase() } },
            ],
          }
        : {}),
      isArchived: false,
    },
    orderBy: { particulars: 'asc' },
  });
  return records.map(mapAccount);
}

export async function getAccountMaster(
  client: PrismaClient,
  id: string,
  financialYearId?: string,
): Promise<AccountMasterDetailDto> {
  const record = await client.accountMaster.findUniqueOrThrow({
    where: { id },
    include: { subgroup: { include: { group: { include: { category: true } } } } },
  });

  const closing = await getClosingBalance(client, id, undefined, financialYearId);

  return {
    ...mapAccount(record),
    categoryId: record.subgroup.group.categoryId as AccountCategoryType,
    categoryName: record.subgroup.group.category.name,
    groupId: record.subgroup.groupId,
    groupName: record.subgroup.group.groupName,
    subgroupName: record.subgroup.subgroupName,
    closingBalanceDr: closing.closingBalanceDr,
    closingBalanceCr: closing.closingBalanceCr,
  };
}

export async function saveAccountMaster(
  client: PrismaClient,
  dto: AccountMasterSaveDto,
  actorId: string,
): Promise<AccountMasterDto> {
  const subgroup = await client.accountSubgroup.findUniqueOrThrow({
    where: { id: dto.subgroupId },
    include: { group: true },
  });

  const categoryId = subgroup.group.categoryId as AccountCategoryType;
  const errors: Record<string, string> = {};

  if (!dto.particulars?.trim()) {
    errors.particulars = 'Particulars are required.';
  }

  const shortCodeError = validateShortCode(dto.shortCode);
  if (shortCodeError) {
    errors.shortCode = shortCodeError;
  }

  if (isBalanceSheetCategory(categoryId)) {
    if (dto.openingBalanceDr < 0 || dto.openingBalanceCr < 0) {
      errors.openingBalanceDr = 'Opening balances cannot be negative.';
    }
    if (dto.openingBalanceDr > 0 && dto.openingBalanceCr > 0) {
      errors.openingBalanceDr = 'Enter either debit or credit opening balance, not both.';
    }
  } else if (isIncomeExpenseCategory(categoryId)) {
    if (dto.openingBalanceDr !== 0 || dto.openingBalanceCr !== 0) {
      errors.openingBalanceDr = 'Income and expense accounts use previous year amount, not Dr/Cr.';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw Object.assign(new Error(Object.values(errors).join(' ')), { fieldErrors: errors });
  }

  const normalizedShortCode = dto.shortCode?.trim().toUpperCase() || null;
  if (normalizedShortCode) {
    const duplicate = await client.accountMaster.findFirst({
      where: {
        shortCode: normalizedShortCode,
        ...(dto.id ? { NOT: { id: dto.id } } : {}),
      },
    });
    if (duplicate) {
      throw Object.assign(new Error('Short code must be unique.'), {
        fieldErrors: { shortCode: 'Short code must be unique.' },
      });
    }
  }

  const data = {
    subgroupId: dto.subgroupId,
    particulars: dto.particulars.trim(),
    openingBalanceDr: isBalanceSheetCategory(categoryId) ? dto.openingBalanceDr : 0,
    openingBalanceCr: isBalanceSheetCategory(categoryId) ? dto.openingBalanceCr : 0,
    previousYearAmount: isIncomeExpenseCategory(categoryId) ? dto.previousYearAmount : 0,
    estimateAmount: isIncomeExpenseCategory(categoryId) ? dto.estimateAmount : 0,
    shortCode: normalizedShortCode,
    serviceTaxApplicable: dto.serviceTaxApplicable,
    rebateApplicable: dto.rebateApplicable,
    interestFree: dto.interestFree,
    pettyCash: dto.pettyCash,
    isActive: dto.isActive,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.accountMaster.update({ where: { id: dto.id }, data })
    : await client.accountMaster.create({
        data: { ...data, createdBy: actorId },
      });

  return mapAccount(record);
}

export async function archiveAccountMaster(
  client: PrismaClient,
  id: string,
  actorId: string,
  financialYearId?: string,
): Promise<ArchiveAccountResult> {
  const guard = await canArchiveAccount(client, id, financialYearId);
  if (!guard.allowed) {
    return {
      archived: false,
      blockReason: `Cannot archive: ${guard.references.join('; ')}.`,
    };
  }

  await client.accountMaster.update({
    where: { id },
    data: {
      isArchived: true,
      isActive: false,
      archivedAt: new Date(),
      archivedBy: actorId,
      updatedBy: actorId,
    },
  });

  return { archived: true };
}

async function resolvePickerSubgroupIds(
  client: PrismaClient,
  kind: CoaPickerKind,
): Promise<string[] | undefined> {
  const parameters = await client.societyParameters.findFirst();
  if (!parameters) {
    return undefined;
  }

  if (kind === 'MEMBER') {
    return parameters.memberSubgroupId ? [parameters.memberSubgroupId] : undefined;
  }
  if (kind === 'BANK') {
    return parameters.bankSubgroupId ? [parameters.bankSubgroupId] : undefined;
  }
  return undefined;
}

export async function searchAccountsForPicker(
  client: PrismaClient,
  query: string,
  kind: CoaPickerKind = 'ACCOUNT',
  activeOnly = true,
  pettyCashOnly = false,
): Promise<AccountPickerItem[]> {
  const subgroupIds = await resolvePickerSubgroupIds(client, kind);

  const records = await client.accountMaster.findMany({
    where: {
      isArchived: false,
      ...(pettyCashOnly ? { pettyCash: true } : {}),
      ...(activeOnly ? { isActive: true } : {}),
      ...(subgroupIds ? { subgroupId: { in: subgroupIds } } : {}),
      ...(query.trim()
        ? {
            OR: [
              { particulars: { contains: query.trim() } },
              { shortCode: { contains: query.trim().toUpperCase() } },
            ],
          }
        : {}),
    },
    include: {
      subgroup: { include: { group: { include: { category: true } } } },
    },
    orderBy: { particulars: 'asc' },
    take: 50,
  });

  return records.map((record) => ({
    id: record.id,
    particulars: record.particulars,
    shortCode: record.shortCode,
    subgroupName: record.subgroup.subgroupName,
    groupName: record.subgroup.group.groupName,
    categoryName: record.subgroup.group.category.name,
    label: record.shortCode
      ? `${record.particulars} (${record.shortCode})`
      : record.particulars,
    ...(kind === 'MEMBER' && record.memberSubsidiaryId
      ? { memberId: record.memberSubsidiaryId }
      : {}),
  }));
}

export async function searchGroupsForPicker(
  client: PrismaClient,
  query: string,
  categoryId?: AccountCategoryType,
): Promise<AccountPickerItem[]> {
  const records = await client.accountGroup.findMany({
    where: {
      ...(categoryId ? { categoryId: categoryId as PrismaAccountCategoryType } : {}),
      ...(query.trim() ? { groupName: { contains: query.trim() } } : {}),
    },
    include: { category: true },
    orderBy: { balanceSheetSr: 'asc' },
    take: 50,
  });

  return records.map((record) => ({
    id: record.id,
    particulars: record.groupName,
    shortCode: null,
    subgroupName: '',
    groupName: record.groupName,
    categoryName: record.category.name,
    label: `${record.category.name} → ${record.groupName}`,
  }));
}

export async function searchSubgroupsForPicker(
  client: PrismaClient,
  query: string,
  groupId?: string,
): Promise<AccountPickerItem[]> {
  const records = await client.accountSubgroup.findMany({
    where: {
      ...(groupId ? { groupId } : {}),
      ...(query.trim() ? { subgroupName: { contains: query.trim() } } : {}),
    },
    include: { group: { include: { category: true } } },
    orderBy: { subgroupSr: 'asc' },
    take: 50,
  });

  return records.map((record) => ({
    id: record.id,
    particulars: record.subgroupName,
    shortCode: null,
    subgroupName: record.subgroupName,
    groupName: record.group.groupName,
    categoryName: record.group.category.name,
    label: `${record.group.groupName} → ${record.subgroupName}`,
  }));
}

/** Phase 6 — auto-create member subsidiary ledger under Member Subgroup */
export async function createMemberSubsidiaryLedger(
  client: PrismaClient,
  member: { id: string; memberName: string; unitNo: string },
  actorId: string,
): Promise<AccountMasterDto | null> {
  const existing = await client.accountMaster.findFirst({
    where: { memberSubsidiaryId: member.id },
  });
  if (existing) {
    return mapAccount(existing);
  }

  const parameters = await client.societyParameters.findFirst();
  if (!parameters?.memberSubgroupId) {
    return null;
  }

  const particulars = `${member.memberName} (${member.unitNo})`;
  const created = await client.accountMaster.create({
    data: {
      subgroupId: parameters.memberSubgroupId,
      particulars,
      memberSubsidiaryId: member.id,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  return mapAccount(created);
}

export async function hasPostedVoucherReferences(
  client: PrismaClient,
  accountId: string,
  financialYearId?: string,
): Promise<boolean> {
  const count = await client.voucherLine.count({
    where: {
      accountMasterId: accountId,
      voucher: {
        status: VoucherStatus.POSTED,
        ...(financialYearId ? { financialYearId } : {}),
      },
    },
  });
  return count > 0;
}
