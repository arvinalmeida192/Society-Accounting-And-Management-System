import { PermissionAction, type ReferenceMasterType } from '@sams/shared-types';
import {
  addParkingTariffRate,
  archiveUnit,
  calculateParkingCharges,
  deleteBuilding,
  deleteWing,
  getBuilding,
  getUnit,
  listBuildings,
  listParkingAssignments,
  listParkingSpaces,
  listParkingTariffTypes,
  listReferenceMasters,
  listTariffRates,
  listUnits,
  listWings,
  saveBuilding,
  saveParkingAssignment,
  saveParkingSpace,
  saveParkingTariffType,
  saveReferenceMaster,
  saveUnit,
  saveWing,
  validateUnitNo,
  getSocietyParameters,
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

export const propertyHandlers = {
  listBuildings: (async (_ctx, payload: { filter?: string }) =>
    listBuildings(getActivePrisma(), requireFinancialYearId(), payload.filter)) as IpcHandler<
    { filter?: string },
    Awaited<ReturnType<typeof listBuildings>>
  >,

  getBuilding: (async (_ctx, payload: { id: string }) =>
    getBuilding(getActivePrisma(), payload.id)) as IpcHandler<
    { id: string },
    Awaited<ReturnType<typeof getBuilding>>
  >,

  saveBuilding: (async (_ctx, payload: Parameters<typeof saveBuilding>[1]) =>
    saveBuilding(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveBuilding>[1],
    Awaited<ReturnType<typeof saveBuilding>>
  >,

  deleteBuilding: (async (_ctx, payload: { id: string }) =>
    deleteBuilding(getActivePrisma(), payload.id, requireUserId())) as IpcHandler<
    { id: string },
    Awaited<ReturnType<typeof deleteBuilding>>
  >,

  listWings: (async (_ctx, payload: { buildingId: string }) =>
    listWings(getActivePrisma(), payload.buildingId)) as IpcHandler<
    { buildingId: string },
    Awaited<ReturnType<typeof listWings>>
  >,

  saveWing: (async (_ctx, payload: Parameters<typeof saveWing>[1]) =>
    saveWing(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveWing>[1],
    Awaited<ReturnType<typeof saveWing>>
  >,

  deleteWing: (async (_ctx, payload: { id: string }) =>
    deleteWing(getActivePrisma(), payload.id, requireUserId())) as IpcHandler<
    { id: string },
    Awaited<ReturnType<typeof deleteWing>>
  >,

  listUnits: (async (
    _ctx,
    payload: { buildingId?: string; wingId?: string; filter?: string },
  ) =>
    listUnits(getActivePrisma(), {
      buildingId: payload.buildingId,
      wingId: payload.wingId,
      search: payload.filter,
    })) as IpcHandler<
    { buildingId?: string; wingId?: string; filter?: string },
    Awaited<ReturnType<typeof listUnits>>
  >,

  getUnit: (async (_ctx, payload: { id: string }) =>
    getUnit(getActivePrisma(), payload.id)) as IpcHandler<
    { id: string },
    Awaited<ReturnType<typeof getUnit>>
  >,

  saveUnit: (async (_ctx, payload: Parameters<typeof saveUnit>[1]) =>
    saveUnit(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveUnit>[1],
    Awaited<ReturnType<typeof saveUnit>>
  >,

  archiveUnit: (async (_ctx, payload: { id: string }) =>
    archiveUnit(getActivePrisma(), payload.id, requireUserId())) as IpcHandler<
    { id: string },
    Awaited<ReturnType<typeof archiveUnit>>
  >,

  validateUnitNo: (async (
    _ctx,
    payload: { buildingId: string; wingId: string; unitNo: string; excludeId?: string },
  ) => validateUnitNo(
    getActivePrisma(),
    payload.buildingId,
    payload.wingId,
    payload.unitNo,
    payload.excludeId,
  )) as IpcHandler<
    { buildingId: string; wingId: string; unitNo: string; excludeId?: string },
    Awaited<ReturnType<typeof validateUnitNo>>
  >,

  listReferenceMasters: (async (_ctx, payload: { type: ReferenceMasterType }) =>
    listReferenceMasters(getActivePrisma(), payload.type)) as IpcHandler<
    { type: ReferenceMasterType },
    Awaited<ReturnType<typeof listReferenceMasters>>
  >,

  saveReferenceMaster: (async (
    _ctx,
    payload: { type: ReferenceMasterType; data: Record<string, unknown> },
  ) => saveReferenceMaster(getActivePrisma(), payload.type, payload.data, requireUserId())) as IpcHandler<
    { type: ReferenceMasterType; data: Record<string, unknown> },
    unknown
  >,

  listParkingTariffTypes: (async () =>
    listParkingTariffTypes(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    Awaited<ReturnType<typeof listParkingTariffTypes>>
  >,

  saveParkingTariffType: (async (_ctx, payload: Parameters<typeof saveParkingTariffType>[1]) =>
    saveParkingTariffType(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveParkingTariffType>[1],
    Awaited<ReturnType<typeof saveParkingTariffType>>
  >,

  addParkingTariffRate: (async (
    _ctx,
    payload: { typeId: string; effectiveDate: string; monthlyRate: number },
  ) =>
    addParkingTariffRate(
      getActivePrisma(),
      payload.typeId,
      payload.effectiveDate,
      payload.monthlyRate,
      requireUserId(),
    )) as IpcHandler<
    { typeId: string; effectiveDate: string; monthlyRate: number },
    Awaited<ReturnType<typeof addParkingTariffRate>>
  >,

  listTariffRates: (async (_ctx, payload: { typeId: string }) =>
    listTariffRates(getActivePrisma(), payload.typeId)) as IpcHandler<
    { typeId: string },
    Awaited<ReturnType<typeof listTariffRates>>
  >,

  listParkingSpaces: (async (_ctx, payload: { filter?: string }) =>
    listParkingSpaces(getActivePrisma(), payload.filter)) as IpcHandler<
    { filter?: string },
    Awaited<ReturnType<typeof listParkingSpaces>>
  >,

  saveParkingSpace: (async (_ctx, payload: Parameters<typeof saveParkingSpace>[1]) =>
    saveParkingSpace(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveParkingSpace>[1],
    Awaited<ReturnType<typeof saveParkingSpace>>
  >,

  listParkingAssignments: (async (_ctx, payload: { memberId?: string }) =>
    listParkingAssignments(getActivePrisma(), payload.memberId)) as IpcHandler<
    { memberId?: string },
    Awaited<ReturnType<typeof listParkingAssignments>>
  >,

  saveParkingAssignment: (async (_ctx, payload: Parameters<typeof saveParkingAssignment>[1]) =>
    saveParkingAssignment(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveParkingAssignment>[1],
    Awaited<ReturnType<typeof saveParkingAssignment>>
  >,

  calculateForBill: (async (_ctx, payload: { memberId: string; billDate: string }) => {
    const params = await getSocietyParameters(getActivePrisma());
    return calculateParkingCharges(
      getActivePrisma(),
      payload.memberId,
      new Date(payload.billDate),
      params.mergeParkingOnBill,
      params.tariffDecimalPlaces,
    );
  }) as IpcHandler<
    { memberId: string; billDate: string },
    Awaited<ReturnType<typeof calculateParkingCharges>>
  >,
};

export const propertyReadOptions = {
  resource: 'property',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const propertyWriteOptions = {
  resource: 'property',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const propertyCreateOptions = {
  resource: 'property',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};

export const propertyDeleteOptions = {
  resource: 'property',
  action: PermissionAction.DELETE,
  requireDatabase: true,
};
