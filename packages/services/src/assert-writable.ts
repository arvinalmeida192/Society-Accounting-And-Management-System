import type { PrismaClient } from '@prisma/client';
import { ErrorCodes } from '@sams/shared-types';
import { getActiveFinancialYear } from './financial-year.js';

export class YearClosedError extends Error {
  readonly code = ErrorCodes.YEAR_CLOSED;

  constructor(message = 'Financial year is closed for modifications') {
    super(message);
  }
}

/** NF-009 — service-layer guard when IPC is bypassed. */
export async function assertWritable(client: PrismaClient): Promise<void> {
  const [meta, fy] = await Promise.all([
    client.systemMeta.findFirst(),
    getActiveFinancialYear(client),
  ]);

  if (meta?.isReadOnly || fy.isClosed) {
    throw new YearClosedError();
  }
}
