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
