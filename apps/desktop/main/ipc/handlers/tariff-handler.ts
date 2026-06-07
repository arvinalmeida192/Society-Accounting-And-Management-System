import { PermissionAction } from '@sams/shared-types';
import type {
  TariffBillRegisterMappingDto,
  TariffBillRegisterMappingSaveDto,
  TariffDefinitionDto,
  TariffDefinitionSaveDto,
  TariffLineDto,
  TariffResolveResult,
  TariffScopeLevel,
  TariffSettlementSequenceDto,
  TariffSettlementSequenceSaveDto,
} from '@sams/shared-types';
import {
  cloneTariffDefinition,
  getSettlementSequence,
  getTariffDefinition,
  listBillRegisterMapping,
  listSettlementSequences,
  listTariffDefinitions,
  reorderTariffLines,
  resolveTariffForMember,
  saveBillRegisterMapping,
  saveSettlementSequence,
  saveTariffDefinition,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const tariffHandlers = {
  listDefinitions: (async (_ctx, payload: { scopeLevel?: TariffScopeLevel; asOfDate?: string }) =>
    listTariffDefinitions(getActivePrisma(), payload)) as IpcHandler<
    { scopeLevel?: TariffScopeLevel; asOfDate?: string },
    TariffDefinitionDto[]
  >,

  getDefinition: (async (_ctx, payload: { id: string }) =>
    getTariffDefinition(getActivePrisma(), payload.id)) as IpcHandler<
    { id: string },
    TariffDefinitionDto
  >,

  saveDefinition: (async (_ctx, payload: TariffDefinitionSaveDto) =>
    saveTariffDefinition(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    TariffDefinitionSaveDto,
    TariffDefinitionDto
  >,

  cloneDefinition: (async (_ctx, payload: { sourceId: string; newEffectiveDate: string }) =>
    cloneTariffDefinition(
      getActivePrisma(),
      payload.sourceId,
      payload.newEffectiveDate,
      requireUserId(),
    )) as IpcHandler<{ sourceId: string; newEffectiveDate: string }, TariffDefinitionDto>,

  reorderLines: (async (_ctx, payload: { definitionId: string; lineIds: string[] }) =>
    reorderTariffLines(
      getActivePrisma(),
      payload.definitionId,
      payload.lineIds,
      requireUserId(),
    )) as IpcHandler<{ definitionId: string; lineIds: string[] }, TariffLineDto[]>,

  resolveForMember: (async (_ctx, payload: { memberId: string; billDate: string }) =>
    resolveTariffForMember(getActivePrisma(), payload.memberId, payload.billDate)) as IpcHandler<
    { memberId: string; billDate: string },
    TariffResolveResult
  >,

  listSettlementSequences: (async () =>
    listSettlementSequences(getActivePrisma())) as IpcHandler<Record<string, never>, TariffSettlementSequenceDto[]>,

  getSettlementSequence: (async (_ctx, payload: { id: string }) =>
    getSettlementSequence(getActivePrisma(), payload.id)) as IpcHandler<
    { id: string },
    TariffSettlementSequenceDto
  >,

  saveSettlementSequence: (async (_ctx, payload: TariffSettlementSequenceSaveDto) =>
    saveSettlementSequence(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    TariffSettlementSequenceSaveDto,
    TariffSettlementSequenceDto
  >,

  listBillRegisterMapping: (async () =>
    listBillRegisterMapping(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    TariffBillRegisterMappingDto[]
  >,

  saveBillRegisterMapping: (async (_ctx, payload: TariffBillRegisterMappingSaveDto) =>
    saveBillRegisterMapping(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    TariffBillRegisterMappingSaveDto,
    TariffBillRegisterMappingDto[]
  >,
};

export const tariffReadOptions = {
  resource: 'billing',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const tariffWriteOptions = {
  resource: 'billing',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const tariffCreateOptions = {
  resource: 'billing',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};
