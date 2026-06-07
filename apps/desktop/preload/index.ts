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
  type SocietyIdentityDto,
  type SocietyParametersDto,
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
});

export type SamApi = typeof window.sams;

declare global {
  interface Window {
    sams: SamApi;
  }
}
