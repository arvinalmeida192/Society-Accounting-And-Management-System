import type { PrismaClient } from '@prisma/client';
import { ErrorCodes } from '@sams/shared-types';
import type { ValidateDatabaseResult } from '@sams/shared-types';
import { SCHEMA_VERSION } from '@sams/db';

export class DatabaseValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** SDD §2.3.1 — validate SAMS database signature */
export async function validateSamsDatabase(
  client: PrismaClient,
): Promise<ValidateDatabaseResult> {
  try {
    await client.$queryRaw`SELECT 1 FROM _prisma_migrations LIMIT 1`;
  } catch {
    return {
      valid: false,
      errorMessage: 'Not a SAMS database: migration history is missing.',
    };
  }

  const meta = await client.systemMeta.findUnique({ where: { id: 1 } });
  if (!meta) {
    return {
      valid: false,
      errorMessage: 'Not a SAMS database: SystemMeta record is missing.',
    };
  }

  if (meta.schemaVersion !== SCHEMA_VERSION) {
    return {
      valid: false,
      schemaVersion: meta.schemaVersion,
      errorMessage: `Database schema version ${meta.schemaVersion} does not match application ${SCHEMA_VERSION}.`,
    };
  }

  const identity = await client.societyIdentity.findFirst();
  if (!identity) {
    return {
      valid: false,
      errorMessage: 'Not a SAMS database: Society identity has not been configured.',
    };
  }

  const financialYear = await client.financialYear.findFirst({
    orderBy: { startDate: 'desc' },
  });

  if (!financialYear) {
    return {
      valid: false,
      errorMessage: 'Not a SAMS database: financial year record is missing.',
    };
  }

  return {
    valid: true,
    schemaVersion: meta.schemaVersion,
    societyName: identity.societyName,
    fyLabel: financialYear.label,
    isReadOnly: meta.isReadOnly,
  };
}

export async function assertValidSamsDatabase(client: PrismaClient): Promise<{
  societyName: string;
  fyLabel: string;
  financialYearId: string;
  isReadOnly: boolean;
}> {
  const result = await validateSamsDatabase(client);
  if (!result.valid) {
    throw new DatabaseValidationError(
      ErrorCodes.INVALID_DB,
      result.errorMessage ?? 'Invalid SAMS database',
    );
  }

  const identity = await client.societyIdentity.findFirstOrThrow();
  const financialYear = await client.financialYear.findFirstOrThrow({
    orderBy: { startDate: 'desc' },
  });

  return {
    societyName: identity.societyName,
    fyLabel: financialYear.label,
    financialYearId: financialYear.id,
    isReadOnly: result.isReadOnly ?? false,
  };
}
