import type { PrismaClient } from '@prisma/client';
import { BillToType, OpeningBalanceType } from '@sams/shared-types';

export interface ArrearsResult {
  principalArrears: number;
  interestArrears: number;
}

export async function computeArrears(
  client: PrismaClient,
  memberId: string,
  billType: 'REGULAR' | 'SUPPLEMENTARY',
  asOfDate: Date,
): Promise<ArrearsResult> {
  const balanceType =
    billType === 'REGULAR' ? OpeningBalanceType.REGULAR : OpeningBalanceType.SUPPLEMENTARY;

  const ob = await client.memberOpeningBalance.findUnique({
    where: { memberId_balanceType: { memberId, balanceType } },
  });

  let principalArrears = ob ? Number(ob.principalOB) : 0;
  let interestArrears = ob ? Number(ob.interestOB) : 0;

  const priorBills = await client.bill.findMany({
    where: {
      memberId,
      billType,
      status: 'POSTED',
      billDate: { lt: asOfDate },
    },
    include: { settlements: true },
  });

  for (const bill of priorBills) {
    const settledPrincipal = bill.settlements.reduce(
      (sum, row) => sum + Number(row.principalAllocated),
      0,
    );
    const settledInterest = bill.settlements.reduce(
      (sum, row) => sum + Number(row.interestAllocated),
      0,
    );

    const billPrincipal = Number(bill.totalCharges) + Number(bill.adjustmentAmount);
    const billInterest = Number(bill.interestAmount);

    principalArrears += Math.max(0, billPrincipal - settledPrincipal);
    interestArrears += Math.max(0, billInterest - settledInterest);
  }

  return { principalArrears, interestArrears };
}

function sumBillArrears(
  priorBills: Array<{
    totalCharges: { toString(): string };
    adjustmentAmount: { toString(): string };
    interestAmount: { toString(): string };
    settlements: Array<{
      principalAllocated: { toString(): string };
      interestAllocated: { toString(): string };
    }>;
  }>,
): ArrearsResult {
  let principalArrears = 0;
  let interestArrears = 0;

  for (const bill of priorBills) {
    const settledPrincipal = bill.settlements.reduce(
      (sum, row) => sum + Number(row.principalAllocated),
      0,
    );
    const settledInterest = bill.settlements.reduce(
      (sum, row) => sum + Number(row.interestAllocated),
      0,
    );

    const billPrincipal = Number(bill.totalCharges) + Number(bill.adjustmentAmount);
    const billInterest = Number(bill.interestAmount);

    principalArrears += Math.max(0, billPrincipal - settledPrincipal);
    interestArrears += Math.max(0, billInterest - settledInterest);
  }

  return { principalArrears, interestArrears };
}

export async function computeSupplementaryArrears(
  client: PrismaClient,
  context: {
    billToType: BillToType;
    memberId?: string;
    tenantId?: string;
    generalReferenceNo?: string;
  },
  asOfDate: Date,
): Promise<ArrearsResult> {
  if (context.billToType === BillToType.MEMBER && context.memberId) {
    return computeArrears(client, context.memberId, 'SUPPLEMENTARY', asOfDate);
  }

  const priorBills = await client.bill.findMany({
    where: {
      billType: 'SUPPLEMENTARY',
      status: 'POSTED',
      billDate: { lt: asOfDate },
      ...(context.billToType === BillToType.TENANT && context.tenantId
        ? { billToType: BillToType.TENANT, tenantId: context.tenantId }
        : {}),
      ...(context.billToType === BillToType.GENERAL && context.generalReferenceNo
        ? {
            billToType: BillToType.GENERAL,
            generalReferenceNo: context.generalReferenceNo,
          }
        : {}),
    },
    include: { settlements: true },
  });

  return sumBillArrears(priorBills);
}
