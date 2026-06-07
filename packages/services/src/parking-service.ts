import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  MemberParkingAssignmentDto,
  ParkingChargeLineDto,
  ParkingSpaceDto,
  ParkingTariffRateDto,
  ParkingTariffTypeDto,
} from '@sams/shared-types';
import { Money } from './money.js';

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

function mapTariffType(record: {
  id: string;
  typeName: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): ParkingTariffTypeDto {
  return {
    id: record.id,
    typeName: record.typeName,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapRate(record: {
  id: string;
  parkingTariffTypeId: string;
  effectiveDate: Date;
  monthlyRate: Prisma.Decimal;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): ParkingTariffRateDto {
  return {
    id: record.id,
    parkingTariffTypeId: record.parkingTariffTypeId,
    effectiveDate: record.effectiveDate.toISOString(),
    monthlyRate: decimalToNumber(record.monthlyRate),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapSpace(record: {
  id: string;
  parkingNo: string;
  parkingTariffTypeId: string;
  chargeAccountId: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): ParkingSpaceDto {
  return {
    id: record.id,
    parkingNo: record.parkingNo,
    parkingTariffTypeId: record.parkingTariffTypeId,
    chargeAccountId: record.chargeAccountId,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function listParkingTariffTypes(
  client: PrismaClient,
): Promise<ParkingTariffTypeDto[]> {
  const records = await client.parkingTariffType.findMany({ orderBy: { typeName: 'asc' } });
  return records.map(mapTariffType);
}

export async function saveParkingTariffType(
  client: PrismaClient,
  dto: ParkingTariffTypeDto,
  actorId: string,
): Promise<ParkingTariffTypeDto> {
  if (!dto.typeName?.trim()) {
    throw new Error('Parking tariff type name is required.');
  }

  const data = {
    typeName: dto.typeName.trim(),
    isActive: dto.isActive,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.parkingTariffType.update({ where: { id: dto.id }, data })
    : await client.parkingTariffType.create({ data: { ...data, createdBy: actorId } });

  return mapTariffType(record);
}

export async function addParkingTariffRate(
  client: PrismaClient,
  typeId: string,
  effectiveDate: string,
  monthlyRate: number,
  actorId: string,
): Promise<ParkingTariffRateDto> {
  const record = await client.parkingTariffRate.create({
    data: {
      parkingTariffTypeId: typeId,
      effectiveDate: new Date(effectiveDate),
      monthlyRate,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
  return mapRate(record);
}

export async function listTariffRates(
  client: PrismaClient,
  typeId: string,
): Promise<ParkingTariffRateDto[]> {
  const records = await client.parkingTariffRate.findMany({
    where: { parkingTariffTypeId: typeId },
    orderBy: { effectiveDate: 'desc' },
  });
  return records.map(mapRate);
}

export async function listParkingSpaces(
  client: PrismaClient,
  filter?: string,
): Promise<ParkingSpaceDto[]> {
  const records = await client.parkingSpace.findMany({
    where: filter?.trim() ? { parkingNo: { contains: filter.trim() } } : undefined,
    orderBy: { parkingNo: 'asc' },
  });
  return records.map(mapSpace);
}

export async function saveParkingSpace(
  client: PrismaClient,
  dto: ParkingSpaceDto,
  actorId: string,
): Promise<ParkingSpaceDto> {
  if (!dto.parkingNo?.trim()) {
    throw new Error('Parking number is required.');
  }

  const data = {
    parkingNo: dto.parkingNo.trim().toUpperCase(),
    parkingTariffTypeId: dto.parkingTariffTypeId,
    chargeAccountId: dto.chargeAccountId,
    isActive: dto.isActive,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.parkingSpace.update({ where: { id: dto.id }, data })
    : await client.parkingSpace.create({ data: { ...data, createdBy: actorId } });

  return mapSpace(record);
}

export async function listParkingAssignments(
  client: PrismaClient,
  memberId?: string,
): Promise<MemberParkingAssignmentDto[]> {
  const records = await client.memberParkingAssignment.findMany({
    where: {
      ...(memberId ? { memberId } : {}),
      isActive: true,
    },
    include: { parkingSpace: true },
    orderBy: { purchaseDate: 'desc' },
  });

  return records.map((record) => ({
    id: record.id,
    memberId: record.memberId,
    parkingSpaceId: record.parkingSpaceId,
    parkingNo: record.parkingSpace.parkingNo,
    purchaseDate: record.purchaseDate.toISOString(),
    disposeDate: record.disposeDate?.toISOString() ?? null,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  }));
}

export async function saveParkingAssignment(
  client: PrismaClient,
  dto: MemberParkingAssignmentDto,
  actorId: string,
): Promise<MemberParkingAssignmentDto> {
  const data = {
    memberId: dto.memberId,
    parkingSpaceId: dto.parkingSpaceId,
    purchaseDate: new Date(dto.purchaseDate),
    disposeDate: dto.disposeDate ? new Date(dto.disposeDate) : null,
    isActive: dto.isActive,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.memberParkingAssignment.update({
        where: { id: dto.id },
        data,
        include: { parkingSpace: true },
      })
    : await client.memberParkingAssignment.create({
        data: { ...data, createdBy: actorId },
        include: { parkingSpace: true },
      });

  return {
    id: record.id,
    memberId: record.memberId,
    parkingSpaceId: record.parkingSpaceId,
    parkingNo: record.parkingSpace.parkingNo,
    purchaseDate: record.purchaseDate.toISOString(),
    disposeDate: record.disposeDate?.toISOString() ?? null,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

/** SDD §27.4 — PK-004 parking charge calculation for billing */
export async function calculateParkingCharges(
  client: PrismaClient,
  memberId: string,
  billDate: Date,
  mergeParkingOnBill: boolean,
  decimalPlaces: 0 | 2,
): Promise<ParkingChargeLineDto[]> {
  const assignments = await client.memberParkingAssignment.findMany({
    where: {
      memberId,
      isActive: true,
      purchaseDate: { lte: billDate },
      OR: [{ disposeDate: null }, { disposeDate: { gte: billDate } }],
    },
    include: {
      parkingSpace: {
        include: { parkingTariffType: true, chargeAccount: true },
      },
    },
  });

  const lines: ParkingChargeLineDto[] = [];

  for (const assignment of assignments) {
    const typeId = assignment.parkingSpace.parkingTariffTypeId;
    const rate = await client.parkingTariffRate.findFirst({
      where: {
        parkingTariffTypeId: typeId,
        effectiveDate: { lte: billDate },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!rate) continue;

    const amount = Money.fromRupees(decimalToNumber(rate.monthlyRate))
      .round(decimalPlaces)
      .toRupees();
    lines.push({
      accountMasterId: assignment.parkingSpace.chargeAccountId,
      chargeName: assignment.parkingSpace.chargeAccount.particulars,
      parkingNo: assignment.parkingSpace.parkingNo,
      amount,
    });
  }

  if (!mergeParkingOnBill || lines.length <= 1) {
    return lines;
  }

  const merged = new Map<string, ParkingChargeLineDto>();
  for (const line of lines) {
    const existing = merged.get(line.accountMasterId);
    if (existing) {
      existing.amount = Money.fromRupees(existing.amount + line.amount)
        .round(decimalPlaces)
        .toRupees();
      existing.parkingNo = `${existing.parkingNo}, ${line.parkingNo}`;
    } else {
      merged.set(line.accountMasterId, { ...line });
    }
  }

  return [...merged.values()];
}
