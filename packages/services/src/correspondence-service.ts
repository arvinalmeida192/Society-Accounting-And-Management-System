import type { PrismaClient } from '@prisma/client';
import { CommitteeStatus as PrismaCommitteeStatus, LetterType as PrismaLetterType } from '@prisma/client';
import {
  CommitteeStatus,
  LetterType,
  type CommitteeMemberDto,
  type DefaulterMemberDto,
  type GeneratedLetterDto,
  type GenerateReminderDto,
  type GenerateReminderResultDto,
  type LetterTemplateDto,
  type MeetingAttendeeDto,
  type MeetingMinutesDto,
  type SaveGeneralLetterDto,
} from '@sams/shared-types';
import { parseIsoDate } from './financial-year.js';
import { getOpenBillsForMember } from './settlement-service.js';
import { assertWritable } from './assert-writable.js';

type TxClient = PrismaClient;

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatIndianAmount(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface PlaceholderContext {
  amount: number;
  balanceAsOnDate: string;
  memberName?: string;
  unitNo?: string;
  buildingName?: string;
  memberAddress?: string;
  societyName?: string;
  referenceNo?: string;
  customBody?: string;
}

export function renderPlaceholders(template: string, context: PlaceholderContext): string {
  let output = template;
  const replacements: Record<string, string> = {
    '{amount}': formatIndianAmount(context.amount),
    '[date]': context.balanceAsOnDate,
    '{memberName}': context.memberName ?? '',
    '{unitNo}': context.unitNo ?? '',
    '{buildingName}': context.buildingName ?? '',
    '{memberAddress}': context.memberAddress ?? '',
    '{societyName}': context.societyName ?? '',
    '{referenceNo}': context.referenceNo ?? '',
    '{customBody}': context.customBody ?? '',
  };

  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(value);
  }
  return output;
}

export function formatMcAct101ReferenceNo(year: number, serial: number): string {
  return `MCACT-101/${year}/${String(serial).padStart(4, '0')}`;
}

async function getActiveFinancialYearId(client: PrismaClient): Promise<string> {
  const fy = await client.financialYear.findFirst({ orderBy: { startDate: 'desc' } });
  if (!fy) throw new Error('No financial year found.');
  return fy.id;
}

async function loadSocietyHeader(client: PrismaClient): Promise<{
  societyName: string;
  signatories: string[];
}> {
  const identity = await client.societyIdentity.findFirst();
  const parameters = await client.societyParameters.findFirst();
  const signatories = [
    parameters?.authorizedSignatory1,
    parameters?.authorizedSignatory2,
    parameters?.authorizedSignatory3,
  ].filter((name): name is string => Boolean(name?.trim()));

  return {
    societyName: identity?.societyName ?? 'Society',
    signatories,
  };
}

export async function computeMemberOutstanding(
  client: PrismaClient,
  memberId: string,
): Promise<number> {
  const regular = await getOpenBillsForMember(client, memberId, 'REGULAR');
  const supplementary = await getOpenBillsForMember(client, memberId, 'SUPPLEMENTARY');
  return [...regular, ...supplementary].reduce((sum, bill) => sum + bill.outstanding, 0);
}

async function nextMcAct101Serial(client: PrismaClient, year: number): Promise<number> {
  const prefix = `MCACT-101/${year}/`;
  const existing = await client.generatedLetter.findMany({
    where: {
      letterType: PrismaLetterType.MCACT_101,
      referenceNo: { startsWith: prefix },
    },
    select: { referenceNo: true },
  });

  const maxSerial = existing.reduce((max, row) => {
    const parts = row.referenceNo.split('/');
    const serial = Number.parseInt(parts[2] ?? '0', 10);
    return Number.isFinite(serial) ? Math.max(max, serial) : max;
  }, 0);

  return maxSerial + 1;
}

function wrapLetterHtml(title: string, bodyHtml: string, signatories: string[]): string {
  const footer =
    signatories.length > 0
      ? `<p style="margin-top:2rem;">${signatories.map((name) => `<div>${name}</div>`).join('')}</p>`
      : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:serif;margin:2rem;line-height:1.5;} p{margin:0.5rem 0;}</style></head>
<body><h2>${title}</h2>${bodyHtml}${footer}</body></html>`;
}

function mapLetterTemplate(row: {
  id: string;
  letterType: PrismaLetterType;
  name: string;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): LetterTemplateDto {
  return {
    id: row.id,
    letterType: row.letterType as LetterType,
    name: row.name,
    bodyTemplate: row.bodyTemplate,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

function mapGeneratedLetter(row: {
  id: string;
  financialYearId: string;
  letterTemplateId: string | null;
  memberId: string | null;
  letterType: PrismaLetterType;
  referenceNo: string;
  issueDate: Date;
  balanceAsOnDate: Date;
  amountDue: { toString(): string };
  renderedHtml: string;
  pdfPath: string | null;
  subject: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  member?: { memberName: string } | null;
}): GeneratedLetterDto {
  return {
    id: row.id,
    financialYearId: row.financialYearId,
    letterTemplateId: row.letterTemplateId,
    memberId: row.memberId,
    memberName: row.member?.memberName ?? null,
    letterType: row.letterType as LetterType,
    referenceNo: row.referenceNo,
    issueDate: formatDate(row.issueDate),
    balanceAsOnDate: formatDate(row.balanceAsOnDate),
    amountDue: toNumber(row.amountDue),
    renderedHtml: row.renderedHtml,
    pdfPath: row.pdfPath,
    subject: row.subject,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

export async function listLetterTemplates(client: PrismaClient): Promise<LetterTemplateDto[]> {
  const rows = await client.letterTemplate.findMany({ orderBy: [{ letterType: 'asc' }, { name: 'asc' }] });
  return rows.map(mapLetterTemplate);
}

export async function saveLetterTemplate(
  client: PrismaClient,
  dto: LetterTemplateDto,
  actorId: string,
): Promise<LetterTemplateDto> {
  await assertWritable(client);
  if (!dto.name.trim()) throw new Error('Template name is required.');
  if (!dto.bodyTemplate.trim()) throw new Error('Template body is required.');

  if (dto.id) {
    const updated = await client.letterTemplate.update({
      where: { id: dto.id },
      data: {
        letterType: dto.letterType as PrismaLetterType,
        name: dto.name.trim(),
        bodyTemplate: dto.bodyTemplate,
        isActive: dto.isActive,
        updatedBy: actorId,
      },
    });
    return mapLetterTemplate(updated);
  }

  const created = await client.letterTemplate.create({
    data: {
      letterType: dto.letterType as PrismaLetterType,
      name: dto.name.trim(),
      bodyTemplate: dto.bodyTemplate,
      isActive: dto.isActive,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });
  return mapLetterTemplate(created);
}

export async function listDefaulters(
  client: PrismaClient,
  filter: { minOutstanding?: number; buildingId?: string },
): Promise<DefaulterMemberDto[]> {
  const members = await client.member.findMany({
    where: {
      disposedAt: null,
      ...(filter.buildingId ? { unit: { buildingId: filter.buildingId } } : {}),
    },
    include: {
      unit: { include: { building: true, wing: true } },
    },
    orderBy: { memberName: 'asc' },
  });

  const results: DefaulterMemberDto[] = [];
  for (const member of members) {
    const outstanding = await computeMemberOutstanding(client, member.id);
    if (outstanding < (filter.minOutstanding ?? 0.01)) continue;
    results.push({
      memberId: member.id,
      memberName: member.memberName,
      unitNo: member.unit.unitNo,
      buildingName: member.unit.building.shortName,
      wingName: member.unit.wing.shortName,
      outstanding,
    });
  }
  return results;
}

async function loadMemberContext(client: PrismaClient, memberId: string) {
  const member = await client.member.findFirst({
    where: { id: memberId, disposedAt: null },
    include: {
      unit: { include: { building: true, wing: true } },
    },
  });
  if (!member) throw new Error('Member not found.');
  return {
    member,
    memberName: member.memberName,
    unitNo: member.unit.unitNo,
    buildingName: member.unit.building.fullName,
    memberAddress: member.address ?? '',
  };
}

async function createGeneratedLetter(
  client: TxClient,
  input: {
    financialYearId: string;
    letterTemplateId?: string | null;
    memberId?: string | null;
    letterType: PrismaLetterType;
    referenceNo: string;
    issueDate: Date;
    balanceAsOnDate: Date;
    amountDue: number;
    renderedHtml: string;
    subject?: string | null;
    actorId: string;
  },
): Promise<GeneratedLetterDto> {
  const created = await client.generatedLetter.create({
    data: {
      financialYearId: input.financialYearId,
      letterTemplateId: input.letterTemplateId ?? null,
      memberId: input.memberId ?? null,
      letterType: input.letterType,
      referenceNo: input.referenceNo,
      issueDate: input.issueDate,
      balanceAsOnDate: input.balanceAsOnDate,
      amountDue: input.amountDue,
      renderedHtml: input.renderedHtml,
      subject: input.subject ?? null,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    },
    include: { member: { select: { memberName: true } } },
  });
  return mapGeneratedLetter(created);
}

export async function generateReminder(
  client: PrismaClient,
  dto: GenerateReminderDto,
  actorId: string,
): Promise<GenerateReminderResultDto> {
  await assertWritable(client);
  const financialYearId = dto.financialYearId ?? (await getActiveFinancialYearId(client));
  const balanceAsOnDate = parseIsoDate(dto.balanceAsOnDate, 'balanceAsOnDate');
  const issueDate = dto.issueDate ? parseIsoDate(dto.issueDate, 'issueDate') : new Date();
  const { societyName, signatories } = await loadSocietyHeader(client);

  const template = dto.letterTemplateId
    ? await client.letterTemplate.findUniqueOrThrow({ where: { id: dto.letterTemplateId } })
    : await client.letterTemplate.findFirstOrThrow({
        where: { letterType: dto.letterType, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

  let memberIds = dto.memberIds ?? [];
  if (memberIds.length === 0) {
    const defaulters = await listDefaulters(client, {
      minOutstanding: dto.minOutstanding ?? 0.01,
      buildingId: dto.buildingId,
    });
    memberIds = defaulters.map((row) => row.memberId);
  }

  const letters: GeneratedLetterDto[] = [];

  for (const memberId of memberIds) {
    const existingMcAct =
      dto.letterType === LetterType.MCACT_101
        ? await client.generatedLetter.findFirst({
            where: {
              memberId,
              letterType: PrismaLetterType.MCACT_101,
              balanceAsOnDate,
            },
            include: { member: { select: { memberName: true } } },
          })
        : null;

    if (existingMcAct) {
      letters.push(mapGeneratedLetter(existingMcAct));
      continue;
    }

    const memberContext = await loadMemberContext(client, memberId);
    const amount = await computeMemberOutstanding(client, memberId);
    if (amount <= 0) continue;

    let referenceNo = `REM-${formatDate(issueDate).replaceAll('-', '')}-${memberId.slice(-6).toUpperCase()}`;
    if (dto.letterType === LetterType.MCACT_101) {
      const serial = await nextMcAct101Serial(client, issueDate.getFullYear());
      referenceNo = formatMcAct101ReferenceNo(issueDate.getFullYear(), serial);
    }

    const body = renderPlaceholders(template.bodyTemplate, {
      amount,
      balanceAsOnDate: formatDate(balanceAsOnDate),
      memberName: memberContext.memberName,
      unitNo: memberContext.unitNo,
      buildingName: memberContext.buildingName,
      memberAddress: memberContext.memberAddress,
      societyName,
      referenceNo,
    });

    const renderedHtml = wrapLetterHtml(template.name, body, signatories);
    const saved = await createGeneratedLetter(client, {
      financialYearId,
      letterTemplateId: template.id,
      memberId,
      letterType: dto.letterType as PrismaLetterType,
      referenceNo,
      issueDate,
      balanceAsOnDate,
      amountDue: amount,
      renderedHtml,
      subject: template.name,
      actorId,
    });
    letters.push(saved);
  }

  return { letters, generated: letters.length };
}

export async function getGeneratedLetter(
  client: PrismaClient,
  id: string,
): Promise<GeneratedLetterDto> {
  const row = await client.generatedLetter.findUniqueOrThrow({
    where: { id },
    include: { member: { select: { memberName: true } } },
  });
  return mapGeneratedLetter(row);
}

export async function listGeneratedLetters(
  client: PrismaClient,
  filter: { letterType?: LetterType; memberId?: string },
): Promise<GeneratedLetterDto[]> {
  const rows = await client.generatedLetter.findMany({
    where: {
      ...(filter.letterType ? { letterType: filter.letterType as PrismaLetterType } : {}),
      ...(filter.memberId ? { memberId: filter.memberId } : {}),
    },
    include: { member: { select: { memberName: true } } },
    orderBy: [{ issueDate: 'desc' }, { referenceNo: 'desc' }],
  });
  return rows.map(mapGeneratedLetter);
}

export async function saveGeneralLetter(
  client: PrismaClient,
  dto: SaveGeneralLetterDto,
  actorId: string,
): Promise<GeneratedLetterDto> {
  await assertWritable(client);
  const financialYearId = dto.financialYearId ?? (await getActiveFinancialYearId(client));
  const issueDate = parseIsoDate(dto.issueDate, 'issueDate');
  const balanceAsOnDate = parseIsoDate(dto.balanceAsOnDate ?? dto.issueDate, 'balanceAsOnDate');
  const { signatories } = await loadSocietyHeader(client);

  const referenceNo =
    dto.referenceNo?.trim() ||
    `GEN-${formatDate(issueDate).replaceAll('-', '')}-${Date.now().toString(36).toUpperCase()}`;

  const bodyHtml = dto.bodyHtml.includes('<')
    ? dto.bodyHtml
    : `<p>${dto.bodyHtml.replaceAll('\n', '<br/>')}</p>`;

  const renderedHtml = wrapLetterHtml(dto.subject, bodyHtml, signatories);

  return createGeneratedLetter(client, {
    financialYearId,
    letterTemplateId: null,
    memberId: dto.memberId ?? null,
    letterType: PrismaLetterType.CUSTOM,
    referenceNo,
    issueDate,
    balanceAsOnDate,
    amountDue: dto.amountDue ?? 0,
    renderedHtml,
    subject: dto.subject,
    actorId,
  });
}

function mapCommitteeMember(row: {
  id: string;
  financialYearId: string;
  effectiveDate: Date;
  termEndsOn: Date | null;
  buildingId: string | null;
  wingId: string | null;
  unitId: string | null;
  memberId: string;
  designation: string;
  status: PrismaCommitteeStatus;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  member?: { memberName: string } | null;
  building?: { shortName: string } | null;
  wing?: { shortName: string } | null;
  unit?: { unitNo: string } | null;
}): CommitteeMemberDto {
  return {
    id: row.id,
    financialYearId: row.financialYearId,
    effectiveDate: formatDate(row.effectiveDate),
    termEndsOn: row.termEndsOn ? formatDate(row.termEndsOn) : null,
    buildingId: row.buildingId,
    wingId: row.wingId,
    unitId: row.unitId,
    memberId: row.memberId,
    memberName: row.member?.memberName ?? '',
    buildingName: row.building?.shortName ?? null,
    wingName: row.wing?.shortName ?? null,
    unitNo: row.unit?.unitNo ?? null,
    designation: row.designation,
    status: row.status as CommitteeStatus,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

export async function listCommitteeMembers(
  client: PrismaClient,
  filter: { status?: CommitteeStatus; activeOnly?: boolean },
): Promise<CommitteeMemberDto[]> {
  const financialYearId = await getActiveFinancialYearId(client);
  const rows = await client.committeeMember.findMany({
    where: {
      financialYearId,
      ...(filter.status ? { status: filter.status as PrismaCommitteeStatus } : {}),
      ...(filter.activeOnly ? { status: PrismaCommitteeStatus.ACTIVE } : {}),
    },
    include: {
      member: { select: { memberName: true } },
      building: { select: { shortName: true } },
      wing: { select: { shortName: true } },
      unit: { select: { unitNo: true } },
    },
    orderBy: [{ effectiveDate: 'desc' }, { designation: 'asc' }],
  });
  return rows.map(mapCommitteeMember);
}

export async function saveCommitteeMember(
  client: PrismaClient,
  dto: CommitteeMemberDto,
  actorId: string,
): Promise<CommitteeMemberDto> {
  await assertWritable(client);
  const financialYearId = dto.financialYearId || (await getActiveFinancialYearId(client));
  if (!dto.memberId) throw new Error('Member is required.');
  if (!dto.designation.trim()) throw new Error('Designation is required.');

  const data = {
    financialYearId,
    effectiveDate: parseIsoDate(dto.effectiveDate, 'effectiveDate'),
    termEndsOn: dto.termEndsOn ? parseIsoDate(dto.termEndsOn, 'termEndsOn') : null,
    buildingId: dto.buildingId ?? null,
    wingId: dto.wingId ?? null,
    unitId: dto.unitId ?? null,
    memberId: dto.memberId,
    designation: dto.designation.trim(),
    status: dto.status as PrismaCommitteeStatus,
    updatedBy: actorId,
  };

  const row = dto.id
    ? await client.committeeMember.update({
        where: { id: dto.id },
        data,
        include: {
          member: { select: { memberName: true } },
          building: { select: { shortName: true } },
          wing: { select: { shortName: true } },
          unit: { select: { unitNo: true } },
        },
      })
    : await client.committeeMember.create({
        data: { ...data, createdBy: actorId },
        include: {
          member: { select: { memberName: true } },
          building: { select: { shortName: true } },
          wing: { select: { shortName: true } },
          unit: { select: { unitNo: true } },
        },
      });

  return mapCommitteeMember(row);
}

export async function deleteCommitteeMember(client: PrismaClient, id: string): Promise<void> {
  await assertWritable(client);
  await client.committeeMember.delete({ where: { id } });
}

function mapMeetingAttendee(row: {
  id: string;
  meetingId: string;
  memberId: string;
  designation: string | null;
  attended: boolean;
  comments: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  member?: { memberName: string } | null;
}): MeetingAttendeeDto {
  return {
    id: row.id,
    meetingId: row.meetingId,
    memberId: row.memberId,
    memberName: row.member?.memberName ?? '',
    designation: row.designation,
    attended: row.attended,
    comments: row.comments,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

function mapMeetingMinutes(row: {
  id: string;
  financialYearId: string;
  meetingNo: number;
  meetingDate: Date;
  meetingTime: string | null;
  natureOfMeeting: string | null;
  resolutionDetails: string | null;
  commentsNotings: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  attendees: Array<{
    id: string;
    meetingId: string;
    memberId: string;
    designation: string | null;
    attended: boolean;
    comments: string | null;
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    member?: { memberName: string } | null;
  }>;
}): MeetingMinutesDto {
  return {
    id: row.id,
    financialYearId: row.financialYearId,
    meetingNo: row.meetingNo,
    meetingDate: formatDate(row.meetingDate),
    meetingTime: row.meetingTime,
    natureOfMeeting: row.natureOfMeeting,
    resolutionDetails: row.resolutionDetails,
    commentsNotings: row.commentsNotings,
    attendees: row.attendees.map(mapMeetingAttendee),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

export async function listMeetingMinutes(client: PrismaClient): Promise<MeetingMinutesDto[]> {
  const financialYearId = await getActiveFinancialYearId(client);
  const rows = await client.meetingMinutes.findMany({
    where: { financialYearId },
    include: {
      attendees: { include: { member: { select: { memberName: true } } } },
    },
    orderBy: [{ meetingNo: 'desc' }],
  });
  return rows.map(mapMeetingMinutes);
}

export async function getMeetingMinutes(
  client: PrismaClient,
  id: string,
): Promise<MeetingMinutesDto> {
  const row = await client.meetingMinutes.findUniqueOrThrow({
    where: { id },
    include: {
      attendees: { include: { member: { select: { memberName: true } } } },
    },
  });
  return mapMeetingMinutes(row);
}

export async function saveMeetingMinutes(
  client: PrismaClient,
  dto: MeetingMinutesDto,
  actorId: string,
): Promise<MeetingMinutesDto> {
  await assertWritable(client);
  const financialYearId = dto.financialYearId || (await getActiveFinancialYearId(client));

  const saved = await client.$transaction(async (tx) => {
    let meetingNo = dto.meetingNo;
    if (!dto.id) {
      const max = await tx.meetingMinutes.aggregate({
        where: { financialYearId },
        _max: { meetingNo: true },
      });
      meetingNo = (max._max.meetingNo ?? 0) + 1;
    }

    const meeting = dto.id
      ? await tx.meetingMinutes.update({
          where: { id: dto.id },
          data: {
            meetingDate: parseIsoDate(dto.meetingDate, 'meetingDate'),
            meetingTime: dto.meetingTime ?? null,
            natureOfMeeting: dto.natureOfMeeting ?? null,
            resolutionDetails: dto.resolutionDetails ?? null,
            commentsNotings: dto.commentsNotings ?? null,
            updatedBy: actorId,
          },
        })
      : await tx.meetingMinutes.create({
          data: {
            financialYearId,
            meetingNo,
            meetingDate: parseIsoDate(dto.meetingDate, 'meetingDate'),
            meetingTime: dto.meetingTime ?? null,
            natureOfMeeting: dto.natureOfMeeting ?? null,
            resolutionDetails: dto.resolutionDetails ?? null,
            commentsNotings: dto.commentsNotings ?? null,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });

    await tx.meetingAttendee.deleteMany({ where: { meetingId: meeting.id } });
    for (const attendee of dto.attendees) {
      await tx.meetingAttendee.create({
        data: {
          meetingId: meeting.id,
          memberId: attendee.memberId,
          designation: attendee.designation ?? null,
          attended: attendee.attended,
          comments: attendee.comments ?? null,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }

    return tx.meetingMinutes.findUniqueOrThrow({
      where: { id: meeting.id },
      include: {
        attendees: { include: { member: { select: { memberName: true } } } },
      },
    });
  });

  return mapMeetingMinutes(saved);
}

export async function deleteMeetingMinutes(client: PrismaClient, id: string): Promise<void> {
  await assertWritable(client);
  await client.meetingMinutes.delete({ where: { id } });
}

export async function renderMeetingMinutesPrint(
  client: PrismaClient,
  id: string,
): Promise<string> {
  const minutes = await getMeetingMinutes(client, id);
  const { societyName, signatories } = await loadSocietyHeader(client);
  const attendeeRows = minutes.attendees
    .map(
      (row) =>
        `<tr><td>${row.memberName}</td><td>${row.designation ?? ''}</td><td>${row.attended ? 'Yes' : 'No'}</td><td>${row.comments ?? ''}</td></tr>`,
    )
    .join('');

  const body = `<h2>Minutes of Meeting No. ${minutes.meetingNo}</h2>
<p><strong>${societyName}</strong></p>
<p>Date: ${minutes.meetingDate}${minutes.meetingTime ? ` · Time: ${minutes.meetingTime}` : ''}</p>
<p>Nature: ${minutes.natureOfMeeting ?? 'General Meeting'}</p>
<h3>Attendees</h3>
<table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;">
<thead><tr><th>Member</th><th>Designation</th><th>Attended</th><th>Comments</th></tr></thead>
<tbody>${attendeeRows}</tbody></table>
<h3>Resolutions</h3>
<div>${minutes.resolutionDetails?.replaceAll('\n', '<br/>') ?? ''}</div>
<h3>Notings / Comments</h3>
<div>${minutes.commentsNotings?.replaceAll('\n', '<br/>') ?? ''}</div>`;

  return wrapLetterHtml(`Meeting Minutes #${minutes.meetingNo}`, body, signatories);
}
