import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TariffLineType, TariffScopeLevel } from '@sams/shared-types';
import {
  resolveTariffForMember,
  saveTariffDefinition,
} from './tariff-service.js';
import { seedDefaultChartOfAccounts } from './coa-seed.js';

const client = new PrismaClient();
const testSuffix = `tariff-${Date.now()}`;

describe('resolveTariffForMember', () => {
  let financialYearId: string;
  let buildingId: string;
  let wingId: string;
  let unitId: string;
  let memberId: string;
  let maintenanceAccountId: string;

  beforeAll(async () => {
    await seedDefaultChartOfAccounts(client);

    const identity = await client.societyIdentity.create({
      data: {
        societyName: 'Tariff Test Society',
        createdBy: 'test',
        updatedBy: 'test',
      },
    });

    financialYearId = (
      await client.financialYear.create({
        data: {
          label: '2025-26',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2026-03-31'),
          societyIdentityId: identity.id,
          createdBy: 'test',
          updatedBy: 'test',
        },
      })
    ).id;

    await client.societyParameters.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        societyIdentityId: identity.id,
        tariffStructureBasis: JSON.stringify(['UNIT', 'BUILDING']),
        suppressZeroTariffs: true,
        tariffDecimalPlaces: 2,
        createdBy: 'test',
        updatedBy: 'test',
      },
      update: {
        societyIdentityId: identity.id,
        tariffStructureBasis: JSON.stringify(['UNIT', 'BUILDING']),
        updatedBy: 'test',
      },
    });

    const building = await client.building.create({
      data: {
        financialYearId,
        shortName: `B-${testSuffix}`,
        fullName: `Block ${testSuffix}`,
        createdBy: 'test',
        updatedBy: 'test',
      },
    });
    buildingId = building.id;

    const wing = await client.wing.create({
      data: {
        buildingId,
        shortName: `W-${testSuffix}`,
        fullName: `Wing ${testSuffix}`,
        createdBy: 'test',
        updatedBy: 'test',
      },
    });
    wingId = wing.id;

    const unit = await client.unit.create({
      data: {
        buildingId,
        wingId,
        unitNo: `U-${testSuffix}`,
        serialNo: 1,
        createdBy: 'test',
        updatedBy: 'test',
      },
    });
    unitId = unit.id;

    const member = await client.member.create({
      data: {
        unitId,
        memberName: 'Test Member',
        tenantOccupancy: false,
        createdBy: 'test',
        updatedBy: 'test',
      },
    });
    memberId = member.id;

    maintenanceAccountId = (
      await client.accountMaster.findFirstOrThrow({ where: { shortCode: 'MNCE' } })
    ).id;

    await saveTariffDefinition(
      client,
      {
        effectiveDate: '2025-04-01',
        scopeLevel: TariffScopeLevel.UNIT,
        scopeRefId: unitId,
        lines: [
          {
            srNo: 1,
            accountMasterId: maintenanceAccountId,
            amount: 2500,
            tariffType: TariffLineType.BOTH,
          },
          {
            srNo: 2,
            accountMasterId: maintenanceAccountId,
            amount: 500,
            tariffType: TariffLineType.TENANT,
          },
        ],
      },
      'test',
    );
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('resolves unit-level tariff with tenant lines excluded for non-tenant members', async () => {
    const result = await resolveTariffForMember(client, memberId, '2025-06-01');

    expect(result.scopeLevel).toBe(TariffScopeLevel.UNIT);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.amount).toBe(2500);
  });

  it('prefers unit scope over building scope', async () => {
    await saveTariffDefinition(
      client,
      {
        effectiveDate: '2025-04-01',
        scopeLevel: TariffScopeLevel.BUILDING,
        scopeRefId: buildingId,
        lines: [
          {
            srNo: 1,
            accountMasterId: maintenanceAccountId,
            amount: 999,
            tariffType: TariffLineType.BOTH,
          },
        ],
      },
      'test',
    );

    const result = await resolveTariffForMember(client, memberId, '2025-06-01');
    expect(result.scopeLevel).toBe(TariffScopeLevel.UNIT);
    expect(result.lines[0]?.amount).toBe(2500);
  });
});
