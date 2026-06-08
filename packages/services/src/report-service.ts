import { writeFile } from 'node:fs/promises';
import type { Prisma, PrismaClient } from '@prisma/client';
import { BillStatus, BillType, UnitStatus, VoucherStatus } from '@prisma/client';
import { FdStatus, LetterType } from '@sams/shared-types';
import type {
  ReportCatalogEntryDto,
  ReportColumnDef,
  ReportId,
  ReportResultDto,
  ReportRow,
} from '@sams/shared-types';
import { getActiveFinancialYear, getActiveFinancialYearId } from './financial-year.js';
import { listBillRegisterMapping } from './tariff-service.js';
import { computeMemberArrearsBreakdown } from './settlement-service.js';
import { listMembers, getMember } from './member-service.js';
import {
  listFdRegister,
  listIFormRegisters,
  listPropertyRegister,
  listSinkingFundEntries,
} from './statutory-register-service.js';
import { listParkingAssignments } from './parking-service.js';
import { listGeneratedLetters } from './correspondence-service.js';
import {
  queryBalanceSheet,
  queryBankBook,
  queryBankDepositSlip,
  queryBankReconciliationStatement,
  queryCashBook,
  queryDayBook,
  queryGeneralLedger,
  queryIncomeExpenditure,
  queryPettyCashRegister,
  queryReceiptPaymentStatement,
  queryTrialBalance,
  queryVoucherRegister,
} from './accounting-reports.js';

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

function fmtCurrency(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

const REPORT_CATALOG: ReportCatalogEntryDto[] = [
  { reportId: 'RPT-B01', title: 'Bill Register — Regular', category: 'billing', supportsDrillDown: true },
  { reportId: 'RPT-B02', title: 'Bill Register — Supplementary', category: 'billing', supportsDrillDown: true },
  { reportId: 'RPT-B03', title: 'Member Ledger', category: 'billing', supportsDrillDown: true },
  { reportId: 'RPT-B04', title: 'All Bills Summary', category: 'billing', supportsDrillDown: true },
  { reportId: 'RPT-B05', title: 'Contribution Summary', category: 'billing', supportsDrillDown: false },
  { reportId: 'RPT-B06', title: 'Tariffwise Settlement', category: 'billing', supportsDrillDown: false },
  { reportId: 'RPT-B07', title: 'Outstanding Statement', category: 'billing', supportsDrillDown: true },
  { reportId: 'RPT-B08', title: 'Reminder Letter Print', category: 'billing', supportsDrillDown: true },
  { reportId: 'RPT-M01', title: 'Member Directory', category: 'member', supportsDrillDown: true },
  { reportId: 'RPT-M02', title: 'Member Profile', category: 'member', supportsDrillDown: false },
  { reportId: 'RPT-M03', title: 'Occupancy Report', category: 'member', supportsDrillDown: false },
  { reportId: 'RPT-M04', title: 'Parking Allocation', category: 'member', supportsDrillDown: false },
  { reportId: 'RPT-M05', title: 'I-Form Register', category: 'member', supportsDrillDown: false },
  { reportId: 'RPT-M06', title: 'Property Register', category: 'member', supportsDrillDown: false },
  { reportId: 'RPT-M07', title: 'FD Register', category: 'member', supportsDrillDown: false },
  { reportId: 'RPT-M08', title: 'Sinking Fund Register', category: 'member', supportsDrillDown: false },
  { reportId: 'RPT-A01', title: 'Voucher Register', category: 'accounting', supportsDrillDown: true },
  { reportId: 'RPT-A02', title: 'Cash Book', category: 'accounting', supportsDrillDown: true },
  { reportId: 'RPT-A03', title: 'Bank Book', category: 'accounting', supportsDrillDown: true },
  { reportId: 'RPT-A04', title: 'General Ledger', category: 'accounting', supportsDrillDown: true },
  { reportId: 'RPT-A05', title: 'Trial Balance', category: 'accounting', supportsDrillDown: false },
  { reportId: 'RPT-A06', title: 'Balance Sheet', category: 'accounting', supportsDrillDown: false },
  { reportId: 'RPT-A07', title: 'Income & Expenditure', category: 'accounting', supportsDrillDown: false },
  { reportId: 'RPT-A08', title: 'Receipt & Payment Statement', category: 'accounting', supportsDrillDown: false },
  { reportId: 'RPT-A09', title: 'Bank Reconciliation Statement', category: 'accounting', supportsDrillDown: false },
  { reportId: 'RPT-A10', title: 'Bank Deposit Slip', category: 'accounting', supportsDrillDown: true },
  { reportId: 'RPT-A11', title: 'Day Book', category: 'accounting', supportsDrillDown: true },
  { reportId: 'RPT-A12', title: 'Petty Cash Register', category: 'accounting', supportsDrillDown: true },
];

export function listReportCatalog(): ReportCatalogEntryDto[] {
  return REPORT_CATALOG;
}

async function reportMeta(
  client: PrismaClient,
  parameters: Record<string, unknown>,
  supportsDrillDown: boolean,
  orientation: 'portrait' | 'landscape' = 'portrait',
): Promise<ReportResultDto['metadata']> {
  const fy = await getActiveFinancialYear(client);
  const identity = await client.societyIdentity.findFirst();
  return {
    generatedAt: new Date().toISOString(),
    financialYearId: fy.id,
    societyName: identity?.societyName ?? 'Society',
    fyLabel: fy.label,
    parameters,
    supportsDrillDown,
    orientation,
  };
}

async function queryBillRegister(
  client: PrismaClient,
  reportId: 'RPT-B01' | 'RPT-B02',
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const billType = reportId === 'RPT-B01' ? BillType.REGULAR : BillType.SUPPLEMENTARY;
  const periodFrom = String(parameters.periodFrom ?? '');
  const periodTo = String(parameters.periodTo ?? 'zzzz');
  const buildingId = parameters.buildingId as string | undefined;
  const wingId = parameters.wingId as string | undefined;
  const memberId = parameters.memberId as string | undefined;

  const mapping = await listBillRegisterMapping(client);
  const fixedColumns: ReportColumnDef[] = [
    { key: 'memberName', label: 'Member' },
    { key: 'unitNo', label: 'Unit' },
    { key: 'billForPeriodLabel', label: 'Bill For' },
    { key: 'systemBillNo', label: 'Bill No.' },
    { key: 'billDate', label: 'Bill Date', format: 'date' },
    ...mapping.map((col) => ({
      key: `chg_${col.accountMasterId}`,
      label:
        (col.displayMode === 'SHORT_CODE' ? col.accountShortCode : col.accountParticulars) ?? 'Charge',
      align: 'right' as const,
      format: 'currency' as const,
    })),
    { key: 'principalArrears', label: 'Arrears Principal', align: 'right', format: 'currency' },
    { key: 'interestArrears', label: 'Arrears Interest', align: 'right', format: 'currency' },
    { key: 'interestAmount', label: 'Interest', align: 'right', format: 'currency' },
    { key: 'serviceTaxAmount', label: 'Service Tax', align: 'right', format: 'currency' },
    { key: 'rebateAmount', label: 'Rebate', align: 'right', format: 'currency' },
    { key: 'billAmount', label: 'Bill Amount', align: 'right', format: 'currency' },
  ];

  const bills = await client.bill.findMany({
    where: {
      billType,
      status: BillStatus.POSTED,
      ...(periodFrom ? { billForPeriodKey: { gte: periodFrom, lte: periodTo } } : {}),
      ...(buildingId ? { buildingId } : {}),
      ...(wingId ? { wingId } : {}),
      ...(memberId ? { memberId } : {}),
    },
    include: {
      lines: true,
      member: { include: { unit: { include: { building: true, wing: true } } } },
    },
    orderBy: [{ billForPeriodKey: 'asc' }, { billSerialNo: 'asc' }],
  });

  const rows: ReportRow[] = bills.map((bill) => {
    const cells: Record<string, string | number | null> = {
      memberName: bill.member?.memberName ?? bill.generalPartyName ?? '—',
      unitNo: bill.member?.unit?.unitNo ?? '—',
      billForPeriodLabel: bill.billForPeriodLabel,
      systemBillNo: bill.systemBillNo,
      billDate: fmtDate(bill.billDate),
      principalArrears: toNumber(bill.principalArrears),
      interestArrears: toNumber(bill.interestArrears),
      interestAmount: toNumber(bill.interestAmount),
      serviceTaxAmount: toNumber(bill.serviceTaxAmount),
      rebateAmount: toNumber(bill.rebateAmount),
      billAmount: toNumber(bill.billAmount),
    };
    for (const mapCol of mapping) {
      const line = bill.lines.find(
        (l) => l.accountMasterId === mapCol.accountMasterId && l.lineType === 'CHARGE',
      );
      cells[`chg_${mapCol.accountMasterId}`] = line ? toNumber(line.amount) : 0;
    }
    return { cells, drillDown: { refType: 'BILL', refId: bill.id } };
  });

  const totals: Record<string, number> = { billAmount: 0 };
  for (const row of rows) {
    totals.billAmount = (totals.billAmount ?? 0) + toNumber(row.cells.billAmount as number);
  }

  return {
    reportId,
    title: reportId === 'RPT-B01' ? 'Bill Register — Regular' : 'Bill Register — Supplementary',
    columns: fixedColumns,
    rows,
    totals: { cells: totals },
    metadata: await reportMeta(client, parameters, true, 'landscape'),
  };
}

async function queryMemberLedger(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const memberId = String(parameters.memberId ?? '');
  if (!memberId) throw new Error('Member is required for Member Ledger report.');
  const dateFrom = parameters.dateFrom ? new Date(String(parameters.dateFrom)) : undefined;
  const dateTo = parameters.dateTo ? new Date(String(parameters.dateTo)) : undefined;

  const columns: ReportColumnDef[] = [
    { key: 'date', label: 'Date', format: 'date' },
    { key: 'particulars', label: 'Particulars' },
    { key: 'refNo', label: 'Bill / Voucher No.' },
    { key: 'debit', label: 'Debit', align: 'right', format: 'currency' },
    { key: 'credit', label: 'Credit', align: 'right', format: 'currency' },
    { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
  ];

  const member = await client.member.findUniqueOrThrow({
    where: { id: memberId },
    include: { subsidiaryLedger: { select: { id: true } } },
  });

  const bills = await client.bill.findMany({
    where: {
      memberId,
      status: BillStatus.POSTED,
      ...(dateFrom || dateTo
        ? {
            billDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    },
    orderBy: { billDate: 'asc' },
  });

  const voucherLineFilter = member.subsidiaryLedger
    ? {
        OR: [{ memberId }, { accountMasterId: member.subsidiaryLedger.id }],
      }
    : { memberId };

  const voucherLines = await client.voucherLine.findMany({
    where: {
      ...voucherLineFilter,
      voucher: {
        status: VoucherStatus.POSTED,
        ...(dateFrom || dateTo
          ? {
              voucherDate: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
    },
    include: {
      voucher: {
        select: { id: true, systemVoucherNo: true, voucherDate: true, voucherType: true },
      },
    },
    orderBy: [{ voucher: { voucherDate: 'asc' } }, { lineNo: 'asc' }],
  });

  type Entry = {
    date: Date;
    particulars: string;
    refNo: string;
    debit: number;
    credit: number;
    drillDown?: ReportRow['drillDown'];
  };

  const entries: Entry[] = [
    ...bills.map((b) => ({
      date: b.billDate,
      particulars: `Bill — ${b.billForPeriodLabel}`,
      refNo: b.systemBillNo,
      debit: toNumber(b.billAmount),
      credit: 0,
      drillDown: { refType: 'BILL' as const, refId: b.id },
    })),
    ...voucherLines.map((line) => ({
      date: line.voucher.voucherDate,
      particulars: `${line.voucher.voucherType} — ${line.particulars ?? 'Voucher entry'}`,
      refNo: line.voucher.systemVoucherNo,
      debit: toNumber(line.drAmount),
      credit: toNumber(line.crAmount),
      drillDown: { refType: 'VOUCHER' as const, refId: line.voucher.id },
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = 0;
  const rows: ReportRow[] = entries.map((entry) => {
    balance += entry.debit - entry.credit;
    return {
      cells: {
        date: fmtDate(entry.date),
        particulars: entry.particulars,
        refNo: entry.refNo,
        debit: entry.debit || null,
        credit: entry.credit || null,
        balance,
      },
      drillDown: entry.drillDown,
    };
  });

  return {
    reportId: 'RPT-B03',
    title: 'Member Ledger',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, true),
  };
}

async function queryAllBillsSummary(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const memberId = String(parameters.memberId ?? '');
  if (!memberId) throw new Error('Member is required for All Bills Summary.');

  const columns: ReportColumnDef[] = [
    { key: 'billForPeriodLabel', label: 'Bill For' },
    { key: 'systemBillNo', label: 'Bill No.' },
    { key: 'billDate', label: 'Date', format: 'date' },
    { key: 'billAmount', label: 'Bill Amount', align: 'right', format: 'currency' },
    { key: 'cumulativeBalance', label: 'Cumulative Balance', align: 'right', format: 'currency' },
  ];

  const bills = await client.bill.findMany({
    where: { memberId, status: BillStatus.POSTED },
    orderBy: { billDate: 'asc' },
  });

  let cumulative = 0;
  const rows: ReportRow[] = bills.map((bill) => {
    cumulative += toNumber(bill.billAmount);
    return {
      cells: {
        billForPeriodLabel: bill.billForPeriodLabel,
        systemBillNo: bill.systemBillNo,
        billDate: fmtDate(bill.billDate),
        billAmount: toNumber(bill.billAmount),
        cumulativeBalance: cumulative,
      },
      drillDown: { refType: 'BILL', refId: bill.id },
    };
  });

  return {
    reportId: 'RPT-B04',
    title: 'All Bills Summary',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, true),
  };
}

async function queryContributionSummary(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const fyId = (parameters.financialYearId as string) || (await getActiveFinancialYearId(client));
  const columns: ReportColumnDef[] = [
    { key: 'billForPeriodLabel', label: 'Bill For' },
    { key: 'billCount', label: 'No. of Bills', align: 'right', format: 'number' },
    { key: 'totalPrincipal', label: 'Total Principal', align: 'right', format: 'currency' },
    { key: 'totalInterest', label: 'Total Interest', align: 'right', format: 'currency' },
    { key: 'totalServiceTax', label: 'Total Service Tax', align: 'right', format: 'currency' },
    { key: 'grandTotal', label: 'Grand Total', align: 'right', format: 'currency' },
  ];

  const bills = await client.bill.findMany({
    where: { financialYearId: fyId, billType: BillType.REGULAR, status: BillStatus.POSTED },
    select: {
      billForPeriodKey: true,
      billForPeriodLabel: true,
      totalCharges: true,
      interestAmount: true,
      serviceTaxAmount: true,
      billAmount: true,
    },
  });

  const grouped = new Map<
    string,
    {
      label: string;
      count: number;
      principal: number;
      interest: number;
      serviceTax: number;
      total: number;
    }
  >();

  for (const bill of bills) {
    const existing = grouped.get(bill.billForPeriodKey) ?? {
      label: bill.billForPeriodLabel,
      count: 0,
      principal: 0,
      interest: 0,
      serviceTax: 0,
      total: 0,
    };
    existing.count += 1;
    existing.principal += toNumber(bill.totalCharges);
    existing.interest += toNumber(bill.interestAmount);
    existing.serviceTax += toNumber(bill.serviceTaxAmount);
    existing.total += toNumber(bill.billAmount);
    grouped.set(bill.billForPeriodKey, existing);
  }

  const rows: ReportRow[] = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, g]) => ({
      cells: {
        billForPeriodLabel: g.label,
        billForPeriodKey: key,
        billCount: g.count,
        totalPrincipal: g.principal,
        totalInterest: g.interest,
        totalServiceTax: g.serviceTax,
        grandTotal: g.total,
      },
    }));

  const totals = rows.reduce(
    (acc, row) => ({
      billCount: acc.billCount + toNumber(row.cells.billCount as number),
      grandTotal: acc.grandTotal + toNumber(row.cells.grandTotal as number),
    }),
    { billCount: 0, grandTotal: 0 },
  );

  return {
    reportId: 'RPT-B05',
    title: 'Contribution Summary',
    columns,
    rows,
    totals: { cells: totals },
    metadata: await reportMeta(client, parameters, false),
  };
}

async function queryTariffwiseSettlement(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const memberId = parameters.memberId as string | undefined;
  const columns: ReportColumnDef[] = [
    { key: 'memberName', label: 'Member' },
    { key: 'unitNo', label: 'Unit' },
    { key: 'chargeHead', label: 'Charge Head' },
    { key: 'billed', label: 'Billed', align: 'right', format: 'currency' },
    { key: 'recovered', label: 'Recovered', align: 'right', format: 'currency' },
    { key: 'outstanding', label: 'Outstanding', align: 'right', format: 'currency' },
  ];

  const settlements = await client.billSettlement.findMany({
    where: {
      ...(memberId ? { bill: { memberId } } : {}),
    },
    include: {
      bill: { include: { member: { include: { unit: true } } } },
    },
  });

  const rows: ReportRow[] = [];
  for (const settlement of settlements) {
    let breakdown: Record<string, number> = {};
    try {
      breakdown = JSON.parse(settlement.chargeHeadBreakdown ?? '{}') as Record<string, number>;
    } catch {
      breakdown = {};
    }
    const memberName = settlement.bill.member?.memberName ?? '—';
    const unitNo = settlement.bill.member?.unit?.unitNo ?? '—';
    for (const [chargeHead, recovered] of Object.entries(breakdown)) {
      rows.push({
        cells: {
          memberName,
          unitNo,
          chargeHead,
          billed: recovered,
          recovered,
          outstanding: 0,
        },
      });
    }
  }

  return {
    reportId: 'RPT-B06',
    title: 'Tariffwise Settlement',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false, 'landscape'),
  };
}

async function queryOutstanding(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const buildingId = parameters.buildingId as string | undefined;
  const wingId = parameters.wingId as string | undefined;

  const columns: ReportColumnDef[] = [
    { key: 'memberName', label: 'Member' },
    { key: 'unitNo', label: 'Unit' },
    { key: 'buildingShortName', label: 'Building' },
    { key: 'principalOutstanding', label: 'Principal Outstanding', align: 'right', format: 'currency' },
    { key: 'interestOutstanding', label: 'Interest Outstanding', align: 'right', format: 'currency' },
    { key: 'totalOutstanding', label: 'Total Outstanding', align: 'right', format: 'currency' },
  ];

  const memberList = await listMembers(client, {
    buildingId,
    wingId,
    status: 'active',
  });

  const rows: ReportRow[] = [];
  for (const member of memberList.items) {
    const regular = await computeMemberArrearsBreakdown(client, member.id, 'REGULAR');
    const supplementary = await computeMemberArrearsBreakdown(client, member.id, 'SUPPLEMENTARY');
    const principal = regular.principal + supplementary.principal;
    const interest = regular.interest + supplementary.interest;
    const serviceTax = regular.serviceTax + supplementary.serviceTax;
    const total = principal + interest + serviceTax;
    if (total <= 0.01) continue;
    rows.push({
      cells: {
        memberName: member.memberName,
        unitNo: member.unitNo,
        buildingShortName: member.buildingShortName,
        principalOutstanding: principal,
        interestOutstanding: interest + serviceTax,
        totalOutstanding: total,
      },
      drillDown: { refType: 'MEMBER', refId: member.id },
    });
  }

  return {
    reportId: 'RPT-B07',
    title: 'Outstanding Statement',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, true),
  };
}

async function queryReminderLetters(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const letters = await listGeneratedLetters(client, {
    letterType: LetterType.GENERAL_REMINDER,
    memberId: parameters.memberId as string | undefined,
  });

  const columns: ReportColumnDef[] = [
    { key: 'referenceNo', label: 'Reference No.' },
    { key: 'memberName', label: 'Member' },
    { key: 'generatedAt', label: 'Generated', format: 'date' },
    { key: 'subject', label: 'Subject' },
  ];

  const rows: ReportRow[] = letters.map((letter) => ({
    cells: {
      referenceNo: letter.referenceNo ?? '—',
      memberName: letter.memberName ?? '—',
      generatedAt: letter.issueDate?.slice(0, 10) ?? '—',
      subject: letter.subject ?? 'Reminder',
    },
    drillDown: { refType: 'GENERATED_LETTER', refId: letter.id },
  }));

  return {
    reportId: 'RPT-B08',
    title: 'Reminder Letter Print',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, true),
  };
}

async function queryMemberDirectory(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const columns: ReportColumnDef[] = [
    { key: 'memberName', label: 'Member Name' },
    { key: 'unitNo', label: 'Unit' },
    { key: 'buildingShortName', label: 'Building' },
    { key: 'wingShortName', label: 'Wing' },
    { key: 'memberClass', label: 'Class' },
    { key: 'clubMembershipDeposit', label: 'Club Deposit', align: 'right', format: 'currency' },
  ];

  const members = await client.member.findMany({
    where: {
      ...(parameters.buildingId ? { unit: { buildingId: String(parameters.buildingId) } } : {}),
      ...(parameters.wingId ? { unit: { wingId: String(parameters.wingId) } } : {}),
      ...(parameters.status === 'disposed'
        ? { disposedAt: { not: null } }
        : parameters.status === 'active'
          ? { disposedAt: null }
          : {}),
    },
    include: { unit: { include: { building: true, wing: true } } },
    orderBy: { memberName: 'asc' },
  });

  const rows: ReportRow[] = members.map((m) => ({
    cells: {
      memberName: m.memberName,
      unitNo: m.unit.unitNo,
      buildingShortName: m.unit.building.shortName,
      wingShortName: m.unit.wing.shortName,
      memberClass: m.memberClass ?? '—',
      clubMembershipDeposit: toNumber(m.clubMembershipDeposit),
    },
    drillDown: { refType: 'MEMBER', refId: m.id },
  }));

  return {
    reportId: 'RPT-M01',
    title: 'Member Directory',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, true),
  };
}

async function queryMemberProfile(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const memberId = String(parameters.memberId ?? '');
  if (!memberId) throw new Error('Member is required for Member Profile report.');
  const member = await getMember(client, memberId);

  const columns: ReportColumnDef[] = [
    { key: 'field', label: 'Field' },
    { key: 'value', label: 'Value' },
  ];

  const fields: Array<[string, string]> = [
    ['Member Name', member.memberName],
    ['Unit', `${member.buildingShortName}/${member.wingShortName}/${member.unitNo}`],
    ['PAN', member.panNo ?? '—'],
    ['Email', member.emailPrimary ?? '—'],
    ['Residence Phone', member.residencePhone ?? '—'],
    ['Class', member.memberClass ?? '—'],
    ['Club Deposit', String(member.clubMembershipDeposit ?? 0)],
    ['Dependents', String(member.dependents.length)],
    ['Nominees', String(member.nominees.length)],
    ['Vehicles', String(member.vehicles.length)],
    ['Shares', String(member.shares.length)],
  ];

  const rows: ReportRow[] = fields.map(([field, value]) => ({
    cells: { field, value },
  }));

  return {
    reportId: 'RPT-M02',
    title: `Member Profile — ${member.memberName}`,
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

async function queryOccupancy(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const columns: ReportColumnDef[] = [
    { key: 'buildingShortName', label: 'Building' },
    { key: 'wingShortName', label: 'Wing' },
    { key: 'unitNo', label: 'Unit' },
    { key: 'status', label: 'Status' },
    { key: 'occupant', label: 'Occupant' },
  ];

  const units = await client.unit.findMany({
    where: {
      ...(parameters.buildingId ? { buildingId: String(parameters.buildingId) } : {}),
      ...(parameters.wingId ? { wingId: String(parameters.wingId) } : {}),
      deletedAt: null,
    },
    include: {
      building: true,
      wing: true,
      members: { where: { disposedAt: null }, take: 1 },
      tenants: { where: { isActive: true }, take: 1 },
    },
    orderBy: [{ building: { shortName: 'asc' } }, { unitNo: 'asc' }],
  });

  const rows: ReportRow[] = units.map((unit) => {
    let status = 'Vacant';
    let occupant = '—';
    if (unit.members[0]) {
      status = 'Owner';
      occupant = unit.members[0].memberName;
    } else if (unit.tenants[0]) {
      status = 'Tenant';
      occupant = unit.tenants[0].tenantName;
    } else if (unit.status === UnitStatus.VACANT) {
      status = 'Vacant';
    }
    return {
      cells: {
        buildingShortName: unit.building.shortName,
        wingShortName: unit.wing.shortName,
        unitNo: unit.unitNo,
        status,
        occupant,
      },
    };
  });

  return {
    reportId: 'RPT-M03',
    title: 'Occupancy Report',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

async function queryParkingAllocation(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const assignments = await listParkingAssignments(client, parameters.memberId as string | undefined);

  const columns: ReportColumnDef[] = [
    { key: 'memberName', label: 'Member' },
    { key: 'parkingNo', label: 'Parking No.' },
    { key: 'parkingType', label: 'Type' },
    { key: 'monthlyRate', label: 'Monthly Rate', align: 'right', format: 'currency' },
  ];

  const memberNames = new Map(
    (
      await listMembers(client, { status: 'all' })
    ).items.map((m) => [m.id, m.memberName]),
  );

  const rows: ReportRow[] = assignments.map((a) => ({
    cells: {
      memberName: memberNames.get(a.memberId) ?? '—',
      parkingNo: a.parkingNo ?? '—',
      parkingType: '—',
      monthlyRate: 0,
    },
  }));

  return {
    reportId: 'RPT-M04',
    title: 'Parking Allocation',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

async function queryIFormRegister(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const items = await listIFormRegisters(client, parameters.search as string | undefined);
  const columns: ReportColumnDef[] = [
    { key: 'memberName', label: 'Member' },
    { key: 'shareCertificateNo', label: 'Share Certificate' },
    { key: 'shareCount', label: 'Shares', align: 'right', format: 'number' },
    { key: 'nominalValue', label: 'Nominal Value', align: 'right', format: 'currency' },
  ];
  const rows: ReportRow[] = items.map((item) => {
    const shareCount = item.shareEntries.reduce(
      (sum, entry) => sum + (entry.numberOfShares ?? 0),
      0,
    );
    const nominalValue = item.shareEntries.reduce(
      (sum, entry) => sum + (entry.totalAmount ?? 0),
      0,
    );
    const shareCertificateNo =
      item.shareEntries.find((entry) => entry.certificateSerialNo)?.certificateSerialNo ?? '—';
    return {
      cells: {
        memberName: item.fullName,
        shareCertificateNo,
        shareCount,
        nominalValue,
      },
    };
  });
  return {
    reportId: 'RPT-M05',
    title: 'I-Form Register',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

async function queryPropertyRegister(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const items = await listPropertyRegister(client, parameters.search as string | undefined);
  const columns: ReportColumnDef[] = [
    { key: 'srNo', label: 'Sr. No.', align: 'right' },
    { key: 'description', label: 'Description' },
    { key: 'location', label: 'Location' },
    { key: 'purchaseDate', label: 'Purchase Date', format: 'date' },
    { key: 'purchaseValue', label: 'Value', align: 'right', format: 'currency' },
  ];
  const rows: ReportRow[] = items.map((item) => ({
    cells: {
      srNo: item.srNo,
      description: item.description ?? item.flatNo,
      location: item.tenementNo ?? item.floorNo ?? '—',
      purchaseDate: item.possessionDate ?? '—',
      purchaseValue: item.cost ?? 0,
    },
  }));
  return {
    reportId: 'RPT-M06',
    title: 'Property Register',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

async function queryFdRegister(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const items = await listFdRegister(client, {
    status: parameters.status as FdStatus | undefined,
    search: parameters.search as string | undefined,
  });
  const columns: ReportColumnDef[] = [
    { key: 'fdrNo', label: 'FDR No.' },
    { key: 'bankName', label: 'Bank' },
    { key: 'principalAmount', label: 'Principal', align: 'right', format: 'currency' },
    { key: 'maturityDate', label: 'Maturity', format: 'date' },
    { key: 'status', label: 'Status' },
  ];
  const rows: ReportRow[] = items.map((item) => ({
    cells: {
      fdrNo: item.fdrNo,
      bankName: item.bankName,
      principalAmount: item.amount,
      maturityDate: item.maturityDate,
      status: item.status,
    },
  }));
  return {
    reportId: 'RPT-M07',
    title: 'FD Register',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

async function querySinkingFundRegister(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const items = await listSinkingFundEntries(client, {
    memberId: parameters.memberId as string | undefined,
    dateFrom: parameters.dateFrom as string | undefined,
    dateTo: parameters.dateTo as string | undefined,
  });
  const columns: ReportColumnDef[] = [
    { key: 'entryDate', label: 'Date', format: 'date' },
    { key: 'memberName', label: 'Member' },
    { key: 'receiptNo', label: 'Receipt No.' },
    { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
  ];
  const rows: ReportRow[] = items.map((item) => ({
    cells: {
      entryDate: item.receiptDate,
      memberName: item.memberName ?? '—',
      receiptNo: item.sourceVoucherNo ?? '—',
      amount: item.amountContributed,
    },
  }));
  return {
    reportId: 'RPT-M08',
    title: 'Sinking Fund Register',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

export async function runReport(
  client: PrismaClient,
  reportId: ReportId,
  parameters: Record<string, unknown> = {},
): Promise<ReportResultDto> {
  switch (reportId) {
    case 'RPT-B01':
      return queryBillRegister(client, 'RPT-B01', parameters);
    case 'RPT-B02':
      return queryBillRegister(client, 'RPT-B02', parameters);
    case 'RPT-B03':
      return queryMemberLedger(client, parameters);
    case 'RPT-B04':
      return queryAllBillsSummary(client, parameters);
    case 'RPT-B05':
      return queryContributionSummary(client, parameters);
    case 'RPT-B06':
      return queryTariffwiseSettlement(client, parameters);
    case 'RPT-B07':
      return queryOutstanding(client, parameters);
    case 'RPT-B08':
      return queryReminderLetters(client, parameters);
    case 'RPT-M01':
      return queryMemberDirectory(client, parameters);
    case 'RPT-M02':
      return queryMemberProfile(client, parameters);
    case 'RPT-M03':
      return queryOccupancy(client, parameters);
    case 'RPT-M04':
      return queryParkingAllocation(client, parameters);
    case 'RPT-M05':
      return queryIFormRegister(client, parameters);
    case 'RPT-M06':
      return queryPropertyRegister(client, parameters);
    case 'RPT-M07':
      return queryFdRegister(client, parameters);
    case 'RPT-M08':
      return querySinkingFundRegister(client, parameters);
    case 'RPT-A01':
      return queryVoucherRegister(client, parameters);
    case 'RPT-A02':
      return queryCashBook(client, parameters);
    case 'RPT-A03':
      return queryBankBook(client, parameters);
    case 'RPT-A04':
      return queryGeneralLedger(client, parameters);
    case 'RPT-A05':
      return queryTrialBalance(client, parameters);
    case 'RPT-A06':
      return queryBalanceSheet(client, parameters);
    case 'RPT-A07':
      return queryIncomeExpenditure(client, parameters);
    case 'RPT-A08':
      return queryReceiptPaymentStatement(client, parameters);
    case 'RPT-A09':
      return queryBankReconciliationStatement(client, parameters);
    case 'RPT-A10':
      return queryBankDepositSlip(client, parameters);
    case 'RPT-A11':
      return queryDayBook(client, parameters);
    case 'RPT-A12':
      return queryPettyCashRegister(client, parameters);
    default:
      throw new Error(`Unknown report: ${reportId}`);
  }
}

export function renderReportHtml(result: ReportResultDto): string {
  const { metadata, columns, rows, totals, title } = result;
  const headerCells = columns.map((col) => `<th>${col.label}</th>`).join('');
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((col) => {
          const raw = row.cells[col.key];
          let display: string;
          if (raw == null) display = '';
          else if (col.format === 'currency' && typeof raw === 'number') display = fmtCurrency(raw);
          else display = String(raw);
          const align = col.align === 'right' ? ' style="text-align:right"' : '';
          return `<td${align}>${display}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  let totalsRow = '';
  if (totals) {
    totalsRow = `<tr class="totals">${columns
      .map((col) => {
        const val = totals.cells[col.key];
        const display = val != null ? fmtCurrency(val) : '';
        return `<td style="text-align:right;font-weight:bold">${display}</td>`;
      })
      .join('')}</tr>`;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; font-size: 12px; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  .meta { color: #555; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 4px 8px; }
  th { background: #f0f0f0; }
  tr.totals td { border-top: 2px solid #333; }
</style></head><body>
<h1>${metadata.societyName}</h1>
<p class="meta">${title} · FY ${metadata.fyLabel} · Generated ${metadata.generatedAt.slice(0, 19)}</p>
<table><thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}${totalsRow}</tbody></table>
</body></html>`;
}

export function reportToCsv(result: ReportResultDto): string {
  const header = result.columns.map((c) => c.label).join(',');
  const lines = result.rows.map((row) =>
    result.columns
      .map((col) => {
        const val = row.cells[col.key] ?? '';
        return `"${String(val).replaceAll('"', '""')}"`;
      })
      .join(','),
  );
  return [header, ...lines].join('\n');
}

export async function exportReportCsv(
  result: ReportResultDto,
  targetPath: string,
): Promise<string> {
  const csv = reportToCsv(result);
  await writeFile(targetPath, csv, 'utf8');
  return targetPath;
}

export async function previewReport(
  client: PrismaClient,
  reportId: ReportId,
  parameters: Record<string, unknown>,
): Promise<{ html: string; rowCount: number; result: ReportResultDto }> {
  const result = await runReport(client, reportId, parameters);
  return {
    html: renderReportHtml(result),
    rowCount: result.rows.length,
    result,
  };
}
