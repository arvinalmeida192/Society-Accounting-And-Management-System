import type { Prisma, PrismaClient } from '@prisma/client';
import {
  BillFrequency,
  InterestPattern,
  type PropertyInformationDto,
  type ReportFormatConfigDto,
  type ReportTemplateDto,
  type ReportType,
  type SimpleInterestSubType,
  type SocietyIdentityDto,
  type SocietyParametersDto,
  type TariffBasisFlag,
  type UpdateParametersResult,
  type ValidateBillFrequencyResult,
} from '@sams/shared-types';
import { regenerateBillingPeriodCalendar } from './billing-period-service.js';
import { getInterestHelpText } from './interest-help-text.js';

function toIso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

function parseTariffBasis(json: string): TariffBasisFlag[] {
  try {
    const parsed = JSON.parse(json) as TariffBasisFlag[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapIdentity(record: {
  id: string;
  societyName: string;
  registrationNumber: string | null;
  registrationDate: Date | null;
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
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): SocietyIdentityDto {
  return {
    id: record.id,
    societyName: record.societyName,
    registrationNumber: record.registrationNumber,
    registrationDate: toIso(record.registrationDate),
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    addressLine3: record.addressLine3,
    city: record.city,
    state: record.state,
    pinCode: record.pinCode,
    telephone: record.telephone,
    fax: record.fax,
    email: record.email,
    website: record.website,
    tan: record.tan,
    pan: record.pan,
    tdsCircle: record.tdsCircle,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapParameters(record: {
  id: string;
  billFrequency: string;
  billFrequencyChangedAt: Date | null;
  suppressZeroTariffs: boolean;
  mergeParkingOnBill: boolean;
  tariffDecimalPlaces: number;
  regularInterestPattern: string;
  regularSimpleSubType: string;
  regularInterestRate: Prisma.Decimal;
  regularInterestRoundToRupee: boolean;
  regularAllowManualOverride: boolean;
  supplementaryInterestPattern: string;
  supplementarySimpleSubType: string;
  supplementaryInterestRate: Prisma.Decimal;
  supplementaryInterestRoundToRupee: boolean;
  supplementaryAllowManualOverride: boolean;
  tariffStructureBasis: string;
  tariffMethod: string;
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
  nonOccupancyChargePercent: Prisma.Decimal;
  rebateType: string;
  rebateValue: Prisma.Decimal;
  serviceTaxPercent: Prisma.Decimal;
  educationCessPercent: Prisma.Decimal;
  gstPercent: Prisma.Decimal;
  billNumberingMode: string;
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
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): SocietyParametersDto {
  return {
    id: record.id,
    billFrequency: record.billFrequency as BillFrequency,
    billFrequencyChangedAt: toIso(record.billFrequencyChangedAt),
    suppressZeroTariffs: record.suppressZeroTariffs,
    mergeParkingOnBill: record.mergeParkingOnBill,
    tariffDecimalPlaces: record.tariffDecimalPlaces === 0 ? 0 : 2,
    regularInterestPattern: record.regularInterestPattern as InterestPattern,
    regularSimpleSubType: record.regularSimpleSubType as SimpleInterestSubType,
    regularInterestRate: decimalToNumber(record.regularInterestRate),
    regularInterestRoundToRupee: record.regularInterestRoundToRupee,
    regularAllowManualOverride: record.regularAllowManualOverride,
    supplementaryInterestPattern: record.supplementaryInterestPattern as InterestPattern,
    supplementarySimpleSubType: record.supplementarySimpleSubType as SimpleInterestSubType,
    supplementaryInterestRate: decimalToNumber(record.supplementaryInterestRate),
    supplementaryInterestRoundToRupee: record.supplementaryInterestRoundToRupee,
    supplementaryAllowManualOverride: record.supplementaryAllowManualOverride,
    tariffStructureBasis: parseTariffBasis(record.tariffStructureBasis),
    tariffMethod: record.tariffMethod as SocietyParametersDto['tariffMethod'],
    shareCapitalGroupId: record.shareCapitalGroupId,
    shareCapitalSubgroupId: record.shareCapitalSubgroupId,
    bankSubgroupId: record.bankSubgroupId,
    cashSubgroupId: record.cashSubgroupId,
    memberSubgroupId: record.memberSubgroupId,
    tenantSubgroupId: record.tenantSubgroupId,
    incomeExpenseSubgroupId: record.incomeExpenseSubgroupId,
    interestAccountId: record.interestAccountId,
    adjustmentAccountId: record.adjustmentAccountId,
    nonOccupancyAccountId: record.nonOccupancyAccountId,
    serviceTaxAccountId: record.serviceTaxAccountId,
    educationCessAccountId: record.educationCessAccountId,
    nonOccupancyChargePercent: decimalToNumber(record.nonOccupancyChargePercent),
    rebateType: record.rebateType as SocietyParametersDto['rebateType'],
    rebateValue: decimalToNumber(record.rebateValue),
    serviceTaxPercent: decimalToNumber(record.serviceTaxPercent),
    educationCessPercent: decimalToNumber(record.educationCessPercent),
    gstPercent: decimalToNumber(record.gstPercent),
    billNumberingMode: record.billNumberingMode as SocietyParametersDto['billNumberingMode'],
    bulkBillStartingNumber: record.bulkBillStartingNumber,
    dualTypeUnitSupport: record.dualTypeUnitSupport,
    cashBankGroupId: record.cashBankGroupId,
    authorizedSignatory1: record.authorizedSignatory1,
    authorizedSignatory2: record.authorizedSignatory2,
    authorizedSignatory3: record.authorizedSignatory3,
    chequeSignatory1: record.chequeSignatory1,
    chequeSignatory2: record.chequeSignatory2,
    colourCodedGrids: record.colourCodedGrids,
    dueDateOffsetDays: record.dueDateOffsetDays,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function validateInterestRates(dto: SocietyParametersDto): Record<string, string> {
  const errors: Record<string, string> = {};
  if (
    dto.regularInterestPattern !== InterestPattern.NONE &&
    dto.regularInterestRate <= 0
  ) {
    errors.regularInterestRate = 'Regular interest rate must be greater than zero.';
  }
  if (
    dto.supplementaryInterestPattern !== InterestPattern.NONE &&
    dto.supplementaryInterestRate <= 0
  ) {
    errors.supplementaryInterestRate =
      'Supplementary interest rate must be greater than zero.';
  }
  if (dto.tariffStructureBasis.length === 0) {
    errors.tariffStructureBasis = 'Select at least one tariff structure basis.';
  }
  return errors;
}

async function countBillsInFinancialYear(client: PrismaClient): Promise<number> {
  return client.bill.count({ where: { billType: 'REGULAR' } });
}

export async function getSocietyIdentity(client: PrismaClient): Promise<SocietyIdentityDto> {
  const record = await client.societyIdentity.findFirstOrThrow();
  return mapIdentity(record);
}

export async function updateSocietyIdentity(
  client: PrismaClient,
  dto: SocietyIdentityDto,
  actorId: string,
): Promise<SocietyIdentityDto> {
  if (!dto.societyName?.trim()) {
    throw new Error('Society name is required.');
  }

  const record = await client.societyIdentity.update({
    where: { id: dto.id },
    data: {
      societyName: dto.societyName.trim(),
      registrationNumber: dto.registrationNumber?.trim() || null,
      registrationDate: parseOptionalDate(dto.registrationDate),
      addressLine1: dto.addressLine1?.trim() || null,
      addressLine2: dto.addressLine2?.trim() || null,
      addressLine3: dto.addressLine3?.trim() || null,
      city: dto.city?.trim() || null,
      state: dto.state?.trim() || null,
      pinCode: dto.pinCode?.trim() || null,
      telephone: dto.telephone?.trim() || null,
      fax: dto.fax?.trim() || null,
      email: dto.email?.trim() || null,
      website: dto.website?.trim() || null,
      tan: dto.tan?.trim() || null,
      pan: dto.pan?.trim() || null,
      tdsCircle: dto.tdsCircle?.trim() || null,
      updatedBy: actorId,
    },
  });

  return mapIdentity(record);
}

export async function getSocietyParameters(client: PrismaClient): Promise<SocietyParametersDto> {
  const record = await client.societyParameters.findFirstOrThrow();
  return mapParameters(record);
}

export async function validateBillFrequencyChange(
  client: PrismaClient,
  newFrequency: BillFrequency,
): Promise<ValidateBillFrequencyResult> {
  const current = await client.societyParameters.findFirstOrThrow();
  const billCount = await countBillsInFinancialYear(client);

  if (current.billFrequency === newFrequency) {
    return { allowed: true, billCount, warning: null };
  }

  if (billCount > 0) {
    return {
      allowed: true,
      billCount,
      warning: `Bills have already been generated (${billCount}) in the current year. Changing frequency may affect billing continuity.`,
    };
  }

  return { allowed: true, billCount: 0, warning: null };
}

export async function updateSocietyParameters(
  client: PrismaClient,
  dto: SocietyParametersDto,
  actorId: string,
  financialYearId: string,
  acknowledgeFrequencyWarning = false,
): Promise<UpdateParametersResult> {
  const errors = validateInterestRates(dto);
  if (Object.keys(errors).length > 0) {
    throw Object.assign(new Error(Object.values(errors).join(' ')), { fieldErrors: errors });
  }

  const current = await client.societyParameters.findFirstOrThrow();
  const warnings: string[] = [];
  let frequencyChanged = false;

  if (current.billFrequency !== dto.billFrequency) {
    const validation = await validateBillFrequencyChange(client, dto.billFrequency);
    if (validation.warning) {
      warnings.push(validation.warning);
      if (!acknowledgeFrequencyWarning && validation.billCount > 0) {
        throw Object.assign(new Error(validation.warning), {
          code: 'FREQUENCY_CHANGE_WARNING',
        });
      }
    }
    frequencyChanged = true;
  }

  const record = await client.societyParameters.update({
    where: { id: dto.id },
    data: {
      billFrequency: dto.billFrequency,
      billFrequencyChangedAt: frequencyChanged ? new Date() : current.billFrequencyChangedAt,
      suppressZeroTariffs: dto.suppressZeroTariffs,
      mergeParkingOnBill: dto.mergeParkingOnBill,
      tariffDecimalPlaces: dto.tariffDecimalPlaces,
      regularInterestPattern: dto.regularInterestPattern,
      regularSimpleSubType: dto.regularSimpleSubType,
      regularInterestRate: dto.regularInterestRate,
      regularInterestRoundToRupee: dto.regularInterestRoundToRupee,
      regularAllowManualOverride: dto.regularAllowManualOverride,
      supplementaryInterestPattern: dto.supplementaryInterestPattern,
      supplementarySimpleSubType: dto.supplementarySimpleSubType,
      supplementaryInterestRate: dto.supplementaryInterestRate,
      supplementaryInterestRoundToRupee: dto.supplementaryInterestRoundToRupee,
      supplementaryAllowManualOverride: dto.supplementaryAllowManualOverride,
      tariffStructureBasis: JSON.stringify(dto.tariffStructureBasis),
      tariffMethod: dto.tariffMethod,
      shareCapitalGroupId: dto.shareCapitalGroupId,
      shareCapitalSubgroupId: dto.shareCapitalSubgroupId,
      bankSubgroupId: dto.bankSubgroupId,
      cashSubgroupId: dto.cashSubgroupId,
      memberSubgroupId: dto.memberSubgroupId,
      tenantSubgroupId: dto.tenantSubgroupId,
      incomeExpenseSubgroupId: dto.incomeExpenseSubgroupId,
      interestAccountId: dto.interestAccountId,
      adjustmentAccountId: dto.adjustmentAccountId,
      nonOccupancyAccountId: dto.nonOccupancyAccountId,
      serviceTaxAccountId: dto.serviceTaxAccountId,
      educationCessAccountId: dto.educationCessAccountId,
      nonOccupancyChargePercent: dto.nonOccupancyChargePercent,
      rebateType: dto.rebateType,
      rebateValue: dto.rebateValue,
      serviceTaxPercent: dto.serviceTaxPercent,
      educationCessPercent: dto.educationCessPercent,
      gstPercent: dto.gstPercent,
      billNumberingMode: dto.billNumberingMode,
      bulkBillStartingNumber: dto.bulkBillStartingNumber,
      dualTypeUnitSupport: dto.dualTypeUnitSupport,
      cashBankGroupId: dto.cashBankGroupId,
      authorizedSignatory1: dto.authorizedSignatory1,
      authorizedSignatory2: dto.authorizedSignatory2,
      authorizedSignatory3: dto.authorizedSignatory3,
      chequeSignatory1: dto.chequeSignatory1,
      chequeSignatory2: dto.chequeSignatory2,
      colourCodedGrids: dto.colourCodedGrids,
      dueDateOffsetDays: dto.dueDateOffsetDays,
      updatedBy: actorId,
    },
  });

  if (frequencyChanged) {
    const fy = await client.financialYear.findUniqueOrThrow({ where: { id: financialYearId } });
    await regenerateBillingPeriodCalendar(client, {
      financialYearId,
      startDate: fy.startDate,
      endDate: fy.endDate,
      billFrequency: dto.billFrequency,
      actorId,
    });
  }

  return { parameters: mapParameters(record), warnings };
}

export async function getPropertyInformation(
  client: PrismaClient,
): Promise<PropertyInformationDto> {
  const record = await client.propertyInformation.findFirstOrThrow();
  return {
    id: record.id,
    municipalHouseNo: record.municipalHouseNo,
    surveySubDivisionNo: record.surveySubDivisionNo,
    landType: record.landType as PropertyInformationDto['landType'],
    annualLeaseRent: record.annualLeaseRent ? decimalToNumber(record.annualLeaseRent) : null,
    totalPlotAreaSqFt: record.totalPlotAreaSqFt ? decimalToNumber(record.totalPlotAreaSqFt) : null,
    constructedAreaSqFt: record.constructedAreaSqFt
      ? decimalToNumber(record.constructedAreaSqFt)
      : null,
    totalFlats: record.totalFlats,
    landCost: record.landCost ? decimalToNumber(record.landCost) : null,
    annualNonAgriAssessment: record.annualNonAgriAssessment
      ? decimalToNumber(record.annualNonAgriAssessment)
      : null,
    buildingParticulars: record.buildingParticulars,
    completionCertificateDetails: record.completionCertificateDetails,
    occupationCertificateDetails: record.occupationCertificateDetails,
    occupationDate: toIso(record.occupationDate),
    municipalAssessmentYear: record.municipalAssessmentYear,
    totalRateableValue: record.totalRateableValue
      ? decimalToNumber(record.totalRateableValue)
      : null,
    dateOfConveyance: toIso(record.dateOfConveyance),
    remarks: record.remarks,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function updatePropertyInformation(
  client: PrismaClient,
  dto: PropertyInformationDto,
  actorId: string,
): Promise<PropertyInformationDto> {
  await client.propertyInformation.update({
    where: { id: dto.id },
    data: {
      municipalHouseNo: dto.municipalHouseNo,
      surveySubDivisionNo: dto.surveySubDivisionNo,
      landType: dto.landType,
      annualLeaseRent: dto.annualLeaseRent,
      totalPlotAreaSqFt: dto.totalPlotAreaSqFt,
      constructedAreaSqFt: dto.constructedAreaSqFt,
      totalFlats: dto.totalFlats,
      landCost: dto.landCost,
      annualNonAgriAssessment: dto.annualNonAgriAssessment,
      buildingParticulars: dto.buildingParticulars,
      completionCertificateDetails: dto.completionCertificateDetails,
      occupationCertificateDetails: dto.occupationCertificateDetails,
      occupationDate: parseOptionalDate(dto.occupationDate),
      municipalAssessmentYear: dto.municipalAssessmentYear,
      totalRateableValue: dto.totalRateableValue,
      dateOfConveyance: parseOptionalDate(dto.dateOfConveyance),
      remarks: dto.remarks,
      updatedBy: actorId,
    },
  });

  return getPropertyInformation(client);
}

export async function getReportFormatConfig(
  client: PrismaClient,
): Promise<ReportFormatConfigDto> {
  const record = await client.reportFormatConfig.findFirstOrThrow();
  return {
    id: record.id,
    billFormatId: record.billFormatId,
    supplementaryBillFormatId: record.supplementaryBillFormatId,
    receiptFormatId: record.receiptFormatId,
    generalReceiptFormatId: record.generalReceiptFormatId,
    chequePrintFormatId: record.chequePrintFormatId,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function updateReportFormatConfig(
  client: PrismaClient,
  dto: ReportFormatConfigDto,
  actorId: string,
): Promise<ReportFormatConfigDto> {
  const record = await client.reportFormatConfig.update({
    where: { id: dto.id },
    data: {
      billFormatId: dto.billFormatId,
      supplementaryBillFormatId: dto.supplementaryBillFormatId,
      receiptFormatId: dto.receiptFormatId,
      generalReceiptFormatId: dto.generalReceiptFormatId,
      chequePrintFormatId: dto.chequePrintFormatId,
      updatedBy: actorId,
    },
  });

  return {
    id: record.id,
    billFormatId: record.billFormatId,
    supplementaryBillFormatId: record.supplementaryBillFormatId,
    receiptFormatId: record.receiptFormatId,
    generalReceiptFormatId: record.generalReceiptFormatId,
    chequePrintFormatId: record.chequePrintFormatId,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function listReportTemplates(
  client: PrismaClient,
  reportType: ReportType,
): Promise<ReportTemplateDto[]> {
  const records = await client.reportTemplate.findMany({
    where: { reportType, isActive: true },
    orderBy: { templateCode: 'asc' },
  });

  return records.map((record) => ({
    id: record.id,
    reportType: record.reportType as ReportType,
    templateCode: record.templateCode,
    templateName: record.templateName,
    htmlTemplatePath: record.htmlTemplatePath,
    cssPath: record.cssPath,
    thumbnailPath: record.thumbnailPath,
    pageSize: record.pageSize as ReportTemplateDto['pageSize'],
    isActive: record.isActive,
  }));
}

export { getInterestHelpText };
