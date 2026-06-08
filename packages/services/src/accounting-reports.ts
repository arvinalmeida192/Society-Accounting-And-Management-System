import type { PrismaClient } from '@prisma/client';
import { VoucherStatus, VoucherType } from '@prisma/client';
import type { ReportColumnDef, ReportResultDto, ReportRow } from '@sams/shared-types';
import { PartyType } from '@sams/shared-types';
import { generateBankReconciliationStatement } from './bank-reconciliation-service.js';
import { getActiveFinancialYearId, parseIsoDate } from './financial-year.js';
import {
  getBalanceSheet,
  getClosingBalance,
  getIncomeExpenditure,
  getReceiptPaymentStatement,
  getTrialBalance,
} from './ledger-balance-service.js';
import { getSocietyParameters } from './society-config-service.js';
function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

function fmtDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

async function reportMeta(
  client: PrismaClient,
  parameters: Record<string, unknown>,
  supportsDrillDown: boolean,
  orientation: 'portrait' | 'landscape' = 'portrait',
): Promise<ReportResultDto['metadata']> {
  const fy = await client.financialYear.findFirst({ orderBy: { startDate: 'desc' } });
  const identity = await client.societyIdentity.findFirst();
  return {
    generatedAt: new Date().toISOString(),
    financialYearId: fy?.id ?? '',
    societyName: identity?.societyName ?? 'Society',
    fyLabel: fy?.label ?? '',
    parameters,
    supportsDrillDown,
    orientation,
  };
}

export async function queryVoucherRegister(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const dateFrom = parameters.dateFrom ? parseIsoDate(String(parameters.dateFrom), 'dateFrom') : undefined;
  const dateTo = parameters.dateTo ? parseIsoDate(String(parameters.dateTo), 'dateTo') : undefined;
  const voucherType = parameters.voucherType as VoucherType | undefined;

  const columns: ReportColumnDef[] = [
    { key: 'voucherDate', label: 'Date', format: 'date' },
    { key: 'voucherType', label: 'Type' },
    { key: 'systemVoucherNo', label: 'Voucher No.' },
    { key: 'manualVoucherNo', label: 'Manual No.' },
    { key: 'narration', label: 'Narration' },
    { key: 'debit', label: 'Debit', align: 'right', format: 'currency' },
    { key: 'credit', label: 'Credit', align: 'right', format: 'currency' },
  ];

  const vouchers = await client.voucher.findMany({
    where: {
      status: VoucherStatus.POSTED,
      ...(voucherType ? { voucherType } : {}),
      ...(dateFrom || dateTo
        ? {
            voucherDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    },
    include: { lines: true },
    orderBy: [{ voucherDate: 'asc' }, { systemVoucherNo: 'asc' }],
  });

  const rows: ReportRow[] = vouchers.map((voucher) => {
    const debit = voucher.lines.reduce((sum, line) => sum + toNumber(line.drAmount), 0);
    const credit = voucher.lines.reduce((sum, line) => sum + toNumber(line.crAmount), 0);
    return {
      cells: {
        voucherDate: fmtDate(voucher.voucherDate),
        voucherType: voucher.voucherType,
        systemVoucherNo: voucher.systemVoucherNo,
        manualVoucherNo: voucher.manualVoucherNo ?? '—',
        narration: voucher.narration,
        debit,
        credit,
      },
      drillDown: { refType: 'VOUCHER', refId: voucher.id },
    };
  });

  return {
    reportId: 'RPT-A01',
    title: 'Voucher Register',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, true, 'landscape'),
  };
}

async function queryCashBankBook(
  client: PrismaClient,
  reportId: 'RPT-A02' | 'RPT-A03',
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const dateFrom = parseIsoDate(String(parameters.dateFrom ?? ''), 'dateFrom');
  const dateTo = parseIsoDate(String(parameters.dateTo ?? ''), 'dateTo');
  const bankAccountId = parameters.bankAccountId as string | undefined;
  const parametersConfig = await getSocietyParameters(client);
  const subgroupId =
    reportId === 'RPT-A02' ? parametersConfig.cashSubgroupId : parametersConfig.bankSubgroupId;

  const accountFilter = bankAccountId
    ? { id: bankAccountId }
    : subgroupId
      ? { subgroupId, isArchived: false, isActive: true }
      : { isArchived: false, isActive: true };

  const accounts = await client.accountMaster.findMany({
    where: accountFilter,
    orderBy: { particulars: 'asc' },
  });

  const columns: ReportColumnDef[] = [
    { key: 'date', label: 'Date', format: 'date' },
    { key: 'particulars', label: 'Particulars' },
    { key: 'voucherNo', label: 'Voucher No.' },
    ...(reportId === 'RPT-A03'
      ? [
          { key: 'chequeNo', label: 'Cheque No.' },
          { key: 'chequeDate', label: 'Cheque Date', format: 'date' as const },
        ]
      : []),
    { key: 'debit', label: 'Debit', align: 'right', format: 'currency' },
    { key: 'credit', label: 'Credit', align: 'right', format: 'currency' },
    { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
  ];

  const rows: ReportRow[] = [];
  for (const account of accounts) {
    const opening = await getClosingBalance(
      client,
      account.id,
      new Date(dateFrom.getTime() - 86_400_000),
    );
    let balance = opening.closingBalanceDr - opening.closingBalanceCr;

    const lines = await client.voucherLine.findMany({
      where: {
        accountMasterId: account.id,
        voucher: {
          status: VoucherStatus.POSTED,
          voucherDate: { gte: dateFrom, lte: dateTo },
        },
      },
      include: {
        voucher: { select: { id: true, systemVoucherNo: true, voucherDate: true, narration: true } },
        chequeDetail: true,
      },
      orderBy: [{ voucher: { voucherDate: 'asc' } }, { lineNo: 'asc' }],
    });

    if (accounts.length > 1) {
      rows.push({
        cells: {
          date: '',
          particulars: `— ${account.particulars} —`,
          voucherNo: '',
          debit: null,
          credit: null,
          balance,
        },
      });
    }

    for (const line of lines) {
      const debit = toNumber(line.drAmount);
      const credit = toNumber(line.crAmount);
      balance += debit - credit;
      rows.push({
        cells: {
          date: fmtDate(line.voucher.voucherDate),
          particulars: line.particulars ?? line.voucher.narration,
          voucherNo: line.voucher.systemVoucherNo,
          ...(reportId === 'RPT-A03'
            ? {
                chequeNo: line.chequeDetail?.chequeNo ?? '—',
                chequeDate: line.chequeDetail?.chequeDate
                  ? fmtDate(line.chequeDetail.chequeDate)
                  : '—',
              }
            : {}),
          debit: debit || null,
          credit: credit || null,
          balance,
        },
        drillDown: { refType: 'VOUCHER', refId: line.voucher.id },
      });
    }
  }

  return {
    reportId,
    title: reportId === 'RPT-A02' ? 'Cash Book' : 'Bank Book',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, true),
  };
}

export async function queryCashBook(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  return queryCashBankBook(client, 'RPT-A02', parameters);
}

export async function queryBankBook(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  return queryCashBankBook(client, 'RPT-A03', parameters);
}

export async function queryGeneralLedger(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const accountId = String(parameters.accountId ?? '');
  if (!accountId) throw new Error('Account is required for General Ledger report.');
  const dateFrom = parseIsoDate(String(parameters.dateFrom ?? ''), 'dateFrom');
  const dateTo = parseIsoDate(String(parameters.dateTo ?? ''), 'dateTo');

  const account = await client.accountMaster.findUniqueOrThrow({ where: { id: accountId } });
  const columns: ReportColumnDef[] = [
    { key: 'date', label: 'Date', format: 'date' },
    { key: 'particulars', label: 'Particulars' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'debit', label: 'Debit', align: 'right', format: 'currency' },
    { key: 'credit', label: 'Credit', align: 'right', format: 'currency' },
    { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
  ];

  const opening = await getClosingBalance(
    client,
    accountId,
    new Date(dateFrom.getTime() - 86_400_000),
  );
  let balance = opening.closingBalanceDr - opening.closingBalanceCr;

  const lines = await client.voucherLine.findMany({
    where: {
      accountMasterId: accountId,
      voucher: {
        status: VoucherStatus.POSTED,
        voucherDate: { gte: dateFrom, lte: dateTo },
      },
    },
    include: {
      voucher: { select: { id: true, systemVoucherNo: true, voucherDate: true, narration: true } },
    },
    orderBy: [{ voucher: { voucherDate: 'asc' } }, { lineNo: 'asc' }],
  });

  const rows: ReportRow[] = lines.map((line) => {
    const debit = toNumber(line.drAmount);
    const credit = toNumber(line.crAmount);
    balance += debit - credit;
    return {
      cells: {
        date: fmtDate(line.voucher.voucherDate),
        particulars: line.particulars ?? line.voucher.narration,
        voucherNo: line.voucher.systemVoucherNo,
        debit: debit || null,
        credit: credit || null,
        balance,
      },
      drillDown: { refType: 'VOUCHER', refId: line.voucher.id },
    };
  });

  return {
    reportId: 'RPT-A04',
    title: `General Ledger — ${account.particulars}`,
    columns,
    rows,
    metadata: await reportMeta(client, parameters, true),
  };
}

export async function queryTrialBalance(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const asOnDate = parameters.asOnDate
    ? parseIsoDate(String(parameters.asOnDate), 'asOnDate')
    : new Date();
  const fyId = (parameters.financialYearId as string) || (await getActiveFinancialYearId(client));
  const tbRows = await getTrialBalance(client, asOnDate, fyId);

  const columns: ReportColumnDef[] = [
    { key: 'shortCode', label: 'Code' },
    { key: 'particulars', label: 'Account' },
    { key: 'debitTotal', label: 'Debit', align: 'right', format: 'currency' },
    { key: 'creditTotal', label: 'Credit', align: 'right', format: 'currency' },
  ];

  const rows: ReportRow[] = tbRows.map((row) => ({
    cells: {
      shortCode: row.shortCode ?? '—',
      particulars: row.particulars,
      debitTotal: row.debitTotal || null,
      creditTotal: row.creditTotal || null,
    },
  }));

  const totals = tbRows.reduce(
    (acc, row) => ({
      debitTotal: acc.debitTotal + row.debitTotal,
      creditTotal: acc.creditTotal + row.creditTotal,
    }),
    { debitTotal: 0, creditTotal: 0 },
  );

  return {
    reportId: 'RPT-A05',
    title: 'Trial Balance',
    columns,
    rows,
    totals: { cells: totals },
    metadata: await reportMeta(client, parameters, false),
  };
}

export async function queryBalanceSheet(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const asOnDate = parameters.asOnDate
    ? parseIsoDate(String(parameters.asOnDate), 'asOnDate')
    : new Date();
  const fyId = (parameters.financialYearId as string) || (await getActiveFinancialYearId(client));
  const bsRows = await getBalanceSheet(client, asOnDate, fyId);

  const columns: ReportColumnDef[] = [
    { key: 'label', label: 'Particulars' },
    { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
  ];

  const rows: ReportRow[] = bsRows.map((row) => ({
    cells: {
      label: `${'  '.repeat(row.indent - 1)}${row.label}`,
      amount: row.amount,
      level: row.level,
    },
  }));

  return {
    reportId: 'RPT-A06',
    title: 'Balance Sheet',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

export async function queryIncomeExpenditure(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const dateFrom = parseIsoDate(String(parameters.dateFrom ?? ''), 'dateFrom');
  const dateTo = parseIsoDate(String(parameters.dateTo ?? ''), 'dateTo');
  const fyId = (parameters.financialYearId as string) || (await getActiveFinancialYearId(client));
  const { rows: ieRows, netSurplus } = await getIncomeExpenditure(
    client,
    dateFrom,
    dateTo,
    fyId,
  );

  const columns: ReportColumnDef[] = [
    { key: 'category', label: 'Category' },
    { key: 'particulars', label: 'Account' },
    { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
  ];

  const rows: ReportRow[] = ieRows.map((row) => ({
    cells: {
      category: row.category,
      particulars: row.particulars,
      amount: row.amount,
    },
  }));

  rows.push({
    cells: {
      category: 'NET',
      particulars: netSurplus >= 0 ? 'Surplus' : 'Deficit',
      amount: Math.abs(netSurplus),
    },
  });

  return {
    reportId: 'RPT-A07',
    title: 'Income & Expenditure',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

export async function queryReceiptPaymentStatement(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const dateFrom = parseIsoDate(String(parameters.dateFrom ?? ''), 'dateFrom');
  const dateTo = parseIsoDate(String(parameters.dateTo ?? ''), 'dateTo');
  const societyParams = await getSocietyParameters(client);
  if (!societyParams.cashBankGroupId) {
    throw new Error('Cash-Bank Group is not configured in Society Parameters (SP-018).');
  }
  const fyId = (parameters.financialYearId as string) || (await getActiveFinancialYearId(client));
  const rpRows = await getReceiptPaymentStatement(
    client,
    societyParams.cashBankGroupId,
    dateFrom,
    dateTo,
    fyId,
  );

  const columns: ReportColumnDef[] = [
    { key: 'particulars', label: 'Account' },
    { key: 'openingBalance', label: 'Opening', align: 'right', format: 'currency' },
    { key: 'receipts', label: 'Receipts', align: 'right', format: 'currency' },
    { key: 'payments', label: 'Payments', align: 'right', format: 'currency' },
    { key: 'closingBalance', label: 'Closing', align: 'right', format: 'currency' },
  ];

  const rows: ReportRow[] = rpRows.map((row) => ({
    cells: {
      particulars: row.particulars,
      openingBalance: row.openingBalance,
      receipts: row.receipts,
      payments: row.payments,
      closingBalance: row.closingBalance,
    },
  }));

  return {
    reportId: 'RPT-A08',
    title: 'Receipt & Payment Statement',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

export async function queryBankReconciliationStatement(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const bankAccountId = String(parameters.bankAccountId ?? '');
  const asOnDate = String(parameters.asOnDate ?? new Date().toISOString().slice(0, 10));
  if (!bankAccountId) {
    throw new Error('Bank account is required for Bank Reconciliation Statement.');
  }

  const statement = await generateBankReconciliationStatement(client, bankAccountId, asOnDate);
  const columns: ReportColumnDef[] = [
    { key: 'label', label: 'Particulars' },
    { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
  ];

  const rows: ReportRow[] = [
    {
      cells: {
        label: `Balance as per books (${statement.bankAccountName})`,
        amount: statement.closingBalancePerBooks,
      },
    },
    {
      cells: {
        label: 'Add: Uncleared deposits',
        amount: statement.addUnclearedDeposits,
      },
    },
    {
      cells: {
        label: 'Less: Uncleared withdrawals',
        amount: statement.lessUnclearedWithdrawals,
      },
    },
    {
      cells: {
        label: 'Balance as per pass book',
        amount: statement.closingBalancePerPassBook,
      },
    },
  ];

  return {
    reportId: 'RPT-A09',
    title: 'Bank Reconciliation Statement',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, false),
  };
}

export async function queryBankDepositSlip(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const bankSlipNo = String(parameters.bankSlipNo ?? '');
  if (!bankSlipNo) throw new Error('Bank Slip No. is required.');

  const societyBank = await client.addressBookEntry.findFirst({
    where: { partyType: PartyType.SOCIETY_BANK },
  });

  const lines = await client.voucherLine.findMany({
    where: {
      chequeDetail: { bankSlipNo },
      voucher: { status: VoucherStatus.POSTED },
    },
    include: {
      chequeDetail: true,
      voucher: true,
      member: { select: { memberName: true } },
    },
    orderBy: [{ voucher: { voucherDate: 'asc' } }],
  });

  const columns: ReportColumnDef[] = [
    { key: 'chequeNo', label: 'Cheque No.' },
    { key: 'chequeDate', label: 'Cheque Date', format: 'date' },
    { key: 'bankName', label: 'Bank' },
    { key: 'branchName', label: 'Branch' },
    { key: 'drawerName', label: 'Drawer' },
    { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
  ];

  let total = 0;
  const rows: ReportRow[] = lines.map((line) => {
    const amount = toNumber(line.crAmount) || toNumber(line.drAmount);
    total += amount;
    return {
      cells: {
        chequeNo: line.chequeDetail?.chequeNo ?? '—',
        chequeDate: line.chequeDetail?.chequeDate
          ? fmtDate(line.chequeDetail.chequeDate)
          : '—',
        bankName: line.chequeDetail?.bankName ?? '—',
        branchName: line.chequeDetail?.branchName ?? '—',
        drawerName: line.member?.memberName ?? line.particulars ?? '—',
        amount,
      },
      drillDown: { refType: 'VOUCHER', refId: line.voucher.id },
    };
  });

  const headerRows: ReportRow[] = societyBank
    ? [
        {
          cells: {
            chequeNo: 'Society Bank',
            chequeDate: societyBank.bankBranchName ?? '—',
            bankName: societyBank.bankAccountNo ?? '—',
            branchName: societyBank.officeAddress ?? '—',
            drawerName: '',
            amount: null,
          },
        },
      ]
    : [];

  return {
    reportId: 'RPT-A10',
    title: `Bank Deposit Slip — ${bankSlipNo}`,
    columns,
    rows: [...headerRows, ...rows],
    totals: { cells: { amount: total } },
    metadata: await reportMeta(client, parameters, true),
  };
}

export async function queryDayBook(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const date = parseIsoDate(String(parameters.date ?? ''), 'date');
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return queryVoucherRegister(client, {
    ...parameters,
    dateFrom: dayStart.toISOString().slice(0, 10),
    dateTo: dayEnd.toISOString().slice(0, 10),
  }).then((result) => ({
    ...result,
    reportId: 'RPT-A11',
    title: `Day Book — ${fmtDate(date)}`,
  }));
}

export async function queryPettyCashRegister(
  client: PrismaClient,
  parameters: Record<string, unknown>,
): Promise<ReportResultDto> {
  const dateFrom = parseIsoDate(String(parameters.dateFrom ?? ''), 'dateFrom');
  const dateTo = parseIsoDate(String(parameters.dateTo ?? ''), 'dateTo');
  const pettyCashAccountId = parameters.pettyCashAccountId as string | undefined;

  const pettyAccounts = await client.accountMaster.findMany({
    where: {
      pettyCash: true,
      isArchived: false,
      isActive: true,
      ...(pettyCashAccountId ? { id: pettyCashAccountId } : {}),
    },
    orderBy: { particulars: 'asc' },
  });

  const columns: ReportColumnDef[] = [
    { key: 'date', label: 'Date', format: 'date' },
    { key: 'account', label: 'Petty Cash Account' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'particulars', label: 'Particulars' },
    { key: 'debit', label: 'Debit', align: 'right', format: 'currency' },
    { key: 'credit', label: 'Credit', align: 'right', format: 'currency' },
    { key: 'balance', label: 'Balance', align: 'right', format: 'currency' },
  ];

  const rows: ReportRow[] = [];
  for (const account of pettyAccounts) {
    const opening = await getClosingBalance(
      client,
      account.id,
      new Date(dateFrom.getTime() - 86_400_000),
    );
    let balance = opening.closingBalanceDr - opening.closingBalanceCr;

    const lines = await client.voucherLine.findMany({
      where: {
        accountMasterId: account.id,
        voucher: {
          status: VoucherStatus.POSTED,
          voucherType: VoucherType.PETTY_CASH,
          voucherDate: { gte: dateFrom, lte: dateTo },
        },
      },
      include: {
        voucher: { select: { id: true, systemVoucherNo: true, voucherDate: true, narration: true } },
      },
      orderBy: [{ voucher: { voucherDate: 'asc' } }],
    });

    for (const line of lines) {
      const debit = toNumber(line.drAmount);
      const credit = toNumber(line.crAmount);
      balance += debit - credit;
      rows.push({
        cells: {
          date: fmtDate(line.voucher.voucherDate),
          account: account.particulars,
          voucherNo: line.voucher.systemVoucherNo,
          particulars: line.particulars ?? line.voucher.narration,
          debit: debit || null,
          credit: credit || null,
          balance,
        },
        drillDown: { refType: 'VOUCHER', refId: line.voucher.id },
      });
    }
  }

  return {
    reportId: 'RPT-A12',
    title: 'Petty Cash Register',
    columns,
    rows,
    metadata: await reportMeta(client, parameters, true),
  };
}
