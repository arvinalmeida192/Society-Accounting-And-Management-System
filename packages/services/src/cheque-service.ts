import type { PrismaClient } from '@prisma/client';
import { VoucherSubType, VoucherType, type ChequePrintDto } from '@sams/shared-types';
import { toIndianRupeesWords } from './amount-in-words-service.js';
import { loadReportTemplateHtml } from './report-template-loader.js';
import { getReportFormatConfig } from './society-config-service.js';
import { cancelVoucher } from './voucher-service.js';
import { assertWritable } from './assert-writable.js';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value.toString());
}

function renderChequeHtml(data: {
  payee: string;
  amount: number;
  amountWords: string;
  chequeDate: string;
  chequeNo: string;
  bankName: string | null;
  branchName: string | null;
  signatory1: string | null;
  signatory2: string | null;
}): string {
  return `
    <div class="cheque-print-preview">
      <p class="cheque-bank">${data.bankName ?? ''}${data.branchName ? ` — ${data.branchName}` : ''}</p>
      <p class="cheque-date">Date: ${data.chequeDate}</p>
      <p class="cheque-no">Cheque No: ${data.chequeNo}</p>
      <p class="cheque-payee"><strong>Pay:</strong> ${data.payee}</p>
      <p class="cheque-amount-words"><strong>Rupees:</strong> ${data.amountWords}</p>
      <p class="cheque-amount-figures"><strong>₹</strong> ${data.amount.toFixed(2)}</p>
      <div class="cheque-signatories">
        ${data.signatory1 ? `<p>${data.signatory1}</p>` : ''}
        ${data.signatory2 ? `<p>${data.signatory2}</p>` : ''}
      </div>
    </div>
  `.trim();
}

export async function prepareChequePrintData(
  client: PrismaClient,
  voucherId: string,
): Promise<ChequePrintDto> {
  const voucher = await client.voucher.findUniqueOrThrow({
    where: { id: voucherId },
    include: {
      lines: {
        orderBy: { lineNo: 'asc' },
        include: {
          accountMaster: { select: { particulars: true } },
          chequeDetail: true,
        },
      },
    },
  });

  if (voucher.voucherType !== 'PAYMENT' || voucher.subType !== 'BANK_PAYMENT') {
    throw new Error('Cheque print is available only for bank payment vouchers.');
  }

  const bankLine =
    voucher.lines.find((line) => line.chequeDetail) ??
    voucher.lines.find((line) => toNumber(line.crAmount) > 0) ??
    voucher.lines[0];

  if (!bankLine) {
    throw new Error('Bank payment line not found on voucher.');
  }

  const payeeLine = voucher.lines.find((line) => toNumber(line.drAmount) > 0) ?? bankLine;
  const amount = Math.max(toNumber(bankLine.crAmount), toNumber(payeeLine.drAmount));
  const cheque = bankLine.chequeDetail;
  const [formats, parameters] = await Promise.all([
    getReportFormatConfig(client),
    client.societyParameters.findFirstOrThrow(),
  ]);

  const amountWords = toIndianRupeesWords(amount);

  const printData = {
    payee: payeeLine.particulars?.trim() || payeeLine.accountMaster.particulars,
    amount,
    amountWords,
    chequeDate: (cheque?.chequeDate ?? voucher.voucherDate).toISOString().slice(0, 10),
    chequeNo: cheque?.chequeNo ?? '',
    bankName: cheque?.bankName ?? bankLine.accountMaster.particulars,
    branchName: cheque?.branchName ?? null,
    signatory1: parameters.chequeSignatory1,
    signatory2: parameters.chequeSignatory2,
  };

  const fallbackHtml = renderChequeHtml(printData);
  let templateHtml = fallbackHtml;
  if (formats.chequePrintFormatId) {
    const template = await client.reportTemplate.findUnique({
      where: { id: formats.chequePrintFormatId },
    });
    templateHtml = await loadReportTemplateHtml(
      template?.htmlTemplatePath,
      {
        payee: printData.payee,
        amount: printData.amount.toFixed(2),
        amountWords: printData.amountWords,
        chequeDate: printData.chequeDate,
        chequeNo: printData.chequeNo,
        bankName: printData.bankName ?? '',
        branchName: printData.branchName ? ` — ${printData.branchName}` : '',
        signatory1: printData.signatory1 ?? '',
        signatory2: printData.signatory2 ?? '',
      },
      fallbackHtml,
    );
  }

  return {
    voucherId,
    templateId: formats.chequePrintFormatId,
    ...printData,
    templateHtml,
  };
}

export async function cancelChequeVoucher(
  client: PrismaClient,
  voucherId: string,
  cancelDate: string,
  actorId: string,
  reasonId?: string,
): Promise<{ original: Awaited<ReturnType<typeof cancelVoucher>>['original']; reversal: Awaited<ReturnType<typeof cancelVoucher>>['reversal'] }> {
  await assertWritable(client);
  const voucher = await client.voucher.findUniqueOrThrow({
    where: { id: voucherId },
    include: { lines: { include: { chequeDetail: true } } },
  });

  if (voucher.voucherType !== VoucherType.PAYMENT || voucher.subType !== VoucherSubType.BANK_PAYMENT) {
    throw new Error('Cheque cancellation applies to bank payment vouchers only.');
  }

  const hasCheque = voucher.lines.some((line) => line.chequeDetail?.chequeNo);
  if (!hasCheque) {
    throw new Error('Voucher has no cheque details to cancel.');
  }

  return cancelVoucher(client, voucherId, cancelDate, actorId, {
    reasonId,
    updateCheque: true,
  });
}
