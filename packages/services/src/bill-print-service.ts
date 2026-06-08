import type { PrismaClient } from '@prisma/client';
import type { BillPrintDto } from '@sams/shared-types';
import { getRegularBill, getSupplementaryBill } from './billing-service.js';
import { loadReportTemplateHtml } from './report-template-loader.js';
import {
  getReportFormatConfig,
  getSocietyIdentity,
  getSocietyParameters,
} from './society-config-service.js';

function fmtCurrency(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderBillLinesHtml(
  lines: Array<{ srNo: number; chargeName: string; amount: number }>,
): string {
  return lines
    .map(
      (line) =>
        `<tr><td>${line.srNo}</td><td>${line.chargeName}</td><td class="amount">${fmtCurrency(line.amount)}</td></tr>`,
    )
    .join('');
}

function renderBillFallbackHtml(placeholders: Record<string, string>): string {
  return `
    <div class="bill-print-preview">
      <h1>${placeholders['society.name']}</h1>
      <p>${placeholders['society.address']}</p>
      <h2>Maintenance Bill</h2>
      <p><strong>Bill For:</strong> ${placeholders['bill.billForLabel']}</p>
      <p><strong>Bill No:</strong> ${placeholders['bill.billNo']} | <strong>Date:</strong> ${placeholders['bill.billDate']}</p>
      <p><strong>Member:</strong> ${placeholders['member.name']} | <strong>Unit:</strong> ${placeholders['unit.label']}</p>
      <table border="1" cellpadding="4" cellspacing="0" style="width:100%;border-collapse:collapse">
        <thead><tr><th>Sr.</th><th>Charge</th><th>Amount</th></tr></thead>
        <tbody>${placeholders['bill.lines']}</tbody>
      </table>
      <p><strong>Bill Amount: ₹ ${placeholders['bill.billAmount']}</strong></p>
      <p>${placeholders['bill.remark']}</p>
    </div>
  `;
}

/** GAP-002 — regular bill print using SOC-004 selected template. */
export async function prepareRegularBillPrintData(
  client: PrismaClient,
  billId: string,
): Promise<BillPrintDto> {
  const bill = await getRegularBill(client, billId);
  const [identity, formats, parameters] = await Promise.all([
    getSocietyIdentity(client),
    getReportFormatConfig(client),
    getSocietyParameters(client),
  ]);

  const address = [identity.addressLine1, identity.addressLine2, identity.addressLine3]
    .filter(Boolean)
    .join(', ');

  const placeholders: Record<string, string> = {
    'society.name': identity.societyName,
    'society.address': address,
    'bill.billForLabel': bill.billForPeriodLabel,
    'bill.billNo': bill.systemBillNo,
    'bill.billDate': bill.billDate,
    'bill.dueDate': bill.dueDate,
    'member.name': bill.memberName ?? '—',
    'unit.label': `${bill.buildingShortName}/${bill.wingShortName}/${bill.unitNo}`,
    'unit.area': String(bill.areaSnapshot ?? '—'),
    'bill.lines': renderBillLinesHtml(bill.lines),
    'bill.principalArrears': fmtCurrency(bill.principalArrears),
    'bill.interestArrears': fmtCurrency(bill.interestArrears),
    'bill.interest': fmtCurrency(bill.interestAmount),
    'bill.serviceTax': fmtCurrency(bill.serviceTaxAmount),
    'bill.rebate': fmtCurrency(bill.rebateAmount),
    'bill.billAmount': fmtCurrency(bill.billAmount),
    'bill.remark': bill.remark ?? '',
    signatory1: parameters.authorizedSignatory1 ?? '',
    signatory2: parameters.authorizedSignatory2 ?? '',
    signatory3: parameters.authorizedSignatory3 ?? '',
  };

  const fallbackHtml = renderBillFallbackHtml(placeholders);
  let templatePath: string | null = null;
  if (formats.billFormatId) {
    const template = await client.reportTemplate.findUnique({
      where: { id: formats.billFormatId },
      select: { htmlTemplatePath: true },
    });
    templatePath = template?.htmlTemplatePath ?? null;
  }

  const templateHtml = await loadReportTemplateHtml(templatePath, placeholders, fallbackHtml);

  return {
    billId,
    templateHtml,
  };
}

/** Supplementary bill print using SOC-004 supplementary template. */
export async function prepareSupplementaryBillPrintData(
  client: PrismaClient,
  billId: string,
): Promise<BillPrintDto> {
  const bill = await getSupplementaryBill(client, billId);
  const [identity, formats, parameters] = await Promise.all([
    getSocietyIdentity(client),
    getReportFormatConfig(client),
    getSocietyParameters(client),
  ]);

  const address = [identity.addressLine1, identity.addressLine2, identity.addressLine3]
    .filter(Boolean)
    .join(', ');

  const partyLabel =
    bill.billToType === 'GENERAL'
      ? (bill.generalPartyName ?? 'General Party')
      : (bill.memberName ?? bill.tenantName ?? '—');

  const placeholders: Record<string, string> = {
    'society.name': identity.societyName,
    'society.address': address,
    'bill.billForLabel': bill.billForPeriodLabel,
    'bill.billNo': bill.systemBillNo,
    'bill.billDate': bill.billDate,
    'bill.dueDate': bill.dueDate,
    'member.name': partyLabel,
    'unit.label': bill.unitNo ? `${bill.buildingShortName ?? ''}/${bill.wingShortName ?? ''}/${bill.unitNo}` : '—',
    'unit.area': '—',
    'bill.lines': renderBillLinesHtml(bill.lines),
    'bill.principalArrears': fmtCurrency(bill.principalArrears),
    'bill.interestArrears': fmtCurrency(bill.interestArrears),
    'bill.interest': fmtCurrency(bill.interestAmount),
    'bill.serviceTax': fmtCurrency(bill.serviceTaxAmount),
    'bill.rebate': fmtCurrency(bill.rebateAmount),
    'bill.billAmount': fmtCurrency(bill.billAmount),
    'bill.remark': bill.remark ?? '',
    signatory1: parameters.authorizedSignatory1 ?? '',
    signatory2: parameters.authorizedSignatory2 ?? '',
    signatory3: parameters.authorizedSignatory3 ?? '',
  };

  const fallbackHtml = renderBillFallbackHtml(placeholders).replace(
    'Maintenance Bill',
    'Supplementary Bill',
  );

  let templatePath: string | null = null;
  if (formats.supplementaryBillFormatId) {
    const template = await client.reportTemplate.findUnique({
      where: { id: formats.supplementaryBillFormatId },
      select: { htmlTemplatePath: true },
    });
    templatePath = template?.htmlTemplatePath ?? null;
  }

  const templateHtml = await loadReportTemplateHtml(templatePath, placeholders, fallbackHtml);

  return { billId, templateHtml };
}

export interface BillReferenceNavigationDto {
  tabId: string;
  title: string;
  route: string;
}

/** RB-012 — resolve bill reference panel navigation target. */
export async function resolveBillReferenceNavigation(
  client: PrismaClient,
  billId: string,
  refType: import('@sams/shared-types').BillReferenceType,
): Promise<BillReferenceNavigationDto> {
  const bill = await getRegularBill(client, billId);
  const memberId = bill.memberId ?? '';

  const routes: Record<
    import('@sams/shared-types').BillReferenceType,
    BillReferenceNavigationDto
  > = {
    ALL_BILLS: { tabId: 'bil-bulk', title: 'Bulk Regular Bills', route: '/app/billing/regular/bulk' },
    RECEIPTS: { tabId: 'vch-entry', title: 'Receipt / Payment', route: '/app/transactions/voucher' },
    ADJUSTMENTS: { tabId: 'vch-adj', title: 'JV / DN / CN', route: '/app/transactions/adjustments' },
    MEMBER_LEDGER: {
      tabId: 'mem-reg',
      title: 'Member Register',
      route: memberId ? `/app/members/register?memberId=${memberId}` : '/app/members/register',
    },
    CONTRIBUTION: {
      tabId: 'rpt-b05',
      title: 'Contribution Summary',
      route: `/app/reports/RPT-B05${memberId ? `?memberId=${memberId}&autoRun=1` : '?autoRun=1'}`,
    },
    OPENING_BILL: {
      tabId: 'mem-reg',
      title: 'Member Register',
      route: memberId ? `/app/members/register?memberId=${memberId}` : '/app/members/register',
    },
  };

  return routes[refType];
}
