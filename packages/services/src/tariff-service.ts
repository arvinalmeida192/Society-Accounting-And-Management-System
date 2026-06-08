import type { PrismaClient } from '@prisma/client';
import {
  TariffLineType as PrismaTariffLineType,
  TariffMethod,
  TariffScopeLevel as PrismaTariffScopeLevel,
} from '@prisma/client';
import {
  BillRegisterDisplayMode,
  TariffLineType,
  TariffScopeLevel,
  type TariffBasisFlag,
  type TariffBillRegisterMappingDto,
  type TariffBillRegisterMappingSaveDto,
  type TariffDefinitionDto,
  type TariffDefinitionSaveDto,
  type TariffLineDto,
  type TariffResolveResult,
  type TariffResolvedLineDto,
  type TariffSettlementSequenceDto,
  type TariffSettlementSequenceLineDto,
  type TariffSettlementSequenceSaveDto,
} from '@sams/shared-types';
import { Money, type TariffDecimalPlaces } from './money.js';
import { parseIsoDate } from './financial-year.js';
import { assertWritable } from './assert-writable.js';

const SCOPE_PRIORITY: PrismaTariffScopeLevel[] = [
  PrismaTariffScopeLevel.UNIT,
  PrismaTariffScopeLevel.WING,
  PrismaTariffScopeLevel.BUILDING,
  PrismaTariffScopeLevel.COMPOSITION,
  PrismaTariffScopeLevel.TYPE,
  PrismaTariffScopeLevel.AREA,
  PrismaTariffScopeLevel.PERSON,
  PrismaTariffScopeLevel.FLOOR,
];

type TariffLineRecord = {
  id: string;
  tariffDefinitionId: string;
  srNo: number;
  accountMasterId: string;
  amount: { toString(): string };
  tariffType: TariffLineType;
  remark: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  accountMaster: {
    particulars: string;
    shortCode: string | null;
  };
};

function parseTariffBasis(value: string): TariffBasisFlag[] {
  try {
    const parsed = JSON.parse(value) as TariffBasisFlag[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toNumber(value: { toString(): string } | number): number {
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

function mapTariffLine(record: TariffLineRecord): TariffLineDto {
  return {
    id: record.id,
    tariffDefinitionId: record.tariffDefinitionId,
    srNo: record.srNo,
    accountMasterId: record.accountMasterId,
    accountParticulars: record.accountMaster.particulars,
    accountShortCode: record.accountMaster.shortCode,
    amount: toNumber(record.amount),
    tariffType: record.tariffType as TariffLineType,
    remark: record.remark,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

async function resolveScopeLabel(
  client: PrismaClient,
  scopeLevel: PrismaTariffScopeLevel,
  scopeRefId: string | null,
): Promise<string | null> {
  if (!scopeRefId) {
    return scopeLevel === PrismaTariffScopeLevel.PERSON ? `${scopeRefId ?? '—'} persons` : null;
  }

  switch (scopeLevel) {
    case PrismaTariffScopeLevel.BUILDING: {
      const row = await client.building.findUnique({ where: { id: scopeRefId } });
      return row ? `${row.shortName} — ${row.fullName}` : null;
    }
    case PrismaTariffScopeLevel.WING: {
      const row = await client.wing.findUnique({
        where: { id: scopeRefId },
        include: { building: true },
      });
      return row ? `${row.building.shortName}/${row.shortName}` : null;
    }
    case PrismaTariffScopeLevel.UNIT: {
      const row = await client.unit.findUnique({
        where: { id: scopeRefId },
        include: { building: true, wing: true },
      });
      return row ? `${row.building.shortName}/${row.wing.shortName}/${row.unitNo}` : null;
    }
    case PrismaTariffScopeLevel.COMPOSITION: {
      const row = await client.unitComposition.findUnique({ where: { id: scopeRefId } });
      return row?.compositionName ?? null;
    }
    case PrismaTariffScopeLevel.TYPE: {
      const row = await client.unitType.findUnique({ where: { id: scopeRefId } });
      return row?.typeName ?? null;
    }
    case PrismaTariffScopeLevel.AREA: {
      const row = await client.unitArea.findUnique({ where: { id: scopeRefId } });
      return row ? `${row.areaSqFt} sq.ft.` : null;
    }
    case PrismaTariffScopeLevel.FLOOR: {
      const row = await client.floorMaster.findUnique({ where: { id: scopeRefId } });
      return row?.floorName ?? null;
    }
    case PrismaTariffScopeLevel.PERSON:
      return `${scopeRefId} family members`;
    default:
      return null;
  }
}

async function isLatestDefinition(
  client: PrismaClient,
  definition: {
    id: string;
    financialYearId: string;
    scopeLevel: TariffScopeLevel;
    scopeRefId: string | null;
    effectiveDate: Date;
  },
): Promise<boolean> {
  const latest = await client.tariffDefinition.findFirst({
    where: {
      financialYearId: definition.financialYearId,
      scopeLevel: definition.scopeLevel,
      scopeRefId: definition.scopeRefId,
    },
    orderBy: { effectiveDate: 'desc' },
  });
  return latest?.id === definition.id;
}

async function getActiveFinancialYearId(client: PrismaClient): Promise<string> {
  const fy = await client.financialYear.findFirst({ orderBy: { startDate: 'desc' } });
  if (!fy) {
    throw new Error('No financial year configured.');
  }
  return fy.id;
}

export async function listTariffDefinitions(
  client: PrismaClient,
  filter?: { scopeLevel?: TariffScopeLevel; asOfDate?: string },
): Promise<TariffDefinitionDto[]> {
  const financialYearId = await getActiveFinancialYearId(client);
  const asOf = filter?.asOfDate ? parseIsoDate(filter.asOfDate, 'asOfDate') : null;

  const records = await client.tariffDefinition.findMany({
    where: {
      financialYearId,
      ...(filter?.scopeLevel ? { scopeLevel: filter.scopeLevel } : {}),
      ...(asOf ? { effectiveDate: { lte: asOf } } : {}),
    },
    include: {
      lines: {
        include: { accountMaster: true },
        orderBy: { srNo: 'asc' },
      },
    },
    orderBy: [{ scopeLevel: 'asc' }, { effectiveDate: 'desc' }],
  });

  const latestByScope = new Map<string, string>();
  for (const record of records) {
    const key = `${record.scopeLevel}:${record.scopeRefId ?? ''}`;
    if (!latestByScope.has(key)) {
      latestByScope.set(key, record.id);
    }
  }

  return Promise.all(
    records.map(async (record) => ({
      id: record.id,
      financialYearId: record.financialYearId,
      effectiveDate: record.effectiveDate.toISOString().slice(0, 10),
      scopeLevel: record.scopeLevel as TariffScopeLevel,
      scopeRefId: record.scopeRefId,
      scopeLabel: await resolveScopeLabel(
        client,
        record.scopeLevel as TariffScopeLevel,
        record.scopeRefId,
      ),
      isAdvanceMethod: record.isAdvanceMethod,
      isReadOnly: latestByScope.get(`${record.scopeLevel}:${record.scopeRefId ?? ''}`) !== record.id,
      lines: record.lines.map((line) => mapTariffLine(line as TariffLineRecord)),
      createdAt: record.createdAt.toISOString(),
      createdBy: record.createdBy,
      updatedAt: record.updatedAt.toISOString(),
      updatedBy: record.updatedBy,
    })),
  );
}

export async function getTariffDefinition(
  client: PrismaClient,
  id: string,
): Promise<TariffDefinitionDto> {
  const record = await client.tariffDefinition.findUniqueOrThrow({
    where: { id },
    include: {
      lines: {
        include: { accountMaster: true },
        orderBy: { srNo: 'asc' },
      },
    },
  });

  return {
    id: record.id,
    financialYearId: record.financialYearId,
    effectiveDate: record.effectiveDate.toISOString().slice(0, 10),
    scopeLevel: record.scopeLevel as TariffScopeLevel,
    scopeRefId: record.scopeRefId,
    scopeLabel: await resolveScopeLabel(
      client,
      record.scopeLevel as TariffScopeLevel,
      record.scopeRefId,
    ),
    isAdvanceMethod: record.isAdvanceMethod,
    isReadOnly: !(await isLatestDefinition(client, {
      id: record.id,
      financialYearId: record.financialYearId,
      scopeLevel: record.scopeLevel as TariffScopeLevel,
      scopeRefId: record.scopeRefId,
      effectiveDate: record.effectiveDate,
    })),
    lines: record.lines.map((line) => mapTariffLine(line as TariffLineRecord)),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

function validateTariffLines(
  lines: TariffDefinitionSaveDto['lines'],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const srNos = new Set<number>();
  for (const line of lines) {
    if (srNos.has(line.srNo)) {
      errors.lines = 'Duplicate serial numbers are not allowed.';
      break;
    }
    srNos.add(line.srNo);
    if (!line.accountMasterId) {
      errors.lines = 'Each line requires a charge account.';
      break;
    }
    if (line.amount < 0) {
      errors.lines = 'Amount cannot be negative.';
      break;
    }
  }
  return errors;
}

export async function saveTariffDefinition(
  client: PrismaClient,
  dto: TariffDefinitionSaveDto,
  actorId: string,
): Promise<TariffDefinitionDto> {
  await assertWritable(client);
  const errors = validateTariffLines(dto.lines);
  if (Object.keys(errors).length > 0) {
    throw Object.assign(new Error('Validation failed'), { fieldErrors: errors });
  }

  const financialYearId = await getActiveFinancialYearId(client);
  const effectiveDate = parseIsoDate(dto.effectiveDate, 'effectiveDate');
  const parameters = await client.societyParameters.findFirst();
  const tariffMethod = parameters?.tariffMethod ?? TariffMethod.SIMPLE;

  if (dto.id) {
    const existing = await client.tariffDefinition.findUniqueOrThrow({
      where: { id: dto.id },
      include: { lines: true },
    });

    const latest = await isLatestDefinition(client, {
      id: existing.id,
      financialYearId: existing.financialYearId,
      scopeLevel: existing.scopeLevel as TariffScopeLevel,
      scopeRefId: existing.scopeRefId,
      effectiveDate: existing.effectiveDate,
    });

    if (!latest) {
      throw Object.assign(new Error('Historical tariff definitions are read-only.'), {
        fieldErrors: { effectiveDate: 'Clone with a new effective date to change rates.' },
      });
    }

    const amountChanged = dto.lines.some((line) => {
      const prior = existing.lines.find((row) => row.id === line.id);
      return prior && toNumber(prior.amount) !== line.amount;
    });

    if (amountChanged && existing.effectiveDate.getTime() === effectiveDate.getTime()) {
      throw Object.assign(new Error('Rate changes require a new effective date version.'), {
        fieldErrors: { effectiveDate: 'Use "New Rate Effective From" to change amounts.' },
      });
    }

    await client.tariffLine.deleteMany({ where: { tariffDefinitionId: existing.id } });
    await client.tariffDefinition.update({
      where: { id: existing.id },
      data: {
        isAdvanceMethod: tariffMethod === TariffMethod.ADVANCE,
        updatedBy: actorId,
        lines: {
          create: dto.lines.map((line) => ({
            srNo: line.srNo,
            accountMasterId: line.accountMasterId,
            amount: line.amount,
            tariffType: line.tariffType,
            remark: line.remark ?? null,
            createdBy: actorId,
            updatedBy: actorId,
          })),
        },
      },
    });

    return getTariffDefinition(client, existing.id);
  }

  const duplicate = await client.tariffDefinition.findFirst({
    where: {
      financialYearId,
      scopeLevel: dto.scopeLevel,
      scopeRefId: dto.scopeRefId ?? null,
      effectiveDate,
    },
  });

  if (duplicate) {
    throw Object.assign(new Error('A tariff already exists for this scope and effective date.'), {
      fieldErrors: { effectiveDate: 'Choose a different effective date or edit the existing version.' },
    });
  }

  const created = await client.tariffDefinition.create({
    data: {
      financialYearId,
      effectiveDate,
      scopeLevel: dto.scopeLevel,
      scopeRefId: dto.scopeRefId ?? null,
      isAdvanceMethod: tariffMethod === TariffMethod.ADVANCE,
      createdBy: actorId,
      updatedBy: actorId,
      lines: {
        create: dto.lines.map((line) => ({
          srNo: line.srNo,
          accountMasterId: line.accountMasterId,
          amount: line.amount,
          tariffType: line.tariffType,
          remark: line.remark ?? null,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      },
    },
  });

  return getTariffDefinition(client, created.id);
}

export async function cloneTariffDefinition(
  client: PrismaClient,
  sourceId: string,
  newEffectiveDate: string,
  actorId: string,
): Promise<TariffDefinitionDto> {
  await assertWritable(client);
  const source = await getTariffDefinition(client, sourceId);
  return saveTariffDefinition(
    client,
    {
      effectiveDate: newEffectiveDate,
      scopeLevel: source.scopeLevel,
      scopeRefId: source.scopeRefId,
      isAdvanceMethod: source.isAdvanceMethod,
      lines: source.lines.map((line) => ({
        srNo: line.srNo,
        accountMasterId: line.accountMasterId,
        amount: line.amount,
        tariffType: line.tariffType,
        remark: line.remark,
      })),
    },
    actorId,
  );
}

export async function reorderTariffLines(
  client: PrismaClient,
  definitionId: string,
  lineIds: string[],
  actorId: string,
): Promise<TariffLineDto[]> {
  await assertWritable(client);
  const definition = await client.tariffDefinition.findUniqueOrThrow({
    where: { id: definitionId },
    include: { lines: true },
  });

  const latest = await isLatestDefinition(client, {
    id: definition.id,
    financialYearId: definition.financialYearId,
    scopeLevel: definition.scopeLevel as TariffScopeLevel,
    scopeRefId: definition.scopeRefId,
    effectiveDate: definition.effectiveDate,
  });

  if (!latest) {
    throw new Error('Historical tariff definitions are read-only.');
  }

  if (lineIds.length !== definition.lines.length) {
    throw new Error('All lines must be included in the reorder request.');
  }

  await client.$transaction(
    lineIds.map((lineId, index) =>
      client.tariffLine.update({
        where: { id: lineId },
        data: { srNo: index + 1, updatedBy: actorId },
      }),
    ),
  );

  const updated = await getTariffDefinition(client, definitionId);
  return updated.lines;
}

function resolveScopeRefId(
  scope: PrismaTariffScopeLevel,
  unit: {
    id: string;
    buildingId: string;
    wingId: string;
    unitCompositionId: string | null;
    unitTypeId: string | null;
    unitAreaId: string | null;
    floorMasterId: string | null;
  },
  member: { totalFamilyMembers: number | null },
): string | null {
  switch (scope) {
    case PrismaTariffScopeLevel.UNIT:
      return unit.id;
    case PrismaTariffScopeLevel.WING:
      return unit.wingId;
    case PrismaTariffScopeLevel.BUILDING:
      return unit.buildingId;
    case PrismaTariffScopeLevel.COMPOSITION:
      return unit.unitCompositionId;
    case PrismaTariffScopeLevel.TYPE:
      return unit.unitTypeId;
    case PrismaTariffScopeLevel.AREA:
      return unit.unitAreaId;
    case PrismaTariffScopeLevel.FLOOR:
      return unit.floorMasterId;
    case PrismaTariffScopeLevel.PERSON:
      return String(member.totalFamilyMembers ?? 1);
    default:
      return null;
  }
}

function getUnitRateableValue(unit: {
  residentialRateableValue: { toString(): string } | null;
  commercialRateableValue: { toString(): string } | null;
}): number {
  const residential = unit.residentialRateableValue
    ? toNumber(unit.residentialRateableValue)
    : 0;
  const commercial = unit.commercialRateableValue ? toNumber(unit.commercialRateableValue) : 0;
  return residential + commercial;
}

async function applyAdvanceMethod(
  client: PrismaClient,
  lines: TariffResolvedLineDto[],
  unit: {
    residentialRateableValue: { toString(): string } | null;
    commercialRateableValue: { toString(): string } | null;
  },
  decimalPlaces: TariffDecimalPlaces,
): Promise<TariffResolvedLineDto[]> {
  const unitRateable = getUnitRateableValue(unit);
  if (unitRateable <= 0) {
    return lines.map((line) => ({ ...line, amount: 0 }));
  }

  const allUnits = await client.unit.findMany({
    where: { deletedAt: null },
    select: { residentialRateableValue: true, commercialRateableValue: true },
  });

  const totalSocietyRateable = allUnits.reduce(
    (sum, row) => sum + getUnitRateableValue(row),
    0,
  );

  if (totalSocietyRateable <= 0) {
    return lines;
  }

  return lines.map((line) => {
    const budgetAmount = line.amount;
    const computed = (unitRateable / totalSocietyRateable) * budgetAmount;
    return {
      ...line,
      amount: Money.fromRupees(computed).round(decimalPlaces).toRupees(),
    };
  });
}

function applyTariffLines(
  lines: TariffLineRecord[],
  member: { tenantOccupancy: boolean },
  suppressZeroTariffs: boolean,
  decimalPlaces: TariffDecimalPlaces,
): TariffResolvedLineDto[] {
  const resolved: TariffResolvedLineDto[] = [];

  for (const line of lines) {
    if (line.tariffType === PrismaTariffLineType.TENANT && !member.tenantOccupancy) {
      continue;
    }

    const amount = Money.fromRupees(toNumber(line.amount)).round(decimalPlaces).toRupees();
    if (amount === 0 && suppressZeroTariffs) {
      continue;
    }

    resolved.push({
      srNo: line.srNo,
      accountMasterId: line.accountMasterId,
      accountParticulars: line.accountMaster.particulars,
      accountShortCode: line.accountMaster.shortCode,
      amount,
      tariffType: line.tariffType as TariffLineType,
      remark: line.remark,
    });
  }

  return resolved;
}

export async function resolveTariffForMember(
  client: PrismaClient,
  memberId: string,
  billDate: string,
): Promise<TariffResolveResult> {
  const member = await client.member.findUniqueOrThrow({
    where: { id: memberId },
    include: { unit: true },
  });

  const parameters = await client.societyParameters.findFirstOrThrow();
  const enabledBasis = parseTariffBasis(parameters.tariffStructureBasis);
  const asOfDate = parseIsoDate(billDate, 'billDate');
  const financialYearId = await getActiveFinancialYearId(client);
  const decimalPlaces = (parameters.tariffDecimalPlaces === 0 ? 0 : 2) as TariffDecimalPlaces;

  for (const scope of SCOPE_PRIORITY) {
    if (!enabledBasis.includes(scope as unknown as TariffBasisFlag)) {
      continue;
    }

    const scopeRefId = resolveScopeRefId(
      scope,
      member.unit,
      { totalFamilyMembers: member.totalFamilyMembers },
    );

    if (!scopeRefId && scope !== PrismaTariffScopeLevel.PERSON) {
      continue;
    }

    const definition = await client.tariffDefinition.findFirst({
      where: {
        financialYearId,
        scopeLevel: scope,
        scopeRefId: scopeRefId ?? null,
        effectiveDate: { lte: asOfDate },
      },
      include: {
        lines: {
          include: { accountMaster: true },
          orderBy: { srNo: 'asc' },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!definition) {
      continue;
    }

    let lines = applyTariffLines(
      definition.lines as TariffLineRecord[],
      member,
      parameters.suppressZeroTariffs,
      decimalPlaces,
    );

    if (definition.isAdvanceMethod || parameters.tariffMethod === TariffMethod.ADVANCE) {
      lines = await applyAdvanceMethod(client, lines, member.unit, decimalPlaces);
    }

    return {
      sourceDefinitionId: definition.id,
      scopeLevel: scope as unknown as TariffScopeLevel,
      scopeRefId,
      isAdvanceMethod: definition.isAdvanceMethod,
      lines,
    };
  }

  throw Object.assign(new Error('No tariff definition found for this member.'), {
    code: 'TARIFF_NOT_FOUND',
  });
}

function mapSettlementLine(record: {
  id: string;
  sequenceId: string;
  srNo: number;
  accountMasterId: string;
  remark: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  accountMaster: { particulars: string; shortCode: string | null };
}): TariffSettlementSequenceLineDto {
  return {
    id: record.id,
    sequenceId: record.sequenceId,
    srNo: record.srNo,
    accountMasterId: record.accountMasterId,
    accountParticulars: record.accountMaster.particulars,
    accountShortCode: record.accountMaster.shortCode,
    remark: record.remark,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

async function isLatestSettlementSequence(
  client: PrismaClient,
  sequence: { id: string; financialYearId: string; effectiveDate: Date },
): Promise<boolean> {
  const latest = await client.tariffSettlementSequence.findFirst({
    where: { financialYearId: sequence.financialYearId },
    orderBy: { effectiveDate: 'desc' },
  });
  return latest?.id === sequence.id;
}

export async function listSettlementSequences(
  client: PrismaClient,
): Promise<TariffSettlementSequenceDto[]> {
  const financialYearId = await getActiveFinancialYearId(client);
  const records = await client.tariffSettlementSequence.findMany({
    where: { financialYearId },
    include: {
      lines: {
        include: { accountMaster: true },
        orderBy: { srNo: 'asc' },
      },
    },
    orderBy: { effectiveDate: 'desc' },
  });

  const latestId = records[0]?.id;

  return records.map((record) => ({
    id: record.id,
    financialYearId: record.financialYearId,
    effectiveDate: record.effectiveDate.toISOString().slice(0, 10),
    isReadOnly: record.id !== latestId,
    lines: record.lines.map(mapSettlementLine),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  }));
}

export async function getSettlementSequence(
  client: PrismaClient,
  id: string,
): Promise<TariffSettlementSequenceDto> {
  const record = await client.tariffSettlementSequence.findUniqueOrThrow({
    where: { id },
    include: {
      lines: {
        include: { accountMaster: true },
        orderBy: { srNo: 'asc' },
      },
    },
  });

  return {
    id: record.id,
    financialYearId: record.financialYearId,
    effectiveDate: record.effectiveDate.toISOString().slice(0, 10),
    isReadOnly: !(await isLatestSettlementSequence(client, record)),
    lines: record.lines.map(mapSettlementLine),
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

export async function saveSettlementSequence(
  client: PrismaClient,
  dto: TariffSettlementSequenceSaveDto,
  actorId: string,
): Promise<TariffSettlementSequenceDto> {
  await assertWritable(client);
  const financialYearId = await getActiveFinancialYearId(client);
  const effectiveDate = parseIsoDate(dto.effectiveDate, 'effectiveDate');

  if (dto.id) {
    const existing = await client.tariffSettlementSequence.findUniqueOrThrow({
      where: { id: dto.id },
    });

    const latest = await isLatestSettlementSequence(client, existing);
    if (!latest) {
      throw new Error('Historical settlement sequences are read-only.');
    }

    await client.tariffSettlementSequenceLine.deleteMany({ where: { sequenceId: existing.id } });
    await client.tariffSettlementSequence.update({
      where: { id: existing.id },
      data: {
        updatedBy: actorId,
        lines: {
          create: dto.lines.map((line) => ({
            srNo: line.srNo,
            accountMasterId: line.accountMasterId,
            remark: line.remark ?? null,
            createdBy: actorId,
            updatedBy: actorId,
          })),
        },
      },
    });

    return getSettlementSequence(client, existing.id);
  }

  const duplicate = await client.tariffSettlementSequence.findFirst({
    where: { financialYearId, effectiveDate },
  });
  if (duplicate) {
    throw Object.assign(new Error('Settlement sequence already exists for this effective date.'), {
      fieldErrors: { effectiveDate: 'Choose a different effective date.' },
    });
  }

  const created = await client.tariffSettlementSequence.create({
    data: {
      financialYearId,
      effectiveDate,
      createdBy: actorId,
      updatedBy: actorId,
      lines: {
        create: dto.lines.map((line) => ({
          srNo: line.srNo,
          accountMasterId: line.accountMasterId,
          remark: line.remark ?? null,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      },
    },
  });

  return getSettlementSequence(client, created.id);
}

export async function listBillRegisterMapping(
  client: PrismaClient,
): Promise<TariffBillRegisterMappingDto[]> {
  const financialYearId = await getActiveFinancialYearId(client);
  const records = await client.tariffBillRegisterMapping.findMany({
    where: { financialYearId },
    include: { accountMaster: true },
    orderBy: { srNo: 'asc' },
  });

  return records.map((record) => ({
    id: record.id,
    financialYearId: record.financialYearId,
    srNo: record.srNo,
    accountMasterId: record.accountMasterId,
    accountParticulars: record.accountMaster.particulars,
    accountShortCode: record.accountMaster.shortCode,
    displayMode: record.displayMode as BillRegisterDisplayMode,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  }));
}

export async function saveBillRegisterMapping(
  client: PrismaClient,
  dto: TariffBillRegisterMappingSaveDto,
  actorId: string,
): Promise<TariffBillRegisterMappingDto[]> {
  await assertWritable(client);
  const financialYearId = await getActiveFinancialYearId(client);

  await client.$transaction(async (tx) => {
    await tx.tariffBillRegisterMapping.deleteMany({ where: { financialYearId } });
    for (const row of dto.rows) {
      await tx.tariffBillRegisterMapping.create({
        data: {
          financialYearId,
          srNo: row.srNo,
          accountMasterId: row.accountMasterId,
          displayMode: row.displayMode,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
  });

  return listBillRegisterMapping(client);
}
