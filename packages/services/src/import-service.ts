import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { UnitStatus } from '@prisma/client';
import { OpeningBalanceType } from '@sams/shared-types';
import { assertWritable } from './assert-writable.js';
import { getActiveFinancialYearId } from './financial-year.js';
import { saveMemberAddress, saveMemberIdentification } from './member-service.js';
import { saveMemberOpeningBalance } from './opening-balance-service.js';

export const MEMBER_CSV_HEADERS = [
  'memberName',
  'buildingShort',
  'wingShort',
  'unitNo',
  'tenantOccupancy',
  'phone',
  'email',
  'regularPrincipalOB',
  'regularInterestOB',
  'regularServiceTaxOB',
  'supplementaryPrincipalOB',
  'supplementaryInterestOB',
] as const;

export type MemberCsvHeader = (typeof MEMBER_CSV_HEADERS)[number];

export interface MemberCsvRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface MemberCsvValidationResult {
  valid: boolean;
  rowCount: number;
  errors: MemberCsvRowError[];
}

export interface MemberCsvCommitResult {
  imported: number;
}

interface ParsedMemberCsvRow {
  rowNumber: number;
  memberName: string;
  buildingShort: string;
  wingShort: string;
  unitNo: string;
  tenantOccupancy: boolean;
  phone: string | null;
  email: string | null;
  regularPrincipalOB: number;
  regularInterestOB: number;
  regularServiceTaxOB: number;
  supplementaryPrincipalOB: number;
  supplementaryInterestOB: number;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parseOptionalDecimal(value: string, field: string, rowNumber: number): { value: number; error?: MemberCsvRowError } {
  if (!value.trim()) return { value: 0 };
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return {
      value: 0,
      error: { rowNumber, field, message: `${field} must be a valid number.` },
    };
  }
  return { value: parsed };
}

function parseTenantOccupancy(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return normalized === 'Y' || normalized === 'YES' || normalized === 'TRUE' || normalized === '1';
}

export function memberCsvTemplateContent(): string {
  return `${MEMBER_CSV_HEADERS.join(',')}\n`;
}

export async function writeMemberCsvTemplate(outputDir: string): Promise<string> {
  const filePath = join(outputDir, 'sams-member-import-template.csv');
  await writeFile(filePath, memberCsvTemplateContent(), 'utf8');
  return filePath;
}

async function parseMemberCsv(filePath: string): Promise<{ headers: string[]; rows: string[][] }> {
  const content = await readFile(filePath, 'utf8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    throw Object.assign(new Error('CSV file is empty.'), { code: 'VALIDATION_ERROR' });
  }
  const headers = parseCsvLine(lines[0]!).map((h) => h.trim());
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

function rowToRecord(headers: string[], cells: string[], rowNumber: number): {
  record: ParsedMemberCsvRow | null;
  errors: MemberCsvRowError[];
} {
  const errors: MemberCsvRowError[] = [];
  const map = new Map<string, string>();
  headers.forEach((header, index) => {
    map.set(header, cells[index] ?? '');
  });

  for (const required of ['memberName', 'buildingShort', 'wingShort', 'unitNo'] as const) {
    if (!map.get(required)?.trim()) {
      errors.push({ rowNumber, field: required, message: `${required} is required.` });
    }
  }

  const decimalFields = [
    'regularPrincipalOB',
    'regularInterestOB',
    'regularServiceTaxOB',
    'supplementaryPrincipalOB',
    'supplementaryInterestOB',
  ] as const;

  const decimals: Record<string, number> = {};
  for (const field of decimalFields) {
    const parsed = parseOptionalDecimal(map.get(field) ?? '', field, rowNumber);
    if (parsed.error) errors.push(parsed.error);
    decimals[field] = parsed.value;
  }

  if (errors.length > 0) return { record: null, errors };

  return {
    record: {
      rowNumber,
      memberName: map.get('memberName')!.trim(),
      buildingShort: map.get('buildingShort')!.trim(),
      wingShort: map.get('wingShort')!.trim(),
      unitNo: map.get('unitNo')!.trim(),
      tenantOccupancy: parseTenantOccupancy(map.get('tenantOccupancy') ?? ''),
      phone: map.get('phone')?.trim() || null,
      email: map.get('email')?.trim() || null,
      regularPrincipalOB: decimals.regularPrincipalOB!,
      regularInterestOB: decimals.regularInterestOB!,
      regularServiceTaxOB: decimals.regularServiceTaxOB!,
      supplementaryPrincipalOB: decimals.supplementaryPrincipalOB!,
      supplementaryInterestOB: decimals.supplementaryInterestOB!,
    },
    errors: [],
  };
}

async function validateRows(
  client: PrismaClient,
  records: ParsedMemberCsvRow[],
): Promise<MemberCsvRowError[]> {
  const errors: MemberCsvRowError[] = [];
  const unitKeys = new Set<string>();

  for (const row of records) {
    const unitKey = `${row.buildingShort}|${row.wingShort}|${row.unitNo}`.toLowerCase();
    if (unitKeys.has(unitKey)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'unitNo',
        message: 'Duplicate unit in import file.',
      });
    }
    unitKeys.add(unitKey);

    const building = await client.building.findFirst({
      where: { shortName: row.buildingShort },
      select: { id: true },
    });
    if (!building) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'buildingShort',
        message: `Building "${row.buildingShort}" not found.`,
      });
      continue;
    }

    const wing = await client.wing.findFirst({
      where: { buildingId: building.id, shortName: row.wingShort },
      select: { id: true },
    });
    if (!wing) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'wingShort',
        message: `Wing "${row.wingShort}" not found in building "${row.buildingShort}".`,
      });
      continue;
    }

    const unit = await client.unit.findFirst({
      where: {
        buildingId: building.id,
        wingId: wing.id,
        unitNo: row.unitNo,
        status: { not: UnitStatus.ARCHIVED },
      },
      include: { members: { where: { disposedAt: null }, select: { id: true } } },
    });

    if (!unit) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'unitNo',
        message: `Unit "${row.unitNo}" not found.`,
      });
      continue;
    }

    if (unit.members.length > 0) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'unitNo',
        message: `Unit "${row.unitNo}" is already occupied.`,
      });
    }

    if (row.tenantOccupancy) {
      const tenant = await client.tenant.findFirst({
        where: { unitId: unit.id, isActive: true },
      });
      if (!tenant) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'tenantOccupancy',
          message: 'Tenant occupancy is Y but no active tenant exists on this unit.',
        });
      }
    }
  }

  return errors;
}

export async function validateMemberCsv(
  client: PrismaClient,
  filePath: string,
): Promise<MemberCsvValidationResult> {
  const { headers, rows } = await parseMemberCsv(filePath);
  const missingHeaders = MEMBER_CSV_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return {
      valid: false,
      rowCount: 0,
      errors: missingHeaders.map((field) => ({
        rowNumber: 1,
        field,
        message: `Missing required column: ${field}`,
      })),
    };
  }

  const errors: MemberCsvRowError[] = [];
  const records: ParsedMemberCsvRow[] = [];

  rows.forEach((cells, index) => {
    const rowNumber = index + 2;
    const { record, errors: rowErrors } = rowToRecord(headers, cells, rowNumber);
    errors.push(...rowErrors);
    if (record) records.push(record);
  });

  if (records.length === 0 && errors.length === 0) {
    errors.push({ rowNumber: 0, field: 'file', message: 'No data rows found in CSV.' });
  }

  if (errors.length === 0) {
    errors.push(...(await validateRows(client, records)));
  }

  return {
    valid: errors.length === 0,
    rowCount: records.length,
    errors,
  };
}

export async function commitMemberCsv(
  client: PrismaClient,
  filePath: string,
  actorId: string,
): Promise<MemberCsvCommitResult> {
  await assertWritable(client);
  const validation = await validateMemberCsv(client, filePath);
  if (!validation.valid) {
    throw Object.assign(new Error('CSV validation failed. Fix all errors before commit.'), {
      code: 'VALIDATION_ERROR',
      details: validation.errors,
    });
  }

  const { headers, rows } = await parseMemberCsv(filePath);
  const records: ParsedMemberCsvRow[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const { record } = rowToRecord(headers, rows[index]!, index + 2);
    if (record) records.push(record);
  }

  let imported = 0;
  const financialYearId = await getActiveFinancialYearId(client);
  if (!financialYearId) {
    throw Object.assign(new Error('No active financial year.'), { code: 'VALIDATION_ERROR' });
  }

  await client.$transaction(async (tx) => {
    for (const row of records) {
      const building = await tx.building.findFirstOrThrow({
        where: { shortName: row.buildingShort },
      });
      const wing = await tx.wing.findFirstOrThrow({
        where: { buildingId: building.id, shortName: row.wingShort },
      });
      const unit = await tx.unit.findFirstOrThrow({
        where: { buildingId: building.id, wingId: wing.id, unitNo: row.unitNo },
      });

      const member = await saveMemberIdentification(
        tx as unknown as PrismaClient,
        {
          memberName: row.memberName,
          unitId: unit.id,
          tenantOccupancy: row.tenantOccupancy,
          generateRegularBills: true,
          generateSupplementaryBills: true,
          chargeInterest: true,
        },
        actorId,
      );

      if (row.phone || row.email) {
        await saveMemberAddress(
          tx as unknown as PrismaClient,
          {
            id: member.id,
            residencePhone: row.phone,
            emailPrimary: row.email,
          },
          actorId,
        );
      }

      const hasRegularOb =
        row.regularPrincipalOB !== 0 ||
        row.regularInterestOB !== 0 ||
        row.regularServiceTaxOB !== 0;
      if (hasRegularOb) {
        await saveMemberOpeningBalance(
          tx as unknown as PrismaClient,
          {
            memberId: member.id,
            balanceType: OpeningBalanceType.REGULAR,
            principalOB: row.regularPrincipalOB,
            interestOB: row.regularInterestOB,
            serviceTaxOB: row.regularServiceTaxOB,
          },
          financialYearId,
          actorId,
        );
      }

      const hasSupplementaryOb =
        row.supplementaryPrincipalOB !== 0 || row.supplementaryInterestOB !== 0;
      if (hasSupplementaryOb) {
        await saveMemberOpeningBalance(
          tx as unknown as PrismaClient,
          {
            memberId: member.id,
            balanceType: OpeningBalanceType.SUPPLEMENTARY,
            principalOB: row.supplementaryPrincipalOB,
            interestOB: row.supplementaryInterestOB,
            serviceTaxOB: 0,
          },
          financialYearId,
          actorId,
        );
      }

      await tx.unit.update({
        where: { id: unit.id },
        data: { status: UnitStatus.OCCUPIED, updatedBy: actorId },
      });

      imported += 1;
    }
  });

  return { imported };
}
