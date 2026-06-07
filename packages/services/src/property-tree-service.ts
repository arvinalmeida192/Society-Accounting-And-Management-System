import type { Prisma, PrismaClient } from '@prisma/client';
import { UnitStatus } from '@prisma/client';
import {
  UnitStatus as SharedUnitStatus,
  type BuildingDto,
  type FloorMasterDto,
  type ReferenceMasterType,
  type UnitAreaDto,
  type UnitCompositionDto,
  type UnitDetailDto,
  type UnitDto,
  type UnitSaveDto,
  type UnitTypeDto,
  type WingDto,
} from '@sams/shared-types';
import { canDeleteBuilding, canDeleteWing } from './reference-guard-service.js';

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === 'number' ? value : value.toNumber();
}

function mapBuilding(record: {
  id: string;
  financialYearId: string;
  shortName: string;
  fullName: string;
  totalUnits: number;
  numberOfFloors: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): BuildingDto {
  return {
    id: record.id,
    financialYearId: record.financialYearId,
    shortName: record.shortName,
    fullName: record.fullName,
    totalUnits: record.totalUnits,
    numberOfFloors: record.numberOfFloors,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapWing(record: {
  id: string;
  buildingId: string;
  shortName: string;
  fullName: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): WingDto {
  return {
    id: record.id,
    buildingId: record.buildingId,
    shortName: record.shortName,
    fullName: record.fullName,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function mapUnit(record: {
  id: string;
  buildingId: string;
  wingId: string;
  unitNo: string;
  floorMasterId: string | null;
  unitTypeId: string | null;
  unitCompositionId: string | null;
  unitAreaId: string | null;
  carpetAreaSqFt: Prisma.Decimal | null;
  residentialAreaSqFt: Prisma.Decimal | null;
  commercialAreaSqFt: Prisma.Decimal | null;
  residentialRateableValue: Prisma.Decimal | null;
  commercialRateableValue: Prisma.Decimal | null;
  serialNo: number;
  status: UnitStatus;
  constructionValue: Prisma.Decimal | null;
  landValue: Prisma.Decimal | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): UnitDto {
  return {
    id: record.id,
    buildingId: record.buildingId,
    wingId: record.wingId,
    unitNo: record.unitNo,
    floorMasterId: record.floorMasterId,
    unitTypeId: record.unitTypeId,
    unitCompositionId: record.unitCompositionId,
    unitAreaId: record.unitAreaId,
    carpetAreaSqFt: decimalToNumber(record.carpetAreaSqFt),
    residentialAreaSqFt: decimalToNumber(record.residentialAreaSqFt),
    commercialAreaSqFt: decimalToNumber(record.commercialAreaSqFt),
    residentialRateableValue: decimalToNumber(record.residentialRateableValue),
    commercialRateableValue: decimalToNumber(record.commercialRateableValue),
    serialNo: record.serialNo,
    status: record.status as SharedUnitStatus,
    constructionValue: decimalToNumber(record.constructionValue),
    landValue: decimalToNumber(record.landValue),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function listBuildings(
  client: PrismaClient,
  financialYearId: string,
  filter?: string,
): Promise<{ items: BuildingDto[]; total: number }> {
  const where = {
    financialYearId,
    deletedAt: null,
    ...(filter?.trim()
      ? {
          OR: [
            { shortName: { contains: filter.trim() } },
            { fullName: { contains: filter.trim() } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    client.building.findMany({ where, orderBy: { shortName: 'asc' } }),
    client.building.count({ where }),
  ]);

  return { items: items.map(mapBuilding), total };
}

export async function getBuilding(client: PrismaClient, id: string): Promise<BuildingDto> {
  const record = await client.building.findFirstOrThrow({
    where: { id, deletedAt: null },
  });
  return mapBuilding(record);
}

export async function saveBuilding(
  client: PrismaClient,
  dto: BuildingDto,
  actorId: string,
): Promise<BuildingDto> {
  if (!dto.shortName?.trim() || dto.shortName.length > 10) {
    throw Object.assign(new Error('Building short name is required (max 10 characters).'), {
      fieldErrors: { shortName: 'Required, max 10 characters.' },
    });
  }
  if (!dto.fullName?.trim()) {
    throw Object.assign(new Error('Building full name is required.'), {
      fieldErrors: { fullName: 'Required.' },
    });
  }

  const data = {
    financialYearId: dto.financialYearId,
    shortName: dto.shortName.trim().toUpperCase(),
    fullName: dto.fullName.trim(),
    totalUnits: dto.totalUnits,
    numberOfFloors: dto.numberOfFloors,
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.building.update({ where: { id: dto.id }, data })
    : await client.building.create({ data: { ...data, createdBy: actorId } });

  return mapBuilding(record);
}

export async function deleteBuilding(
  client: PrismaClient,
  id: string,
  actorId: string,
): Promise<{ deleted: boolean; blockReason?: string }> {
  const guard = await canDeleteBuilding(client, id);
  if (!guard.allowed) {
    return { deleted: false, blockReason: guard.references.join('; ') };
  }

  await client.building.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: actorId, updatedBy: actorId },
  });

  return { deleted: true };
}

export async function listWings(client: PrismaClient, buildingId: string): Promise<WingDto[]> {
  const records = await client.wing.findMany({
    where: { buildingId, deletedAt: null },
    orderBy: { shortName: 'asc' },
  });
  return records.map(mapWing);
}

export async function saveWing(
  client: PrismaClient,
  dto: WingDto,
  actorId: string,
): Promise<WingDto> {
  if (!dto.shortName?.trim()) {
    throw Object.assign(new Error('Wing short name is required.'), {
      fieldErrors: { shortName: 'Required.' },
    });
  }

  const data = {
    buildingId: dto.buildingId,
    shortName: dto.shortName.trim(),
    fullName: dto.fullName.trim(),
    updatedBy: actorId,
  };

  const record = dto.id
    ? await client.wing.update({ where: { id: dto.id }, data })
    : await client.wing.create({ data: { ...data, createdBy: actorId } });

  return mapWing(record);
}

export async function deleteWing(
  client: PrismaClient,
  id: string,
  actorId: string,
): Promise<{ deleted: boolean; blockReason?: string }> {
  const guard = await canDeleteWing(client, id);
  if (!guard.allowed) {
    return { deleted: false, blockReason: guard.references.join('; ') };
  }

  await client.wing.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: actorId, updatedBy: actorId },
  });

  return { deleted: true };
}

export async function listReferenceMasters(
  client: PrismaClient,
  type: ReferenceMasterType,
): Promise<UnitAreaDto[] | UnitTypeDto[] | UnitCompositionDto[] | FloorMasterDto[]> {
  switch (type) {
    case 'UNIT_AREA':
      return client.unitArea.findMany({ orderBy: { areaSqFt: 'asc' } }).then((rows) =>
        rows.map((row) => ({
          id: row.id,
          areaSqFt: decimalToNumber(row.areaSqFt) ?? 0,
          description: row.description,
          isActive: row.isActive,
          createdAt: row.createdAt.toISOString(),
          createdBy: row.createdBy,
          updatedAt: row.updatedAt.toISOString(),
          updatedBy: row.updatedBy,
        })),
      );
    case 'UNIT_TYPE':
      return client.unitType.findMany({ orderBy: { typeName: 'asc' } }).then((rows) =>
        rows.map((row) => ({
          id: row.id,
          typeName: row.typeName,
          isActive: row.isActive,
          createdAt: row.createdAt.toISOString(),
          createdBy: row.createdBy,
          updatedAt: row.updatedAt.toISOString(),
          updatedBy: row.updatedBy,
        })),
      );
    case 'COMPOSITION':
      return client.unitComposition.findMany({ orderBy: { compositionName: 'asc' } }).then((rows) =>
        rows.map((row) => ({
          id: row.id,
          compositionName: row.compositionName,
          isActive: row.isActive,
          createdAt: row.createdAt.toISOString(),
          createdBy: row.createdBy,
          updatedAt: row.updatedAt.toISOString(),
          updatedBy: row.updatedBy,
        })),
      );
    case 'FLOOR':
      return client.floorMaster.findMany({ orderBy: { srNo: 'asc' } }).then((rows) =>
        rows.map((row) => ({
          id: row.id,
          srNo: row.srNo,
          floorName: row.floorName,
          isActive: row.isActive,
          createdAt: row.createdAt.toISOString(),
          createdBy: row.createdBy,
          updatedAt: row.updatedAt.toISOString(),
          updatedBy: row.updatedBy,
        })),
      );
    default:
      return [];
  }
}

export async function saveReferenceMaster(
  client: PrismaClient,
  type: ReferenceMasterType,
  data: Record<string, unknown>,
  actorId: string,
): Promise<unknown> {
  const id = typeof data.id === 'string' ? data.id : undefined;

  switch (type) {
    case 'UNIT_AREA': {
      const payload = {
        areaSqFt: Number(data.areaSqFt),
        description: typeof data.description === 'string' ? data.description : null,
        isActive: data.isActive !== false,
        updatedBy: actorId,
      };
      const record = id
        ? await client.unitArea.update({ where: { id }, data: payload })
        : await client.unitArea.create({ data: { ...payload, createdBy: actorId } });
      return {
        id: record.id,
        areaSqFt: decimalToNumber(record.areaSqFt) ?? 0,
        description: record.description,
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy,
      };
    }
    case 'UNIT_TYPE': {
      const payload = {
        typeName: String(data.typeName ?? '').trim(),
        isActive: data.isActive !== false,
        updatedBy: actorId,
      };
      const record = id
        ? await client.unitType.update({ where: { id }, data: payload })
        : await client.unitType.create({ data: { ...payload, createdBy: actorId } });
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
    case 'COMPOSITION': {
      const payload = {
        compositionName: String(data.compositionName ?? '').trim(),
        isActive: data.isActive !== false,
        updatedBy: actorId,
      };
      const record = id
        ? await client.unitComposition.update({ where: { id }, data: payload })
        : await client.unitComposition.create({ data: { ...payload, createdBy: actorId } });
      return {
        id: record.id,
        compositionName: record.compositionName,
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy,
      };
    }
    case 'FLOOR': {
      const payload = {
        srNo: Number(data.srNo),
        floorName: String(data.floorName ?? '').trim(),
        isActive: data.isActive !== false,
        updatedBy: actorId,
      };
      const record = id
        ? await client.floorMaster.update({ where: { id }, data: payload })
        : await client.floorMaster.create({ data: { ...payload, createdBy: actorId } });
      return {
        id: record.id,
        srNo: record.srNo,
        floorName: record.floorName,
        isActive: record.isActive,
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy,
      };
    }
    default:
      throw new Error('Unsupported reference master type.');
  }
}

export async function listUnits(
  client: PrismaClient,
  filter?: { buildingId?: string; wingId?: string; search?: string },
): Promise<{ items: UnitDto[]; total: number }> {
  const where = {
    deletedAt: null,
    ...(filter?.buildingId ? { buildingId: filter.buildingId } : {}),
    ...(filter?.wingId ? { wingId: filter.wingId } : {}),
    ...(filter?.search?.trim() ? { unitNo: { contains: filter.search.trim() } } : {}),
  };

  const [items, total] = await Promise.all([
    client.unit.findMany({ where, orderBy: { serialNo: 'asc' } }),
    client.unit.count({ where }),
  ]);

  return { items: items.map(mapUnit), total };
}

export async function getUnit(client: PrismaClient, id: string): Promise<UnitDetailDto> {
  const record = await client.unit.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: {
      building: true,
      wing: true,
      floorMaster: true,
      unitType: true,
      unitComposition: true,
      unitArea: true,
    },
  });

  return {
    ...mapUnit(record),
    buildingShortName: record.building.shortName,
    wingShortName: record.wing.shortName,
    floorName: record.floorMaster?.floorName ?? null,
    unitTypeName: record.unitType?.typeName ?? null,
    compositionName: record.unitComposition?.compositionName ?? null,
    areaSqFt: decimalToNumber(record.unitArea?.areaSqFt) ?? null,
  };
}

export async function validateUnitNo(
  client: PrismaClient,
  buildingId: string,
  wingId: string,
  unitNo: string,
  excludeId?: string,
): Promise<{ unique: boolean; suggestion?: string }> {
  const existing = await client.unit.findFirst({
    where: {
      buildingId,
      wingId,
      unitNo: unitNo.trim(),
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });

  if (!existing) {
    return { unique: true };
  }

  const wing = await client.wing.findUnique({ where: { id: wingId } });
  const prefix = wing?.shortName && wing.shortName !== '.' ? `${wing.shortName}-` : '';
  const count = await client.unit.count({ where: { buildingId, wingId, deletedAt: null } });
  return {
    unique: false,
    suggestion: `${prefix}${String(count + 1).padStart(3, '0')}`,
  };
}

export async function saveUnit(
  client: PrismaClient,
  dto: UnitSaveDto,
  actorId: string,
): Promise<UnitDetailDto> {
  if (!dto.unitNo?.trim()) {
    throw Object.assign(new Error('Unit number is required.'), {
      fieldErrors: { unitNo: 'Required.' },
    });
  }

  const uniqueness = await validateUnitNo(
    client,
    dto.buildingId,
    dto.wingId,
    dto.unitNo,
    dto.id,
  );
  if (!uniqueness.unique) {
    throw Object.assign(new Error('Unit number already exists for this building and wing.'), {
      fieldErrors: { unitNo: `Duplicate. Try ${uniqueness.suggestion ?? 'another number'}.` },
    });
  }

  const data = {
    buildingId: dto.buildingId,
    wingId: dto.wingId,
    unitNo: dto.unitNo.trim(),
    floorMasterId: dto.floorMasterId,
    unitTypeId: dto.unitTypeId,
    unitCompositionId: dto.unitCompositionId,
    unitAreaId: dto.unitAreaId,
    carpetAreaSqFt: dto.carpetAreaSqFt,
    residentialAreaSqFt: dto.residentialAreaSqFt,
    commercialAreaSqFt: dto.commercialAreaSqFt,
    residentialRateableValue: dto.residentialRateableValue,
    commercialRateableValue: dto.commercialRateableValue,
    status: dto.status,
    constructionValue: dto.constructionValue,
    landValue: dto.landValue,
    updatedBy: actorId,
  };

  if (dto.id) {
    await client.unit.update({ where: { id: dto.id }, data });
    return getUnit(client, dto.id);
  }

  const maxSerial = await client.unit.aggregate({ _max: { serialNo: true } });
  const record = await client.unit.create({
    data: {
      ...data,
      serialNo: (maxSerial._max.serialNo ?? 0) + 1,
      createdBy: actorId,
    },
  });

  return getUnit(client, record.id);
}

export async function archiveUnit(
  client: PrismaClient,
  id: string,
  actorId: string,
): Promise<UnitDto> {
  const record = await client.unit.update({
    where: { id },
    data: {
      status: UnitStatus.ARCHIVED,
      deletedAt: new Date(),
      deletedById: actorId,
      updatedBy: actorId,
    },
  });
  return mapUnit(record);
}
