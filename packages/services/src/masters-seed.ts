import type { PrismaClient } from '@prisma/client';
import { VoucherType } from '@prisma/client';

const SYSTEM_ACTOR = 'SYSTEM';

const DEFAULT_NARRATIONS: Array<{
  voucherTableType: VoucherType;
  shortCode: string;
  narrationText: string;
}> = [
  { voucherTableType: VoucherType.RECEIPT, shortCode: 'MC', narrationText: 'Maintenance charges received' },
  { voucherTableType: VoucherType.RECEIPT, shortCode: 'SF', narrationText: 'Sinking fund contribution received' },
  { voucherTableType: VoucherType.RECEIPT, shortCode: 'INT', narrationText: 'Interest on arrears received' },
  { voucherTableType: VoucherType.PAYMENT, shortCode: 'BP', narrationText: 'Bank payment' },
  { voucherTableType: VoucherType.PAYMENT, shortCode: 'PT', narrationText: 'Petty cash payment' },
  { voucherTableType: VoucherType.CONTRA, shortCode: 'CT', narrationText: 'Cash to bank transfer' },
  { voucherTableType: VoucherType.JV, shortCode: 'JV', narrationText: 'Journal adjustment' },
  { voucherTableType: VoucherType.DN, shortCode: 'DN', narrationText: 'Debit note' },
  { voucherTableType: VoucherType.CN, shortCode: 'CN', narrationText: 'Credit note' },
  { voucherTableType: VoucherType.PETTY_CASH, shortCode: 'PC', narrationText: 'Petty cash expense' },
];

const DEFAULT_CHEQUE_REASONS: Array<{
  reasonCode: string;
  reasonDescription: string;
  category: string;
}> = [
  { reasonCode: 'INSUF', reasonDescription: 'Insufficient Funds', category: 'Bank Return' },
  { reasonCode: 'SIGMM', reasonDescription: 'Signature Mismatch', category: 'Bank Return' },
  { reasonCode: 'ACCLS', reasonDescription: 'Account Closed', category: 'Bank Return' },
  { reasonCode: 'REFDR', reasonDescription: 'Refer to Drawer', category: 'Bank Return' },
  { reasonCode: 'STPAY', reasonDescription: 'Stop Payment', category: 'Stop Payment' },
  { reasonCode: 'OTHER', reasonDescription: 'Others', category: 'Other' },
];

/** SDD §30.3 — default narrations and cheque cancellation reasons */
export async function seedMiscellaneousMasters(
  client: PrismaClient,
  actorId: string = SYSTEM_ACTOR,
): Promise<void> {
  const narrationCount = await client.narrationMaster.count();
  if (narrationCount === 0) {
    for (const row of DEFAULT_NARRATIONS) {
      await client.narrationMaster.create({
        data: {
          voucherTableType: row.voucherTableType,
          shortCode: row.shortCode,
          narrationText: row.narrationText,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
  }

  const reasonCount = await client.chequeCancellationReason.count();
  if (reasonCount === 0) {
    for (const row of DEFAULT_CHEQUE_REASONS) {
      await client.chequeCancellationReason.create({
        data: {
          reasonCode: row.reasonCode,
          reasonDescription: row.reasonDescription,
          category: row.category,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }
  }
}
