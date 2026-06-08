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
  VoucherType,
  PartyType,
  type BankMasterDto,
  type BankMicrCodeDto,
  type MicrLookupResult,
  type NarrationMasterDto,
  type AddressBookEntryDto,
  type ChequeCancellationReasonDto,
  type DishonouredChequeDto,
  type ContractorDetailDto,
  AccountCategoryType,
  type TariffDefinitionDto,
  type TariffDefinitionSaveDto,
  type TariffLineDto,
  type TariffResolveResult,
  type TariffScopeLevel,
  type TariffSettlementSequenceDto,
  type TariffSettlementSequenceSaveDto,
  type TariffBillRegisterMappingDto,
  type TariffBillRegisterMappingSaveDto,
  type BillingPeriodDto,
  type BillSummaryDto,
  type RegularBillDetailDto,
  type RegularBillPreviewDto,
  type RegularBillSaveDto,
  type BillInterestDetailDto,
  type BillSettlementDto,
  type BulkRegularBillGenerateDto,
  type BulkRegularBillResult,
  type BillToType,
  type SupplementaryBillDetailDto,
  type SupplementaryBillPreviewDto,
  type SupplementaryBillSaveDto,
  type SupplementaryBillSummaryDto,
  type VoucherType,
  type VoucherSubType,
  type VoucherSaveDto,
  type VoucherDetailDto,
  type VoucherSummaryDto,
  type VoucherPreviewResultDto,
  type MicrLookupResult,
  type OpenBillDto,
  type RegularSettlementInputDto,
  type SettlementAllocationResultDto,
  type GeneralBillSettlementDto,
  type ChequePrintDto,
  type VoucherCancelInputDto,
  type VoucherCancelResultDto,
  type AdjustmentVoucherDto,
  type PettyCashVoucherDto,
  type PartialWaiverInputDto,
  type PartialWaiverPreviewDto,
  type PartialWaiverResultDto,
  type BankRecGridRow,
  type BankReconciliationStatementDto,
  type BankRecStatus,
  type FdRegisterDto,
  type FdStatus,
  type PropertyRegisterEntryDto,
  type SinkingFundEntryDto,
  type IFormRegisterDto,
  type IFormShareEntryDto,
  type IFormShareTransferDto,
  type UpcomingFdMaturityDto,
  type TdsRecordDto,
  type TdsChallanDto,
  type Form16AResultDto,
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
        pettyCashOnly?: boolean;
      },
    ) =>
      invoke<
        {
          query: string;
          kind?: CoaPickerKind;
          activeOnly?: boolean;
          categoryId?: AccountCategoryType;
          groupId?: string;
          pettyCashOnly?: boolean;
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
  masters: {
    listBanks: (filter?: string) =>
      invoke<{ filter?: string }, BankMasterDto[]>(IpcChannels.MASTERS_BANK_LIST, { filter }),
    getBank: (id: string) =>
      invoke<{ id: string }, BankMasterDto>(IpcChannels.MASTERS_BANK_GET, { id }),
    saveBank: (payload: BankMasterDto) => invoke(IpcChannels.MASTERS_BANK_SAVE, payload),
    deleteBank: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.MASTERS_BANK_DELETE, { id }),
    listMicr: (bankMasterId: string) =>
      invoke<{ bankMasterId: string }, BankMicrCodeDto[]>(IpcChannels.MASTERS_BANK_LIST_MICR, {
        bankMasterId,
      }),
    saveMicr: (payload: BankMicrCodeDto) => invoke(IpcChannels.MASTERS_BANK_SAVE_MICR, payload),
    deleteMicr: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.MASTERS_BANK_DELETE_MICR, { id }),
    lookupMicr: (micrCode: string) =>
      invoke<{ micrCode: string }, MicrLookupResult | null>(
        IpcChannels.MASTERS_BANK_LOOKUP_MICR,
        { micrCode },
      ),
    listNarrations: (voucherTableType?: VoucherType) =>
      invoke<{ voucherTableType?: VoucherType }, NarrationMasterDto[]>(
        IpcChannels.MASTERS_NARRATION_LIST,
        { voucherTableType },
      ),
    saveNarration: (payload: NarrationMasterDto) =>
      invoke(IpcChannels.MASTERS_NARRATION_SAVE, payload),
    deleteNarration: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.MASTERS_NARRATION_DELETE, { id }),
    listAddressBook: (filter?: string) =>
      invoke<{ filter?: string }, AddressBookEntryDto[]>(
        IpcChannels.MASTERS_ADDRESS_BOOK_LIST,
        { filter },
      ),
    saveAddressBook: (payload: AddressBookEntryDto) =>
      invoke(IpcChannels.MASTERS_ADDRESS_BOOK_SAVE, payload),
    deleteAddressBook: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.MASTERS_ADDRESS_BOOK_DELETE, { id }),
    listChequeReasons: () =>
      invoke<Record<string, never>, ChequeCancellationReasonDto[]>(
        IpcChannels.MASTERS_CHEQUE_REASON_LIST,
        {},
      ),
    saveChequeReason: (payload: ChequeCancellationReasonDto) =>
      invoke(IpcChannels.MASTERS_CHEQUE_REASON_SAVE, payload),
    deleteChequeReason: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.MASTERS_CHEQUE_REASON_DELETE, { id }),
    listDishonoured: (reasonId: string) =>
      invoke<{ reasonId: string }, DishonouredChequeDto[]>(
        IpcChannels.MASTERS_CHEQUE_REASON_LIST_DISHONOURED,
        { reasonId },
      ),
    listContractors: (filter?: string) =>
      invoke<{ filter?: string }, ContractorDetailDto[]>(
        IpcChannels.MASTERS_CONTRACTOR_LIST,
        { filter },
      ),
    saveContractor: (payload: ContractorDetailDto) =>
      invoke(IpcChannels.MASTERS_CONTRACTOR_SAVE, payload),
    deleteContractor: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.MASTERS_CONTRACTOR_DELETE, { id }),
  },
  tariff: {
    listDefinitions: (scopeLevel?: TariffScopeLevel, asOfDate?: string) =>
      invoke<{ scopeLevel?: TariffScopeLevel; asOfDate?: string }, TariffDefinitionDto[]>(
        IpcChannels.TARIFF_LIST_DEFINITIONS,
        { scopeLevel, asOfDate },
      ),
    getDefinition: (id: string) =>
      invoke<{ id: string }, TariffDefinitionDto>(IpcChannels.TARIFF_GET_DEFINITION, { id }),
    saveDefinition: (payload: TariffDefinitionSaveDto) =>
      invoke(IpcChannels.TARIFF_SAVE_DEFINITION, payload),
    cloneDefinition: (sourceId: string, newEffectiveDate: string) =>
      invoke<{ sourceId: string; newEffectiveDate: string }, TariffDefinitionDto>(
        IpcChannels.TARIFF_CLONE_DEFINITION,
        { sourceId, newEffectiveDate },
      ),
    reorderLines: (definitionId: string, lineIds: string[]) =>
      invoke<{ definitionId: string; lineIds: string[] }, TariffLineDto[]>(
        IpcChannels.TARIFF_REORDER_LINES,
        { definitionId, lineIds },
      ),
    resolveForMember: (memberId: string, billDate: string) =>
      invoke<{ memberId: string; billDate: string }, TariffResolveResult>(
        IpcChannels.TARIFF_RESOLVE_FOR_MEMBER,
        { memberId, billDate },
      ),
    listSettlementSequences: () =>
      invoke<Record<string, never>, TariffSettlementSequenceDto[]>(
        IpcChannels.TARIFF_LIST_SETTLEMENT_SEQUENCES,
        {},
      ),
    getSettlementSequence: (id: string) =>
      invoke<{ id: string }, TariffSettlementSequenceDto>(
        IpcChannels.TARIFF_GET_SETTLEMENT_SEQUENCE,
        { id },
      ),
    saveSettlementSequence: (payload: TariffSettlementSequenceSaveDto) =>
      invoke(IpcChannels.TARIFF_SAVE_SETTLEMENT_SEQUENCE, payload),
    listBillRegisterMapping: () =>
      invoke<Record<string, never>, TariffBillRegisterMappingDto[]>(
        IpcChannels.TARIFF_LIST_BILL_REGISTER_MAPPING,
        {},
      ),
    saveBillRegisterMapping: (payload: TariffBillRegisterMappingSaveDto) =>
      invoke(IpcChannels.TARIFF_SAVE_BILL_REGISTER_MAPPING, payload),
  },
  billing: {
    listPeriods: (financialYearId?: string) =>
      invoke<{ financialYearId?: string }, BillingPeriodDto[]>(
        IpcChannels.BILLING_LIST_PERIODS,
        { financialYearId },
      ),
    getNextPeriod: () =>
      invoke<Record<string, never>, { periodKey: string; periodLabel: string } | null>(
        IpcChannels.BILLING_GET_NEXT_PERIOD,
        {},
      ),
    listRegularBills: (filter?: { memberId?: string; periodKey?: string; search?: string }) =>
      invoke(IpcChannels.BILLING_LIST_REGULAR, filter ?? {}),
    getRegularBill: (id: string) =>
      invoke<{ id: string }, RegularBillDetailDto>(IpcChannels.BILLING_GET_REGULAR, { id }),
    previewRegularBill: (payload: RegularBillPreviewDto) =>
      invoke(IpcChannels.BILLING_PREVIEW_REGULAR, payload),
    saveRegularBill: (payload: RegularBillSaveDto) =>
      invoke(IpcChannels.BILLING_SAVE_REGULAR, payload),
    getInterestDetail: (id: string) =>
      invoke<{ id: string }, BillInterestDetailDto[]>(
        IpcChannels.BILLING_GET_INTEREST_DETAIL,
        { id },
      ),
    generateBulkRegular: (payload: BulkRegularBillGenerateDto) =>
      invoke(IpcChannels.BILLING_GENERATE_BULK_REGULAR, payload),
    getBillSettlements: (billId: string) =>
      invoke<{ billId: string }, BillSettlementDto[]>(
        IpcChannels.BILLING_GET_SETTLEMENTS,
        { billId },
      ),
    listSupplementaryBills: (filter?: {
      billToType?: BillToType;
      memberId?: string;
      tenantId?: string;
      periodKey?: string;
      search?: string;
    }) => invoke(IpcChannels.BILLING_LIST_SUPPLEMENTARY, filter ?? {}),
    getSupplementaryBill: (id: string) =>
      invoke<{ id: string }, SupplementaryBillDetailDto>(
        IpcChannels.BILLING_GET_SUPPLEMENTARY,
        { id },
      ),
    previewSupplementaryBill: (payload: SupplementaryBillPreviewDto) =>
      invoke(IpcChannels.BILLING_PREVIEW_SUPPLEMENTARY, payload),
    saveSupplementaryBill: (payload: SupplementaryBillSaveDto) =>
      invoke(IpcChannels.BILLING_SAVE_SUPPLEMENTARY, payload),
  },
  voucher: {
    list: (filter?: {
      voucherType?: VoucherType;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    }) => invoke(IpcChannels.VOUCHER_LIST, filter ?? {}),
    get: (id: string) =>
      invoke<{ id: string }, VoucherDetailDto>(IpcChannels.VOUCHER_GET, { id }),
    previewPost: (payload: VoucherSaveDto) =>
      invoke(IpcChannels.VOUCHER_PREVIEW_POST, payload),
    post: (payload: VoucherSaveDto) => invoke(IpcChannels.VOUCHER_POST, payload),
    lookupMicr: (micrCode: string) =>
      invoke<{ micrCode: string }, MicrLookupResult | null>(
        IpcChannels.VOUCHER_LOOKUP_MICR,
        { micrCode },
      ),
    validateManualNo: (payload: {
      voucherType: VoucherType;
      subType?: VoucherSubType;
      manualNo: string;
      excludeVoucherId?: string;
    }) => invoke(IpcChannels.VOUCHER_VALIDATE_MANUAL_NO, payload),
    getOpenBillsForMember: (memberId: string, billType: 'REGULAR' | 'SUPPLEMENTARY') =>
      invoke<{ memberId: string; billType: 'REGULAR' | 'SUPPLEMENTARY' }, OpenBillDto[]>(
        IpcChannels.VOUCHER_GET_OPEN_BILLS,
        { memberId, billType },
      ),
    allocateSettlement: (payload: RegularSettlementInputDto & { asOfDate?: string }) =>
      invoke(IpcChannels.VOUCHER_ALLOCATE_SETTLEMENT, payload),
    linkGeneralBill: (payload: {
      voucherId: string;
      supplementaryBillId: string;
      amount: number;
    }) => invoke(IpcChannels.VOUCHER_LINK_GENERAL_BILL, payload),
    cancel: (payload: VoucherCancelInputDto) =>
      invoke(IpcChannels.VOUCHER_CANCEL, payload),
    getChequePrintData: (voucherId: string) =>
      invoke<{ voucherId: string }, ChequePrintDto>(IpcChannels.VOUCHER_GET_CHEQUE_PRINT_DATA, {
        voucherId,
      }),
  },
  pettycash: {
    list: (filter?: { dateFrom?: string; dateTo?: string; search?: string }) =>
      invoke(IpcChannels.PETTYCASH_LIST, filter ?? {}),
    post: (payload: PettyCashVoucherDto) => invoke(IpcChannels.PETTYCASH_POST, payload),
  },
  adjustment: {
    post: (payload: AdjustmentVoucherDto) => invoke(IpcChannels.ADJUSTMENT_POST, payload),
    previewPartialWaiver: (payload: PartialWaiverInputDto) =>
      invoke(IpcChannels.ADJUSTMENT_PREVIEW_PARTIAL_WAIVER, payload),
    partialWaiver: (payload: PartialWaiverInputDto) =>
      invoke(IpcChannels.ADJUSTMENT_PARTIAL_WAIVER, payload),
    cancel: (payload: VoucherCancelInputDto) => invoke(IpcChannels.ADJUSTMENT_CANCEL, payload),
  },
  bankrec: {
    listItems: (payload: {
      bankAccountId: string;
      dateFrom: string;
      dateTo: string;
      status?: BankRecStatus;
    }) => invoke(IpcChannels.BANKREC_LIST_ITEMS, payload),
    bulkSetClearingDate: (payload: { voucherLineIds: string[]; clearingDate: string }) =>
      invoke(IpcChannels.BANKREC_BULK_SET_CLEARING_DATE, payload),
    getStatement: (payload: { bankAccountId: string; asOnDate: string }) =>
      invoke(IpcChannels.BANKREC_GET_STATEMENT, payload),
  },
  registers: {
    listFd: (filter?: { status?: FdStatus; search?: string }) =>
      invoke(IpcChannels.REGISTERS_FD_LIST, filter ?? {}),
    getFd: (id: string) => invoke<{ id: string }, FdRegisterDto>(IpcChannels.REGISTERS_FD_GET, { id }),
    saveFd: (payload: FdRegisterDto) => invoke(IpcChannels.REGISTERS_FD_SAVE, payload),
    deleteFd: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.REGISTERS_FD_DELETE, { id }),
    upcomingFdMaturities: (daysAhead?: number) =>
      invoke<{ daysAhead?: number }, UpcomingFdMaturityDto[]>(
        IpcChannels.REGISTERS_FD_UPCOMING_MATURITIES,
        { daysAhead },
      ),
    listProperty: (filter?: string) =>
      invoke<{ filter?: string }, PropertyRegisterEntryDto[]>(
        IpcChannels.REGISTERS_PROPERTY_LIST,
        { filter },
      ),
    getProperty: (id: string) =>
      invoke<{ id: string }, PropertyRegisterEntryDto>(IpcChannels.REGISTERS_PROPERTY_GET, { id }),
    saveProperty: (payload: PropertyRegisterEntryDto) =>
      invoke(IpcChannels.REGISTERS_PROPERTY_SAVE, payload),
    deleteProperty: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.REGISTERS_PROPERTY_DELETE, { id }),
    listSinkingFund: (filter?: { memberId?: string; dateFrom?: string; dateTo?: string }) =>
      invoke(IpcChannels.REGISTERS_SINKING_FUND_LIST, filter ?? {}),
    listIForm: (filter?: string) =>
      invoke<{ filter?: string }, IFormRegisterDto[]>(IpcChannels.REGISTERS_IFORM_LIST, { filter }),
    getIForm: (id: string) =>
      invoke<{ id: string }, IFormRegisterDto>(IpcChannels.REGISTERS_IFORM_GET, { id }),
    saveIForm: (payload: IFormRegisterDto) => invoke(IpcChannels.REGISTERS_IFORM_SAVE, payload),
    deleteIForm: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.REGISTERS_IFORM_DELETE, { id }),
    saveIFormShare: (payload: IFormShareEntryDto) =>
      invoke(IpcChannels.REGISTERS_IFORM_SAVE_SHARE, payload),
    deleteIFormShare: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.REGISTERS_IFORM_DELETE_SHARE, { id }),
    saveIFormTransfer: (payload: IFormShareTransferDto) =>
      invoke(IpcChannels.REGISTERS_IFORM_SAVE_TRANSFER, payload),
    deleteIFormTransfer: (id: string) =>
      invoke<{ id: string }, { deleted: boolean }>(IpcChannels.REGISTERS_IFORM_DELETE_TRANSFER, {
        id,
      }),
  },
  tds: {
    list: (filter?: { partyAccountId?: string; search?: string; unlinkedChallanOnly?: boolean }) =>
      invoke(IpcChannels.TDS_LIST, filter ?? {}),
    get: (id: string) => invoke<{ id: string }, TdsRecordDto>(IpcChannels.TDS_GET, { id }),
    update: (payload: TdsRecordDto) => invoke(IpcChannels.TDS_UPDATE, payload),
    listChallans: () => invoke<Record<string, never>, TdsChallanDto[]>(IpcChannels.TDS_LIST_CHALLANS, {}),
    saveChallan: (payload: TdsChallanDto) => invoke(IpcChannels.TDS_SAVE_CHALLAN, payload),
    generateForm16A: (payload: { partyAccountId: string; financialYearId?: string }) =>
      invoke(IpcChannels.TDS_GENERATE_FORM16A, payload),
  },
});

export type SamApi = typeof window.sams;

declare global {
  interface Window {
    sams: SamApi;
  }
}
