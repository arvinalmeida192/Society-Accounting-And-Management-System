import type { PrismaClient } from '@prisma/client';
import { BillFrequency } from '@sams/shared-types';

const SYSTEM_ACTOR = 'SYSTEM';

const TEMPLATE_DEFINITIONS = [
  { reportType: 'BILL_REGULAR', code: 'BILL-R1', name: 'Regular Bill — Standard' },
  { reportType: 'BILL_REGULAR', code: 'BILL-R2', name: 'Regular Bill — Compact' },
  { reportType: 'BILL_SUPPLEMENTARY', code: 'BILL-S1', name: 'Supplementary Bill — Standard' },
  { reportType: 'BILL_SUPPLEMENTARY', code: 'BILL-S2', name: 'Supplementary Bill — Compact' },
  { reportType: 'RECEIPT_MEMBER', code: 'RCPT-M1', name: 'Member Receipt — Standard' },
  { reportType: 'RECEIPT_MEMBER', code: 'RCPT-M2', name: 'Member Receipt — Compact' },
  { reportType: 'RECEIPT_GENERAL', code: 'RCPT-G1', name: 'General Receipt — Standard' },
  { reportType: 'RECEIPT_GENERAL', code: 'RCPT-G2', name: 'General Receipt — Compact' },
  { reportType: 'CHEQUE', code: 'CHQ-1', name: 'Cheque Print — Standard' },
  { reportType: 'CHEQUE', code: 'CHQ-2', name: 'Cheque Print — Alternate' },
  { reportType: 'MEETING_MINUTES', code: 'MIN-1', name: 'Meeting Minutes — Formal' },
  { reportType: 'MEETING_MINUTES', code: 'MIN-2', name: 'Meeting Minutes — Simple' },
  { reportType: 'MCACT_101', code: 'MC101-1', name: 'MCACT-101 — Standard' },
  { reportType: 'MCACT_101', code: 'MC101-2', name: 'MCACT-101 — Alternate' },
] as const;

export async function seedReportTemplates(
  client: PrismaClient,
  actorId: string = SYSTEM_ACTOR,
): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};

  for (const template of TEMPLATE_DEFINITIONS) {
    const existing = await client.reportTemplate.findUnique({
      where: { templateCode: template.code },
    });
    if (existing) {
      ids[template.code] = existing.id;
      continue;
    }

    const created = await client.reportTemplate.create({
      data: {
        reportType: template.reportType,
        templateCode: template.code,
        templateName: template.name,
        htmlTemplatePath: `assets/report-templates/${template.code.toLowerCase()}.html`,
        cssPath: `assets/report-templates/${template.code.toLowerCase()}.css`,
        thumbnailPath: null,
        pageSize: 'A4',
        isActive: true,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    ids[template.code] = created.id;
  }

  return ids;
}

export async function seedSocietyConfiguration(
  client: PrismaClient,
  societyIdentityId: string,
  financialYearId: string,
  actorId: string = SYSTEM_ACTOR,
): Promise<void> {
  const templateIds = await seedReportTemplates(client, actorId);

  await client.societyParameters.create({
    data: {
      id: 'singleton',
      societyIdentityId,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.propertyInformation.create({
    data: {
      id: 'singleton',
      societyIdentityId,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  await client.reportFormatConfig.create({
    data: {
      id: 'singleton',
      societyIdentityId,
      billFormatId: templateIds['BILL-R1'],
      supplementaryBillFormatId: templateIds['BILL-S1'],
      receiptFormatId: templateIds['RCPT-M1'],
      generalReceiptFormatId: templateIds['RCPT-G1'],
      chequePrintFormatId: templateIds['CHQ-1'],
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  const fy = await client.financialYear.findUniqueOrThrow({ where: { id: financialYearId } });
  const { regenerateBillingPeriodCalendar } = await import('./billing-period-service.js');
  await regenerateBillingPeriodCalendar(client, {
    financialYearId,
    startDate: fy.startDate,
    endDate: fy.endDate,
    billFrequency: BillFrequency.MONTHLY,
    actorId,
  });
}
