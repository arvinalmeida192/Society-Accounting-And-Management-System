import type { PrismaClient } from '@prisma/client';
import {
  ErrorCodes,
  VoucherType,
  type AdjustmentVoucherDto,
  type PartialWaiverInputDto,
  type PartialWaiverPreviewDto,
  type PartialWaiverResultDto,
  type VoucherDetailDto,
} from '@sams/shared-types';
import { parseIsoDate } from './financial-year.js';
import { allocateToBill } from './settlement-service.js';
import { cancelVoucher, postVoucher, validateVoucherBalance } from './voucher-service.js';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

function assertAdjustmentType(voucherType: VoucherType): void {
  if (![VoucherType.JV, VoucherType.DN, VoucherType.CN].includes(voucherType)) {
    throw new Error('Adjustment vouchers must be JV, DN, or CN.');
  }
}

async function loadEffectiveSequenceLines(client: PrismaClient, asOfDate: Date) {
  const sequence = await client.tariffSettlementSequence.findFirst({
    where: { effectiveDate: { lte: asOfDate } },
    orderBy: { effectiveDate: 'desc' },
    include: {
      lines: {
        orderBy: { srNo: 'asc' },
        include: { accountMaster: { select: { shortCode: true } } },
      },
    },
  });

  return sequence?.lines.map((line) => ({
    accountMasterId: line.accountMasterId,
    accountShortCode: line.accountMaster.shortCode,
  }));
}

type BillRecord = {
  id: string;
  systemBillNo: string;
  memberId: string | null;
  billAmount: { toString(): string };
  totalCharges: { toString(): string };
  interestAmount: { toString(): string };
  serviceTaxAmount: { toString(): string };
  adjustmentAmount: { toString(): string };
  settlements: Array<{
    principalAllocated: { toString(): string };
    interestAllocated: { toString(): string };
    serviceTaxAllocated: { toString(): string };
  }>;
};

function getOutstanding(bill: BillRecord): number {
  const settled = bill.settlements.reduce(
    (sum, row) =>
      sum +
      toNumber(row.principalAllocated) +
      toNumber(row.interestAllocated) +
      toNumber(row.serviceTaxAllocated),
    0,
  );
  return Math.max(0, toNumber(bill.billAmount) - settled);
}

export async function postAdjustmentVoucher(
  client: PrismaClient,
  dto: AdjustmentVoucherDto,
  actorId: string,
): Promise<VoucherDetailDto> {
  assertAdjustmentType(dto.voucherType);
  const balance = validateVoucherBalance(dto.lines);
  if (!balance.balanced) {
    throw Object.assign(new Error('Adjustment voucher is not balanced. ΣDr must equal ΣCr.'), {
      code: ErrorCodes.ACCOUNTING_IMBALANCE,
    });
  }

  return postVoucher(client, dto, actorId);
}

export async function previewPartialWaiver(
  client: PrismaClient,
  input: Pick<PartialWaiverInputDto, 'billId' | 'waiverAmount' | 'voucherDate'>,
): Promise<PartialWaiverPreviewDto> {
  const bill = await client.bill.findFirstOrThrow({
    where: { id: input.billId, status: 'POSTED' },
    include: { settlements: true, member: { include: { subsidiaryLedger: true } } },
  });

  if (!bill.memberId || !bill.member?.subsidiaryLedger) {
    throw new Error('Partial waiver requires a member bill with a subsidiary ledger.');
  }

  const outstanding = getOutstanding(bill);
  if (outstanding <= 0) {
    throw new Error('Bill has no outstanding balance.');
  }

  const waiverAmount = Math.min(input.waiverAmount, outstanding);
  const effectiveDate = parseIsoDate(input.voucherDate, 'voucherDate');
  const sequenceLines = await loadEffectiveSequenceLines(client, effectiveDate);
  const breakdown = allocateToBill(bill, waiverAmount, sequenceLines);
  const waiverRatio = outstanding > 0 ? waiverAmount / outstanding : 0;

  const parameters = await client.societyParameters.findFirstOrThrow();
  if (!parameters.adjustmentAccountId) {
    throw new Error('Adjustment account is not configured in Society Parameters.');
  }

  const adjustmentAccount = await client.accountMaster.findUniqueOrThrow({
    where: { id: parameters.adjustmentAccountId },
  });

  return {
    billId: bill.id,
    systemBillNo: bill.systemBillNo,
    memberId: bill.memberId,
    memberName: bill.member.memberName,
    outstanding,
    waiverAmount,
    waiverRatio,
    principalWaiver: breakdown.principalAllocated,
    interestWaiver: breakdown.interestAllocated,
    serviceTaxWaiver: breakdown.serviceTaxAllocated,
    proposedLines: [
      {
        lineNo: 1,
        accountMasterId: parameters.adjustmentAccountId,
        accountParticulars: adjustmentAccount.particulars,
        drAmount: breakdown.allocated,
        crAmount: 0,
        particulars: `Partial waiver — ${bill.systemBillNo}`,
      },
      {
        lineNo: 2,
        accountMasterId: bill.member.subsidiaryLedger.id,
        memberId: bill.memberId,
        accountParticulars: bill.member.subsidiaryLedger.particulars,
        drAmount: 0,
        crAmount: breakdown.allocated,
        particulars: `Partial waiver — ${bill.member.memberName}`,
      },
    ],
  };
}

export async function postPartialWaiver(
  client: PrismaClient,
  input: PartialWaiverInputDto,
  actorId: string,
): Promise<PartialWaiverResultDto> {
  const preview = await previewPartialWaiver(client, input);
  const voucherType = input.voucherType ?? VoucherType.JV;
  assertAdjustmentType(voucherType);

  const voucher = await postVoucher(
    client,
    {
      voucherType,
      voucherDate: input.voucherDate,
      narration: input.narration ?? `Partial waiver for ${preview.systemBillNo}`,
      lines: preview.proposedLines.map((line) => ({
        lineNo: line.lineNo,
        accountMasterId: line.accountMasterId,
        memberId: line.memberId,
        drAmount: line.drAmount,
        crAmount: line.crAmount,
        particulars: line.particulars,
      })),
      regularSettlement: {
        memberId: preview.memberId,
        amount: preview.waiverAmount,
        autoFifo: false,
        billIds: [preview.billId],
      },
    },
    actorId,
  );

  return { voucher, allocations: preview };
}

export async function cancelAdjustmentVoucher(
  client: PrismaClient,
  voucherId: string,
  cancelDate: string,
  actorId: string,
): Promise<{ original: VoucherDetailDto; reversal: VoucherDetailDto }> {
  const voucher = await client.voucher.findUniqueOrThrow({ where: { id: voucherId } });
  assertAdjustmentType(voucher.voucherType as VoucherType);
  return cancelVoucher(client, voucherId, cancelDate, actorId);
}
