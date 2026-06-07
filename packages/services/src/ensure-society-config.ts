import type { PrismaClient } from '@prisma/client';
import { seedSocietyConfiguration } from './report-template-seed.js';

/** Back-fill Phase 3 defaults for databases created in Phase 2. */
export async function ensureSocietyConfiguration(client: PrismaClient): Promise<void> {
  const identity = await client.societyIdentity.findFirst();
  if (!identity) {
    return;
  }

  const parameters = await client.societyParameters.findFirst();
  if (parameters) {
    return;
  }

  const financialYear = await client.financialYear.findFirst({
    orderBy: { startDate: 'desc' },
  });
  if (!financialYear) {
    return;
  }

  await seedSocietyConfiguration(client, identity.id, financialYear.id);
}
