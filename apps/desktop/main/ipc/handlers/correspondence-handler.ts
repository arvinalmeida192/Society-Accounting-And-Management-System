import { PermissionAction, CommitteeStatus, LetterType } from '@sams/shared-types';
import type {
  CommitteeMemberDto,
  DefaulterMemberDto,
  GeneratedLetterDto,
  GenerateReminderDto,
  GenerateReminderResultDto,
  LetterTemplateDto,
  MeetingMinutesDto,
  SaveGeneralLetterDto,
} from '@sams/shared-types';
import {
  deleteCommitteeMember,
  deleteMeetingMinutes,
  generateReminder,
  getGeneratedLetter,
  getMeetingMinutes,
  listCommitteeMembers,
  listDefaulters,
  listGeneratedLetters,
  listLetterTemplates,
  listMeetingMinutes,
  renderMeetingMinutesPrint,
  saveCommitteeMember,
  saveGeneralLetter,
  saveLetterTemplate,
  saveMeetingMinutes,
} from '@sams/services';
import { getActivePrisma } from '../../database/database-manager.js';
import { sessionManager } from '../../session/session-manager.js';
import type { IpcHandler } from '../pipeline.js';

function requireUserId(): string {
  const userId = sessionManager.get().userId;
  if (!userId) throw new Error('User session is required.');
  return userId;
}

export const correspondenceHandlers = {
  listTemplates: (async () => listLetterTemplates(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    LetterTemplateDto[]
  >,

  saveTemplate: (async (_ctx, payload: LetterTemplateDto) =>
    saveLetterTemplate(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    LetterTemplateDto,
    LetterTemplateDto
  >,

  listDefaulters: (async (
    _ctx,
    payload: { minOutstanding?: number; buildingId?: string },
  ) => listDefaulters(getActivePrisma(), payload)) as IpcHandler<
    { minOutstanding?: number; buildingId?: string },
    DefaulterMemberDto[]
  >,

  generateReminder: (async (_ctx, payload: GenerateReminderDto) =>
    generateReminder(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    GenerateReminderDto,
    GenerateReminderResultDto
  >,

  getGeneratedLetter: (async (_ctx, payload: { id: string }) =>
    getGeneratedLetter(getActivePrisma(), payload.id)) as IpcHandler<
    { id: string },
    GeneratedLetterDto
  >,

  listGeneratedLetters: (async (
    _ctx,
    payload: { letterType?: LetterType; memberId?: string },
  ) =>
    listGeneratedLetters(getActivePrisma(), {
      letterType: payload.letterType,
      memberId: payload.memberId,
    })) as IpcHandler<
    { letterType?: LetterType; memberId?: string },
    GeneratedLetterDto[]
  >,

  saveGeneralLetter: (async (_ctx, payload: SaveGeneralLetterDto) =>
    saveGeneralLetter(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    SaveGeneralLetterDto,
    GeneratedLetterDto
  >,

  listCommittee: (async (
    _ctx,
    payload: { status?: CommitteeStatus; activeOnly?: boolean },
  ) =>
    listCommitteeMembers(getActivePrisma(), {
      status: payload.status,
      activeOnly: payload.activeOnly,
    })) as IpcHandler<
    { status?: CommitteeStatus; activeOnly?: boolean },
    CommitteeMemberDto[]
  >,

  saveCommittee: (async (_ctx, payload: CommitteeMemberDto) =>
    saveCommitteeMember(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    CommitteeMemberDto,
    CommitteeMemberDto
  >,

  deleteCommittee: (async (_ctx, payload: { id: string }) => {
    await deleteCommitteeMember(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  listMinutes: (async () => listMeetingMinutes(getActivePrisma())) as IpcHandler<
    Record<string, never>,
    MeetingMinutesDto[]
  >,

  getMinutes: (async (_ctx, payload: { id: string }) =>
    getMeetingMinutes(getActivePrisma(), payload.id)) as IpcHandler<
    { id: string },
    MeetingMinutesDto
  >,

  saveMinutes: (async (_ctx, payload: MeetingMinutesDto) =>
    saveMeetingMinutes(getActivePrisma(), payload, requireUserId())) as IpcHandler<
    MeetingMinutesDto,
    MeetingMinutesDto
  >,

  deleteMinutes: (async (_ctx, payload: { id: string }) => {
    await deleteMeetingMinutes(getActivePrisma(), payload.id);
    return { deleted: true };
  }) as IpcHandler<{ id: string }, { deleted: boolean }>,

  renderMinutesPrint: (async (_ctx, payload: { id: string }) => ({
    html: await renderMeetingMinutesPrint(getActivePrisma(), payload.id),
  })) as IpcHandler<{ id: string }, { html: string }>,
};

export const correspondenceReadOptions = {
  resource: 'letters',
  action: PermissionAction.READ,
  requireDatabase: true,
};

export const correspondenceWriteOptions = {
  resource: 'letters',
  action: PermissionAction.UPDATE,
  requireDatabase: true,
};

export const correspondenceCreateOptions = {
  resource: 'letters',
  action: PermissionAction.CREATE,
  requireDatabase: true,
};

export const correspondenceDeleteOptions = {
  resource: 'letters',
  action: PermissionAction.DELETE,
  requireDatabase: true,
};

export const correspondencePrintOptions = {
  resource: 'letters',
  action: PermissionAction.PRINT,
  requireDatabase: true,
};
