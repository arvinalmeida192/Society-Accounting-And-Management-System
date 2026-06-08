import { PermissionAction } from '@sams/shared-types';
import type {
  FdRegisterDto,
  FdStatus,
  IFormRegisterDto,
  IFormShareEntryDto,
  IFormShareTransferDto,
  PropertyRegisterEntryDto,
  SinkingFundEntryDto,
  UpcomingFdMaturityDto,
} from '@sams/shared-types';
import {
  deleteFdRegister,
  deleteIFormRegister,
  deleteIFormShareEntry,
  deleteIFormShareTransfer,
  deletePropertyRegisterEntry,
  getFdRegister,
  getIFormRegister,
  getPropertyRegisterEntry,
  listFdRegister,
  listIFormRegisters,
  listPropertyRegister,
  listSinkingFundEntries,
  listUpcomingFdMaturities,
  saveFdRegister,
  saveIFormRegister,
  saveIFormShareEntry,
  saveIFormShareTransfer,
  savePropertyRegisterEntry,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const registersHandlers = {
  listFd: (async (_ctx, payload: { status?: FdStatus; search?: string }) =>
    listFdRegister(getActivePrisma(), payload)) as IpcHandler<
    { status?: FdStatus; search?: string },
    FdRegisterDto[]
  >,

  getFd: (async (_ctx, payload: { id: string }) =>
    getFdRegister(getActivePrisma(), payload.id)) as IpcHandler<{ id: string }, FdRegisterDto>,

  saveFd: (async (_ctx, payload: FdRegisterDto) =>
    saveFdRegister(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    FdRegisterDto,
    FdRegisterDto
  >,

  deleteFd: (async (_ctx, payload: { id: string }) => {
    await deleteFdRegister(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  upcomingFdMaturities: (async (_ctx, payload: { daysAhead?: number }) =>
    listUpcomingFdMaturities(getActivePrisma(), payload.daysAhead ?? 30)) as IpcHandler<
    { daysAhead?: number },
    UpcomingFdMaturityDto[]
  >,

  listProperty: (async (_ctx, payload: { filter?: string }) =>
    listPropertyRegister(getActivePrisma(), payload.filter)) as IpcHandler<
    { filter?: string },
    PropertyRegisterEntryDto[]
  >,

  getProperty: (async (_ctx, payload: { id: string }) =>
    getPropertyRegisterEntry(getActivePrisma(), payload.id)) as IpcHandler<
    { id: string },
    PropertyRegisterEntryDto
  >,

  saveProperty: (async (_ctx, payload: PropertyRegisterEntryDto) =>
    savePropertyRegisterEntry(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    PropertyRegisterEntryDto,
    PropertyRegisterEntryDto
  >,

  deleteProperty: (async (_ctx, payload: { id: string }) => {
    await deletePropertyRegisterEntry(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  listSinkingFund: (async (
    _ctx,
    payload: { memberId?: string; dateFrom?: string; dateTo?: string },
  ) => listSinkingFundEntries(getActivePrisma(), payload)) as IpcHandler<
    { memberId?: string; dateFrom?: string; dateTo?: string },
    SinkingFundEntryDto[]
  >,

  listIForm: (async (_ctx, payload: { filter?: string }) =>
    listIFormRegisters(getActivePrisma(), payload.filter)) as IpcHandler<
    { filter?: string },
    IFormRegisterDto[]
  >,

  getIForm: (async (_ctx, payload: { id: string }) =>
    getIFormRegister(getActivePrisma(), payload.id)) as IpcHandler<{ id: string }, IFormRegisterDto>,

  saveIForm: (async (_ctx, payload: IFormRegisterDto) =>
    saveIFormRegister(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    IFormRegisterDto,
    IFormRegisterDto
  >,

  deleteIForm: (async (_ctx, payload: { id: string }) => {
    await deleteIFormRegister(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  saveIFormShare: (async (_ctx, payload: IFormShareEntryDto) =>
    saveIFormShareEntry(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    IFormShareEntryDto,
    IFormShareEntryDto
  >,

  deleteIFormShare: (async (_ctx, payload: { id: string }) => {
    await deleteIFormShareEntry(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  saveIFormTransfer: (async (_ctx, payload: IFormShareTransferDto) =>
    saveIFormShareTransfer(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    IFormShareTransferDto,
    IFormShareTransferDto
  >,

  deleteIFormTransfer: (async (_ctx, payload: { id: string }) => {
    await deleteIFormShareTransfer(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,
};

export const registersReadOptions = {
  resource: 'statutory',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const registersWriteOptions = {
  resource: 'statutory',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const registersCreateOptions = {
  resource: 'statutory',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};

export const registersDeleteOptions = {
  resource: 'statutory',
  action: PermissionAction.DELETE,
  requireDatabase: true,
};
