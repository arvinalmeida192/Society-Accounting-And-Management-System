import { PermissionAction } from '@sams/shared-types';
import type {
  AddressBookEntryDto,
  BankMasterDto,
  BankMicrCodeDto,
  ChequeCancellationReasonDto,
  ContractorDetailDto,
  DishonouredChequeDto,
  MicrLookupResult,
  NarrationMasterDto,
  VoucherType,
} from '@sams/shared-types';
import {
  deleteAddressBookEntry,
  deleteBank,
  deleteChequeReason,
  deleteContractor,
  deleteMicrCode,
  deleteNarration,
  getBank,
  listAddressBook,
  listBanks,
  listChequeReasons,
  listContractors,
  listDishonouredCheques,
  listMicrCodes,
  listNarrations,
  lookupMicr,
  saveAddressBookEntry,
  saveBank,
  saveChequeReason,
  saveContractor,
  saveMicrCode,
  saveNarration,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const mastersHandlers = {
  listBanks: (async (_ctx, payload: { filter?: string }) =>
    listBanks(getActivePrisma(), payload.filter)) as IpcHandler<{ filter?: string }, BankMasterDto[]>,

  getBank: (async (_ctx, payload: { id: string }) =>
    getBank(getActivePrisma(), payload.id)) as IpcHandler<{ id: string }, BankMasterDto>,

  saveBank: (async (_ctx, payload: Parameters<typeof saveBank>[1]) =>
    saveBank(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveBank>[1],
    BankMasterDto
  >,

  deleteBank: (async (_ctx, payload: { id: string }) => {
    await deleteBank(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  listMicr: (async (_ctx, payload: { bankMasterId: string }) =>
    listMicrCodes(getActivePrisma(), payload.bankMasterId)) as IpcHandler<
    { bankMasterId: string },
    BankMicrCodeDto[]
  >,

  saveMicr: (async (_ctx, payload: Parameters<typeof saveMicrCode>[1]) =>
    saveMicrCode(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveMicrCode>[1],
    BankMicrCodeDto
  >,

  deleteMicr: (async (_ctx, payload: { id: string }) => {
    await deleteMicrCode(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  lookupMicr: (async (_ctx, payload: { micrCode: string }) =>
    lookupMicr(getActivePrisma(), payload.micrCode)) as IpcHandler<
    { micrCode: string },
    MicrLookupResult | null
  >,

  listNarrations: (async (_ctx, payload: { voucherTableType?: VoucherType }) =>
    listNarrations(getActivePrisma(), payload.voucherTableType)) as IpcHandler<
    { voucherTableType?: VoucherType },
    NarrationMasterDto[]
  >,

  saveNarration: (async (_ctx, payload: Parameters<typeof saveNarration>[1]) =>
    saveNarration(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveNarration>[1],
    NarrationMasterDto
  >,

  deleteNarration: (async (_ctx, payload: { id: string }) => {
    await deleteNarration(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  listAddressBook: (async (_ctx, payload: { filter?: string }) =>
    listAddressBook(getActivePrisma(), payload.filter)) as IpcHandler<
    { filter?: string },
    AddressBookEntryDto[]
  >,

  saveAddressBook: (async (_ctx, payload: Parameters<typeof saveAddressBookEntry>[1]) =>
    saveAddressBookEntry(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveAddressBookEntry>[1],
    AddressBookEntryDto
  >,

  deleteAddressBook: (async (_ctx, payload: { id: string }) => {
    await deleteAddressBookEntry(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  listChequeReasons: (async () => listChequeReasons(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    ChequeCancellationReasonDto[]
  >,

  saveChequeReason: (async (_ctx, payload: Parameters<typeof saveChequeReason>[1]) =>
    saveChequeReason(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveChequeReason>[1],
    ChequeCancellationReasonDto
  >,

  deleteChequeReason: (async (_ctx, payload: { id: string }) => {
    await deleteChequeReason(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  listDishonoured: (async (_ctx, payload: { reasonId: string }) =>
    listDishonouredCheques(getActivePrisma(), payload.reasonId)) as IpcHandler<
    { reasonId: string },
    DishonouredChequeDto[]
  >,

  listContractors: (async (_ctx, payload: { filter?: string }) =>
    listContractors(getActivePrisma(), payload.filter)) as IpcHandler<
    { filter?: string },
    ContractorDetailDto[]
  >,

  saveContractor: (async (_ctx, payload: Parameters<typeof saveContractor>[1]) =>
    saveContractor(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    Parameters<typeof saveContractor>[1],
    ContractorDetailDto
  >,

  deleteContractor: (async (_ctx, payload: { id: string }) => {
    await deleteContractor(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,
};

export const mastersReadOptions = {
  resource: 'masters',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const mastersWriteOptions = {
  resource: 'masters',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const mastersCreateOptions = {
  resource: 'masters',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};

export const mastersDeleteOptions = {
  resource: 'masters',
  action: PermissionAction.DELETE,
  requireDatabase: true,
};
