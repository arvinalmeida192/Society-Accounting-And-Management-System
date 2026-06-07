import type { PrismaClient } from '@prisma/client';
import { ensureDefaultChartOfAccounts } from './coa-seed.js';
import { seedSocietyConfiguration } from './report-template-seed.js';

/** Back-fill Phase 3–4 defaults for databases created in earlier phases. */
export async function ensureSocietyConfiguration(client: PrismaClient): Promise<void> {
  const identity = await client.societyIdentity.findFirst();
  if (!identity) {
    return;
  }

  const parameters = await client.societyParameters.findFirst();
  if (!parameters) {
    const financialYear = await client.financialYear.findFirst({
      orderBy: { startDate: 'desc' },
    });
    if (!financialYear) {
      return;
    }
    await seedSocietyConfiguration(client, identity.id, financialYear.id);
    return;
  }

  await ensureDefaultChartOfAccounts(client);

  const { seedPropertyReferenceMasters } = await import('./property-reference-seed.js');
  await seedPropertyReferenceMasters(client);

  const { seedMiscellaneousMasters } = await import('./masters-seed.js');
  await seedMiscellaneousMasters(client);

  const { seedDefaultTariffConfiguration } = await import('./tariff-seed.js');
  await seedDefaultTariffConfiguration(client);
}
