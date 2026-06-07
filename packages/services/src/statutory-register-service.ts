import type { PrismaClient } from '@prisma/client';
import { VoucherType as PrismaVoucherType } from '@prisma/client';

type PostedReceiptVoucher = {
  id: string;
  voucherType: string;
  voucherDate: Date;
  lines: Array<{
    drAmount: { toString(): string };
    crAmount: { toString(): string };
    memberId: string | null;
    accountMasterId: string;
  }>;
};

/**
 * SF-001 stub — full SinkingFundRegisterEntry persistence is implemented in Phase 14.
 * Called after a receipt voucher is posted so statutory registers can hook in later.
 */
export async function onReceiptPosted(
  _client: PrismaClient,
  voucher: PostedReceiptVoucher,
  _actorId: string,
): Promise<void> {
  if (voucher.voucherType !== PrismaVoucherType.RECEIPT) {
    return;
  }

  const hasMemberCredit = voucher.lines.some(
    (line) => line.memberId != null && Number.parseFloat(line.crAmount.toString()) > 0,
  );
  if (!hasMemberCredit) {
    return;
  }

  // Phase 14: inspect sinking-fund charge account lines and insert SinkingFundRegisterEntry rows.
}
