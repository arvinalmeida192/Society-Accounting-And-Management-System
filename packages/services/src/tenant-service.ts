import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  TenantDto,
  TenantOccupancyResult,
  TenantSaveDto,
} from '@sams/shared-types';

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === 'number' ? value : value.toNumber();
}

function mapTenant(record: {
  id: string;
  unitId: string;
  tenantName: string;
  phone: string | null;
  email: string | null;
  licenseAgreementDate: Date;
  licenseExpiryDate: Date;
  monthlyRent: Prisma.Decimal | null;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  unit?: {
    unitNo: string;
    building: { shortName: string };
    wing: { shortName: string };
  };
}): TenantDto {
  return {
    id: record.id,
    unitId: record.unitId,
    tenantName: record.tenantName,
    phone: record.phone,
    email: record.email,
    licenseAgreementDate: record.licenseAgreementDate.toISOString(),
    licenseExpiryDate: record.licenseExpiryDate.toISOString(),
    monthlyRent: decimalToNumber(record.monthlyRent),
    isActive: record.isActive,
    archivedAt: record.archivedAt?.toISOString() ?? null,
    unitNo: record.unit?.unitNo,
    buildingShortName: record.unit?.building.shortName,
    wingShortName: record.unit?.wing.shortName,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

const tenantInclude = {
  unit: {
    include: {
      building: { select: { shortName: true } },
      wing: { select: { shortName: true } },
    },
  },
} as const;

export async function listTenants(
  client: PrismaClient,
  options: { unitId?: string; activeOnly?: boolean } = {},
): Promise<TenantDto[]> {
  const records = await client.tenant.findMany({
    where: {
      ...(options.unitId ? { unitId: options.unitId } : {}),
      ...(options.activeOnly ? { isActive: true } : {}),
    },
    include: tenantInclude,
    orderBy: [{ isActive: 'desc' }, { tenantName: 'asc' }],
  });

  return records.map(mapTenant);
}

export async function getTenantHistory(
  client: PrismaClient,
  unitId: string,
): Promise<TenantDto[]> {
  const records = await client.tenant.findMany({
    where: { unitId },
    include: tenantInclude,
    orderBy: { licenseAgreementDate: 'desc' },
  });

  return records.map(mapTenant);
}

export async function saveTenant(
  client: PrismaClient,
  dto: TenantSaveDto,
  actorId: string,
): Promise<TenantDto> {
  if (!dto.tenantName?.trim()) {
    throw Object.assign(new Error('Tenant name is required.'), { code: 'VALIDATION_ERROR' });
  }
  if (!dto.unitId) {
    throw Object.assign(new Error('Unit is required.'), { code: 'VALIDATION_ERROR' });
  }

  const data = {
    unitId: dto.unitId,
    tenantName: dto.tenantName.trim(),
    phone: dto.phone ?? null,
    email: dto.email ?? null,
    licenseAgreementDate: new Date(dto.licenseAgreementDate),
    licenseExpiryDate: new Date(dto.licenseExpiryDate),
    monthlyRent: dto.monthlyRent ?? null,
    isActive: dto.isActive ?? true,
    updatedBy: actorId,
  };

  const record = await client.$transaction(async (tx) => {
    if (data.isActive) {
      await tx.tenant.updateMany({
        where: {
          unitId: dto.unitId,
          isActive: true,
          ...(dto.id ? { id: { not: dto.id } } : {}),
        },
        data: {
          isActive: false,
          archivedAt: new Date(),
          archivedById: actorId,
          updatedBy: actorId,
        },
      });
    }

    if (dto.id) {
      return tx.tenant.update({
        where: { id: dto.id },
        data,
        include: tenantInclude,
      });
    }

    return tx.tenant.create({
      data: { ...data, createdBy: actorId },
      include: tenantInclude,
    });
  });

  return mapTenant(record);
}

export async function archiveTenant(
  client: PrismaClient,
  id: string,
  actorId: string,
): Promise<TenantDto> {
  const record = await client.tenant.update({
    where: { id },
    data: {
      isActive: false,
      archivedAt: new Date(),
      archivedById: actorId,
      updatedBy: actorId,
    },
    include: tenantInclude,
  });

  return mapTenant(record);
}

export async function validateTenantForOccupancy(
  client: PrismaClient,
  unitId: string,
): Promise<TenantOccupancyResult> {
  const tenant = await client.tenant.findFirst({
    where: { unitId, isActive: true },
    select: { id: true, tenantName: true },
  });

  if (!tenant) {
    return { hasActiveTenant: false };
  }

  return {
    hasActiveTenant: true,
    tenant: { id: tenant.id, tenantName: tenant.tenantName },
  };
}
