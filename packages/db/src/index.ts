import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

let prisma: PrismaClient | undefined;

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient({
    datasources: databaseUrl
      ? { db: { url: databaseUrl } }
      : undefined,
  });
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

/** Enable SQLite WAL mode — SDD §3.1, NF-006 */
export async function enableWalMode(client: PrismaClient): Promise<void> {
  await client.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}

export const SCHEMA_VERSION = '1.0.0';
export const APP_VERSION = '0.1.0';
