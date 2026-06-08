import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { createPrismaClient, enableWalMode } from '@sams/db';

export interface BackupManifest {
  version: string;
  sourcePath: string;
  createdAt: string;
  checksumSha256: string;
  integrityOk: boolean;
  societyName?: string;
  fyLabel?: string;
}

export interface BackupResult {
  path: string;
  manifestPath: string;
  checksum: string;
  integrityOk: boolean;
}

async function walCheckpoint(client: PrismaClient): Promise<void> {
  await client.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL);');
}

async function integrityCheck(client: PrismaClient): Promise<boolean> {
  const rows = await client.$queryRawUnsafe<Array<{ integrity_check: string }>>(
    'PRAGMA integrity_check;',
  );
  const result = rows[0]?.integrity_check ?? 'failed';
  return result === 'ok';
}

async function sha256File(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

export async function backupDatabase(
  sourcePath: string,
  targetPath?: string,
  metadata?: { societyName?: string; fyLabel?: string },
): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath =
    targetPath ?? join(dirname(sourcePath), `sams-backup-${timestamp}.sqlite`);

  await mkdir(dirname(backupPath), { recursive: true });

  const client = createPrismaClient(`file:${sourcePath}`);
  try {
    await enableWalMode(client);
    await walCheckpoint(client);
  } finally {
    await client.$disconnect();
  }

  await copyFile(sourcePath, backupPath);

  const verifyClient = createPrismaClient(`file:${backupPath}`);
  let integrityOk = false;
  try {
    await enableWalMode(verifyClient);
    integrityOk = await integrityCheck(verifyClient);
  } finally {
    await verifyClient.$disconnect();
  }

  const checksum = await sha256File(backupPath);
  const manifest: BackupManifest = {
    version: '1.0',
    sourcePath,
    createdAt: new Date().toISOString(),
    checksumSha256: checksum,
    integrityOk,
    societyName: metadata?.societyName,
    fyLabel: metadata?.fyLabel,
  };

  if (!integrityOk) {
    await unlink(backupPath).catch(() => undefined);
    throw new Error('Backup file failed integrity_check. Backup was not saved.');
  }

  const manifestPath = `${backupPath}.manifest.json`;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return { path: backupPath, manifestPath, checksum, integrityOk };
}

export async function restoreDatabase(
  backupPath: string,
  targetPath: string,
): Promise<{ path: string; integrityOk: boolean }> {
  const verifyClient = createPrismaClient(`file:${backupPath}`);
  let integrityOk = false;
  try {
    await enableWalMode(verifyClient);
    integrityOk = await integrityCheck(verifyClient);
  } finally {
    await verifyClient.$disconnect();
  }

  if (!integrityOk) {
    throw new Error('Backup file failed integrity_check. Restore aborted.');
  }

  const manifestPath = `${backupPath}.manifest.json`;
  try {
    const manifestRaw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw) as BackupManifest;
    const checksum = await sha256File(backupPath);
    if (manifest.checksumSha256 && manifest.checksumSha256 !== checksum) {
      throw new Error('Backup manifest checksum mismatch. Restore aborted.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('checksum mismatch')) {
      throw error;
    }
    // Manifest optional for legacy backups.
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(backupPath, targetPath);

  return { path: targetPath, integrityOk };
}
