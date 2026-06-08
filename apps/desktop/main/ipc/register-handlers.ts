import { ipcMain } from 'electron';
import { IpcChannels, PermissionAction, type IpcRequest } from '@sams/shared-types';
import { AppConfigStore } from '../config/app-config.js';
import { withIpcPipeline } from './pipeline.js';
import {
  authChangePasswordOptions,
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
import {
  billingHandlers,
  billingCreateOptions,
  billingReadOptions,
} from './handlers/billing-handler.js';
import {
  importHandlers,
  importReadOptions,
  importWriteOptions,
} from './handlers/import-handler.js';
import {
  voucherHandlers,
  voucherCreateOptions,
  voucherReadOptions,
} from './handlers/voucher-handler.js';
import {
  pettyCashHandlers,
  pettyCashCreateOptions,
  pettyCashReadOptions,
} from './handlers/pettycash-handler.js';
import {
  adjustmentHandlers,
  adjustmentCreateOptions,
  adjustmentDeleteOptions,
  adjustmentReadOptions,
} from './handlers/adjustment-handler.js';
import {
  bankRecHandlers,
  bankRecReadOptions,
  bankRecWriteOptions,
} from './handlers/bankrec-handler.js';
import {
  registersHandlers,
  registersCreateOptions,
  registersDeleteOptions,
  registersReadOptions,
} from './handlers/registers-handler.js';
import {
  tdsHandlers,
  tdsPrintOptions,
  tdsReadOptions,
  tdsWriteOptions,
} from './handlers/tds-handler.js';
import {
  correspondenceHandlers,
  correspondenceCreateOptions,
  correspondenceDeleteOptions,
  correspondencePrintOptions,
  correspondenceReadOptions,
  correspondenceWriteOptions,
} from './handlers/correspondence-handler.js';
import {
  createAdminHandlers,
  adminAuditExportOptions,
  adminAuditReadOptions,
  adminBackupReadOptions,
  adminBackupWriteOptions,
  adminUsersCreateOptions,
  adminUsersReadOptions,
  adminUsersWriteOptions,
  adminYearEndReadOptions,
  adminYearEndWriteOptions,
} from './handlers/admin-handler.js';
import {
  reportHandlers,
  reportExportOptions,
  reportPrintOptions,
  reportReadOptions,
} from './handlers/report-handler.js';
import { sessionManager } from '../session/session-manager.js';

const startupPublicOptions = {
  resource: 'startup',
  action: PermissionAction.READ,
  requireSession: false,
};

const startupReadOptions = {
  resource: 'startup',
  action: PermissionAction.READ,
  requireSession: true,
};

const startupCreateOptions = {
  resource: 'startup',
  action: PermissionAction.CREATE,
  requireSession: true,
};

export function registerIpcHandlers(appConfig: AppConfigStore): void {
  const startup = createStartupHandlers(appConfig);
  const admin = createAdminHandlers(appConfig);

  ipcMain.handle(
    IpcChannels.STARTUP_GET_RECENT_DATABASES,
    async (event, request: IpcRequest<Record<string, never>>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...startupPublicOptions,
        handler: startup.getRecentDatabases,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_VALIDATE_DATABASE,
    async (event, request: IpcRequest<{ path: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...startupPublicOptions,
        handler: startup.validateDatabase,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_OPEN_DATABASE,
    async (event, request: IpcRequest<{ path: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...startupPublicOptions,
        handler: startup.openDatabase,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_CREATE_SOCIETY,
    async (event, request: IpcRequest<Parameters<typeof startup.createSociety>[1]>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...startupPublicOptions,
        handler: startup.createSociety,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_OPEN_NEW_FINANCIAL_YEAR,
    async (event, request: IpcRequest<Parameters<typeof startup.openNewFinancialYear>[1]>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...startupCreateOptions,
        handler: startup.openNewFinancialYear,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_CLOSE_DATABASE,
    async (event, request: IpcRequest<Record<string, never>>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...startupReadOptions,
        handler: startup.closeDatabaseSession,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_PICK_OPEN_DATABASE,
    async (event, request: IpcRequest<Record<string, never>>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...startupPublicOptions,
        handler: startup.pickOpenDatabase,
      }),
  );

  ipcMain.handle(
    IpcChannels.STARTUP_PICK_SAVE_DATABASE,
    async (event, request: IpcRequest<{ defaultName?: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...startupPublicOptions,
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

  ipcMain.handle(
    IpcChannels.AUTH_CHANGE_PASSWORD,
    async (event, request: IpcRequest<{ currentPassword: string; newPassword: string }>) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...authChangePasswordOptions,
        requireSession: true,
      }),
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

  const billingOptions = { ...billingReadOptions, requireSession: true };

  const billingChannels: Array<{
    channel: string;
    options: typeof billingOptions;
    handler: (typeof billingHandlers)[keyof typeof billingHandlers];
  }> = [
    { channel: IpcChannels.BILLING_LIST_PERIODS, options: billingOptions, handler: billingHandlers.listPeriods },
    { channel: IpcChannels.BILLING_GET_NEXT_PERIOD, options: billingOptions, handler: billingHandlers.getNextPeriod },
    { channel: IpcChannels.BILLING_LIST_REGULAR, options: billingOptions, handler: billingHandlers.listRegularBills },
    { channel: IpcChannels.BILLING_GET_REGULAR, options: billingOptions, handler: billingHandlers.getRegularBill },
    { channel: IpcChannels.BILLING_PREVIEW_REGULAR, options: billingOptions, handler: billingHandlers.previewRegularBill },
    { channel: IpcChannels.BILLING_SAVE_REGULAR, options: { ...billingCreateOptions, requireSession: true }, handler: billingHandlers.saveRegularBill },
    { channel: IpcChannels.BILLING_GET_INTEREST_DETAIL, options: billingOptions, handler: billingHandlers.getInterestDetail },
    { channel: IpcChannels.BILLING_GENERATE_BULK_REGULAR, options: { ...billingCreateOptions, requireSession: true }, handler: billingHandlers.generateBulkRegular },
    { channel: IpcChannels.BILLING_GET_SETTLEMENTS, options: billingOptions, handler: billingHandlers.getBillSettlements },
    { channel: IpcChannels.BILLING_LIST_SUPPLEMENTARY, options: billingOptions, handler: billingHandlers.listSupplementaryBills },
    { channel: IpcChannels.BILLING_GET_SUPPLEMENTARY, options: billingOptions, handler: billingHandlers.getSupplementaryBill },
    { channel: IpcChannels.BILLING_PREVIEW_SUPPLEMENTARY, options: billingOptions, handler: billingHandlers.previewSupplementaryBill },
    { channel: IpcChannels.BILLING_SAVE_SUPPLEMENTARY, options: { ...billingCreateOptions, requireSession: true }, handler: billingHandlers.saveSupplementaryBill },
    { channel: IpcChannels.BILLING_PRINT_REGULAR, options: billingReadOptions, handler: billingHandlers.printRegularBill },
    { channel: IpcChannels.BILLING_PRINT_SUPPLEMENTARY, options: billingReadOptions, handler: billingHandlers.printSupplementaryBill },
    { channel: IpcChannels.BILLING_CALCULATE_INTEREST, options: billingOptions, handler: billingHandlers.calculateInterest },
    { channel: IpcChannels.BILLING_OPEN_REFERENCE, options: billingOptions, handler: billingHandlers.openReference },
  ];

  for (const entry of billingChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const voucherOptions = { ...voucherReadOptions, requireSession: true };

  const voucherChannels: Array<{
    channel: string;
    options: typeof voucherOptions;
    handler: (typeof voucherHandlers)[keyof typeof voucherHandlers];
  }> = [
    { channel: IpcChannels.VOUCHER_LIST, options: voucherOptions, handler: voucherHandlers.list },
    { channel: IpcChannels.VOUCHER_GET, options: voucherOptions, handler: voucherHandlers.get },
    { channel: IpcChannels.VOUCHER_PREVIEW_POST, options: voucherOptions, handler: voucherHandlers.previewPost },
    { channel: IpcChannels.VOUCHER_POST, options: { ...voucherCreateOptions, requireSession: true }, handler: voucherHandlers.post },
    { channel: IpcChannels.VOUCHER_LOOKUP_MICR, options: voucherOptions, handler: voucherHandlers.lookupMicr },
    { channel: IpcChannels.VOUCHER_VALIDATE_MANUAL_NO, options: voucherOptions, handler: voucherHandlers.validateManualNo },
    { channel: IpcChannels.VOUCHER_GET_OPEN_BILLS, options: voucherOptions, handler: voucherHandlers.getOpenBillsForMember },
    { channel: IpcChannels.VOUCHER_ALLOCATE_SETTLEMENT, options: voucherOptions, handler: voucherHandlers.allocateSettlement },
    { channel: IpcChannels.VOUCHER_LINK_GENERAL_BILL, options: { ...voucherCreateOptions, requireSession: true }, handler: voucherHandlers.linkGeneralBill },
    { channel: IpcChannels.VOUCHER_CANCEL, options: { resource: 'vouchers', action: PermissionAction.DELETE, requireDatabase: true, requireSession: true }, handler: voucherHandlers.cancel },
    { channel: IpcChannels.VOUCHER_GET_CHEQUE_PRINT_DATA, options: voucherOptions, handler: voucherHandlers.getChequePrintData },
  ];

  for (const entry of voucherChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const pettyCashOptions = { ...pettyCashReadOptions, requireSession: true };
  const pettyCashChannels = [
    { channel: IpcChannels.PETTYCASH_LIST, options: pettyCashOptions, handler: pettyCashHandlers.list },
    { channel: IpcChannels.PETTYCASH_POST, options: { ...pettyCashCreateOptions, requireSession: true }, handler: pettyCashHandlers.post },
  ];

  for (const entry of pettyCashChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const adjustmentOptions = { ...adjustmentReadOptions, requireSession: true };
  const adjustmentChannels = [
    { channel: IpcChannels.ADJUSTMENT_POST, options: { ...adjustmentCreateOptions, requireSession: true }, handler: adjustmentHandlers.post },
    { channel: IpcChannels.ADJUSTMENT_PREVIEW_PARTIAL_WAIVER, options: adjustmentOptions, handler: adjustmentHandlers.previewPartialWaiver },
    { channel: IpcChannels.ADJUSTMENT_PARTIAL_WAIVER, options: { ...adjustmentCreateOptions, requireSession: true }, handler: adjustmentHandlers.partialWaiver },
    { channel: IpcChannels.ADJUSTMENT_CANCEL, options: { ...adjustmentDeleteOptions, requireSession: true }, handler: adjustmentHandlers.cancel },
  ];

  for (const entry of adjustmentChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const bankRecOptions = { ...bankRecReadOptions, requireSession: true };
  const bankRecChannels = [
    { channel: IpcChannels.BANKREC_LIST_ITEMS, options: bankRecOptions, handler: bankRecHandlers.listItems },
    {
      channel: IpcChannels.BANKREC_BULK_SET_CLEARING_DATE,
      options: { ...bankRecWriteOptions, requireSession: true },
      handler: bankRecHandlers.bulkSetClearingDate,
    },
    { channel: IpcChannels.BANKREC_GET_STATEMENT, options: bankRecOptions, handler: bankRecHandlers.getStatement },
  ];

  for (const entry of bankRecChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const registersOptions = { ...registersReadOptions, requireSession: true };
  const registersChannels = [
    { channel: IpcChannels.REGISTERS_FD_LIST, options: registersOptions, handler: registersHandlers.listFd },
    { channel: IpcChannels.REGISTERS_FD_GET, options: registersOptions, handler: registersHandlers.getFd },
    { channel: IpcChannels.REGISTERS_FD_SAVE, options: { ...registersCreateOptions, requireSession: true }, handler: registersHandlers.saveFd },
    { channel: IpcChannels.REGISTERS_FD_DELETE, options: { ...registersDeleteOptions, requireSession: true }, handler: registersHandlers.deleteFd },
    { channel: IpcChannels.REGISTERS_FD_UPCOMING_MATURITIES, options: registersOptions, handler: registersHandlers.upcomingFdMaturities },
    { channel: IpcChannels.REGISTERS_PROPERTY_LIST, options: registersOptions, handler: registersHandlers.listProperty },
    { channel: IpcChannels.REGISTERS_PROPERTY_GET, options: registersOptions, handler: registersHandlers.getProperty },
    { channel: IpcChannels.REGISTERS_PROPERTY_SAVE, options: { ...registersCreateOptions, requireSession: true }, handler: registersHandlers.saveProperty },
    { channel: IpcChannels.REGISTERS_PROPERTY_DELETE, options: { ...registersDeleteOptions, requireSession: true }, handler: registersHandlers.deleteProperty },
    { channel: IpcChannels.REGISTERS_SINKING_FUND_LIST, options: registersOptions, handler: registersHandlers.listSinkingFund },
    { channel: IpcChannels.REGISTERS_IFORM_LIST, options: registersOptions, handler: registersHandlers.listIForm },
    { channel: IpcChannels.REGISTERS_IFORM_GET, options: registersOptions, handler: registersHandlers.getIForm },
    { channel: IpcChannels.REGISTERS_IFORM_SAVE, options: { ...registersCreateOptions, requireSession: true }, handler: registersHandlers.saveIForm },
    { channel: IpcChannels.REGISTERS_IFORM_DELETE, options: { ...registersDeleteOptions, requireSession: true }, handler: registersHandlers.deleteIForm },
    { channel: IpcChannels.REGISTERS_IFORM_SAVE_SHARE, options: { ...registersCreateOptions, requireSession: true }, handler: registersHandlers.saveIFormShare },
    { channel: IpcChannels.REGISTERS_IFORM_DELETE_SHARE, options: { ...registersDeleteOptions, requireSession: true }, handler: registersHandlers.deleteIFormShare },
    { channel: IpcChannels.REGISTERS_IFORM_SAVE_TRANSFER, options: { ...registersCreateOptions, requireSession: true }, handler: registersHandlers.saveIFormTransfer },
    { channel: IpcChannels.REGISTERS_IFORM_DELETE_TRANSFER, options: { ...registersDeleteOptions, requireSession: true }, handler: registersHandlers.deleteIFormTransfer },
  ];

  for (const entry of registersChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const tdsOptions = { ...tdsReadOptions, requireSession: true };
  const tdsChannels = [
    { channel: IpcChannels.TDS_LIST, options: tdsOptions, handler: tdsHandlers.list },
    { channel: IpcChannels.TDS_GET, options: tdsOptions, handler: tdsHandlers.get },
    { channel: IpcChannels.TDS_UPDATE, options: { ...tdsWriteOptions, requireSession: true }, handler: tdsHandlers.update },
    { channel: IpcChannels.TDS_LIST_CHALLANS, options: tdsOptions, handler: tdsHandlers.listChallans },
    { channel: IpcChannels.TDS_SAVE_CHALLAN, options: { ...tdsWriteOptions, requireSession: true }, handler: tdsHandlers.saveChallan },
    { channel: IpcChannels.TDS_GENERATE_FORM16A, options: { ...tdsPrintOptions, requireSession: true }, handler: tdsHandlers.generateForm16A },
  ];

  for (const entry of tdsChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const correspondenceOptions = { ...correspondenceReadOptions, requireSession: true };
  const correspondenceChannels = [
    { channel: IpcChannels.CORRESPONDENCE_LIST_TEMPLATES, options: correspondenceOptions, handler: correspondenceHandlers.listTemplates },
    { channel: IpcChannels.CORRESPONDENCE_SAVE_TEMPLATE, options: { ...correspondenceWriteOptions, requireSession: true }, handler: correspondenceHandlers.saveTemplate },
    { channel: IpcChannels.CORRESPONDENCE_LIST_DEFAULTERS, options: correspondenceOptions, handler: correspondenceHandlers.listDefaulters },
    { channel: IpcChannels.CORRESPONDENCE_GENERATE_REMINDER, options: { ...correspondenceCreateOptions, requireSession: true }, handler: correspondenceHandlers.generateReminder },
    { channel: IpcChannels.CORRESPONDENCE_GET_GENERATED, options: correspondenceOptions, handler: correspondenceHandlers.getGeneratedLetter },
    { channel: IpcChannels.CORRESPONDENCE_LIST_GENERATED, options: correspondenceOptions, handler: correspondenceHandlers.listGeneratedLetters },
    { channel: IpcChannels.CORRESPONDENCE_SAVE_GENERAL_LETTER, options: { ...correspondenceCreateOptions, requireSession: true }, handler: correspondenceHandlers.saveGeneralLetter },
    { channel: IpcChannels.CORRESPONDENCE_COMMITTEE_LIST, options: correspondenceOptions, handler: correspondenceHandlers.listCommittee },
    { channel: IpcChannels.CORRESPONDENCE_COMMITTEE_SAVE, options: { ...correspondenceWriteOptions, requireSession: true }, handler: correspondenceHandlers.saveCommittee },
    { channel: IpcChannels.CORRESPONDENCE_COMMITTEE_DELETE, options: { ...correspondenceDeleteOptions, requireSession: true }, handler: correspondenceHandlers.deleteCommittee },
    { channel: IpcChannels.CORRESPONDENCE_MINUTES_LIST, options: correspondenceOptions, handler: correspondenceHandlers.listMinutes },
    { channel: IpcChannels.CORRESPONDENCE_MINUTES_GET, options: correspondenceOptions, handler: correspondenceHandlers.getMinutes },
    { channel: IpcChannels.CORRESPONDENCE_MINUTES_SAVE, options: { ...correspondenceWriteOptions, requireSession: true }, handler: correspondenceHandlers.saveMinutes },
    { channel: IpcChannels.CORRESPONDENCE_MINUTES_DELETE, options: { ...correspondenceDeleteOptions, requireSession: true }, handler: correspondenceHandlers.deleteMinutes },
    { channel: IpcChannels.CORRESPONDENCE_MINUTES_RENDER_PRINT, options: { ...correspondencePrintOptions, requireSession: true }, handler: correspondenceHandlers.renderMinutesPrint },
  ];

  for (const entry of correspondenceChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const adminReadOptions = { ...adminUsersReadOptions, requireSession: true };
  const adminChannels = [
    { channel: IpcChannels.ADMIN_LIST_USERS, options: adminReadOptions, handler: admin.listUsers },
    { channel: IpcChannels.ADMIN_SAVE_USER, options: { ...adminUsersWriteOptions, requireSession: true }, handler: admin.saveUser },
    { channel: IpcChannels.ADMIN_RESET_PASSWORD, options: { ...adminUsersWriteOptions, requireSession: true }, handler: admin.resetPassword },
    { channel: IpcChannels.ADMIN_BACKUP, options: { ...adminBackupWriteOptions, requireSession: true, allowWhenReadOnly: true }, handler: admin.backup },
    { channel: IpcChannels.ADMIN_RESTORE, options: { ...adminBackupWriteOptions, requireSession: true, allowWhenReadOnly: true }, handler: admin.restore },
    { channel: IpcChannels.ADMIN_GET_SCHEDULED_BACKUP, options: { ...adminBackupReadOptions, requireSession: true, allowWhenReadOnly: true }, handler: admin.getScheduledBackup },
    { channel: IpcChannels.ADMIN_SCHEDULE_BACKUP, options: { ...adminBackupWriteOptions, requireSession: true, allowWhenReadOnly: true }, handler: admin.scheduleBackup },
    { channel: IpcChannels.ADMIN_YEAR_END_CHECKLIST, options: { ...adminYearEndReadOptions, requireSession: true, allowWhenReadOnly: true }, handler: admin.yearEndChecklist },
    { channel: IpcChannels.ADMIN_YEAR_END_CLOSE, options: { ...adminYearEndWriteOptions, requireSession: true }, handler: admin.yearEndClose },
    { channel: IpcChannels.ADMIN_REOPEN_YEAR, options: { ...adminYearEndWriteOptions, requireSession: true, allowWhenReadOnly: true }, handler: admin.reopenYear },
    { channel: IpcChannels.ADMIN_LIST_AUDIT_LOG, options: { ...adminAuditReadOptions, requireSession: true }, handler: admin.listAuditLog },
    { channel: IpcChannels.ADMIN_EXPORT_AUDIT_LOG, options: { ...adminAuditExportOptions, requireSession: true }, handler: admin.exportAuditLog },
  ];

  for (const entry of adminChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const reportOptions = { ...reportReadOptions, requireSession: true };
  const reportChannels = [
    { channel: IpcChannels.REPORT_LIST, options: reportOptions, handler: reportHandlers.list },
    { channel: IpcChannels.REPORT_RUN, options: reportOptions, handler: reportHandlers.run },
    { channel: IpcChannels.REPORT_PREVIEW, options: reportOptions, handler: reportHandlers.preview },
    {
      channel: IpcChannels.REPORT_EXPORT_CSV,
      options: { ...reportExportOptions, requireSession: true },
      handler: reportHandlers.exportCsv,
    },
    {
      channel: IpcChannels.REPORT_EXPORT_PDF,
      options: { ...reportExportOptions, requireSession: true },
      handler: reportHandlers.exportPdf,
    },
    {
      channel: IpcChannels.REPORT_PRINT,
      options: { ...reportPrintOptions, requireSession: true },
      handler: reportHandlers.print,
    },
  ];

  for (const entry of reportChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }

  const importChannels = [
    {
      channel: IpcChannels.IMPORT_MEMBER_CSV_TEMPLATE,
      options: { ...importReadOptions, requireSession: true },
      handler: importHandlers.memberCsvTemplate,
    },
    {
      channel: IpcChannels.IMPORT_MEMBER_CSV_VALIDATE,
      options: { ...importReadOptions, requireSession: true },
      handler: importHandlers.memberCsvValidate,
    },
    {
      channel: IpcChannels.IMPORT_MEMBER_CSV_COMMIT,
      options: { ...importWriteOptions, requireSession: true },
      handler: importHandlers.memberCsvCommit,
    },
    {
      channel: IpcChannels.IMPORT_PICK_MEMBER_CSV,
      options: { ...importReadOptions, requireSession: true },
      handler: importHandlers.pickMemberCsv,
    },
  ];

  for (const entry of importChannels) {
    ipcMain.handle(entry.channel, async (event, request) =>
      withIpcPipeline(request, sessionManager.get(), event, {
        ...entry.options,
        handler: entry.handler,
      }),
    );
  }
}
