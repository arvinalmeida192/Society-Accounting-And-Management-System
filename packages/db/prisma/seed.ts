import { PrismaClient } from '@prisma/client';
import { PERMISSION_SEED_ROWS } from '../../services/src/permission-seed.ts';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.permission.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemMeta.deleteMany();

  await prisma.systemMeta.create({
    data: {
      id: 1,
      schemaVersion: '1.0.0',
      appVersionCreated: '0.1.0',
      isReadOnly: false,
      yearStorageMode: 'SEPARATE_FILES',
    },
  });

  for (const row of PERMISSION_SEED_ROWS) {
    await prisma.permission.create({ data: row });
  }

  console.log(`Seeded ${PERMISSION_SEED_ROWS.length} permissions and SystemMeta singleton.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
