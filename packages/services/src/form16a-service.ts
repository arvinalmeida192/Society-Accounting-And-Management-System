import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { PartyType, type Form16AResultDto } from '@sams/shared-types';

function toNumber(value: { toString(): string } | number): number {
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

function quarterLabel(date: Date): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month <= 3) return `Q4 ${year - 1}-${String(year).slice(-2)}`;
  if (month <= 6) return `Q1 ${year}-${String(year + 1).slice(-2)}`;
  if (month <= 9) return `Q2 ${year}-${String(year + 1).slice(-2)}`;
  return `Q3 ${year}-${String(year + 1).slice(-2)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function generateForm16A(
  client: PrismaClient,
  partyAccountId: string,
  financialYearId: string,
  outputDir: string,
): Promise<Form16AResultDto> {
  const address = await client.addressBookEntry.findUnique({
    where: { accountMasterId: partyAccountId },
    include: { accountMaster: { select: { particulars: true } } },
  });

  if (!address?.officeAddress && !address?.otherAddress) {
    return {
      blocked: true,
      reason:
        'Address Book entry is missing for this party. Add office or other address before generating Form 16A (GAP-020).',
    };
  }

  const societyBank = await client.addressBookEntry.findFirst({
    where: { partyType: PartyType.SOCIETY_BANK },
    include: { accountMaster: { select: { particulars: true } } },
  });

  const society = await client.societyIdentity.findFirst();
  const fy = await client.financialYear.findUniqueOrThrow({ where: { id: financialYearId } });

  const records = await client.tdsRecord.findMany({
    where: { financialYearId, partyAccountId },
    include: { challan: true },
    orderBy: [{ paymentDate: 'asc' }, { natureOfPayment: 'asc' }],
  });

  if (records.length === 0) {
    return {
      blocked: true,
      reason: 'No TDS deductions found for this party in the selected financial year.',
    };
  }

  const grouped = new Map<
    string,
    {
      nature: string;
      quarter: string;
      challanNo: string;
      rows: typeof records;
      total: number;
    }
  >();

  for (const record of records) {
    const nature = record.natureOfPayment ?? 'Other';
    const quarter = quarterLabel(record.paymentDate);
    const challanNo = record.challan?.challanNo ?? 'Unlinked';
    const key = `${nature}|${quarter}|${challanNo}`;
    const bucket = grouped.get(key) ?? {
      nature,
      quarter,
      challanNo,
      rows: [],
      total: 0,
    };
    bucket.rows.push(record);
    bucket.total += toNumber(record.totalAmount);
    grouped.set(key, bucket);
  }

  const partyAddress = address.officeAddress ?? address.otherAddress ?? '';
  const deductorPan = society?.pan ?? '—';
  const deducteePan = address.pan ?? '—';
  const bankDepositRef = societyBank
    ? `${societyBank.accountMaster.particulars}${societyBank.bankAccountNo ? ` · A/c ${societyBank.bankAccountNo}` : ''}${societyBank.bankBranchName ? ` · ${societyBank.bankBranchName}` : ''}`
    : 'Society bank details not configured in Address Book (GAP-021).';

  const summaryRows = [...grouped.values()]
    .map(
      (group) => `
      <tr>
        <td>${escapeHtml(group.nature)}</td>
        <td>${escapeHtml(group.quarter)}</td>
        <td>${escapeHtml(group.challanNo)}</td>
        <td>${group.rows.length}</td>
        <td style="text-align:right">${group.total.toFixed(2)}</td>
      </tr>`,
    )
    .join('');

  const grandTotal = records.reduce((sum, row) => sum + toNumber(row.totalAmount), 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Form 16A — ${escapeHtml(address.accountMaster.particulars)}</title>
  <style>
    body { font-family: serif; margin: 24px; color: #111; }
    h1, h2 { margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #444; padding: 6px 8px; font-size: 13px; }
    th { background: #f3f3f3; text-align: left; }
    .meta { margin-bottom: 12px; }
  </style>
</head>
<body>
  <h1>Form 16A Certificate</h1>
  <p class="meta">Financial Year: <strong>${escapeHtml(fy.label)}</strong></p>
  <h2>Deductor</h2>
  <p>${escapeHtml(society?.societyName ?? 'Society')} · PAN: ${escapeHtml(deductorPan)}</p>
  <h2>Deductee</h2>
  <p>${escapeHtml(address.accountMaster.particulars)} · PAN: ${escapeHtml(deducteePan)}</p>
  <p>${escapeHtml(partyAddress)}</p>
  <h2>Deposit Reference (Society Bank)</h2>
  <p>${escapeHtml(bankDepositRef)}</p>
  <h2>Summary by Nature, Quarter, and Challan (GAP-022)</h2>
  <table>
    <thead>
      <tr>
        <th>Nature of Payment</th>
        <th>Quarter</th>
        <th>Challan No.</th>
        <th>Entries</th>
        <th>Total TDS</th>
      </tr>
    </thead>
    <tbody>${summaryRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right"><strong>Grand Total</strong></td>
        <td style="text-align:right"><strong>${grandTotal.toFixed(2)}</strong></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  await mkdir(outputDir, { recursive: true });
  const safeParty = address.accountMaster.particulars.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
  const fileName = `Form16A_${safeParty}_${fy.label.replace(/[^a-zA-Z0-9_-]+/g, '_')}.html`;
  const filePath = join(outputDir, fileName);
  await writeFile(filePath, html, 'utf8');

  return {
    blocked: false,
    htmlPath: filePath,
    partyName: address.accountMaster.particulars,
    financialYearLabel: fy.label,
    totalDeductions: grandTotal,
    groupCount: grouped.size,
  };
}
