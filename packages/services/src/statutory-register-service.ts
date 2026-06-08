import type { PrismaClient } from '@prisma/client';
import {
  FdStatus as PrismaFdStatus,
  VoucherType as PrismaVoucherType,
} from '@prisma/client';
import {
  FdStatus,
  type FdRegisterDto,
  IFormRegisterDto,
  IFormShareEntryDto,
  IFormShareTransferDto,
  PropertyRegisterEntryDto,
  SinkingFundEntryDto,
  UpcomingFdMaturityDto,
} from '@sams/shared-types';
import { parseIsoDate } from './financial-year.js';
import { assertWritable } from './assert-writable.js';

type PostedReceiptVoucher = {
  id: string;
  financialYearId: string;
  voucherType: string;
  voucherDate: Date;
  lines: Array<{
    id: string;
    drAmount: { toString(): string };
    crAmount: { toString(): string };
    memberId: string | null;
    accountMasterId: string;
  }>;
};

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseIsoDate(value, 'date');
}

async function getActiveFinancialYearId(client: PrismaClient): Promise<string> {
  const fy = await client.financialYear.findFirst({ orderBy: { startDate: 'desc' } });
  if (!fy) throw new Error('No financial year configured.');
  return fy.id;
}

async function nextSrNo(
  client: PrismaClient,
  table: 'property' | 'sinkingFund' | 'iform',
  financialYearId: string,
): Promise<number> {
  if (table === 'property') {
    const max = await client.propertyRegisterEntry.aggregate({
      where: { financialYearId },
      _max: { srNo: true },
    });
    return (max._max.srNo ?? 0) + 1;
  }
  if (table === 'sinkingFund') {
    const max = await client.sinkingFundRegisterEntry.aggregate({
      where: { financialYearId },
      _max: { srNo: true },
    });
    return (max._max.srNo ?? 0) + 1;
  }
  const max = await client.iFormRegister.aggregate({
    where: { financialYearId },
    _max: { srNo: true },
  });
  return (max._max.srNo ?? 0) + 1;
}

function resolveFdStatus(maturityDate: Date): FdStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturity = new Date(maturityDate);
  maturity.setHours(0, 0, 0, 0);
  return maturity < today ? FdStatus.MATURED : FdStatus.ACTIVE;
}

function mapFd(record: {
  id: string;
  financialYearId: string;
  fdDate: Date;
  fdrNo: string;
  bankName: string;
  amount: { toString(): string };
  fdType: string | null;
  durationMonths: number;
  interestRate: { toString(): string };
  effectiveDate: Date;
  maturityDate: Date;
  remarks: string | null;
  status: PrismaFdStatus;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): FdRegisterDto {
  const status = resolveFdStatus(record.maturityDate);
  return {
    id: record.id,
    financialYearId: record.financialYearId,
    fdDate: record.fdDate.toISOString().slice(0, 10),
    fdrNo: record.fdrNo,
    bankName: record.bankName,
    amount: toNumber(record.amount),
    fdType: record.fdType,
    durationMonths: record.durationMonths,
    interestRate: toNumber(record.interestRate),
    effectiveDate: record.effectiveDate.toISOString().slice(0, 10),
    maturityDate: record.maturityDate.toISOString().slice(0, 10),
    remarks: record.remarks,
    status,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapProperty(record: {
  id: string;
  financialYearId: string;
  srNo: number;
  coPartnerMemberId: string | null;
  coPartnerMemberName: string | null;
  possessionDate: Date | null;
  tenementNo: string | null;
  flatNo: string;
  floorNo: string | null;
  description: string | null;
  area: { toString(): string } | null;
  cost: { toString(): string } | null;
  landValue: { toString(): string } | null;
  constructionValue: { toString(): string } | null;
  annualGroundRent: { toString(): string } | null;
  cessationDate: Date | null;
  remark: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): PropertyRegisterEntryDto {
  return {
    id: record.id,
    financialYearId: record.financialYearId,
    srNo: record.srNo,
    coPartnerMemberId: record.coPartnerMemberId,
    coPartnerMemberName: record.coPartnerMemberName,
    possessionDate: record.possessionDate?.toISOString().slice(0, 10) ?? null,
    tenementNo: record.tenementNo,
    flatNo: record.flatNo,
    floorNo: record.floorNo,
    description: record.description,
    area: record.area != null ? toNumber(record.area) : null,
    cost: record.cost != null ? toNumber(record.cost) : null,
    landValue: record.landValue != null ? toNumber(record.landValue) : null,
    constructionValue:
      record.constructionValue != null ? toNumber(record.constructionValue) : null,
    annualGroundRent:
      record.annualGroundRent != null ? toNumber(record.annualGroundRent) : null,
    cessationDate: record.cessationDate?.toISOString().slice(0, 10) ?? null,
    remark: record.remark,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapSinkingFund(record: {
  id: string;
  financialYearId: string;
  srNo: number;
  memberId: string;
  flatNo: string;
  flatValueExclLand: { toString(): string };
  requiredContribution: { toString(): string };
  receiptDate: Date;
  amountContributed: { toString(): string };
  remark: string | null;
  sourceVoucherId: string;
  member?: { memberName: string } | null;
  sourceVoucher?: { systemVoucherNo: string } | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): SinkingFundEntryDto {
  return {
    id: record.id,
    financialYearId: record.financialYearId,
    srNo: record.srNo,
    memberId: record.memberId,
    memberName: record.member?.memberName ?? null,
    flatNo: record.flatNo,
    flatValueExclLand: toNumber(record.flatValueExclLand),
    requiredContribution: toNumber(record.requiredContribution),
    receiptDate: record.receiptDate.toISOString().slice(0, 10),
    amountContributed: toNumber(record.amountContributed),
    remark: record.remark,
    sourceVoucherId: record.sourceVoucherId,
    sourceVoucherNo: record.sourceVoucher?.systemVoucherNo ?? null,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapShareEntry(record: {
  id: string;
  iFormRegisterId: string;
  onDate: Date | null;
  cashBookFolio: string | null;
  applicationDetails: string | null;
  amountCall1: { toString(): string } | null;
  amountCall2: { toString(): string } | null;
  totalAmount: { toString(): string } | null;
  numberOfShares: number | null;
  certificateSerialNo: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): IFormShareEntryDto {
  return {
    id: record.id,
    iFormRegisterId: record.iFormRegisterId,
    onDate: record.onDate?.toISOString().slice(0, 10) ?? null,
    cashBookFolio: record.cashBookFolio,
    applicationDetails: record.applicationDetails,
    amountCall1: record.amountCall1 != null ? toNumber(record.amountCall1) : null,
    amountCall2: record.amountCall2 != null ? toNumber(record.amountCall2) : null,
    totalAmount: record.totalAmount != null ? toNumber(record.totalAmount) : null,
    numberOfShares: record.numberOfShares,
    certificateSerialNo: record.certificateSerialNo,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapShareTransfer(record: {
  id: string;
  iFormRegisterId: string;
  onDate: Date | null;
  cashBookFolio: string | null;
  unitNo: string | null;
  registerNo: string | null;
  serialNo: string | null;
  certificatesCount: number | null;
  sharesTransferred: number | null;
  balanceShares: number | null;
  balanceCertificateSerial: string | null;
  balanceAmount: { toString(): string } | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): IFormShareTransferDto {
  return {
    id: record.id,
    iFormRegisterId: record.iFormRegisterId,
    onDate: record.onDate?.toISOString().slice(0, 10) ?? null,
    cashBookFolio: record.cashBookFolio,
    unitNo: record.unitNo,
    registerNo: record.registerNo,
    serialNo: record.serialNo,
    certificatesCount: record.certificatesCount,
    sharesTransferred: record.sharesTransferred,
    balanceShares: record.balanceShares,
    balanceCertificateSerial: record.balanceCertificateSerial,
    balanceAmount: record.balanceAmount != null ? toNumber(record.balanceAmount) : null,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapIForm(record: {
  id: string;
  financialYearId: string;
  srNo: number;
  memberId: string;
  admissionDate: Date | null;
  admissionFeeDate: Date | null;
  fullName: string;
  unitNo: string;
  address: string | null;
  occupation: string | null;
  ageOnAdmission: number | null;
  nomineeName: string | null;
  nominationDate: Date | null;
  cessationDate: Date | null;
  cessationReason: string | null;
  remarks: string | null;
  shareEntries?: Array<{
    id: string;
    iFormRegisterId: string;
    onDate: Date | null;
    cashBookFolio: string | null;
    applicationDetails: string | null;
    amountCall1: { toString(): string } | null;
    amountCall2: { toString(): string } | null;
    totalAmount: { toString(): string } | null;
    numberOfShares: number | null;
    certificateSerialNo: string | null;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
  }>;
  shareTransfers?: Array<{
    id: string;
    iFormRegisterId: string;
    onDate: Date | null;
    cashBookFolio: string | null;
    unitNo: string | null;
    registerNo: string | null;
    serialNo: string | null;
    certificatesCount: number | null;
    sharesTransferred: number | null;
    balanceShares: number | null;
    balanceCertificateSerial: string | null;
    balanceAmount: { toString(): string } | null;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
  }>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): IFormRegisterDto {
  return {
    id: record.id,
    financialYearId: record.financialYearId,
    srNo: record.srNo,
    memberId: record.memberId,
    admissionDate: record.admissionDate?.toISOString().slice(0, 10) ?? null,
    admissionFeeDate: record.admissionFeeDate?.toISOString().slice(0, 10) ?? null,
    fullName: record.fullName,
    unitNo: record.unitNo,
    address: record.address,
    occupation: record.occupation,
    ageOnAdmission: record.ageOnAdmission,
    nomineeName: record.nomineeName,
    nominationDate: record.nominationDate?.toISOString().slice(0, 10) ?? null,
    cessationDate: record.cessationDate?.toISOString().slice(0, 10) ?? null,
    cessationReason: record.cessationReason,
    remarks: record.remarks,
    shareEntries: (record.shareEntries ?? []).map(mapShareEntry),
    shareTransfers: (record.shareTransfers ?? []).map(mapShareTransfer),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

async function resolveSinkingFundAccountId(client: PrismaClient): Promise<string | null> {
  const account = await client.accountMaster.findFirst({
    where: { shortCode: 'SINK', isActive: true },
    select: { id: true },
  });
  return account?.id ?? null;
}

function computeAgeOnAdmission(dateOfBirth: Date | null, admissionDate: Date | null): number | null {
  if (!dateOfBirth || !admissionDate) return null;
  let age = admissionDate.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = admissionDate.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && admissionDate.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/**
 * SF-001 — auto-create sinking fund register entries when a receipt includes SINK account lines.
 */
export async function onReceiptPosted(
  client: PrismaClient,
  voucher: PostedReceiptVoucher,
  actorId: string,
): Promise<void> {
  if (voucher.voucherType !== PrismaVoucherType.RECEIPT) {
    return;
  }

  const sinkAccountId = await resolveSinkingFundAccountId(client);
  if (!sinkAccountId) return;

  const sinkLines = voucher.lines.filter(
    (line) =>
      line.accountMasterId === sinkAccountId &&
      (toNumber(line.crAmount) > 0 || toNumber(line.drAmount) > 0),
  );
  if (sinkLines.length === 0) return;

  const defaultMemberId =
    voucher.lines.find((line) => line.memberId && toNumber(line.crAmount) > 0)?.memberId ?? null;

  for (const line of sinkLines) {
    const memberId = line.memberId ?? defaultMemberId;
    if (!memberId) continue;

    const amountContributed =
      toNumber(line.crAmount) > 0 ? toNumber(line.crAmount) : toNumber(line.drAmount);
    if (amountContributed <= 0) continue;

    const existing = await client.sinkingFundRegisterEntry.findFirst({
      where: { sourceVoucherId: voucher.id, memberId },
    });
    if (existing) continue;

    const member = await client.member.findUnique({
      where: { id: memberId },
      include: { unit: true },
    });
    if (!member) continue;

    const constructionValue = toNumber(member.unit.constructionValue);
    const landValue = toNumber(member.unit.landValue);
    const flatValueExclLand =
      constructionValue > 0
        ? constructionValue
        : Math.max(0, toNumber(member.unit.constructionValue) - landValue);
    const requiredContribution = flatValueExclLand * 0.0025;
    const srNo = await nextSrNo(client, 'sinkingFund', voucher.financialYearId);

    await client.sinkingFundRegisterEntry.create({
      data: {
        financialYearId: voucher.financialYearId,
        srNo,
        memberId,
        flatNo: member.unit.unitNo,
        flatValueExclLand,
        requiredContribution,
        receiptDate: voucher.voucherDate,
        amountContributed,
        sourceVoucherId: voucher.id,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }
}

export async function syncIFormOnMemberChange(
  client: PrismaClient,
  memberId: string,
  actorId: string,
): Promise<void> {
  const member = await client.member.findUnique({
    where: { id: memberId },
    include: {
      unit: true,
      nominees: { orderBy: { nominationDate: 'desc' } },
    },
  });
  if (!member || member.disposedAt) return;

  const financialYearId = await getActiveFinancialYearId(client);
  const activeNominee = member.nominees.find((n) => !n.revocationDate) ?? member.nominees[0];
  const admissionDate = member.unitPurchaseDate ?? member.createdAt;
  const fullName = [member.title, member.memberName].filter(Boolean).join(' ').trim();

  const header = {
    admissionDate,
    admissionFeeDate: member.unitPurchaseDate,
    fullName,
    unitNo: member.unit.unitNo,
    address: member.address,
    occupation: member.occupation,
    ageOnAdmission: computeAgeOnAdmission(member.dateOfBirth, admissionDate),
    nomineeName: activeNominee?.nomineeName ?? null,
    nominationDate: activeNominee?.nominationDate ?? null,
    updatedBy: actorId,
  };

  const existing = await client.iFormRegister.findUnique({ where: { memberId } });
  if (existing) {
    await client.iFormRegister.update({
      where: { id: existing.id },
      data: header,
    });
    return;
  }

  const srNo = await nextSrNo(client, 'iform', financialYearId);
  await client.iFormRegister.create({
    data: {
      financialYearId,
      srNo,
      memberId,
      ...header,
      createdBy: actorId,
    },
  });
}

export async function syncIFormOnDisposal(
  client: PrismaClient,
  memberId: string,
  disposeDate: string,
  reason: string | undefined,
  actorId: string,
): Promise<void> {
  const existing = await client.iFormRegister.findUnique({ where: { memberId } });
  if (!existing) return;

  await client.iFormRegister.update({
    where: { id: existing.id },
    data: {
      cessationDate: parseDate(disposeDate),
      cessationReason: reason ?? null,
      updatedBy: actorId,
    },
  });
}

export async function listFdRegister(
  client: PrismaClient,
  filter?: { status?: FdStatus; search?: string },
): Promise<FdRegisterDto[]> {
  const records = await client.fixedDepositRegister.findMany({
    where: filter?.search?.trim()
      ? {
          OR: [
            { fdrNo: { contains: filter.search.trim() } },
            { bankName: { contains: filter.search.trim() } },
          ],
        }
      : undefined,
    orderBy: [{ fdDate: 'desc' }, { fdrNo: 'asc' }],
  });

  const mapped = records.map(mapFd);
  if (!filter?.status) return mapped;
  return mapped.filter((row) => row.status === filter.status);
}

export async function getFdRegister(client: PrismaClient, id: string): Promise<FdRegisterDto> {
  const record = await client.fixedDepositRegister.findUniqueOrThrow({ where: { id } });
  return mapFd(record);
}

export async function saveFdRegister(
  client: PrismaClient,
  dto: FdRegisterDto,
  actorId: string,
): Promise<FdRegisterDto> {
  await assertWritable(client);
  if (!dto.fdrNo?.trim()) {
    throw Object.assign(new Error('FDR number is required.'), { code: 'VALIDATION_ERROR' });
  }
  if (!dto.bankName?.trim()) {
    throw Object.assign(new Error('Bank name is required.'), { code: 'VALIDATION_ERROR' });
  }

  const financialYearId = dto.financialYearId || (await getActiveFinancialYearId(client));
  const maturityDate = parseDate(dto.maturityDate);
  if (!maturityDate) {
    throw Object.assign(new Error('Maturity date is required.'), { code: 'VALIDATION_ERROR' });
  }
  const status = resolveFdStatus(maturityDate);

  const data = {
    financialYearId,
    fdDate: parseDate(dto.fdDate) ?? new Date(),
    fdrNo: dto.fdrNo.trim(),
    bankName: dto.bankName.trim(),
    amount: dto.amount,
    fdType: dto.fdType ?? null,
    durationMonths: dto.durationMonths,
    interestRate: dto.interestRate,
    effectiveDate: parseDate(dto.effectiveDate) ?? new Date(),
    maturityDate,
    remarks: dto.remarks ?? null,
    status: status as PrismaFdStatus,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.fixedDepositRegister.update({ where: { id: dto.id }, data })
    : await client.fixedDepositRegister.create({
        data: { ...data, createdBy: actorId },
      });

  return mapFd(record);
}

export async function deleteFdRegister(client: PrismaClient, id: string): Promise<void> {
  await assertWritable(client);
  await client.fixedDepositRegister.delete({ where: { id } });
}

export async function listUpcomingFdMaturities(
  client: PrismaClient,
  daysAhead = 30,
): Promise<UpcomingFdMaturityDto[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + daysAhead);

  const records = await client.fixedDepositRegister.findMany({
    where: {
      maturityDate: { gte: today, lte: horizon },
      status: PrismaFdStatus.ACTIVE,
    },
    orderBy: { maturityDate: 'asc' },
  });

  return records.map((record) => ({
    id: record.id,
    fdrNo: record.fdrNo,
    bankName: record.bankName,
    amount: toNumber(record.amount),
    maturityDate: record.maturityDate.toISOString().slice(0, 10),
    daysRemaining: Math.ceil(
      (record.maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    ),
  }));
}

export async function listPropertyRegister(
  client: PrismaClient,
  filter?: string,
): Promise<PropertyRegisterEntryDto[]> {
  const records = await client.propertyRegisterEntry.findMany({
    where: filter?.trim()
      ? {
          OR: [
            { flatNo: { contains: filter.trim() } },
            { coPartnerMemberName: { contains: filter.trim() } },
            { tenementNo: { contains: filter.trim() } },
          ],
        }
      : undefined,
    orderBy: { srNo: 'asc' },
  });
  return records.map(mapProperty);
}

export async function getPropertyRegisterEntry(
  client: PrismaClient,
  id: string,
): Promise<PropertyRegisterEntryDto> {
  const record = await client.propertyRegisterEntry.findUniqueOrThrow({ where: { id } });
  return mapProperty(record);
}

export async function savePropertyRegisterEntry(
  client: PrismaClient,
  dto: PropertyRegisterEntryDto,
  actorId: string,
): Promise<PropertyRegisterEntryDto> {
  await assertWritable(client);
  if (!dto.flatNo?.trim()) {
    throw Object.assign(new Error('Flat number is required.'), { code: 'VALIDATION_ERROR' });
  }

  const financialYearId = dto.financialYearId || (await getActiveFinancialYearId(client));
  const data = {
    financialYearId,
    coPartnerMemberId: dto.coPartnerMemberId ?? null,
    coPartnerMemberName: dto.coPartnerMemberName ?? null,
    possessionDate: parseDate(dto.possessionDate),
    tenementNo: dto.tenementNo ?? null,
    flatNo: dto.flatNo.trim(),
    floorNo: dto.floorNo ?? null,
    description: dto.description ?? null,
    area: dto.area ?? null,
    cost: dto.cost ?? null,
    landValue: dto.landValue ?? null,
    constructionValue: dto.constructionValue ?? null,
    annualGroundRent: dto.annualGroundRent ?? null,
    cessationDate: parseDate(dto.cessationDate),
    remark: dto.remark ?? null,
    updatedBy: actorId,
  };

  if (dto.id) {
    const record = await client.propertyRegisterEntry.update({
      where: { id: dto.id },
      data,
    });
    return mapProperty(record);
  }

  const srNo = await nextSrNo(client, 'property', financialYearId);
  const record = await client.propertyRegisterEntry.create({
    data: { ...data, srNo, createdBy: actorId },
  });
  return mapProperty(record);
}

export async function deletePropertyRegisterEntry(
  client: PrismaClient,
  id: string,
): Promise<void> {
  await assertWritable(client);
  await client.propertyRegisterEntry.delete({ where: { id } });
}

export async function listSinkingFundEntries(
  client: PrismaClient,
  filter?: { memberId?: string; dateFrom?: string; dateTo?: string },
): Promise<SinkingFundEntryDto[]> {
  const records = await client.sinkingFundRegisterEntry.findMany({
    where: {
      ...(filter?.memberId ? { memberId: filter.memberId } : {}),
      ...(filter?.dateFrom || filter?.dateTo
        ? {
            receiptDate: {
              ...(filter.dateFrom ? { gte: parseDate(filter.dateFrom) ?? undefined } : {}),
              ...(filter.dateTo ? { lte: parseDate(filter.dateTo) ?? undefined } : {}),
            },
          }
        : {}),
    },
    include: {
      member: { select: { memberName: true } },
      sourceVoucher: { select: { systemVoucherNo: true } },
    },
    orderBy: [{ receiptDate: 'desc' }, { srNo: 'desc' }],
  });
  return records.map(mapSinkingFund);
}

export async function listIFormRegisters(
  client: PrismaClient,
  filter?: string,
): Promise<IFormRegisterDto[]> {
  const records = await client.iFormRegister.findMany({
    where: filter?.trim()
      ? {
          OR: [
            { fullName: { contains: filter.trim() } },
            { unitNo: { contains: filter.trim() } },
          ],
        }
      : undefined,
    include: { shareEntries: true, shareTransfers: true },
    orderBy: { srNo: 'asc' },
  });
  return records.map(mapIForm);
}

export async function getIFormRegister(
  client: PrismaClient,
  id: string,
): Promise<IFormRegisterDto> {
  const record = await client.iFormRegister.findUniqueOrThrow({
    where: { id },
    include: { shareEntries: true, shareTransfers: true },
  });
  return mapIForm(record);
}

export async function saveIFormRegister(
  client: PrismaClient,
  dto: IFormRegisterDto,
  actorId: string,
): Promise<IFormRegisterDto> {
  await assertWritable(client);
  if (!dto.memberId) {
    throw Object.assign(new Error('Member is required.'), { code: 'VALIDATION_ERROR' });
  }
  if (!dto.fullName?.trim()) {
    throw Object.assign(new Error('Full name is required.'), { code: 'VALIDATION_ERROR' });
  }

  const financialYearId = dto.financialYearId || (await getActiveFinancialYearId(client));
  const data = {
    financialYearId,
    memberId: dto.memberId,
    admissionDate: parseDate(dto.admissionDate),
    admissionFeeDate: parseDate(dto.admissionFeeDate),
    fullName: dto.fullName.trim(),
    unitNo: dto.unitNo.trim(),
    address: dto.address ?? null,
    occupation: dto.occupation ?? null,
    ageOnAdmission: dto.ageOnAdmission ?? null,
    nomineeName: dto.nomineeName ?? null,
    nominationDate: parseDate(dto.nominationDate),
    cessationDate: parseDate(dto.cessationDate),
    cessationReason: dto.cessationReason ?? null,
    remarks: dto.remarks ?? null,
    updatedBy: actorId,
  };

  if (dto.id) {
    const record = await client.iFormRegister.update({
      where: { id: dto.id },
      data,
      include: { shareEntries: true, shareTransfers: true },
    });
    return mapIForm(record);
  }

  const srNo = await nextSrNo(client, 'iform', financialYearId);
  const record = await client.iFormRegister.create({
    data: { ...data, srNo, createdBy: actorId },
    include: { shareEntries: true, shareTransfers: true },
  });
  return mapIForm(record);
}

export async function deleteIFormRegister(client: PrismaClient, id: string): Promise<void> {
  await assertWritable(client);
  await client.iFormRegister.delete({ where: { id } });
}

export async function saveIFormShareEntry(
  client: PrismaClient,
  dto: IFormShareEntryDto,
  actorId: string,
): Promise<IFormShareEntryDto> {
  await assertWritable(client);
  if (!dto.iFormRegisterId) {
    throw Object.assign(new Error('I-Form register is required.'), { code: 'VALIDATION_ERROR' });
  }

  const data = {
    iFormRegisterId: dto.iFormRegisterId,
    onDate: parseDate(dto.onDate),
    cashBookFolio: dto.cashBookFolio ?? null,
    applicationDetails: dto.applicationDetails ?? null,
    amountCall1: dto.amountCall1 ?? null,
    amountCall2: dto.amountCall2 ?? null,
    totalAmount: dto.totalAmount ?? null,
    numberOfShares: dto.numberOfShares ?? null,
    certificateSerialNo: dto.certificateSerialNo ?? null,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.iFormShareEntry.update({ where: { id: dto.id }, data })
    : await client.iFormShareEntry.create({ data: { ...data, createdBy: actorId } });

  return mapShareEntry(record);
}

export async function deleteIFormShareEntry(client: PrismaClient, id: string): Promise<void> {
  await assertWritable(client);
  await client.iFormShareEntry.delete({ where: { id } });
}

export async function saveIFormShareTransfer(
  client: PrismaClient,
  dto: IFormShareTransferDto,
  actorId: string,
): Promise<IFormShareTransferDto> {
  await assertWritable(client);
  if (!dto.iFormRegisterId) {
    throw Object.assign(new Error('I-Form register is required.'), { code: 'VALIDATION_ERROR' });
  }

  const data = {
    iFormRegisterId: dto.iFormRegisterId,
    onDate: parseDate(dto.onDate),
    cashBookFolio: dto.cashBookFolio ?? null,
    unitNo: dto.unitNo ?? null,
    registerNo: dto.registerNo ?? null,
    serialNo: dto.serialNo ?? null,
    certificatesCount: dto.certificatesCount ?? null,
    sharesTransferred: dto.sharesTransferred ?? null,
    balanceShares: dto.balanceShares ?? null,
    balanceCertificateSerial: dto.balanceCertificateSerial ?? null,
    balanceAmount: dto.balanceAmount ?? null,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.iFormShareTransfer.update({ where: { id: dto.id }, data })
    : await client.iFormShareTransfer.create({ data: { ...data, createdBy: actorId } });

  return mapShareTransfer(record);
}

export async function deleteIFormShareTransfer(client: PrismaClient, id: string): Promise<void> {
  await assertWritable(client);
  await client.iFormShareTransfer.delete({ where: { id } });
}
