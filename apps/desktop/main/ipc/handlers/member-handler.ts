import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { app, dialog } from 'electron';
import { PermissionAction } from '@sams/shared-types';
import type {
  MemberAddressDto,
  MemberDependentDto,
  MemberDto,
  MemberFullDto,
  MemberHousingLoanDto,
  MemberIdentificationDto,
  MemberListItemDto,
  MemberNomineeDto,
  MemberOpeningBalanceResult,
  MemberOpeningBalanceSaveDto,
  MemberPersonalDto,
  MemberShareDto,
  MemberVehicleDto,
  TenantDto,
  TenantOccupancyResult,
  TenantSaveDto,
  UnitVacancyResult,
} from '@sams/shared-types';
import {
  archiveTenant,
  checkUnitVacancy,
  disposeMember,
  getMember,
  getTenantHistory,
  listMembers,
  listTenants,
  saveMemberAddress,
  saveMemberDependents,
  saveMemberHousingLoans,
  saveMemberIdentification,
  saveMemberNominees,
  saveMemberOpeningBalance,
  saveMemberPersonal,
  saveMemberShares,
  saveMemberVehicles,
  saveTenant,
  uploadMemberPhoto,
  validateTenantForOccupancy,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

function requireFinancialYearId(): string {
  const fyId = sessionManager.get().financialYearId;
  if (!fyId) throw new Error('Financial year context is required.');
  return fyId;
}

function memberPhotosDir(): string {
  const dbPath = sessionManager.get().databasePath;
  const base = dbPath ? join(dirname(dbPath), 'member-photos') : join(app.getPath('userData'), 'member-photos');
  return base;
}

export const memberHandlers = {
  listMembers: (async (
    _ctx,
    payload: {
      buildingId?: string;
      wingId?: string;
      status?: 'active' | 'disposed' | 'all';
      filter?: string;
    },
  ) => listMembers(getActivePrisma(), payload)) as IpcHandler<
    {
      buildingId?: string;
      wingId?: string;
      status?: 'active' | 'disposed' | 'all';
      filter?: string;
    },
    { items: MemberListItemDto[]; total: number }
  >,

  getMember: (async (_ctx, payload: { id: string }) =>
    getMember(getActivePrisma(), payload.id)) as IpcHandler<{ id: string }, MemberFullDto>,

  saveIdentification: (async (_ctx, payload: MemberIdentificationDto) =>
    saveMemberIdentification(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    MemberIdentificationDto,
    MemberDto
  >,

  savePersonal: (async (_ctx, payload: MemberPersonalDto) =>
    saveMemberPersonal(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    MemberPersonalDto,
    MemberDto
  >,

  saveAddress: (async (_ctx, payload: MemberAddressDto) =>
    saveMemberAddress(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    MemberAddressDto,
    MemberDto
  >,

  saveDependents: (async (_ctx, payload: { memberId: string; rows: MemberDependentDto[] }) =>
    saveMemberDependents(getActivePrisma(), payload.memberId, payload.rows, requireUserId())) as IpcHandler<
    { memberId: string; rows: MemberDependentDto[] },
    MemberDependentDto[]
  >,

  saveNominees: (async (_ctx, payload: { memberId: string; rows: MemberNomineeDto[] }) =>
    saveMemberNominees(getActivePrisma(), payload.memberId, payload.rows, requireUserId())) as IpcHandler<
    { memberId: string; rows: MemberNomineeDto[] },
    MemberNomineeDto[]
  >,

  saveVehicles: (async (_ctx, payload: { memberId: string; rows: MemberVehicleDto[] }) =>
    saveMemberVehicles(getActivePrisma(), payload.memberId, payload.rows, requireUserId())) as IpcHandler<
    { memberId: string; rows: MemberVehicleDto[] },
    MemberVehicleDto[]
  >,

  saveShares: (async (_ctx, payload: { memberId: string; rows: MemberShareDto[] }) =>
    saveMemberShares(getActivePrisma(), payload.memberId, payload.rows, requireUserId())) as IpcHandler<
    { memberId: string; rows: MemberShareDto[] },
    MemberShareDto[]
  >,

  saveHousingLoans: (async (_ctx, payload: { memberId: string; rows: MemberHousingLoanDto[] }) =>
    saveMemberHousingLoans(getActivePrisma(), payload.memberId, payload.rows, requireUserId())) as IpcHandler<
    { memberId: string; rows: MemberHousingLoanDto[] },
    MemberHousingLoanDto[]
  >,

  dispose: (async (_ctx, payload: { id: string; disposeDate: string; reason?: string }) =>
    disposeMember(getActivePrisma(), payload.id, payload.disposeDate, payload.reason, requireUserId())) as IpcHandler<
    { id: string; disposeDate: string; reason?: string },
    MemberDto
  >,

  checkUnitVacancy: (async (_ctx, payload: { unitId: string; excludeMemberId?: string }) =>
    checkUnitVacancy(getActivePrisma(), payload.unitId, payload.excludeMemberId)) as IpcHandler<
    { unitId: string; excludeMemberId?: string },
    UnitVacancyResult
  >,

  saveOpeningBalance: (async (_ctx, payload: MemberOpeningBalanceSaveDto) =>
    saveMemberOpeningBalance(
      getActivePrisma(),
      payload,
      requireFinancialYearId(),
      requireUserId(),
    )) as IpcHandler<MemberOpeningBalanceSaveDto, MemberOpeningBalanceResult>,

  uploadPhoto: (async (_ctx, payload: { memberId: string; filePath?: string }) => {
    let sourcePath = payload.filePath;
    if (!sourcePath) {
      const result = await dialog.showOpenDialog({
        title: 'Select Member Photo',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { photographPath: null };
      }
      sourcePath = result.filePaths[0];
    }

    const photosDir = memberPhotosDir();
    await mkdir(photosDir, { recursive: true });

    const updated = await uploadMemberPhoto(
      getActivePrisma(),
      payload.memberId,
      sourcePath,
      photosDir,
      requireUserId(),
    );
    return updated;
  }) as IpcHandler<{ memberId: string; filePath?: string }, { photographPath: string | null }>,

  listTenants: (async (_ctx, payload: { unitId?: string; activeOnly?: boolean }) =>
    listTenants(getActivePrisma(), payload)) as IpcHandler<
    { unitId?: string; activeOnly?: boolean },
    TenantDto[]
  >,

  getTenantHistory: (async (_ctx, payload: { unitId: string }) =>
    getTenantHistory(getActivePrisma(), payload.unitId)) as IpcHandler<{ unitId: string }, TenantDto[]>,

  saveTenant: (async (_ctx, payload: TenantSaveDto) =>
    saveTenant(getActivePrisma(), payload, requireUserId())) as IpcHandler<TenantSaveDto, TenantDto>,

  archiveTenant: (async (_ctx, payload: { id: string }) =>
    archiveTenant(getActivePrisma(), payload.id, requireUserId())) as IpcHandler<
    { id: string },
    TenantDto
  >,

  validateForOccupancy: (async (_ctx, payload: { unitId: string }) =>
    validateTenantForOccupancy(getActivePrisma(), payload.unitId)) as IpcHandler<
    { unitId: string },
    TenantOccupancyResult
  >,
};

export const memberReadOptions = {
  resource: 'members',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const memberWriteOptions = {
  resource: 'members',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const memberCreateOptions = {
  resource: 'members',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};

export const memberDeleteOptions = {
  resource: 'members',
  action: PermissionAction.DELETE,
  requireDatabase: true,
};
