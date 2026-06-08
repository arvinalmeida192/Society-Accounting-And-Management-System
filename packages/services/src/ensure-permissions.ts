import type { PrismaClient } from '@prisma/client';
import { PERMISSION_SEED_ROWS } from './permission-seed.js';

/** Back-fill permission rows added in later phases for existing databases. */
export async function ensurePermissions(client: PrismaClient): Promise<void> {
  const existing = await client.permission.findMany({
    select: { role: true, resource: true, action: true },
  });
  const existingKeys = new Set(existing.map((row) => `${row.role}:${row.resource}:${row.action}`));

  const missing = PERMISSION_SEED_ROWS.filter(
    (row) => !existingKeys.has(`${row.role}:${row.resource}:${row.action}`),
  );

  if (missing.length === 0) {
    return;
  }

  await client.permission.createMany({ data: missing });
}
