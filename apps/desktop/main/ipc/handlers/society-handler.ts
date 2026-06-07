import {
  BillFrequency,
  type PropertyInformationDto,
  type ReportFormatConfigDto,
  type ReportType,
  type SimpleInterestSubType,
  type SocietyIdentityDto,
  type SocietyParametersDto,
} from '@sams/shared-types';
import { PermissionAction } from '@sams/shared-types';
import {
  getInterestHelpText,
  getPropertyInformation,
  getReportFormatConfig,
  getSocietyIdentity,
  getSocietyParameters,
  listReportTemplates,
  updatePropertyInformation,
  updateReportFormatConfig,
  updateSocietyIdentity,
  updateSocietyParameters,
  validateBillFrequencyChange,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) {
    throw new Error('User session is required.');
  }
  return userId;
}

function requireFinancialYearId(): string {
  const financialYearId = sessionManager.get().financialYearId;
  if (!financialYearId) {
    throw new Error('Financial year context is required.');
  }
  return financialYearId;
}

export const societyHandlers = {
  getIdentity: (async () => getSocietyIdentity(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    SocietyIdentityDto
  >,

  updateIdentity: (async (_ctx, payload: SocietyIdentityDto) =>
    updateSocietyIdentity(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    SocietyIdentityDto,
    SocietyIdentityDto
  >,

  getParameters: (async () => getSocietyParameters(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    SocietyParametersDto
  >,

  updateParameters: (async (
    _ctx,
    payload: SocietyParametersDto & { acknowledgeFrequencyWarning?: boolean },
  ) => {
    const { acknowledgeFrequencyWarning, ...dto } = payload;
    return updateSocietyParameters(
      getActivePrisma(),
      dto,
      requireUserId(),
      requireFinancialYearId(),
      acknowledgeFrequencyWarning ?? false,
    );
  }) as IpcHandler<
    SocietyParametersDto & { acknowledgeFrequencyWarning?: boolean },
    Awaited<ReturnType<typeof updateSocietyParameters>>
  >,

  validateBillFrequencyChange: (async (_ctx, payload: { newFrequency: BillFrequency }) =>
    validateBillFrequencyChange(getActivePrisma(), payload.newFrequency)) as IpcHandler<
    { newFrequency: BillFrequency },
    Awaited<ReturnType<typeof validateBillFrequencyChange>>
  >,

  getPropertyInfo: (async () => getPropertyInformation(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    PropertyInformationDto
  >,

  updatePropertyInfo: (async (_ctx, payload: PropertyInformationDto) =>
    updatePropertyInformation(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    PropertyInformationDto,
    PropertyInformationDto
  >,

  getReportFormats: (async () => getReportFormatConfig(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    ReportFormatConfigDto
  >,

  updateReportFormats: (async (_ctx, payload: ReportFormatConfigDto) =>
    updateReportFormatConfig(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    ReportFormatConfigDto,
    ReportFormatConfigDto
  >,

  listReportTemplates: (async (_ctx, payload: { reportType: ReportType }) =>
    listReportTemplates(getActivePrisma(), payload.reportType)) as IpcHandler<
    { reportType: ReportType },
    Awaited<ReturnType<typeof listReportTemplates>>
  >,

  getInterestHelpText: (async (_ctx, payload: { subType: SimpleInterestSubType }) =>
    getInterestHelpText(payload.subType)) as IpcHandler<
    { subType: SimpleInterestSubType },
    ReturnType<typeof getInterestHelpText>
  >,
};

export const societyReadOptions = {
  resource: 'society.parameters',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const societyUpdateOptions = {
  resource: 'society.parameters',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};
