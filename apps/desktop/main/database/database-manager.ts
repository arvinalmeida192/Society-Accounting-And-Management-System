import { execFile } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { PrismaClient } from '@prisma/client';
import { createPrismaClient, disconnectPrisma, enableWalMode } from '@sams/db';

const execFileAsync = promisify(execFile);

function findRepoRoot(startDir: string): string {
  let current = startDir;
  while (current !== dirname(current)) {
    if (existsSync(join(current, 'packages', 'db', 'prisma', 'schema.prisma'))) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error('Could not locate SAMS repository root.');
}

const repoRoot = findRepoRoot(fileURLToPath(new URL('.', import.meta.url)));

let activeClient: PrismaClient | null = null;
let activePath: string | null = null;

export function getActiveDatabasePath(): string | null {
  return activePath;
}

export function getActivePrisma(): PrismaClient {
  if (!activeClient) {
    throw new Error('No database is connected.');
  }
  return activeClient;
}

export function hasActiveDatabase(): boolean {
  return activeClient !== null;
}

function toDatabaseUrl(filePath: string): string {
  return `file:${filePath}`;
}

export async function deployMigrations(dbPath: string): Promise<void> {
  mkdirSync(dirname(dbPath), { recursive: true });

  const prismaDir = join(repoRoot, 'packages/db');
  await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: prismaDir,
    env: {
      ...process.env,
      DATABASE_URL: toDatabaseUrl(dbPath),
    },
  });
}

export async function connectDatabase(dbPath: string): Promise<PrismaClient> {
  if (!existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }

  if (activeClient) {
    await activeClient.$disconnect();
    activeClient = null;
    activePath = null;
  }

  await disconnectPrisma();

  const client = createPrismaClient(toDatabaseUrl(dbPath));
  await enableWalMode(client);

  activeClient = client;
  activePath = dbPath;
  return client;
}

export async function createEmptyDatabaseFile(dbPath: string): Promise<PrismaClient> {
  if (existsSync(dbPath)) {
    throw new Error('A database file already exists at the selected path.');
  }

  mkdirSync(dirname(dbPath), { recursive: true });
  await deployMigrations(dbPath);
  return connectDatabase(dbPath);
}

export async function closeDatabase(): Promise<void> {
  if (activeClient) {
    await activeClient.$disconnect();
    activeClient = null;
    activePath = null;
  }
  await disconnectPrisma();
}
