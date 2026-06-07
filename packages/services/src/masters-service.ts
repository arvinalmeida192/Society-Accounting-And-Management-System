import type { PrismaClient } from '@prisma/client';
import type {
  AddressBookEntryDto,
  BankMasterDto,
  BankMicrCodeDto,
  ChequeCancellationReasonDto,
  ContractorDetailDto,
  DishonouredChequeDto,
  MicrLookupResult,
  NarrationMasterDto,
  PartyType,
  VoucherType,
} from '@sams/shared-types';

function mapBank(record: {
  id: string;
  bankName: string;
  branchName: string;
  address: string | null;
  telephone: string | null;
  fax: string | null;
  email: string | null;
  url: string | null;
  contactPerson: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): BankMasterDto {
  return {
    id: record.id,
    bankName: record.bankName,
    branchName: record.branchName,
    address: record.address,
    telephone: record.telephone,
    fax: record.fax,
    email: record.email,
    url: record.url,
    contactPerson: record.contactPerson,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapMicr(record: {
  id: string;
  bankMasterId: string;
  micrCode: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): BankMicrCodeDto {
  return {
    id: record.id,
    bankMasterId: record.bankMasterId,
    micrCode: record.micrCode,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function listBanks(
  client: PrismaClient,
  filter?: string,
): Promise<BankMasterDto[]> {
  const records = await client.bankMaster.findMany({
    where: filter?.trim()
      ? {
          OR: [
            { bankName: { contains: filter.trim() } },
            { branchName: { contains: filter.trim() } },
          ],
        }
      : undefined,
    orderBy: [{ bankName: 'asc' }, { branchName: 'asc' }],
  });
  return records.map(mapBank);
}

export async function getBank(client: PrismaClient, id: string): Promise<BankMasterDto> {
  const record = await client.bankMaster.findUniqueOrThrow({ where: { id } });
  return mapBank(record);
}

export async function saveBank(
  client: PrismaClient,
  dto: Omit<BankMasterDto, keyof import('@sams/shared-types').AuditFieldsDto> & { id?: string },
  actorId: string,
): Promise<BankMasterDto> {
  if (!dto.bankName?.trim() || !dto.branchName?.trim()) {
    throw Object.assign(new Error('Bank name and branch are required.'), { code: 'VALIDATION_ERROR' });
  }

  const data = {
    bankName: dto.bankName.trim(),
    branchName: dto.branchName.trim(),
    address: dto.address ?? null,
    telephone: dto.telephone ?? null,
    fax: dto.fax ?? null,
    email: dto.email ?? null,
    url: dto.url ?? null,
    contactPerson: dto.contactPerson ?? null,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.bankMaster.update({ where: { id: dto.id }, data })
    : await client.bankMaster.create({ data: { ...data, createdBy: actorId } });

  return mapBank(record);
}

export async function deleteBank(client: PrismaClient, id: string): Promise<void> {
  await client.bankMaster.delete({ where: { id } });
}

export async function listMicrCodes(
  client: PrismaClient,
  bankMasterId: string,
): Promise<BankMicrCodeDto[]> {
  const records = await client.bankMicrCode.findMany({
    where: { bankMasterId },
    orderBy: { micrCode: 'asc' },
  });
  return records.map(mapMicr);
}

export async function saveMicrCode(
  client: PrismaClient,
  dto: Omit<BankMicrCodeDto, keyof import('@sams/shared-types').AuditFieldsDto> & { id?: string },
  actorId: string,
): Promise<BankMicrCodeDto> {
  const code = dto.micrCode?.trim();
  if (!code || !/^\d{9}$/.test(code)) {
    throw Object.assign(new Error('MICR code must be exactly 9 digits.'), { code: 'VALIDATION_ERROR' });
  }

  const data = {
    bankMasterId: dto.bankMasterId,
    micrCode: code,
    isActive: dto.isActive ?? true,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.bankMicrCode.update({ where: { id: dto.id }, data })
    : await client.bankMicrCode.create({ data: { ...data, createdBy: actorId } });

  return mapMicr(record);
}

export async function deleteMicrCode(client: PrismaClient, id: string): Promise<void> {
  await client.bankMicrCode.delete({ where: { id } });
}

export async function lookupMicr(
  client: PrismaClient,
  micrCode: string,
): Promise<MicrLookupResult | null> {
  const code = micrCode.trim();
  if (!/^\d{9}$/.test(code)) return null;

  const record = await client.bankMicrCode.findFirst({
    where: { micrCode: code, isActive: true },
    include: { bankMaster: true },
  });

  if (!record) return null;

  return {
    micrCode: record.micrCode,
    bankMasterId: record.bankMasterId,
    bankName: record.bankMaster.bankName,
    branchName: record.bankMaster.branchName,
    address: record.bankMaster.address,
  };
}

export async function listNarrations(
  client: PrismaClient,
  voucherTableType?: VoucherType,
): Promise<NarrationMasterDto[]> {
  const records = await client.narrationMaster.findMany({
    where: voucherTableType ? { voucherTableType } : undefined,
    orderBy: [{ voucherTableType: 'asc' }, { shortCode: 'asc' }],
  });

  return records.map((record) => ({
    id: record.id,
    voucherTableType: record.voucherTableType as VoucherType,
    shortCode: record.shortCode,
    narrationText: record.narrationText,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  }));
}

export async function saveNarration(
  client: PrismaClient,
  dto: Omit<NarrationMasterDto, keyof import('@sams/shared-types').AuditFieldsDto> & { id?: string },
  actorId: string,
): Promise<NarrationMasterDto> {
  if (!dto.shortCode?.trim() || !dto.narrationText?.trim()) {
    throw Object.assign(new Error('Short code and narration text are required.'), {
      code: 'VALIDATION_ERROR',
    });
  }

  const data = {
    voucherTableType: dto.voucherTableType,
    shortCode: dto.shortCode.trim().toUpperCase(),
    narrationText: dto.narrationText.trim(),
    isActive: dto.isActive ?? true,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.narrationMaster.update({ where: { id: dto.id }, data })
    : await client.narrationMaster.create({ data: { ...data, createdBy: actorId } });

  return {
    id: record.id,
    voucherTableType: record.voucherTableType as VoucherType,
    shortCode: record.shortCode,
    narrationText: record.narrationText,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function deleteNarration(client: PrismaClient, id: string): Promise<void> {
  await client.narrationMaster.delete({ where: { id } });
}

export async function listAddressBook(
  client: PrismaClient,
  filter?: string,
): Promise<AddressBookEntryDto[]> {
  const records = await client.addressBookEntry.findMany({
    include: { accountMaster: true },
    orderBy: { accountMaster: { particulars: 'asc' } },
  });

  return records
    .filter((record) => {
      if (!filter?.trim()) return true;
      const q = filter.trim().toLowerCase();
      return (
        record.accountMaster.particulars.toLowerCase().includes(q) ||
        record.partyType.toLowerCase().includes(q)
      );
    })
    .map((record) => ({
      id: record.id,
      accountMasterId: record.accountMasterId,
      accountParticulars: record.accountMaster.particulars,
      partyType: record.partyType as PartyType,
      officeAddress: record.officeAddress,
      otherAddress: record.otherAddress,
      bankBranchName: record.bankBranchName,
      bankAccountNo: record.bankAccountNo,
      pan: record.pan,
      createdAt: record.createdAt.toISOString(),
      createdBy: record.createdBy,
      updatedAt: record.updatedAt.toISOString(),
      updatedBy: record.updatedBy,
    }));
}

export async function saveAddressBookEntry(
  client: PrismaClient,
  dto: Omit<AddressBookEntryDto, keyof import('@sams/shared-types').AuditFieldsDto | 'accountParticulars'> & {
    id?: string;
  },
  actorId: string,
): Promise<AddressBookEntryDto> {
  if (!dto.accountMasterId) {
    throw Object.assign(new Error('Account is required.'), { code: 'VALIDATION_ERROR' });
  }

  const data = {
    accountMasterId: dto.accountMasterId,
    partyType: dto.partyType,
    officeAddress: dto.officeAddress ?? null,
    otherAddress: dto.otherAddress ?? null,
    bankBranchName: dto.bankBranchName ?? null,
    bankAccountNo: dto.bankAccountNo ?? null,
    pan: dto.pan ?? null,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.addressBookEntry.update({
        where: { id: dto.id },
        data,
        include: { accountMaster: true },
      })
    : await client.addressBookEntry.create({
        data: { ...data, createdBy: actorId },
        include: { accountMaster: true },
      });

  return {
    id: record.id,
    accountMasterId: record.accountMasterId,
    accountParticulars: record.accountMaster.particulars,
    partyType: record.partyType as PartyType,
    officeAddress: record.officeAddress,
    otherAddress: record.otherAddress,
    bankBranchName: record.bankBranchName,
    bankAccountNo: record.bankAccountNo,
    pan: record.pan,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function deleteAddressBookEntry(client: PrismaClient, id: string): Promise<void> {
  await client.addressBookEntry.delete({ where: { id } });
}

export async function listChequeReasons(
  client: PrismaClient,
): Promise<ChequeCancellationReasonDto[]> {
  const records = await client.chequeCancellationReason.findMany({
    orderBy: { reasonCode: 'asc' },
  });

  return records.map((record) => ({
    id: record.id,
    reasonCode: record.reasonCode,
    reasonDescription: record.reasonDescription,
    category: record.category,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  }));
}

export async function saveChequeReason(
  client: PrismaClient,
  dto: Omit<ChequeCancellationReasonDto, keyof import('@sams/shared-types').AuditFieldsDto> & {
    id?: string;
  },
  actorId: string,
): Promise<ChequeCancellationReasonDto> {
  if (!dto.reasonCode?.trim() || !dto.reasonDescription?.trim()) {
    throw Object.assign(new Error('Reason code and description are required.'), {
      code: 'VALIDATION_ERROR',
    });
  }

  const data = {
    reasonCode: dto.reasonCode.trim().toUpperCase(),
    reasonDescription: dto.reasonDescription.trim(),
    category: dto.category ?? null,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.chequeCancellationReason.update({ where: { id: dto.id }, data })
    : await client.chequeCancellationReason.create({ data: { ...data, createdBy: actorId } });

  return {
    id: record.id,
    reasonCode: record.reasonCode,
    reasonDescription: record.reasonDescription,
    category: record.category,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function deleteChequeReason(client: PrismaClient, id: string): Promise<void> {
  await client.chequeCancellationReason.delete({ where: { id } });
}

export async function listDishonouredCheques(
  client: PrismaClient,
  reasonId: string,
): Promise<DishonouredChequeDto[]> {
  const records = await client.chequeDetail.findMany({
    where: { cancellationReasonId: reasonId, cancelledOn: { not: null } },
    include: {
      voucherLine: {
        include: {
          voucher: { select: { id: true, voucherDate: true } },
          accountMaster: { select: { particulars: true } },
        },
      },
    },
    orderBy: { cancelledOn: 'desc' },
  });

  return records.map((record) => ({
    id: record.id,
    chequeNo: record.chequeNo,
    chequeDate: record.chequeDate.toISOString(),
    cancelledOn: record.cancelledOn?.toISOString() ?? null,
    bankName: record.bankName,
    branchName: record.branchName,
    drawerName: record.drawerName,
    voucherId: record.voucherLine.voucher.id,
    voucherDate: record.voucherLine.voucher.voucherDate.toISOString(),
    accountParticulars: record.voucherLine.accountMaster.particulars,
    amount: Number(record.voucherLine.drAmount) || Number(record.voucherLine.crAmount),
  }));
}

export async function listContractors(
  client: PrismaClient,
  filter?: string,
): Promise<ContractorDetailDto[]> {
  const records = await client.contractorDetail.findMany({
    where: filter?.trim()
      ? { contractorName: { contains: filter.trim() } }
      : undefined,
    orderBy: { contractorName: 'asc' },
  });

  return records.map((record) => ({
    id: record.id,
    contractorName: record.contractorName,
    contractType: record.contractType,
    contractDate: record.contractDate?.toISOString() ?? null,
    buildingName: record.buildingName,
    address: record.address,
    telephone: record.telephone,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  }));
}

export async function saveContractor(
  client: PrismaClient,
  dto: Omit<ContractorDetailDto, keyof import('@sams/shared-types').AuditFieldsDto> & { id?: string },
  actorId: string,
): Promise<ContractorDetailDto> {
  if (!dto.contractorName?.trim()) {
    throw Object.assign(new Error('Contractor name is required.'), { code: 'VALIDATION_ERROR' });
  }

  const data = {
    contractorName: dto.contractorName.trim(),
    contractType: dto.contractType ?? null,
    contractDate: dto.contractDate ? new Date(dto.contractDate) : null,
    buildingName: dto.buildingName ?? null,
    address: dto.address ?? null,
    telephone: dto.telephone ?? null,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.contractorDetail.update({ where: { id: dto.id }, data })
    : await client.contractorDetail.create({ data: { ...data, createdBy: actorId } });

  return {
    id: record.id,
    contractorName: record.contractorName,
    contractType: record.contractType,
    contractDate: record.contractDate?.toISOString() ?? null,
    buildingName: record.buildingName,
    address: record.address,
    telephone: record.telephone,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function deleteContractor(client: PrismaClient, id: string): Promise<void> {
  await client.contractorDetail.delete({ where: { id } });
}
