import { contextBridge, ipcRenderer } from 'electron';
import {
  BillFrequency,
  IpcChannels,
  ReportType,
  SimpleInterestSubType,
  type CreateSocietyWizardDto,
  type GetSessionPayload,
  type IpcRequest,
  type IpcResponse,
  type LoginPayload,
  type OpenNewFinancialYearPayload,
  type PropertyInformationDto,
  type ReportFormatConfigDto,
  type SessionDto,
  type AccountGroupDto,
  type AccountMasterDetailDto,
  type AccountMasterDto,
  type AccountMasterSaveDto,
  type AccountSubgroupDto,
  type ArchiveAccountResult,
  type CoaPickerKind,
  type CoaTreeNode,
  type AccountPickerItem,
  type SocietyIdentityDto,
  type SocietyParametersDto,
  type BuildingDto,
  type WingDto,
  type UnitDto,
  type UnitDetailDto,
  type UnitSaveDto,
  type ReferenceMasterType,
  type ParkingTariffTypeDto,
  type ParkingTariffRateDto,
  type ParkingSpaceDto,
  type MemberParkingAssignmentDto,
  type ParkingChargeLineDto,
  type DeleteGuardResult,
  type MemberDto,
  type MemberFullDto,
  type MemberIdentificationDto,
  type MemberPersonalDto,
  type MemberAddressDto,
  type MemberDependentDto,
  type MemberNomineeDto,
  type MemberVehicleDto,
  type MemberShareDto,
  type MemberHousingLoanDto,
  type MemberOpeningBalanceSaveDto,
  type MemberOpeningBalanceResult,
  type MemberListItemDto,
  type UnitVacancyResult,
  type TenantDto,
  type TenantSaveDto,
  type TenantOccupancyResult,
  OpeningBalanceType,
  AccountCategoryType,
} from '@sams/shared-types';

async function invoke<TPayload, TResult>(
  channel: string,
  payload: TPayload,
): Promise<IpcResponse<TResult>> {
  const request: IpcRequest<TPayload> = {
    requestId: crypto.randomUUID(),
    payload,
  };
  return ipcRenderer.invoke(channel, request) as Promise<IpcResponse<TResult>>;
}

/** SDD §2.9 — typed preload bridge; renderer uses window.sams only */
contextBridge.exposeInMainWorld('sams', {
  startup: {
    getRecentDatabases: () =>
      invoke<Record<string, never>, { paths: Array<{ path: string; label: string; lastOpened: string }> }>(
        IpcChannels.STARTUP_GET_RECENT_DATABASES,
        {},
      ),
    validateDatabase: (path: string) =>
      invoke(IpcChannels.STARTUP_VALIDATE_DATABASE, { path }),
    openDatabase: (path: string) => invoke(IpcChannels.STARTUP_OPEN_DATABASE, { path }),
    createSociety: (payload: CreateSocietyWizardDto) =>
      invoke(IpcChannels.STARTUP_CREATE_SOCIETY, payload),
    openNewFinancialYear: (payload: OpenNewFinancialYearPayload) =>
      invoke(IpcChannels.STARTUP_OPEN_NEW_FINANCIAL_YEAR, payload),
    pickOpenDatabase: () => invoke(IpcChannels.STARTUP_PICK_OPEN_DATABASE, {}),
    pickSaveDatabase: (defaultName?: string) =>
      invoke(IpcChannels.STARTUP_PICK_SAVE_DATABASE, { defaultName }),
  },
  auth: {
    login: (username: string, password: string) =>
      invoke<LoginPayload, import('@sams/shared-types').LoginResult>(IpcChannels.AUTH_LOGIN, {
        username,
        password,
      }),
    logout: () => invoke(IpcChannels.AUTH_LOGOUT, {}),
    getSession: (): Promise<IpcResponse<SessionDto>> =>
      invoke<GetSessionPayload, SessionDto>(IpcChannels.AUTH_GET_SESSION, {}),
  },
  society: {
    getIdentity: () => invoke(IpcChannels.SOCIETY_GET_IDENTITY, {}),
    updateIdentity: (payload: SocietyIdentityDto) =>
      invoke(IpcChannels.SOCIETY_UPDATE_IDENTITY, payload),
    getParameters: () => invoke(IpcChannels.SOCIETY_GET_PARAMETERS, {}),
    updateParameters: (
      payload: SocietyParametersDto & { acknowledgeFrequencyWarning?: boolean },
    ) => invoke(IpcChannels.SOCIETY_UPDATE_PARAMETERS, payload),
    validateBillFrequencyChange: (newFrequency: BillFrequency) =>
      invoke(IpcChannels.SOCIETY_VALIDATE_BILL_FREQUENCY, { newFrequency }),
    getPropertyInfo: () => invoke(IpcChannels.SOCIETY_GET_PROPERTY_INFO, {}),
    updatePropertyInfo: (payload: PropertyInformationDto) =>
      invoke(IpcChannels.SOCIETY_UPDATE_PROPERTY_INFO, payload),
    getReportFormats: () => invoke(IpcChannels.SOCIETY_GET_REPORT_FORMATS, {}),
    updateReportFormats: (payload: ReportFormatConfigDto) =>
      invoke(IpcChannels.SOCIETY_UPDATE_REPORT_FORMATS, payload),
    listReportTemplates: (reportType: ReportType) =>
      invoke(IpcChannels.SOCIETY_LIST_REPORT_TEMPLATES, { reportType }),
    getInterestHelpText: (subType: SimpleInterestSubType) =>
      invoke(IpcChannels.SOCIETY_GET_INTEREST_HELP, { subType }),
  },
  coa: {
    getTree: (includeInactive?: boolean) =>
      invoke<{ includeInactive?: boolean }, CoaTreeNode[]>(IpcChannels.COA_GET_TREE, {
        includeInactive,
      }),
    listGroups: (categoryId?: AccountCategoryType) =>
      invoke<{ categoryId?: AccountCategoryType }, AccountGroupDto[]>(
        IpcChannels.COA_LIST_GROUPS,
        { categoryId },
      ),
    saveGroup: (payload: AccountGroupDto) =>
      invoke(IpcChannels.COA_SAVE_GROUP, payload),
    listSubgroups: (groupId: string) =>
      invoke<{ groupId: string }, AccountSubgroupDto[]>(IpcChannels.COA_LIST_SUBGROUPS, {
        groupId,
      }),
    saveSubgroup: (payload: AccountSubgroupDto) =>
      invoke(IpcChannels.COA_SAVE_SUBGROUP, payload),
    listAccounts: (subgroupId?: string, filter?: string) =>
      invoke<{ subgroupId?: string; filter?: string }, AccountMasterDto[]>(
        IpcChannels.COA_LIST_ACCOUNTS,
        { subgroupId, filter },
      ),
    getAccount: (id: string) =>
      invoke<{ id: string }, AccountMasterDetailDto>(IpcChannels.COA_GET_ACCOUNT, { id }),
    saveAccount: (payload: AccountMasterSaveDto) =>
      invoke(IpcChannels.COA_SAVE_ACCOUNT, payload),
    archiveAccount: (id: string) =>
      invoke<{ id: string }, ArchiveAccountResult>(IpcChannels.COA_ARCHIVE_ACCOUNT, { id }),
    searchForPicker: (
      query: string,
      kind?: CoaPickerKind,
      options?: {
        activeOnly?: boolean;
        categoryId?: AccountCategoryType;
        groupId?: string;
      },
    ) =>
      invoke<
        {
          query: string;
          kind?: CoaPickerKind;
          activeOnly?: boolean;
          categoryId?: AccountCategoryType;
          groupId?: string;
        },
        AccountPickerItem[]
      >(IpcChannels.COA_SEARCH_FOR_PICKER, {
        query,
        kind,
        ...options,
      }),
    searchMembers: (query: string) =>
      invoke<{ query: string }, AccountPickerItem[]>(IpcChannels.COA_SEARCH_MEMBERS, { query }),
    searchBanks: (query: string) =>
      invoke<{ query: string }, AccountPickerItem[]>(IpcChannels.COA_SEARCH_BANKS, { query }),
  },
  property: {
    listBuildings: (filter?: string) =>
      invoke(IpcChannels.BUILDING_LIST, { filter }),
    getBuilding: (id: string) => invoke(IpcChannels.BUILDING_GET, { id }),
    saveBuilding: (payload: BuildingDto) => invoke(IpcChannels.BUILDING_SAVE, payload),
    deleteBuilding: (id: string) =>
      invoke<{ id: string }, DeleteGuardResult>(IpcChannels.BUILDING_DELETE, { id }),
    listWings: (buildingId: string) => invoke(IpcChannels.WING_LIST, { buildingId }),
    saveWing: (payload: WingDto) => invoke(IpcChannels.WING_SAVE, payload),
    deleteWing: (id: string) =>
      invoke<{ id: string }, DeleteGuardResult>(IpcChannels.WING_DELETE, { id }),
    listUnits: (buildingId?: string, wingId?: string, filter?: string) =>
      invoke(IpcChannels.UNIT_LIST, { buildingId, wingId, filter }),
    getUnit: (id: string) => invoke<{ id: string }, UnitDetailDto>(IpcChannels.UNIT_GET, { id }),
    saveUnit: (payload: UnitSaveDto) => invoke(IpcChannels.UNIT_SAVE, payload),
    archiveUnit: (id: string) => invoke(IpcChannels.UNIT_ARCHIVE, { id }),
    validateUnitNo: (buildingId: string, wingId: string, unitNo: string, excludeId?: string) =>
      invoke(IpcChannels.UNIT_VALIDATE_NO, { buildingId, wingId, unitNo, excludeId }),
    listReferenceMasters: (type: ReferenceMasterType) =>
      invoke(IpcChannels.REFERENCE_MASTER_LIST, { type }),
    saveReferenceMaster: (type: ReferenceMasterType, data: Record<string, unknown>) =>
      invoke(IpcChannels.REFERENCE_MASTER_SAVE, { type, data }),
    listParkingTariffTypes: () => invoke(IpcChannels.PARKING_LIST_TARIFF_TYPES, {}),
    saveParkingTariffType: (payload: ParkingTariffTypeDto) =>
      invoke(IpcChannels.PARKING_SAVE_TARIFF_TYPE, payload),
    addParkingTariffRate: (typeId: string, effectiveDate: string, monthlyRate: number) =>
      invoke(IpcChannels.PARKING_ADD_TARIFF_RATE, { typeId, effectiveDate, monthlyRate }),
    listTariffRates: (typeId: string) =>
      invoke(IpcChannels.PARKING_LIST_TARIFF_RATES, { typeId }),
    listParkingSpaces: (filter?: string) =>
      invoke(IpcChannels.PARKING_LIST_SPACES, { filter }),
    saveParkingSpace: (payload: ParkingSpaceDto) =>
      invoke(IpcChannels.PARKING_SAVE_SPACE, payload),
    listParkingAssignments: (memberId?: string) =>
      invoke(IpcChannels.PARKING_LIST_ASSIGNMENTS, { memberId }),
    saveParkingAssignment: (payload: MemberParkingAssignmentDto) =>
      invoke(IpcChannels.PARKING_SAVE_ASSIGNMENT, payload),
    calculateForBill: (memberId: string, billDate: string) =>
      invoke<{ memberId: string; billDate: string }, ParkingChargeLineDto[]>(
        IpcChannels.PARKING_CALCULATE_FOR_BILL,
        { memberId, billDate },
      ),
  },
  member: {
    list: (options?: {
      buildingId?: string;
      wingId?: string;
      status?: 'active' | 'disposed' | 'all';
      filter?: string;
    }) =>
      invoke<
        {
          buildingId?: string;
          wingId?: string;
          status?: 'active' | 'disposed' | 'all';
          filter?: string;
        },
        { items: MemberListItemDto[]; total: number }
      >(IpcChannels.MEMBER_LIST, options ?? {}),
    get: (id: string) => invoke<{ id: string }, MemberFullDto>(IpcChannels.MEMBER_GET, { id }),
    saveIdentification: (payload: MemberIdentificationDto) =>
      invoke(IpcChannels.MEMBER_SAVE_IDENTIFICATION, payload),
    savePersonal: (payload: MemberPersonalDto) =>
      invoke(IpcChannels.MEMBER_SAVE_PERSONAL, payload),
    saveAddress: (payload: MemberAddressDto) =>
      invoke(IpcChannels.MEMBER_SAVE_ADDRESS, payload),
    saveDependents: (memberId: string, rows: MemberDependentDto[]) =>
      invoke(IpcChannels.MEMBER_SAVE_DEPENDENTS, { memberId, rows }),
    saveNominees: (memberId: string, rows: MemberNomineeDto[]) =>
      invoke(IpcChannels.MEMBER_SAVE_NOMINEES, { memberId, rows }),
    saveVehicles: (memberId: string, rows: MemberVehicleDto[]) =>
      invoke(IpcChannels.MEMBER_SAVE_VEHICLES, { memberId, rows }),
    saveShares: (memberId: string, rows: MemberShareDto[]) =>
      invoke(IpcChannels.MEMBER_SAVE_SHARES, { memberId, rows }),
    saveHousingLoans: (memberId: string, rows: MemberHousingLoanDto[]) =>
      invoke(IpcChannels.MEMBER_SAVE_HOUSING_LOANS, { memberId, rows }),
    dispose: (id: string, disposeDate: string, reason?: string) =>
      invoke(IpcChannels.MEMBER_DISPOSE, { id, disposeDate, reason }),
    checkUnitVacancy: (unitId: string, excludeMemberId?: string) =>
      invoke<{ unitId: string; excludeMemberId?: string }, UnitVacancyResult>(
        IpcChannels.MEMBER_CHECK_UNIT_VACANCY,
        { unitId, excludeMemberId },
      ),
    saveOpeningBalance: (payload: MemberOpeningBalanceSaveDto) =>
      invoke(IpcChannels.MEMBER_SAVE_OPENING_BALANCE, payload),
    uploadPhoto: (memberId: string, filePath?: string) =>
      invoke(IpcChannels.MEMBER_UPLOAD_PHOTO, { memberId, filePath }),
  },
  tenant: {
    list: (unitId?: string, activeOnly?: boolean) =>
      invoke<{ unitId?: string; activeOnly?: boolean }, TenantDto[]>(
        IpcChannels.TENANT_LIST,
        { unitId, activeOnly },
      ),
    getHistory: (unitId: string) =>
      invoke<{ unitId: string }, TenantDto[]>(IpcChannels.TENANT_GET_HISTORY, { unitId }),
    save: (payload: TenantSaveDto) => invoke(IpcChannels.TENANT_SAVE, payload),
    archive: (id: string) => invoke<{ id: string }, TenantDto>(IpcChannels.TENANT_ARCHIVE, { id }),
    validateForOccupancy: (unitId: string) =>
      invoke<{ unitId: string }, TenantOccupancyResult>(
        IpcChannels.TENANT_VALIDATE_FOR_OCCUPANCY,
        { unitId },
      ),
  },
});

export type SamApi = typeof window.sams;

declare global {
  interface Window {
    sams: SamApi;
  }
}
