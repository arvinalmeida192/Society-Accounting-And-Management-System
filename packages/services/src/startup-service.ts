import type { PrismaClient } from '@prisma/client';
import { UserRole } from '@sams/shared-types';
import type {
  AdminUserInput,
  CreateSocietyWizardDto,
  FinancialYearInput,
  SocietyIdentityInput,
} from '@sams/shared-types';
import { APP_VERSION, SCHEMA_VERSION } from '@sams/db';
import { hashPassword } from './auth-service.js';
import { generateFinancialYearLabel, parseIsoDate } from './financial-year.js';
import { PERMISSION_SEED_ROWS } from './permission-seed.js';

const SYSTEM_ACTOR = 'SYSTEM';

export function validateSocietyIdentityInput(
  identity: SocietyIdentityInput,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!identity.societyName?.trim()) {
    errors.societyName = 'Society name is required.';
  } else if (identity.societyName.length > 200) {
    errors.societyName = 'Society name must be at most 200 characters.';
  }

  if (identity.pinCode && !/^\d{6}$/.test(identity.pinCode)) {
    errors.pinCode = 'PIN code must be 6 digits.';
  }

  if (identity.pan && identity.pan.length > 10) {
    errors.pan = 'PAN must be at most 10 characters.';
  }

  return errors;
}

export function validateFinancialYearInput(
  financialYear: FinancialYearInput,
): Record<string, string> {
  const errors: Record<string, string> = {};

  try {
    const start = parseIsoDate(financialYear.startDate, 'startDate');
    const end = parseIsoDate(financialYear.endDate, 'endDate');
    if (end <= start) {
      errors.endDate = 'End date must be after start date.';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid financial year dates.';
    errors.startDate = message;
  }

  return errors;
}

export function validateAdminUserInput(adminUser: AdminUserInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!adminUser.username?.trim()) {
    errors.username = 'Username is required.';
  }

  if (!adminUser.displayName?.trim()) {
    errors.displayName = 'Display name is required.';
  }

  if (!adminUser.password || adminUser.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
}

export function validateCreateSocietyWizardDto(
  dto: CreateSocietyWizardDto,
): Record<string, string> {
  return {
    ...validateSocietyIdentityInput(dto.identity),
    ...validateFinancialYearInput(dto.financialYear),
    ...validateAdminUserInput(dto.adminUser),
    ...(dto.dbPath?.trim() ? {} : { dbPath: 'Database file path is required.' }),
  };
}

/** SDD §20.5 WIZ-001 — create SystemMeta, SocietyIdentity, FY, permissions, admin user */
export async function createSocietyInDatabase(
  client: PrismaClient,
  dto: CreateSocietyWizardDto,
): Promise<{ societyName: string; fyLabel: string; financialYearId: string }> {
  const fieldErrors = validateCreateSocietyWizardDto(dto);
  if (Object.keys(fieldErrors).length > 0) {
    const message = Object.values(fieldErrors).join(' ');
    throw new Error(message);
  }

  const startDate = parseIsoDate(dto.financialYear.startDate, 'startDate');
  const endDate = parseIsoDate(dto.financialYear.endDate, 'endDate');
  const fyLabel = generateFinancialYearLabel(startDate, endDate);
  const passwordHash = await hashPassword(dto.adminUser.password);

  return client.$transaction(async (tx) => {
    await tx.systemMeta.create({
      data: {
        id: 1,
        schemaVersion: SCHEMA_VERSION,
        appVersionCreated: APP_VERSION,
        isReadOnly: false,
        yearStorageMode: 'SEPARATE_FILES',
      },
    });

    const identity = await tx.societyIdentity.create({
      data: {
        societyName: dto.identity.societyName.trim(),
        registrationNumber: dto.identity.registrationNumber?.trim() || null,
        registrationDate: dto.identity.registrationDate
          ? parseIsoDate(dto.identity.registrationDate, 'registrationDate')
          : null,
        addressLine1: dto.identity.addressLine1?.trim() || null,
        addressLine2: dto.identity.addressLine2?.trim() || null,
        addressLine3: dto.identity.addressLine3?.trim() || null,
        city: dto.identity.city?.trim() || null,
        state: dto.identity.state?.trim() || null,
        pinCode: dto.identity.pinCode?.trim() || null,
        telephone: dto.identity.telephone?.trim() || null,
        fax: dto.identity.fax?.trim() || null,
        email: dto.identity.email?.trim() || null,
        website: dto.identity.website?.trim() || null,
        tan: dto.identity.tan?.trim() || null,
        pan: dto.identity.pan?.trim() || null,
        tdsCircle: dto.identity.tdsCircle?.trim() || null,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      },
    });

    const financialYear = await tx.financialYear.create({
      data: {
        label: fyLabel,
        startDate,
        endDate,
        isClosed: false,
        societyIdentityId: identity.id,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      },
    });

    for (const row of PERMISSION_SEED_ROWS) {
      await tx.permission.create({ data: row });
    }

    await tx.user.create({
      data: {
        username: dto.adminUser.username.trim(),
        passwordHash,
        displayName: dto.adminUser.displayName.trim(),
        role: UserRole.ADMIN,
        isActive: true,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      },
    });

    return {
      societyName: identity.societyName,
      fyLabel,
      financialYearId: financialYear.id,
    };
  });
}

export async function finalizeSocietyBootstrap(
  client: PrismaClient,
  societyIdentityId: string,
  financialYearId: string,
): Promise<void> {
  const { seedSocietyConfiguration } = await import('./report-template-seed.js');
  await seedSocietyConfiguration(client, societyIdentityId, financialYearId);
}
