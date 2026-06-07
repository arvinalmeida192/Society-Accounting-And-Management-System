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

/** IPC channel names — extended in later phases; SDD §25 */
export const IpcChannels = {
  AUTH_GET_SESSION: 'auth:getSession',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels] | string;

export interface SessionDto {
  userId: string | null;
  username: string | null;
  role: UserRole | null;
  permissions: string[];
  databasePath: string | null;
  isReadOnly: boolean;
}

export interface GetSessionPayload {
  /** empty */
}

/** SDD §30.1 core enums (Phase 1 subset) */
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
