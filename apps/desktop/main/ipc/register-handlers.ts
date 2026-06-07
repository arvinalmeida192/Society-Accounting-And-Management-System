import { ipcMain } from 'electron';
import { IpcChannels, PermissionAction, type IpcRequest } from '@sams/shared-types';
import { AppConfigStore } from '../config/app-config.js';
import { withIpcPipeline } from './pipeline.js';
import {
  authGetSessionOptions,
  authLoginOptions,
  authLogoutOptions,
} from './handlers/auth-handler.js';
import { createStartupHandlers } from './handlers/startup-handler.js';
import {
  societyHandlers,
  societyReadOptions,
  societyUpdateOptions,
} from './handlers/society-handler.js';
import {
  coaHandlers,
  coaCreateOptions,
  coaDeleteOptions,
  coaReadOptions,
  coaWriteOptions,
} from './handlers/coa-handler.js';
import {
  propertyHandlers,
  propertyCreateOptions,
  propertyDeleteOptions,
  propertyReadOptions,
  propertyWriteOptions,
} from './handlers/property-handler.js';
import {
  memberHandlers,
  memberCreateOptions,
  memberDeleteOptions,
  memberReadOptions,
  memberWriteOptions,
} from './handlers/member-handler.js';
import {
  mastersHandlers,
  mastersCreateOptions,
  mastersDeleteOptions,
  mastersReadOptions,
  mastersWriteOptions,
} from './handlers/masters-handler.js';
import {
  tariffHandlers,
  tariffCreateOptions,
  tariffReadOptions,
  tariffWriteOptions,
} from './handlers/tariff-handler.js';
import { sessionManager } from '../session/session-manager.js';

const publicOptions = {
  resource: 'startup',
  action: PermissionAction.READ,
  requireSession: false,
};

export function registerIpcHandlers(appConfig: AppConfigStore): void {
  const startup = createStartupHandlers(appConfig);

  ipcMain.handle(
    IpcChannels.STARTUP_GET_RECENT_DATABASES,
    async (event, request: IpcRequest<Record<string, never>>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.getRecentDatabases,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_VALIDATE_DATABASE,
    async (event, request: IpcRequest<{ path: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.validateDatabase,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_OPEN_DATABASE,
    async (event, request: IpcRequest<{ path: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.openDatabase,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_CREATE_SOCIETY,
    async (event, request: IpcRequest<Parameters<typeof startup.createSociety>[1]>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.createSociety,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_OPEN_NEW_FINANCIAL_YEAR,
    async (event, request: IpcRequest<Parameters<typeof startup.openNewFinancialYear>[1]>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.openNewFinancialYear,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_PICK_OPEN_DATABASE,
    async (event, request: IpcRequest<Record<string, never>>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.pickOpenDatabase,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_PICK_SAVE_DATABASE,
    async (event, request: IpcRequest<{ defaultName?: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...publicOptions,
        handler: startup.pickSaveDatabase,
      }),
  );

  ipcMain.handle(IpcChannels.AUTH_GET_SESSION, async (event, request: IpcRequest<Record<string, never>>) =>
    withIpcPipeline(request, sessionManager.get(), event, authGetSessionOptions),
  );

  ipcMain.handle(IpcChannels.AUTH_LOGIN, async (event, request: IpcRequest<{ username: string; password: string }>) =>
    withIpcPipeline(request, sessionManager.get(), event, authLoginOptions),
  );

  ipcMain.handle(IpcChannels.AUTH_LOGOUT, async (event, request: IpcRequest<Record<string, never>>) =>
    withIpcPipeline(request, sessionManager.get(), event, authLogoutOptions),
  );

  const societyOptions = {
    ...societyReadOptions,
    requireSession: true,
  };

  ipcMain.handle(IpcChannels.SOCIETY_GET_IDENTITY, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.getIdentity,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_UPDATE_IDENTITY, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyUpdateOptions,
      requireSession: true,
      handler: societyHandlers.updateIdentity,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_GET_PARAMETERS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.getParameters,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_UPDATE_PARAMETERS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyUpdateOptions,
      requireSession: true,
      handler: societyHandlers.updateParameters,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_VALIDATE_BILL_FREQUENCY, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.validateBillFrequencyChange,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_GET_PROPERTY_INFO, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.getPropertyInfo,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_UPDATE_PROPERTY_INFO, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyUpdateOptions,
      requireSession: true,
      handler: societyHandlers.updatePropertyInfo,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_GET_REPORT_FORMATS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.getReportFormats,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_UPDATE_REPORT_FORMATS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyUpdateOptions,
      requireSession: true,
      handler: societyHandlers.updateReportFormats,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_LIST_REPORT_TEMPLATES, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      handler: societyHandlers.listReportTemplates,
    }),
  );

  ipcMain.handle(IpcChannels.SOCIETY_GET_INTEREST_HELP, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...societyOptions,
      requireSession: true,
      handler: societyHandlers.getInterestHelpText,
    }),
  );

  const coaOptions = {
    ...coaReadOptions,
    requireSession: true,
  };

  ipcMain.handle(IpcChannels.COA_GET_TREE, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaOptions,
      handler: coaHandlers.getTree,
    }),
  );

  ipcMain.handle(IpcChannels.COA_LIST_GROUPS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaOptions,
      handler: coaHandlers.listGroups,
    }),
  );

  ipcMain.handle(IpcChannels.COA_SAVE_GROUP, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaWriteOptions,
      requireSession: true,
      handler: coaHandlers.saveGroup,
    }),
  );

  ipcMain.handle(IpcChannels.COA_LIST_SUBGROUPS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaOptions,
      handler: coaHandlers.listSubgroups,
    }),
  );

  ipcMain.handle(IpcChannels.COA_SAVE_SUBGROUP, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaWriteOptions,
      requireSession: true,
      handler: coaHandlers.saveSubgroup,
    }),
  );

  ipcMain.handle(IpcChannels.COA_LIST_ACCOUNTS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaOptions,
      handler: coaHandlers.listAccounts,
    }),
  );

  ipcMain.handle(IpcChannels.COA_GET_ACCOUNT, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaOptions,
      handler: coaHandlers.getAccount,
    }),
  );

  ipcMain.handle(IpcChannels.COA_SAVE_ACCOUNT, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaCreateOptions,
      requireSession: true,
      handler: coaHandlers.saveAccount,
    }),
  );

  ipcMain.handle(IpcChannels.COA_ARCHIVE_ACCOUNT, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaDeleteOptions,
      requireSession: true,
      handler: coaHandlers.archiveAccount,
    }),
  );

  ipcMain.handle(IpcChannels.COA_SEARCH_FOR_PICKER, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaOptions,
      handler: coaHandlers.searchForPicker,
    }),
  );

  ipcMain.handle(IpcChannels.COA_SEARCH_MEMBERS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaOptions,
      handler: coaHandlers.searchMembers,
    }),
  );

  ipcMain.handle(IpcChannels.COA_SEARCH_BANKS, async (event, request) =>
    withIpcPipeline(request, sessionManager.get(), event, {
      ...coaOptions,
      handler: coaHandlers.searchBanks,
    }),
  );

  const propertyOptions = { ...propertyReadOptions, requireSession: true };

  const propertyChannels: Array<{
    channel: string;
    options: typeof propertyOptions;
    handler: (typeof propertyHandlers)[keyof typeof propertyHandlers];
  }> = [
    { channel: IpcChannels.BUILDING_LIST, options: propertyOptions, handler: propertyHandlers.listBuildings },
    { channel: IpcChannels.BUILDING_GET, options: propertyOptions, handler: propertyHandlers.getBuilding },
    { channel: IpcChannels.BUILDING_SAVE, options: { ...propertyCreateOptions, requireSession: true }, handler: propertyHandlers.saveBuilding },
    { channel: IpcChannels.BUILDING_DELETE, options: { ...propertyDeleteOptions, requireSession: true }, handler: propertyHandlers.deleteBuilding },
    { channel: IpcChannels.WING_LIST, options: propertyOptions, handler: propertyHandlers.listWings },
    { channel: IpcChannels.WING_SAVE, options: { ...propertyCreateOptions, requireSession: true }, handler: propertyHandlers.saveWing },
    { channel: IpcChannels.WING_DELETE, options: { ...propertyDeleteOptions, requireSession: true }, handler: propertyHandlers.deleteWing },
    { channel: IpcChannels.UNIT_LIST, options: propertyOptions, handler: propertyHandlers.listUnits },
    { channel: IpcChannels.UNIT_GET, options: propertyOptions, handler: propertyHandlers.getUnit },
    { channel: IpcChannels.UNIT_SAVE, options: { ...propertyCreateOptions, requireSession: true }, handler: propertyHandlers.saveUnit },
    { channel: IpcChannels.UNIT_ARCHIVE, options: { ...propertyDeleteOptions, requireSession: true }, handler: propertyHandlers.archiveUnit },
    { channel: IpcChannels.UNIT_VALIDATE_NO, options: propertyOptions, handler: propertyHandlers.validateUnitNo },
    { channel: IpcChannels.REFERENCE_MASTER_LIST, options: propertyOptions, handler: propertyHandlers.listReferenceMasters },
    { channel: IpcChannels.REFERENCE_MASTER_SAVE, options: { ...propertyWriteOptions, requireSession: true }, handler: propertyHandlers.saveReferenceMaster },
    { channel: IpcChannels.PARKING_LIST_TARIFF_TYPES, options: propertyOptions, handler: propertyHandlers.listParkingTariffTypes },
    { channel: IpcChannels.PARKING_SAVE_TARIFF_TYPE, options: { ...propertyCreateOptions, requireSession: true }, handler: propertyHandlers.saveParkingTariffType },
    { channel: IpcChannels.PARKING_ADD_TARIFF_RATE, options: { ...propertyWriteOptions, requireSession: true }, handler: propertyHandlers.addParkingTariffRate },
    { channel: IpcChannels.PARKING_LIST_TARIFF_RATES, options: propertyOptions, handler: propertyHandlers.listTariffRates },
    { channel: IpcChannels.PARKING_LIST_SPACES, options: propertyOptions, handler: propertyHandlers.listParkingSpaces },
    { channel: IpcChannels.PARKING_SAVE_SPACE, options: { ...propertyCreateOptions, requireSession: true }, handler: propertyHandlers.saveParkingSpace },
    { channel: IpcChannels.PARKING_LIST_ASSIGNMENTS, options: propertyOptions, handler: propertyHandlers.listParkingAssignments },
    { channel: IpcChannels.PARKING_SAVE_ASSIGNMENT, options: { ...propertyWriteOptions, requireSession: true }, handler: propertyHandlers.saveParkingAssignment },
    { channel: IpcChannels.PARKING_CALCULATE_FOR_BILL, options: propertyOptions, handler: propertyHandlers.calculateForBill },
  ];

  for (const entry of propertyChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const memberOptions = { ...memberReadOptions, requireSession: true };

  const memberChannels: Array<{
    channel: string;
    options: typeof memberOptions;
    handler: (typeof memberHandlers)[keyof typeof memberHandlers];
  }> = [
    { channel: IpcChannels.MEMBER_LIST, options: memberOptions, handler: memberHandlers.listMembers },
    { channel: IpcChannels.MEMBER_GET, options: memberOptions, handler: memberHandlers.getMember },
    { channel: IpcChannels.MEMBER_SAVE_IDENTIFICATION, options: { ...memberCreateOptions, requireSession: true }, handler: memberHandlers.saveIdentification },
    { channel: IpcChannels.MEMBER_SAVE_PERSONAL, options: { ...memberWriteOptions, requireSession: true }, handler: memberHandlers.savePersonal },
    { channel: IpcChannels.MEMBER_SAVE_ADDRESS, options: { ...memberWriteOptions, requireSession: true }, handler: memberHandlers.saveAddress },
    { channel: IpcChannels.MEMBER_SAVE_DEPENDENTS, options: { ...memberWriteOptions, requireSession: true }, handler: memberHandlers.saveDependents },
    { channel: IpcChannels.MEMBER_SAVE_NOMINEES, options: { ...memberWriteOptions, requireSession: true }, handler: memberHandlers.saveNominees },
    { channel: IpcChannels.MEMBER_SAVE_VEHICLES, options: { ...memberWriteOptions, requireSession: true }, handler: memberHandlers.saveVehicles },
    { channel: IpcChannels.MEMBER_SAVE_SHARES, options: { ...memberWriteOptions, requireSession: true }, handler: memberHandlers.saveShares },
    { channel: IpcChannels.MEMBER_SAVE_HOUSING_LOANS, options: { ...memberWriteOptions, requireSession: true }, handler: memberHandlers.saveHousingLoans },
    { channel: IpcChannels.MEMBER_DISPOSE, options: { ...memberDeleteOptions, requireSession: true }, handler: memberHandlers.dispose },
    { channel: IpcChannels.MEMBER_CHECK_UNIT_VACANCY, options: memberOptions, handler: memberHandlers.checkUnitVacancy },
    { channel: IpcChannels.MEMBER_SAVE_OPENING_BALANCE, options: { ...memberWriteOptions, requireSession: true }, handler: memberHandlers.saveOpeningBalance },
    { channel: IpcChannels.MEMBER_UPLOAD_PHOTO, options: { ...memberWriteOptions, requireSession: true }, handler: memberHandlers.uploadPhoto },
    { channel: IpcChannels.TENANT_LIST, options: memberOptions, handler: memberHandlers.listTenants },
    { channel: IpcChannels.TENANT_GET_HISTORY, options: memberOptions, handler: memberHandlers.getTenantHistory },
    { channel: IpcChannels.TENANT_SAVE, options: { ...memberCreateOptions, requireSession: true }, handler: memberHandlers.saveTenant },
    { channel: IpcChannels.TENANT_ARCHIVE, options: { ...memberDeleteOptions, requireSession: true }, handler: memberHandlers.archiveTenant },
    { channel: IpcChannels.TENANT_VALIDATE_FOR_OCCUPANCY, options: memberOptions, handler: memberHandlers.validateForOccupancy },
  ];

  for (const entry of memberChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const mastersOptions = { ...mastersReadOptions, requireSession: true };

  const mastersChannels: Array<{
    channel: string;
    options: typeof mastersOptions;
    handler: (typeof mastersHandlers)[keyof typeof mastersHandlers];
  }> = [
    { channel: IpcChannels.MASTERS_BANK_LIST, options: mastersOptions, handler: mastersHandlers.listBanks },
    { channel: IpcChannels.MASTERS_BANK_GET, options: mastersOptions, handler: mastersHandlers.getBank },
    { channel: IpcChannels.MASTERS_BANK_SAVE, options: { ...mastersCreateOptions, requireSession: true }, handler: mastersHandlers.saveBank },
    { channel: IpcChannels.MASTERS_BANK_DELETE, options: { ...mastersDeleteOptions, requireSession: true }, handler: mastersHandlers.deleteBank },
    { channel: IpcChannels.MASTERS_BANK_LIST_MICR, options: mastersOptions, handler: mastersHandlers.listMicr },
    { channel: IpcChannels.MASTERS_BANK_SAVE_MICR, options: { ...mastersWriteOptions, requireSession: true }, handler: mastersHandlers.saveMicr },
    { channel: IpcChannels.MASTERS_BANK_DELETE_MICR, options: { ...mastersDeleteOptions, requireSession: true }, handler: mastersHandlers.deleteMicr },
    { channel: IpcChannels.MASTERS_BANK_LOOKUP_MICR, options: mastersOptions, handler: mastersHandlers.lookupMicr },
    { channel: IpcChannels.MASTERS_NARRATION_LIST, options: mastersOptions, handler: mastersHandlers.listNarrations },
    { channel: IpcChannels.MASTERS_NARRATION_SAVE, options: { ...mastersCreateOptions, requireSession: true }, handler: mastersHandlers.saveNarration },
    { channel: IpcChannels.MASTERS_NARRATION_DELETE, options: { ...mastersDeleteOptions, requireSession: true }, handler: mastersHandlers.deleteNarration },
    { channel: IpcChannels.MASTERS_ADDRESS_BOOK_LIST, options: mastersOptions, handler: mastersHandlers.listAddressBook },
    { channel: IpcChannels.MASTERS_ADDRESS_BOOK_SAVE, options: { ...mastersCreateOptions, requireSession: true }, handler: mastersHandlers.saveAddressBook },
    { channel: IpcChannels.MASTERS_ADDRESS_BOOK_DELETE, options: { ...mastersDeleteOptions, requireSession: true }, handler: mastersHandlers.deleteAddressBook },
    { channel: IpcChannels.MASTERS_CHEQUE_REASON_LIST, options: mastersOptions, handler: mastersHandlers.listChequeReasons },
    { channel: IpcChannels.MASTERS_CHEQUE_REASON_SAVE, options: { ...mastersCreateOptions, requireSession: true }, handler: mastersHandlers.saveChequeReason },
    { channel: IpcChannels.MASTERS_CHEQUE_REASON_DELETE, options: { ...mastersDeleteOptions, requireSession: true }, handler: mastersHandlers.deleteChequeReason },
    { channel: IpcChannels.MASTERS_CHEQUE_REASON_LIST_DISHONOURED, options: mastersOptions, handler: mastersHandlers.listDishonoured },
    { channel: IpcChannels.MASTERS_CONTRACTOR_LIST, options: mastersOptions, handler: mastersHandlers.listContractors },
    { channel: IpcChannels.MASTERS_CONTRACTOR_SAVE, options: { ...mastersCreateOptions, requireSession: true }, handler: mastersHandlers.saveContractor },
    { channel: IpcChannels.MASTERS_CONTRACTOR_DELETE, options: { ...mastersDeleteOptions, requireSession: true }, handler: mastersHandlers.deleteContractor },
  ];

  for (const entry of mastersChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const tariffOptions = { ...tariffReadOptions, requireSession: true };

  const tariffChannels: Array<{
    channel: string;
    options: typeof tariffOptions;
    handler: (typeof tariffHandlers)[keyof typeof tariffHandlers];
  }> = [
    { channel: IpcChannels.TARIFF_LIST_DEFINITIONS, options: tariffOptions, handler: tariffHandlers.listDefinitions },
    { channel: IpcChannels.TARIFF_GET_DEFINITION, options: tariffOptions, handler: tariffHandlers.getDefinition },
    { channel: IpcChannels.TARIFF_SAVE_DEFINITION, options: { ...tariffCreateOptions, requireSession: true }, handler: tariffHandlers.saveDefinition },
    { channel: IpcChannels.TARIFF_CLONE_DEFINITION, options: { ...tariffCreateOptions, requireSession: true }, handler: tariffHandlers.cloneDefinition },
    { channel: IpcChannels.TARIFF_REORDER_LINES, options: { ...tariffWriteOptions, requireSession: true }, handler: tariffHandlers.reorderLines },
    { channel: IpcChannels.TARIFF_RESOLVE_FOR_MEMBER, options: tariffOptions, handler: tariffHandlers.resolveForMember },
    { channel: IpcChannels.TARIFF_LIST_SETTLEMENT_SEQUENCES, options: tariffOptions, handler: tariffHandlers.listSettlementSequences },
    { channel: IpcChannels.TARIFF_GET_SETTLEMENT_SEQUENCE, options: tariffOptions, handler: tariffHandlers.getSettlementSequence },
    { channel: IpcChannels.TARIFF_SAVE_SETTLEMENT_SEQUENCE, options: { ...tariffCreateOptions, requireSession: true }, handler: tariffHandlers.saveSettlementSequence },
    { channel: IpcChannels.TARIFF_LIST_BILL_REGISTER_MAPPING, options: tariffOptions, handler: tariffHandlers.listBillRegisterMapping },
    { channel: IpcChannels.TARIFF_SAVE_BILL_REGISTER_MAPPING, options: { ...tariffWriteOptions, requireSession: true }, handler: tariffHandlers.saveBillRegisterMapping },
  ];

  for (const entry of tariffChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }
}
