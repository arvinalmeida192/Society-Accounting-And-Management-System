import { dialog } from 'electron';
import { PermissionAction } from '@sams/shared-types';
import type {
  MemberCsvCommitResultDto,
  MemberCsvTemplateResultDto,
  MemberCsvValidationResultDto,
} from '@sams/shared-types';
import { commitMemberCsv, validateMemberCsv } from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const importHandlers = {
  memberCsvTemplate: (async () => {
    const result = await dialog.showSaveDialog({
      title: 'Save member import template',
      defaultPath: 'sams-member-import-template.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (result.canceled || !result.filePath) {
      throw Object.assign(new Error('Template download cancelled.'), { code: 'USER_CANCELLED' });
    }
    const { writeFile } = await import('node:fs/promises');
    const { memberCsvTemplateContent } = await import('@sams/services');
    await writeFile(result.filePath, memberCsvTemplateContent(), 'utf8');
    return { path: result.filePath } satisfies MemberCsvTemplateResultDto;
  }) as IpcHandler<Record<string, never>, MemberCsvTemplateResultDto>,

  pickMemberCsv: (async () => {
    const path = await pickMemberCsvFile();
    if (!path) {
      throw Object.assign(new Error('File selection cancelled.'), { code: 'USER_CANCELLED' });
    }
    return { path };
  }) as IpcHandler<Record<string, never>, { path: string }>,

  memberCsvValidate: (async (_ctx, payload: { filePath: string }) =>
    validateMemberCsv(getActivePrisma(), payload.filePath)) as IpcHandler<
    { filePath: string },
    MemberCsvValidationResultDto
  >,

  memberCsvCommit: (async (_ctx, payload: { filePath: string }) =>
    commitMemberCsv(getActivePrisma(), payload.filePath, requireUserId())) as IpcHandler<
    { filePath: string },
    MemberCsvCommitResultDto
  >,
};

export async function pickMemberCsvFile(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Select member CSV file',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
}

export const importReadOptions = {
  resource: 'members',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const importWriteOptions = {
  resource: 'members',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};
