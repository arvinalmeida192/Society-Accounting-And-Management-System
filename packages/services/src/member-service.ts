import { copyFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Prisma, PrismaClient } from '@prisma/client';
import { UnitStatus } from '@prisma/client';
import type {
  MemberAddressDto,
  MemberDependentDto,
  MemberDto,
  MemberFullDto,
  MemberHousingLoanDto,
  MemberIdentificationDto,
  MemberListItemDto,
  MemberNomineeDto,
  MemberPersonalDto,
  MemberShareDto,
  MemberVehicleDto,
  UnitVacancyResult,
} from '@sams/shared-types';
import { createMemberSubsidiaryLedger } from './chart-of-accounts-service.js';
import { syncIFormOnDisposal, syncIFormOnMemberChange } from './statutory-register-service.js';

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === 'number' ? value : value.toNumber();
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value);
}

function mapMember(record: {
  id: string;
  unitId: string;
  title: string | null;
  memberName: string;
  tenantOccupancy: boolean;
  tenantOccupancyEffectiveFrom: Date | null;
  generateRegularBills: boolean;
  generateSupplementaryBills: boolean;
  chargeInterest: boolean;
  disposedAt: Date | null;
  disposeReason: string | null;
  photographPath: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  qualification: string | null;
  religion: string | null;
  occupation: string | null;
  panNo: string | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  anniversaryType: string | null;
  anniversaryDate: Date | null;
  unitPurchaseDate: Date | null;
  dateOfSale: Date | null;
  associateMember: string | null;
  jointMember: string | null;
  votingRightsMember: string | null;
  memberBankName: string | null;
  memberBankBranch: string | null;
  totalFamilyMembers: number | null;
  memberClass: string | null;
  clubMembershipDeposit: Prisma.Decimal | null;
  address: string | null;
  residencePhone: string | null;
  officePhone: string | null;
  emailPrimary: string | null;
  emailSecondary: string | null;
  fax: string | null;
  subsidiaryLedger: { id: string } | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): MemberDto {
  return {
    id: record.id,
    unitId: record.unitId,
    title: record.title,
    memberName: record.memberName,
    tenantOccupancy: record.tenantOccupancy,
    tenantOccupancyEffectiveFrom: record.tenantOccupancyEffectiveFrom?.toISOString() ?? null,
    generateRegularBills: record.generateRegularBills,
    generateSupplementaryBills: record.generateSupplementaryBills,
    chargeInterest: record.chargeInterest,
    disposedAt: record.disposedAt?.toISOString() ?? null,
    disposeReason: record.disposeReason,
    photographPath: record.photographPath,
    gender: record.gender as MemberDto['gender'],
    dateOfBirth: record.dateOfBirth?.toISOString() ?? null,
    qualification: record.qualification,
    religion: record.religion,
    occupation: record.occupation,
    panNo: record.panNo,
    bloodGroup: record.bloodGroup,
    maritalStatus: record.maritalStatus as MemberDto['maritalStatus'],
    anniversaryType: record.anniversaryType,
    anniversaryDate: record.anniversaryDate?.toISOString() ?? null,
    unitPurchaseDate: record.unitPurchaseDate?.toISOString() ?? null,
    dateOfSale: record.dateOfSale?.toISOString() ?? null,
    associateMember: record.associateMember,
    jointMember: record.jointMember,
    votingRightsMember: record.votingRightsMember,
    memberBankName: record.memberBankName,
    memberBankBranch: record.memberBankBranch,
    totalFamilyMembers: record.totalFamilyMembers,
    memberClass: record.memberClass,
    clubMembershipDeposit: decimalToNumber(record.clubMembershipDeposit),
    address: record.address,
    residencePhone: record.residencePhone,
    officePhone: record.officePhone,
    emailPrimary: record.emailPrimary,
    emailSecondary: record.emailSecondary,
    fax: record.fax,
    subsidiaryLedgerAccountId: record.subsidiaryLedger?.id ?? null,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

const memberInclude = {
  subsidiaryLedger: { select: { id: true } },
  unit: {
    include: {
      building: { select: { shortName: true, id: true } },
      wing: { select: { shortName: true, id: true } },
    },
  },
} as const;

export async function listMembers(
  client: PrismaClient,
  options: {
    buildingId?: string;
    wingId?: string;
    status?: 'active' | 'disposed' | 'all';
    filter?: string;
  } = {},
): Promise<{ items: MemberListItemDto[]; total: number }> {
  const where: Prisma.MemberWhereInput = {
    ...(options.buildingId ? { unit: { buildingId: options.buildingId } } : {}),
    ...(options.wingId ? { unit: { wingId: options.wingId } } : {}),
    ...(options.status === 'active' ? { disposedAt: null } : {}),
    ...(options.status === 'disposed' ? { disposedAt: { not: null } } : {}),
    ...(options.filter?.trim()
      ? { memberName: { contains: options.filter.trim() } }
      : {}),
  };

  const records = await client.member.findMany({
    where,
    include: {
      unit: {
        include: {
          building: { select: { shortName: true } },
          wing: { select: { shortName: true } },
        },
      },
    },
    orderBy: [{ disposedAt: 'asc' }, { memberName: 'asc' }],
  });

  const items = records.map((record) => ({
    id: record.id,
    memberName: record.memberName,
    unitId: record.unitId,
    unitNo: record.unit.unitNo,
    buildingShortName: record.unit.building.shortName,
    wingShortName: record.unit.wing.shortName,
    disposedAt: record.disposedAt?.toISOString() ?? null,
  }));

  return { items, total: items.length };
}

export async function getMember(client: PrismaClient, id: string): Promise<MemberFullDto> {
  const record = await client.member.findUniqueOrThrow({
    where: { id },
    include: {
      ...memberInclude,
      dependents: { orderBy: { name: 'asc' } },
      nominees: { orderBy: { nomineeName: 'asc' } },
      vehicles: { orderBy: { vehicleNo: 'asc' } },
      shares: { orderBy: { allotmentDate: 'desc' } },
      housingLoans: { orderBy: { bankName: 'asc' } },
      openingBalances: true,
      parkingAssignments: {
        include: { parkingSpace: { select: { parkingNo: true } } },
      },
    },
  });

  const base = mapMember(record);

  return {
    ...base,
    buildingId: record.unit.building.id,
    wingId: record.unit.wing.id,
    unitNo: record.unit.unitNo,
    buildingShortName: record.unit.building.shortName,
    wingShortName: record.unit.wing.shortName,
    dependents: record.dependents.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      name: row.name,
      relation: row.relation,
      occupation: row.occupation,
      age: row.age,
      gender: row.gender as MemberDependentDto['gender'],
      dateOfBirth: row.dateOfBirth?.toISOString() ?? null,
      idCardNo: row.idCardNo,
      bloodGroup: row.bloodGroup,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    })),
    nominees: record.nominees.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      nominationDate: row.nominationDate?.toISOString() ?? null,
      nomineeName: row.nomineeName,
      committeeMeetingDate: row.committeeMeetingDate?.toISOString() ?? null,
      subject: row.subject,
      revocationDate: row.revocationDate?.toISOString() ?? null,
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    })),
    vehicles: record.vehicles.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      vehicleName: row.vehicleName,
      vehicleNo: row.vehicleNo,
      registrationNo: row.registrationNo,
      registrationDate: row.registrationDate?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    })),
    shares: record.shares.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      allotmentDate: row.allotmentDate?.toISOString() ?? null,
      certificateNo: row.certificateNo,
      folioNo: row.folioNo,
      numberOfShares: row.numberOfShares,
      fromShareNo: row.fromShareNo,
      toShareNo: row.toShareNo,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    })),
    housingLoans: record.housingLoans.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      bankName: row.bankName,
      branchName: row.branchName,
      nocDate: row.nocDate?.toISOString() ?? null,
      loanAmount: decimalToNumber(row.loanAmount),
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    })),
    openingBalances: record.openingBalances.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      balanceType: row.balanceType as MemberFullDto['openingBalances'][number]['balanceType'],
      principalOB: decimalToNumber(row.principalOB) ?? 0,
      interestOB: decimalToNumber(row.interestOB) ?? 0,
      serviceTaxOB: decimalToNumber(row.serviceTaxOB) ?? 0,
      ledgerVoucherId: row.ledgerVoucherId,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    })),
    parkingAssignments: record.parkingAssignments.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      parkingSpaceId: row.parkingSpaceId,
      parkingNo: row.parkingSpace.parkingNo,
      purchaseDate: row.purchaseDate.toISOString(),
      disposeDate: row.disposeDate?.toISOString() ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    })),
  };
}

export async function checkUnitVacancy(
  client: PrismaClient,
  unitId: string,
  excludeMemberId?: string,
): Promise<UnitVacancyResult> {
  const active = await client.member.findFirst({
    where: {
      unitId,
      disposedAt: null,
      ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
    },
    select: { id: true, memberName: true },
  });

  if (!active) {
    return { vacant: true };
  }

  return {
    vacant: false,
    currentMember: { id: active.id, memberName: active.memberName },
  };
}

export async function saveMemberIdentification(
  client: PrismaClient,
  dto: MemberIdentificationDto,
  actorId: string,
): Promise<MemberDto> {
  if (!dto.memberName?.trim()) {
    throw Object.assign(new Error('Member name is required.'), { code: 'VALIDATION_ERROR' });
  }
  if (!dto.unitId) {
    throw Object.assign(new Error('Unit is required.'), { code: 'VALIDATION_ERROR' });
  }

  const vacancy = await checkUnitVacancy(client, dto.unitId, dto.id);
  if (!vacancy.vacant) {
    throw Object.assign(
      new Error(
        `Unit already has an active member: ${vacancy.currentMember?.memberName ?? 'unknown'}.`,
      ),
      { code: 'VALIDATION_ERROR' },
    );
  }

  if (dto.tenantOccupancy) {
    const tenant = await client.tenant.findFirst({
      where: { unitId: dto.unitId, isActive: true },
    });
    if (!tenant) {
      throw Object.assign(
        new Error('Tenant occupancy is enabled but no active tenant exists on this unit.'),
        { code: 'VALIDATION_ERROR' },
      );
    }
  }

  const unit = await client.unit.findUniqueOrThrow({
    where: { id: dto.unitId },
    select: { unitNo: true },
  });

  const data = {
    unitId: dto.unitId,
    title: dto.title ?? null,
    memberName: dto.memberName.trim(),
    tenantOccupancy: dto.tenantOccupancy ?? false,
    tenantOccupancyEffectiveFrom: parseDate(dto.tenantOccupancyEffectiveFrom),
    generateRegularBills: dto.generateRegularBills ?? true,
    generateSupplementaryBills: dto.generateSupplementaryBills ?? true,
    chargeInterest: dto.chargeInterest ?? true,
    unitPurchaseDate: parseDate(dto.unitPurchaseDate),
    updatedBy: actorId,
  };

  let record;
  if (dto.id) {
    record = await client.member.update({
      where: { id: dto.id },
      data,
      include: memberInclude,
    });
  } else {
    record = await client.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: { ...data, createdBy: actorId },
        include: memberInclude,
      });

      await tx.unit.update({
        where: { id: dto.unitId },
        data: { status: UnitStatus.OCCUPIED, updatedBy: actorId },
      });

      await createMemberSubsidiaryLedger(
        tx as unknown as PrismaClient,
        { id: created.id, memberName: created.memberName, unitNo: unit.unitNo },
        actorId,
      );

      return tx.member.findUniqueOrThrow({
        where: { id: created.id },
        include: memberInclude,
      });
    });
  }

  await syncIFormOnMemberChange(client, record.id, actorId);
  return mapMember(record);
}

export async function saveMemberPersonal(
  client: PrismaClient,
  dto: MemberPersonalDto,
  actorId: string,
): Promise<MemberDto> {
  const record = await client.member.update({
    where: { id: dto.id },
    data: {
      photographPath: dto.photographPath,
      gender: dto.gender ?? null,
      dateOfBirth: parseDate(dto.dateOfBirth),
      qualification: dto.qualification ?? null,
      religion: dto.religion ?? null,
      occupation: dto.occupation ?? null,
      panNo: dto.panNo ?? null,
      bloodGroup: dto.bloodGroup ?? null,
      maritalStatus: dto.maritalStatus ?? null,
      anniversaryType: dto.anniversaryType ?? null,
      anniversaryDate: parseDate(dto.anniversaryDate),
      associateMember: dto.associateMember ?? null,
      jointMember: dto.jointMember ?? null,
      votingRightsMember: dto.votingRightsMember ?? null,
      memberBankName: dto.memberBankName ?? null,
      memberBankBranch: dto.memberBankBranch ?? null,
      totalFamilyMembers: dto.totalFamilyMembers ?? null,
      memberClass: dto.memberClass ?? null,
      clubMembershipDeposit: dto.clubMembershipDeposit ?? null,
      updatedBy: actorId,
    },
    include: memberInclude,
  });

  await syncIFormOnMemberChange(client, record.id, actorId);
  return mapMember(record);
}

export async function saveMemberAddress(
  client: PrismaClient,
  dto: MemberAddressDto,
  actorId: string,
): Promise<MemberDto> {
  const record = await client.member.update({
    where: { id: dto.id },
    data: {
      address: dto.address ?? null,
      residencePhone: dto.residencePhone ?? null,
      officePhone: dto.officePhone ?? null,
      emailPrimary: dto.emailPrimary ?? null,
      emailSecondary: dto.emailSecondary ?? null,
      fax: dto.fax ?? null,
      updatedBy: actorId,
    },
    include: memberInclude,
  });

  await syncIFormOnMemberChange(client, record.id, actorId);
  return mapMember(record);
}

export async function saveMemberDependents(
  client: PrismaClient,
  memberId: string,
  rows: Omit<MemberDependentDto, keyof import('@sams/shared-types').AuditFieldsDto | 'memberId'>[],
  actorId: string,
): Promise<MemberDependentDto[]> {
  await client.$transaction(async (tx) => {
    await tx.memberDependent.deleteMany({ where: { memberId } });
    for (const row of rows) {
      await tx.memberDependent.create({
        data: {
          memberId,
          name: row.name,
          relation: row.relation,
          occupation: row.occupation,
          age: row.age,
          gender: row.gender,
          dateOfBirth: parseDate(row.dateOfBirth),
          idCardNo: row.idCardNo,
          bloodGroup: row.bloodGroup,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
  });

  const member = await getMember(client, memberId);
  return member.dependents;
}

export async function saveMemberNominees(
  client: PrismaClient,
  memberId: string,
  rows: Omit<MemberNomineeDto, keyof import('@sams/shared-types').AuditFieldsDto | 'memberId'>[],
  actorId: string,
): Promise<MemberNomineeDto[]> {
  await client.$transaction(async (tx) => {
    await tx.memberNominee.deleteMany({ where: { memberId } });
    for (const row of rows) {
      await tx.memberNominee.create({
        data: {
          memberId,
          nominationDate: parseDate(row.nominationDate),
          nomineeName: row.nomineeName,
          committeeMeetingDate: parseDate(row.committeeMeetingDate),
          subject: row.subject,
          revocationDate: parseDate(row.revocationDate),
          remark: row.remark,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
  });

  await syncIFormOnMemberChange(client, memberId, actorId);
  const member = await getMember(client, memberId);
  return member.nominees;
}

export async function saveMemberVehicles(
  client: PrismaClient,
  memberId: string,
  rows: Omit<MemberVehicleDto, keyof import('@sams/shared-types').AuditFieldsDto | 'memberId'>[],
  actorId: string,
): Promise<MemberVehicleDto[]> {
  await client.$transaction(async (tx) => {
    await tx.memberVehicle.deleteMany({ where: { memberId } });
    for (const row of rows) {
      await tx.memberVehicle.create({
        data: {
          memberId,
          vehicleName: row.vehicleName,
          vehicleNo: row.vehicleNo,
          registrationNo: row.registrationNo,
          registrationDate: parseDate(row.registrationDate),
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
  });

  const member = await getMember(client, memberId);
  return member.vehicles;
}

export async function saveMemberShares(
  client: PrismaClient,
  memberId: string,
  rows: Omit<MemberShareDto, keyof import('@sams/shared-types').AuditFieldsDto | 'memberId'>[],
  actorId: string,
): Promise<MemberShareDto[]> {
  await client.$transaction(async (tx) => {
    await tx.memberShare.deleteMany({ where: { memberId } });
    for (const row of rows) {
      await tx.memberShare.create({
        data: {
          memberId,
          allotmentDate: parseDate(row.allotmentDate),
          certificateNo: row.certificateNo,
          folioNo: row.folioNo,
          numberOfShares: row.numberOfShares,
          fromShareNo: row.fromShareNo,
          toShareNo: row.toShareNo,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
  });

  const member = await getMember(client, memberId);
  return member.shares;
}

export async function saveMemberHousingLoans(
  client: PrismaClient,
  memberId: string,
  rows: Omit<MemberHousingLoanDto, keyof import('@sams/shared-types').AuditFieldsDto | 'memberId'>[],
  actorId: string,
): Promise<MemberHousingLoanDto[]> {
  await client.$transaction(async (tx) => {
    await tx.memberHousingLoan.deleteMany({ where: { memberId } });
    for (const row of rows) {
      await tx.memberHousingLoan.create({
        data: {
          memberId,
          bankName: row.bankName,
          branchName: row.branchName,
          nocDate: parseDate(row.nocDate),
          loanAmount: row.loanAmount,
          remark: row.remark,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
  });

  const member = await getMember(client, memberId);
  return member.housingLoans;
}

export async function disposeMember(
  client: PrismaClient,
  id: string,
  disposeDate: string,
  reason: string | undefined,
  actorId: string,
): Promise<MemberDto> {
  const record = await client.$transaction(async (tx) => {
    const member = await tx.member.findUniqueOrThrow({
      where: { id },
      select: { unitId: true },
    });

    const updated = await tx.member.update({
      where: { id },
      data: {
        disposedAt: new Date(disposeDate),
        disposeReason: reason ?? null,
        dateOfSale: new Date(disposeDate),
        updatedBy: actorId,
      },
      include: memberInclude,
    });

    const otherActive = await tx.member.count({
      where: { unitId: member.unitId, disposedAt: null, id: { not: id } },
    });

    if (otherActive === 0) {
      await tx.unit.update({
        where: { id: member.unitId },
        data: { status: UnitStatus.VACANT, updatedBy: actorId },
      });
    }

    return updated;
  });

  await syncIFormOnDisposal(client, id, disposeDate, reason, actorId);
  return mapMember(record);
}

export async function uploadMemberPhoto(
  client: PrismaClient,
  memberId: string,
  sourcePath: string,
  photosDir: string,
  actorId: string,
): Promise<{ photographPath: string }> {
  mkdirSync(photosDir, { recursive: true });
  const destPath = join(photosDir, `${memberId}-${basename(sourcePath)}`);
  copyFileSync(sourcePath, destPath);

  await client.member.update({
    where: { id: memberId },
    data: { photographPath: destPath, updatedBy: actorId },
  });

  return { photographPath: destPath };
}
