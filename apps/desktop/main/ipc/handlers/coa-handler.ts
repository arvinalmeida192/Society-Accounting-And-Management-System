import {
  AccountCategoryType,
  PermissionAction,
  type AccountGroupDto,
  type AccountMasterDetailDto,
  type AccountMasterDto,
  type AccountMasterSaveDto,
  type AccountSubgroupDto,
  type ArchiveAccountResult,
  type CoaPickerKind,
  type CoaTreeNode,
  type AccountPickerItem,
} from '@sams/shared-types';
import {
  archiveAccountMaster,
  getAccountMaster,
  getCoaTree,
  listAccountGroups,
  listAccountMasters,
  listAccountSubgroups,
  saveAccountGroup,
  saveAccountMaster,
  saveAccountSubgroup,
  searchAccountsForPicker,
  searchGroupsForPicker,
  searchSubgroupsForPicker,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) {
    throw new Error('User session is required.');
  }
  return userId;
}

function requireFinancialYearId(): string | undefined {
  return sessionManager.get().financialYearId ?? undefined;
}

export const coaHandlers = {
  getTree: (async (_ctx, payload: { includeInactive?: boolean }) =>
    getCoaTree(getActivePrisma(), payload.includeInactive ?? false)) as IpcHandler<
    { includeInactive?: boolean },
    CoaTreeNode[]
  >,

  listGroups: (async (_ctx, payload: { categoryId?: AccountCategoryType }) =>
    listAccountGroups(getActivePrisma(), payload.categoryId)) as IpcHandler<
    { categoryId?: AccountCategoryType },
    AccountGroupDto[]
  >,

  saveGroup: (async (_ctx, payload: AccountGroupDto) =>
    saveAccountGroup(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    AccountGroupDto,
    AccountGroupDto
  >,

  listSubgroups: (async (_ctx, payload: { groupId: string }) =>
    listAccountSubgroups(getActivePrisma(), payload.groupId)) as IpcHandler<
    { groupId: string },
    AccountSubgroupDto[]
  >,

  saveSubgroup: (async (_ctx, payload: AccountSubgroupDto) =>
    saveAccountSubgroup(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    AccountSubgroupDto,
    AccountSubgroupDto
  >,

  listAccounts: (async (_ctx, payload: { subgroupId?: string; filter?: string }) =>
    listAccountMasters(getActivePrisma(), payload.subgroupId, payload.filter)) as IpcHandler<
    { subgroupId?: string; filter?: string },
    AccountMasterDto[]
  >,

  getAccount: (async (_ctx, payload: { id: string }) =>
    getAccountMaster(getActivePrisma(), payload.id, requireFinancialYearId())) as IpcHandler<
    { id: string },
    AccountMasterDetailDto
  >,

  saveAccount: (async (_ctx, payload: AccountMasterSaveDto) =>
    saveAccountMaster(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    AccountMasterSaveDto,
    AccountMasterDto
  >,

  archiveAccount: (async (_ctx, payload: { id: string }) =>
    archiveAccountMaster(
      getActivePrisma(),
      payload.id,
      requireUserId(),
      requireFinancialYearId(),
    )) as IpcHandler<{ id: string }, ArchiveAccountResult>,

  searchForPicker: (async (
    _ctx,
    payload: {
      query: string;
      kind?: CoaPickerKind;
      activeOnly?: boolean;
      categoryId?: AccountCategoryType;
      groupId?: string;
    },
  ) => {
    const kind = payload.kind ?? 'ACCOUNT';
    if (kind === 'GROUP') {
      return searchGroupsForPicker(getActivePrisma(), payload.query, payload.categoryId);
    }
    if (kind === 'SUBGROUP') {
      return searchSubgroupsForPicker(getActivePrisma(), payload.query, payload.groupId);
    }
    return searchAccountsForPicker(
      getActivePrisma(),
      payload.query,
      kind,
      payload.activeOnly ?? true,
    );
  }) as IpcHandler<
    {
      query: string;
      kind?: CoaPickerKind;
      activeOnly?: boolean;
      categoryId?: AccountCategoryType;
      groupId?: string;
    },
    AccountPickerItem[]
  >,

  searchMembers: (async (_ctx, payload: { query: string }) =>
    searchAccountsForPicker(getActivePrisma(), payload.query, 'MEMBER', true)) as IpcHandler<
    { query: string },
    AccountPickerItem[]
  >,

  searchBanks: (async (_ctx, payload: { query: string }) =>
    searchAccountsForPicker(getActivePrisma(), payload.query, 'BANK', true)) as IpcHandler<
    { query: string },
    AccountPickerItem[]
  >,
};

export const coaReadOptions = {
  resource: 'accounting.coa',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const coaWriteOptions = {
  resource: 'accounting.coa',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const coaCreateOptions = {
  resource: 'accounting.coa',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};

export const coaDeleteOptions = {
  resource: 'accounting.coa',
  action: PermissionAction.DELETE,
  requireDatabase: true,
};
