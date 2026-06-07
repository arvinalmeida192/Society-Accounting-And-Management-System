/** IPC error codes — SDD §2.10 */
export const ErrorCodes = {
  ACCOUNTING_IMBALANCE: 'ACCOUNTING_IMBALANCE',
  YEAR_CLOSED: 'YEAR_CLOSED',
  INVALID_DB: 'INVALID_DB',
  SCHEMA_MISMATCH: 'SCHEMA_MISMATCH',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_INACTIVE: 'USER_INACTIVE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  NO_DATABASE: 'NO_DATABASE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface IpcError {
  code: ErrorCode | string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface IpcRequest<T = unknown> {
  requestId: string;
  payload: T;
}

export interface IpcResponse<T = unknown> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: IpcError;
}

export function createSuccessResponse<T>(requestId: string, data: T): IpcResponse<T> {
  return { requestId, success: true, data };
}

export function createErrorResponse(
  requestId: string,
  error: IpcError,
): IpcResponse<never> {
  return { requestId, success: false, error };
}

/** IPC channel names — SDD §25 */
export const IpcChannels = {
  STARTUP_GET_RECENT_DATABASES: 'startup:getRecentDatabases',
  STARTUP_VALIDATE_DATABASE: 'startup:validateDatabase',
  STARTUP_OPEN_DATABASE: 'startup:openDatabase',
  STARTUP_CREATE_SOCIETY: 'startup:createSociety',
  STARTUP_OPEN_NEW_FINANCIAL_YEAR: 'startup:openNewFinancialYear',
  STARTUP_PICK_OPEN_DATABASE: 'startup:pickOpenDatabase',
  STARTUP_PICK_SAVE_DATABASE: 'startup:pickSaveDatabase',
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_SESSION: 'auth:getSession',
  AUTH_CHANGE_PASSWORD: 'auth:changePassword',
  SOCIETY_GET_IDENTITY: 'society:getIdentity',
  SOCIETY_UPDATE_IDENTITY: 'society:updateIdentity',
  SOCIETY_GET_PARAMETERS: 'society:getParameters',
  SOCIETY_UPDATE_PARAMETERS: 'society:updateParameters',
  SOCIETY_VALIDATE_BILL_FREQUENCY: 'society:validateBillFrequencyChange',
  SOCIETY_GET_PROPERTY_INFO: 'society:getPropertyInfo',
  SOCIETY_UPDATE_PROPERTY_INFO: 'society:updatePropertyInfo',
  SOCIETY_GET_REPORT_FORMATS: 'society:getReportFormats',
  SOCIETY_UPDATE_REPORT_FORMATS: 'society:updateReportFormats',
  SOCIETY_LIST_REPORT_TEMPLATES: 'society:listReportTemplates',
  SOCIETY_GET_INTEREST_HELP: 'society:getInterestHelpText',
  COA_GET_TREE: 'coa:getTree',
  COA_LIST_GROUPS: 'coa:listGroups',
  COA_SAVE_GROUP: 'coa:saveGroup',
  COA_LIST_SUBGROUPS: 'coa:listSubgroups',
  COA_SAVE_SUBGROUP: 'coa:saveSubgroup',
  COA_LIST_ACCOUNTS: 'coa:listAccounts',
  COA_GET_ACCOUNT: 'coa:getAccount',
  COA_SAVE_ACCOUNT: 'coa:saveAccount',
  COA_ARCHIVE_ACCOUNT: 'coa:archiveAccount',
  COA_SEARCH_FOR_PICKER: 'coa:searchForPicker',
  COA_SEARCH_MEMBERS: 'coa:searchMembers',
  COA_SEARCH_BANKS: 'coa:searchBanks',
  BUILDING_LIST: 'building:list',
  BUILDING_GET: 'building:get',
  BUILDING_SAVE: 'building:save',
  BUILDING_DELETE: 'building:delete',
  WING_LIST: 'wing:list',
  WING_SAVE: 'wing:save',
  WING_DELETE: 'wing:delete',
  UNIT_LIST: 'unit:list',
  UNIT_GET: 'unit:get',
  UNIT_SAVE: 'unit:save',
  UNIT_ARCHIVE: 'unit:archive',
  UNIT_VALIDATE_NO: 'unit:validateUnitNo',
  REFERENCE_MASTER_LIST: 'referenceMaster:list',
  REFERENCE_MASTER_SAVE: 'referenceMaster:save',
  PARKING_LIST_TARIFF_TYPES: 'parking:listTariffTypes',
  PARKING_SAVE_TARIFF_TYPE: 'parking:saveTariffType',
  PARKING_ADD_TARIFF_RATE: 'parking:addTariffRate',
  PARKING_LIST_TARIFF_RATES: 'parking:listTariffRates',
  PARKING_LIST_SPACES: 'parking:listSpaces',
  PARKING_SAVE_SPACE: 'parking:saveSpace',
  PARKING_LIST_ASSIGNMENTS: 'parking:listAssignments',
  PARKING_SAVE_ASSIGNMENT: 'parking:saveAssignment',
  PARKING_CALCULATE_FOR_BILL: 'parking:calculateForBill',
  MEMBER_LIST: 'member:list',
  MEMBER_GET: 'member:get',
  MEMBER_SAVE_IDENTIFICATION: 'member:saveIdentification',
  MEMBER_SAVE_PERSONAL: 'member:savePersonal',
  MEMBER_SAVE_ADDRESS: 'member:saveAddress',
  MEMBER_SAVE_DEPENDENTS: 'member:saveDependents',
  MEMBER_SAVE_NOMINEES: 'member:saveNominees',
  MEMBER_SAVE_VEHICLES: 'member:saveVehicles',
  MEMBER_SAVE_SHARES: 'member:saveShares',
  MEMBER_SAVE_HOUSING_LOANS: 'member:saveHousingLoans',
  MEMBER_DISPOSE: 'member:dispose',
  MEMBER_CHECK_UNIT_VACANCY: 'member:checkUnitVacancy',
  MEMBER_SAVE_OPENING_BALANCE: 'member:saveOpeningBalance',
  MEMBER_UPLOAD_PHOTO: 'member:uploadPhoto',
  TENANT_LIST: 'tenant:list',
  TENANT_GET_HISTORY: 'tenant:getHistory',
  TENANT_SAVE: 'tenant:save',
  TENANT_ARCHIVE: 'tenant:archive',
  TENANT_VALIDATE_FOR_OCCUPANCY: 'tenant:validateForOccupancy',
  MASTERS_BANK_LIST: 'masters:bank:list',
  MASTERS_BANK_GET: 'masters:bank:get',
  MASTERS_BANK_SAVE: 'masters:bank:save',
  MASTERS_BANK_DELETE: 'masters:bank:delete',
  MASTERS_BANK_LIST_MICR: 'masters:bank:listMicr',
  MASTERS_BANK_SAVE_MICR: 'masters:bank:saveMicr',
  MASTERS_BANK_DELETE_MICR: 'masters:bank:deleteMicr',
  MASTERS_BANK_LOOKUP_MICR: 'masters:bank:lookupMicr',
  MASTERS_NARRATION_LIST: 'masters:narration:list',
  MASTERS_NARRATION_SAVE: 'masters:narration:save',
  MASTERS_NARRATION_DELETE: 'masters:narration:delete',
  MASTERS_ADDRESS_BOOK_LIST: 'masters:addressBook:list',
  MASTERS_ADDRESS_BOOK_SAVE: 'masters:addressBook:save',
  MASTERS_ADDRESS_BOOK_DELETE: 'masters:addressBook:delete',
  MASTERS_CHEQUE_REASON_LIST: 'masters:chequeReason:list',
  MASTERS_CHEQUE_REASON_SAVE: 'masters:chequeReason:save',
  MASTERS_CHEQUE_REASON_DELETE: 'masters:chequeReason:delete',
  MASTERS_CHEQUE_REASON_LIST_DISHONOURED: 'masters:chequeReason:listDishonoured',
  MASTERS_CONTRACTOR_LIST: 'masters:contractor:list',
  MASTERS_CONTRACTOR_SAVE: 'masters:contractor:save',
  MASTERS_CONTRACTOR_DELETE: 'masters:contractor:delete',
  TARIFF_LIST_DEFINITIONS: 'tariff:listDefinitions',
  TARIFF_GET_DEFINITION: 'tariff:getDefinition',
  TARIFF_SAVE_DEFINITION: 'tariff:saveDefinition',
  TARIFF_CLONE_DEFINITION: 'tariff:cloneDefinition',
  TARIFF_REORDER_LINES: 'tariff:reorderLines',
  TARIFF_RESOLVE_FOR_MEMBER: 'tariff:resolveForMember',
  TARIFF_LIST_SETTLEMENT_SEQUENCES: 'tariff:listSettlementSequences',
  TARIFF_GET_SETTLEMENT_SEQUENCE: 'tariff:getSettlementSequence',
  TARIFF_SAVE_SETTLEMENT_SEQUENCE: 'tariff:saveSettlementSequence',
  TARIFF_LIST_BILL_REGISTER_MAPPING: 'tariff:listBillRegisterMapping',
  TARIFF_SAVE_BILL_REGISTER_MAPPING: 'tariff:saveBillRegisterMapping',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels] | string;

export interface UserDto {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface SessionDto {
  sessionToken: string | null;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  role: UserRole | null;
  permissions: string[];
  databasePath: string | null;
  financialYearId: string | null;
  fyLabel: string | null;
  societyName: string | null;
  isReadOnly: boolean;
}

export interface RecentDatabaseEntry {
  path: string;
  label: string;
  lastOpened: string;
}

export interface ValidateDatabasePayload {
  path: string;
}

export interface ValidateDatabaseResult {
  valid: boolean;
  schemaVersion?: string;
  societyName?: string;
  fyLabel?: string;
  isReadOnly?: boolean;
  errorMessage?: string;
}

export interface OpenDatabasePayload {
  path: string;
}

export interface OpenDatabaseResult {
  sessionToken: string;
  societyName: string;
  fyLabel: string;
  isReadOnly: boolean;
}

export interface SocietyIdentityInput {
  societyName: string;
  registrationNumber?: string;
  registrationDate?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  telephone?: string;
  fax?: string;
  email?: string;
  website?: string;
  tan?: string;
  pan?: string;
  tdsCircle?: string;
}

export interface FinancialYearInput {
  startDate: string;
  endDate: string;
}

export interface AdminUserInput {
  username: string;
  password: string;
  displayName: string;
}

export interface CreateSocietyWizardDto {
  identity: SocietyIdentityInput;
  financialYear: FinancialYearInput;
  dbPath: string;
  adminUser: AdminUserInput;
}

export interface CreateSocietyResult {
  dbPath: string;
  sessionToken: string;
  societyName: string;
  fyLabel: string;
}

export interface OpenNewFinancialYearPayload {
  sourceDbPath: string;
  targetDbPath: string;
  carryForwardOptions?: Record<string, boolean>;
}

export interface OpenNewFinancialYearResult {
  dbPath: string;
  sessionToken: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  user: UserDto;
  permissions: string[];
}

export interface LogoutPayload {
  /** empty */
}

export interface LogoutResult {
  success: boolean;
}

export interface GetSessionPayload {
  /** empty */
}

export interface PickDatabaseResult {
  path: string | null;
}

/** SDD §30.1 core enums */
export enum UserRole {
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  OPERATOR = 'OPERATOR',
  COMMITTEE = 'COMMITTEE',
  AUDITOR = 'AUDITOR',
}

export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  PRINT = 'PRINT',
  EXPORT = 'EXPORT',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum YearStorageMode {
  SAME_FILE = 'SAME_FILE',
  SEPARATE_FILES = 'SEPARATE_FILES',
}

export enum BillFrequency {
  MONTHLY = 'MONTHLY',
  BI_MONTHLY = 'BI_MONTHLY',
  QUARTERLY = 'QUARTERLY',
  QUADRUPLE = 'QUADRUPLE',
  HALF_YEARLY = 'HALF_YEARLY',
  YEARLY = 'YEARLY',
}

export enum InterestPattern {
  NONE = 'NONE',
  SIMPLE = 'SIMPLE',
  COMPOUND = 'COMPOUND',
}

export enum SimpleInterestSubType {
  DELAY_DAYS = 'DELAY_DAYS',
  DELAY_MONTHS = 'DELAY_MONTHS',
  COMPLETE_CYCLE = 'COMPLETE_CYCLE',
}

export enum TariffMethod {
  SIMPLE = 'SIMPLE',
  ADVANCE = 'ADVANCE',
}

export enum RebateType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum BillNumberingMode {
  USER_INPUT = 'USER_INPUT',
  AUTO_SERIAL = 'AUTO_SERIAL',
  BUILDING_WISE = 'BUILDING_WISE',
}

export enum LandType {
  FREEHOLD = 'FREEHOLD',
  LEASEHOLD = 'LEASEHOLD',
}

export enum ReportType {
  BILL_REGULAR = 'BILL_REGULAR',
  BILL_SUPPLEMENTARY = 'BILL_SUPPLEMENTARY',
  RECEIPT_MEMBER = 'RECEIPT_MEMBER',
  RECEIPT_GENERAL = 'RECEIPT_GENERAL',
  CHEQUE = 'CHEQUE',
  MEETING_MINUTES = 'MEETING_MINUTES',
  MCACT_101 = 'MCACT_101',
}

export enum TariffBasisFlag {
  BUILDING = 'BUILDING',
  WING = 'WING',
  UNIT = 'UNIT',
  COMPOSITION = 'COMPOSITION',
  TYPE = 'TYPE',
  AREA = 'AREA',
  PERSON = 'PERSON',
  FLOOR = 'FLOOR',
}

export interface AuditFieldsDto {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SocietyIdentityDto extends AuditFieldsDto {
  id: string;
  societyName: string;
  registrationNumber: string | null;
  registrationDate: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  telephone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  tan: string | null;
  pan: string | null;
  tdsCircle: string | null;
}

export interface SocietyParametersDto extends AuditFieldsDto {
  id: string;
  billFrequency: BillFrequency;
  billFrequencyChangedAt: string | null;
  suppressZeroTariffs: boolean;
  mergeParkingOnBill: boolean;
  tariffDecimalPlaces: 0 | 2;
  regularInterestPattern: InterestPattern;
  regularSimpleSubType: SimpleInterestSubType;
  regularInterestRate: number;
  regularInterestRoundToRupee: boolean;
  regularAllowManualOverride: boolean;
  supplementaryInterestPattern: InterestPattern;
  supplementarySimpleSubType: SimpleInterestSubType;
  supplementaryInterestRate: number;
  supplementaryInterestRoundToRupee: boolean;
  supplementaryAllowManualOverride: boolean;
  tariffStructureBasis: TariffBasisFlag[];
  tariffMethod: TariffMethod;
  shareCapitalGroupId: string | null;
  shareCapitalSubgroupId: string | null;
  bankSubgroupId: string | null;
  cashSubgroupId: string | null;
  memberSubgroupId: string | null;
  tenantSubgroupId: string | null;
  incomeExpenseSubgroupId: string | null;
  interestAccountId: string | null;
  adjustmentAccountId: string | null;
  nonOccupancyAccountId: string | null;
  serviceTaxAccountId: string | null;
  educationCessAccountId: string | null;
  nonOccupancyChargePercent: number;
  rebateType: RebateType;
  rebateValue: number;
  serviceTaxPercent: number;
  educationCessPercent: number;
  gstPercent: number;
  billNumberingMode: BillNumberingMode;
  bulkBillStartingNumber: number;
  dualTypeUnitSupport: boolean;
  cashBankGroupId: string | null;
  authorizedSignatory1: string | null;
  authorizedSignatory2: string | null;
  authorizedSignatory3: string | null;
  chequeSignatory1: string | null;
  chequeSignatory2: string | null;
  colourCodedGrids: boolean;
  dueDateOffsetDays: number;
}

export interface PropertyInformationDto extends AuditFieldsDto {
  id: string;
  municipalHouseNo: string | null;
  surveySubDivisionNo: string | null;
  landType: LandType | null;
  annualLeaseRent: number | null;
  totalPlotAreaSqFt: number | null;
  constructedAreaSqFt: number | null;
  totalFlats: number | null;
  landCost: number | null;
  annualNonAgriAssessment: number | null;
  buildingParticulars: string | null;
  completionCertificateDetails: string | null;
  occupationCertificateDetails: string | null;
  occupationDate: string | null;
  municipalAssessmentYear: string | null;
  totalRateableValue: number | null;
  dateOfConveyance: string | null;
  remarks: string | null;
}

export interface ReportTemplateDto {
  id: string;
  reportType: ReportType;
  templateCode: string;
  templateName: string;
  htmlTemplatePath: string;
  cssPath: string | null;
  thumbnailPath: string | null;
  pageSize: 'A4' | 'LEGAL';
  isActive: boolean;
}

export interface ReportFormatConfigDto extends AuditFieldsDto {
  id: string;
  billFormatId: string | null;
  supplementaryBillFormatId: string | null;
  receiptFormatId: string | null;
  generalReceiptFormatId: string | null;
  chequePrintFormatId: string | null;
}

export interface UpdateParametersResult {
  parameters: SocietyParametersDto;
  warnings: string[];
}

export interface ValidateBillFrequencyResult {
  allowed: boolean;
  billCount: number;
  warning: string | null;
}

export interface InterestHelpTextResult {
  title: string;
  body: string;
}

export interface BillingPeriodCalendarDto {
  id: string;
  financialYearId: string;
  periodKey: string;
  periodLabel: string;
  periodStartDate: string;
  periodEndDate: string;
  sequenceNo: number;
}

/** SDD §30.2 — shell for NumberSeriesService (Phase 1) */
export enum SeriesType {
  MR = 'MR',
  GR = 'GR',
  CP = 'CP',
  BP = 'BP',
  CO = 'CO',
  JV = 'JV',
  DN = 'DN',
  CN = 'CN',
  RB = 'RB',
  SB = 'SB',
}

export const SERIES_PREFIX: Record<SeriesType, string> = {
  [SeriesType.MR]: 'MR',
  [SeriesType.GR]: 'GR',
  [SeriesType.CP]: 'CP',
  [SeriesType.BP]: 'BP',
  [SeriesType.CO]: 'CO',
  [SeriesType.JV]: 'JV',
  [SeriesType.DN]: 'DN',
  [SeriesType.CN]: 'CN',
  [SeriesType.RB]: 'RB',
  [SeriesType.SB]: 'SB',
};

export interface PermissionSeedRow {
  role: UserRole;
  resource: string;
  action: PermissionAction;
}

/** Permission key format: resource:action */
export function permissionKey(resource: string, action: PermissionAction): string {
  return `${resource}:${action}`;
}

export interface AppConfigDto {
  recentDatabases: RecentDatabaseEntry[];
  windowBounds?: { x: number; y: number; width: number; height: number };
  explorerExpandedNodes: string[];
}

/** SDD §30.1 — Chart of Accounts enums */
export enum AccountCategoryType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum AccountNature {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export type CoaNodeType = 'CATEGORY' | 'GROUP' | 'SUBGROUP' | 'ACCOUNT';

export interface CoaTreeNode {
  id: string;
  nodeType: CoaNodeType;
  label: string;
  categoryId?: AccountCategoryType;
  groupId?: string;
  subgroupId?: string;
  isActive?: boolean;
  isArchived?: boolean;
  pettyCash?: boolean;
  children?: CoaTreeNode[];
}

export interface AccountGroupDto extends AuditFieldsDto {
  id: string;
  categoryId: AccountCategoryType;
  groupName: string;
  balanceSheetSr: number;
  nature: AccountNature;
  substituteGroupName: string | null;
}

export interface AccountSubgroupDto extends AuditFieldsDto {
  id: string;
  groupId: string;
  subgroupName: string;
  subgroupSr: number;
  substituteSubgroupName: string | null;
}

export interface AccountMasterDto extends AuditFieldsDto {
  id: string;
  subgroupId: string;
  particulars: string;
  openingBalanceDr: number;
  openingBalanceCr: number;
  previousYearAmount: number;
  estimateAmount: number;
  shortCode: string | null;
  serviceTaxApplicable: boolean;
  rebateApplicable: boolean;
  interestFree: boolean;
  pettyCash: boolean;
  isActive: boolean;
  isArchived: boolean;
  memberSubsidiaryId: string | null;
}

export interface AccountMasterDetailDto extends AccountMasterDto {
  categoryId: AccountCategoryType;
  categoryName: string;
  groupId: string;
  groupName: string;
  subgroupName: string;
  closingBalanceDr: number;
  closingBalanceCr: number;
}

export type AccountMasterSaveDto = Omit<
  AccountMasterDto,
  keyof AuditFieldsDto | 'isArchived' | 'memberSubsidiaryId'
> & { id?: string };

export interface ArchiveAccountResult {
  archived: boolean;
  blockReason?: string;
}

export type CoaPickerKind = 'GROUP' | 'SUBGROUP' | 'ACCOUNT' | 'MEMBER' | 'BANK';

export interface AccountPickerItem {
  id: string;
  particulars: string;
  shortCode: string | null;
  subgroupName: string;
  groupName: string;
  categoryName: string;
  label: string;
}

export enum UnitStatus {
  OCCUPIED = 'OCCUPIED',
  VACANT = 'VACANT',
  ARCHIVED = 'ARCHIVED',
}

export type ReferenceMasterType = 'UNIT_AREA' | 'UNIT_TYPE' | 'COMPOSITION' | 'FLOOR';

export interface BuildingDto extends AuditFieldsDto {
  id: string;
  financialYearId: string;
  shortName: string;
  fullName: string;
  totalUnits: number;
  numberOfFloors: number;
}

export interface WingDto extends AuditFieldsDto {
  id: string;
  buildingId: string;
  shortName: string;
  fullName: string;
}

export interface UnitAreaDto extends AuditFieldsDto {
  id: string;
  areaSqFt: number;
  description: string | null;
  isActive: boolean;
}

export interface UnitTypeDto extends AuditFieldsDto {
  id: string;
  typeName: string;
  isActive: boolean;
}

export interface UnitCompositionDto extends AuditFieldsDto {
  id: string;
  compositionName: string;
  isActive: boolean;
}

export interface FloorMasterDto extends AuditFieldsDto {
  id: string;
  srNo: number;
  floorName: string;
  isActive: boolean;
}

export interface UnitDto extends AuditFieldsDto {
  id: string;
  buildingId: string;
  wingId: string;
  unitNo: string;
  floorMasterId: string | null;
  unitTypeId: string | null;
  unitCompositionId: string | null;
  unitAreaId: string | null;
  carpetAreaSqFt: number | null;
  residentialAreaSqFt: number | null;
  commercialAreaSqFt: number | null;
  residentialRateableValue: number | null;
  commercialRateableValue: number | null;
  serialNo: number;
  status: UnitStatus;
  constructionValue: number | null;
  landValue: number | null;
}

export interface UnitDetailDto extends UnitDto {
  buildingShortName: string;
  wingShortName: string;
  floorName: string | null;
  unitTypeName: string | null;
  compositionName: string | null;
  areaSqFt: number | null;
}

export type UnitSaveDto = Omit<UnitDto, keyof AuditFieldsDto | 'serialNo'> & { id?: string };

export interface ParkingTariffTypeDto extends AuditFieldsDto {
  id: string;
  typeName: string;
  isActive: boolean;
}

export interface ParkingTariffRateDto extends AuditFieldsDto {
  id: string;
  parkingTariffTypeId: string;
  effectiveDate: string;
  monthlyRate: number;
}

export interface ParkingSpaceDto extends AuditFieldsDto {
  id: string;
  parkingNo: string;
  parkingTariffTypeId: string;
  chargeAccountId: string;
  isActive: boolean;
}

export interface MemberParkingAssignmentDto extends AuditFieldsDto {
  id: string;
  memberId: string;
  parkingSpaceId: string;
  parkingNo?: string;
  purchaseDate: string;
  disposeDate: string | null;
  isActive: boolean;
}

export interface ParkingChargeLineDto {
  accountMasterId: string;
  chargeName: string;
  parkingNo: string;
  amount: number;
}

export interface DeleteGuardResult {
  deleted: boolean;
  blockReason?: string;
}

export enum MemberGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  WIDOWED = 'WIDOWED',
  DIVORCED = 'DIVORCED',
}

export enum OpeningBalanceType {
  REGULAR = 'REGULAR',
  SUPPLEMENTARY = 'SUPPLEMENTARY',
}

export interface MemberDto extends AuditFieldsDto {
  id: string;
  unitId: string;
  title: string | null;
  memberName: string;
  tenantOccupancy: boolean;
  tenantOccupancyEffectiveFrom: string | null;
  generateRegularBills: boolean;
  generateSupplementaryBills: boolean;
  chargeInterest: boolean;
  disposedAt: string | null;
  disposeReason: string | null;
  photographPath: string | null;
  gender: MemberGender | null;
  dateOfBirth: string | null;
  qualification: string | null;
  religion: string | null;
  occupation: string | null;
  panNo: string | null;
  bloodGroup: string | null;
  maritalStatus: MaritalStatus | null;
  anniversaryType: string | null;
  anniversaryDate: string | null;
  unitPurchaseDate: string | null;
  dateOfSale: string | null;
  associateMember: string | null;
  jointMember: string | null;
  votingRightsMember: string | null;
  memberBankName: string | null;
  memberBankBranch: string | null;
  totalFamilyMembers: number | null;
  memberClass: string | null;
  clubMembershipDeposit: number | null;
  address: string | null;
  residencePhone: string | null;
  officePhone: string | null;
  emailPrimary: string | null;
  emailSecondary: string | null;
  fax: string | null;
  subsidiaryLedgerAccountId: string | null;
}

export interface MemberListItemDto {
  id: string;
  memberName: string;
  unitId: string;
  unitNo: string;
  buildingShortName: string;
  wingShortName: string;
  disposedAt: string | null;
}

export interface MemberIdentificationDto {
  id?: string;
  unitId: string;
  title?: string | null;
  memberName: string;
  tenantOccupancy?: boolean;
  tenantOccupancyEffectiveFrom?: string | null;
  generateRegularBills?: boolean;
  generateSupplementaryBills?: boolean;
  chargeInterest?: boolean;
  unitPurchaseDate?: string | null;
}

export interface MemberPersonalDto {
  id: string;
  photographPath?: string | null;
  gender?: MemberGender | null;
  dateOfBirth?: string | null;
  qualification?: string | null;
  religion?: string | null;
  occupation?: string | null;
  panNo?: string | null;
  bloodGroup?: string | null;
  maritalStatus?: MaritalStatus | null;
  anniversaryType?: string | null;
  anniversaryDate?: string | null;
  associateMember?: string | null;
  jointMember?: string | null;
  votingRightsMember?: string | null;
  memberBankName?: string | null;
  memberBankBranch?: string | null;
  totalFamilyMembers?: number | null;
  memberClass?: string | null;
  clubMembershipDeposit?: number | null;
}

export interface MemberAddressDto {
  id: string;
  address?: string | null;
  residencePhone?: string | null;
  officePhone?: string | null;
  emailPrimary?: string | null;
  emailSecondary?: string | null;
  fax?: string | null;
}

export interface MemberDependentDto extends AuditFieldsDto {
  id: string;
  memberId: string;
  name: string;
  relation: string | null;
  occupation: string | null;
  age: number | null;
  gender: MemberGender | null;
  dateOfBirth: string | null;
  idCardNo: string | null;
  bloodGroup: string | null;
}

export interface MemberNomineeDto extends AuditFieldsDto {
  id: string;
  memberId: string;
  nominationDate: string | null;
  nomineeName: string;
  committeeMeetingDate: string | null;
  subject: string | null;
  revocationDate: string | null;
  remark: string | null;
}

export interface MemberVehicleDto extends AuditFieldsDto {
  id: string;
  memberId: string;
  vehicleName: string | null;
  vehicleNo: string | null;
  registrationNo: string | null;
  registrationDate: string | null;
}

export interface MemberShareDto extends AuditFieldsDto {
  id: string;
  memberId: string;
  allotmentDate: string | null;
  certificateNo: string | null;
  folioNo: string | null;
  numberOfShares: number | null;
  fromShareNo: string | null;
  toShareNo: string | null;
}

export interface MemberHousingLoanDto extends AuditFieldsDto {
  id: string;
  memberId: string;
  bankName: string | null;
  branchName: string | null;
  nocDate: string | null;
  loanAmount: number | null;
  remark: string | null;
}

export interface MemberOpeningBalanceDto extends AuditFieldsDto {
  id: string;
  memberId: string;
  balanceType: OpeningBalanceType;
  principalOB: number;
  interestOB: number;
  serviceTaxOB: number;
  ledgerVoucherId: string | null;
}

export interface MemberFullDto extends MemberDto {
  buildingId: string;
  wingId: string;
  unitNo: string;
  buildingShortName: string;
  wingShortName: string;
  dependents: MemberDependentDto[];
  nominees: MemberNomineeDto[];
  vehicles: MemberVehicleDto[];
  shares: MemberShareDto[];
  housingLoans: MemberHousingLoanDto[];
  openingBalances: MemberOpeningBalanceDto[];
  parkingAssignments: MemberParkingAssignmentDto[];
}

export interface UnitVacancyResult {
  vacant: boolean;
  currentMember?: { id: string; memberName: string };
}

export interface MemberOpeningBalanceSaveDto {
  memberId: string;
  balanceType: OpeningBalanceType;
  principalOB: number;
  interestOB: number;
  serviceTaxOB?: number;
  acknowledgeReconciliation?: boolean;
}

export interface MemberOpeningBalanceResult {
  ob: MemberOpeningBalanceDto;
  ledgerVoucherId: string | null;
  reconciliationWarning?: string;
}

export interface TenantDto extends AuditFieldsDto {
  id: string;
  unitId: string;
  tenantName: string;
  phone: string | null;
  email: string | null;
  licenseAgreementDate: string;
  licenseExpiryDate: string;
  monthlyRent: number | null;
  isActive: boolean;
  archivedAt: string | null;
  unitNo?: string;
  buildingShortName?: string;
  wingShortName?: string;
}

export type TenantSaveDto = Omit<
  TenantDto,
  keyof AuditFieldsDto | 'archivedAt' | 'unitNo' | 'buildingShortName' | 'wingShortName'
> & { id?: string };

export interface TenantOccupancyResult {
  hasActiveTenant: boolean;
  tenant?: { id: string; tenantName: string };
}

export enum VoucherType {
  RECEIPT = 'RECEIPT',
  PAYMENT = 'PAYMENT',
  CONTRA = 'CONTRA',
  JV = 'JV',
  DN = 'DN',
  CN = 'CN',
  PETTY_CASH = 'PETTY_CASH',
}

export enum PartyType {
  VENDOR = 'VENDOR',
  CONTRACTOR = 'CONTRACTOR',
  SOCIETY_BANK = 'SOCIETY_BANK',
  OTHER = 'OTHER',
}

export interface BankMasterDto extends AuditFieldsDto {
  id: string;
  bankName: string;
  branchName: string;
  address: string | null;
  telephone: string | null;
  fax: string | null;
  email: string | null;
  url: string | null;
  contactPerson: string | null;
}

export type BankMasterSaveDto = Omit<BankMasterDto, keyof AuditFieldsDto> & { id?: string };

export interface BankMicrCodeDto extends AuditFieldsDto {
  id: string;
  bankMasterId: string;
  micrCode: string;
  isActive: boolean;
}

export type BankMicrCodeSaveDto = Omit<BankMicrCodeDto, keyof AuditFieldsDto> & { id?: string };

export interface MicrLookupResult {
  micrCode: string;
  bankMasterId: string;
  bankName: string;
  branchName: string;
  address: string | null;
}

export interface NarrationMasterDto extends AuditFieldsDto {
  id: string;
  voucherTableType: VoucherType;
  shortCode: string;
  narrationText: string;
  isActive: boolean;
}

export type NarrationMasterSaveDto = Omit<NarrationMasterDto, keyof AuditFieldsDto> & { id?: string };

export interface AddressBookEntryDto extends AuditFieldsDto {
  id: string;
  accountMasterId: string;
  accountParticulars: string;
  partyType: PartyType;
  officeAddress: string | null;
  otherAddress: string | null;
  bankBranchName: string | null;
  bankAccountNo: string | null;
  pan: string | null;
}

export type AddressBookEntrySaveDto = Omit<
  AddressBookEntryDto,
  keyof AuditFieldsDto | 'accountParticulars'
> & { id?: string };

export interface ChequeCancellationReasonDto extends AuditFieldsDto {
  id: string;
  reasonCode: string;
  reasonDescription: string;
  category: string | null;
}

export type ChequeCancellationReasonSaveDto = Omit<
  ChequeCancellationReasonDto,
  keyof AuditFieldsDto
> & { id?: string };

export interface DishonouredChequeDto {
  id: string;
  chequeNo: string;
  chequeDate: string;
  cancelledOn: string | null;
  bankName: string | null;
  branchName: string | null;
  drawerName: string | null;
  voucherId: string;
  voucherDate: string;
  accountParticulars: string;
  amount: number;
}

export interface ContractorDetailDto extends AuditFieldsDto {
  id: string;
  contractorName: string;
  contractType: string | null;
  contractDate: string | null;
  buildingName: string | null;
  address: string | null;
  telephone: string | null;
}

export type ContractorDetailSaveDto = Omit<ContractorDetailDto, keyof AuditFieldsDto> & { id?: string };

export enum TariffScopeLevel {
  BUILDING = 'BUILDING',
  WING = 'WING',
  UNIT = 'UNIT',
  COMPOSITION = 'COMPOSITION',
  TYPE = 'TYPE',
  AREA = 'AREA',
  PERSON = 'PERSON',
  FLOOR = 'FLOOR',
}

export enum TariffLineType {
  BOTH = 'BOTH',
  TENANT = 'TENANT',
}

export enum BillRegisterDisplayMode {
  SHORT_CODE = 'SHORT_CODE',
  FULL_NAME = 'FULL_NAME',
}

export interface TariffLineDto extends AuditFieldsDto {
  id: string;
  tariffDefinitionId: string;
  srNo: number;
  accountMasterId: string;
  accountParticulars: string;
  accountShortCode: string | null;
  amount: number;
  tariffType: TariffLineType;
  remark: string | null;
}

export interface TariffDefinitionDto extends AuditFieldsDto {
  id: string;
  financialYearId: string;
  effectiveDate: string;
  scopeLevel: TariffScopeLevel;
  scopeRefId: string | null;
  scopeLabel: string | null;
  isAdvanceMethod: boolean;
  isReadOnly: boolean;
  lines: TariffLineDto[];
}

export interface TariffDefinitionSaveDto {
  id?: string;
  effectiveDate: string;
  scopeLevel: TariffScopeLevel;
  scopeRefId?: string | null;
  isAdvanceMethod?: boolean;
  lines: Array<{
    id?: string;
    srNo: number;
    accountMasterId: string;
    amount: number;
    tariffType: TariffLineType;
    remark?: string | null;
  }>;
}

export interface TariffResolvedLineDto {
  srNo: number;
  accountMasterId: string;
  accountParticulars: string;
  accountShortCode: string | null;
  amount: number;
  tariffType: TariffLineType;
  remark: string | null;
}

export interface TariffResolveResult {
  sourceDefinitionId: string;
  scopeLevel: TariffScopeLevel;
  scopeRefId: string | null;
  isAdvanceMethod: boolean;
  lines: TariffResolvedLineDto[];
}

export interface TariffSettlementSequenceLineDto extends AuditFieldsDto {
  id: string;
  sequenceId: string;
  srNo: number;
  accountMasterId: string;
  accountParticulars: string;
  accountShortCode: string | null;
  remark: string | null;
}

export interface TariffSettlementSequenceDto extends AuditFieldsDto {
  id: string;
  financialYearId: string;
  effectiveDate: string;
  isReadOnly: boolean;
  lines: TariffSettlementSequenceLineDto[];
}

export interface TariffSettlementSequenceSaveDto {
  id?: string;
  effectiveDate: string;
  lines: Array<{
    id?: string;
    srNo: number;
    accountMasterId: string;
    remark?: string | null;
  }>;
}

export interface TariffBillRegisterMappingDto extends AuditFieldsDto {
  id: string;
  financialYearId: string;
  srNo: number;
  accountMasterId: string;
  accountParticulars: string;
  accountShortCode: string | null;
  displayMode: BillRegisterDisplayMode;
}

export interface TariffBillRegisterMappingSaveDto {
  rows: Array<{
    id?: string;
    srNo: number;
    accountMasterId: string;
    displayMode: BillRegisterDisplayMode;
  }>;
}
