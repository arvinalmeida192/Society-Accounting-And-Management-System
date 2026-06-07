import type { Prisma, PrismaClient } from '@prisma/client';
import { OpeningBalanceType, VoucherStatus } from '@prisma/client';
import type {
  MemberOpeningBalanceDto,
  MemberOpeningBalanceResult,
  MemberOpeningBalanceSaveDto,
} from '@sams/shared-types';
import { Money } from './money.js';

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

function mapOb(record: {
  id: string;
  memberId: string;
  balanceType: string;
  principalOB: Prisma.Decimal;
  interestOB: Prisma.Decimal;
  serviceTaxOB: Prisma.Decimal;
  ledgerVoucherId: string | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}): MemberOpeningBalanceDto {
  return {
    id: record.id,
    memberId: record.memberId,
    balanceType: record.balanceType as MemberOpeningBalanceDto['balanceType'],
    principalOB: decimalToNumber(record.principalOB),
    interestOB: decimalToNumber(record.interestOB),
    serviceTaxOB: decimalToNumber(record.serviceTaxOB),
    ledgerVoucherId: record.ledgerVoucherId,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy,
  };
}

async function computeReconciliationWarning(
  client: PrismaClient,
  memberSubgroupId: string | null | undefined,
): Promise<string | undefined> {
  if (!memberSubgroupId) return undefined;

  const memberAccounts = await client.accountMaster.findMany({
    where: {
      subgroupId: memberSubgroupId,
      memberSubsidiaryId: { not: null },
    },
    select: { openingBalanceDr: true },
  });

  const subsidiaryTotal = memberAccounts.reduce(
    (sum, account) => sum + decimalToNumber(account.openingBalanceDr),
    0,
  );

  const regularObs = await client.memberOpeningBalance.findMany({
    where: { balanceType: OpeningBalanceType.REGULAR },
    select: { principalOB: true, interestOB: true, serviceTaxOB: true },
  });

  const memberObTotal = regularObs.reduce(
    (sum, ob) =>
      sum +
      decimalToNumber(ob.principalOB) +
      decimalToNumber(ob.interestOB) +
      decimalToNumber(ob.serviceTaxOB),
    0,
  );

  const difference = Money.fromRupees(memberObTotal).subtract(Money.fromRupees(subsidiaryTotal));
  if (difference.paise === 0) return undefined;

  return `Member opening balance total (₹${memberObTotal.toFixed(2)}) differs from subsidiary ledger total (₹${subsidiaryTotal.toFixed(2)}) by ₹${Math.abs(difference.toRupees()).toFixed(2)}.`;
}

export async function saveMemberOpeningBalance(
  client: PrismaClient,
  dto: MemberOpeningBalanceSaveDto,
  financialYearId: string,
  actorId: string,
): Promise<MemberOpeningBalanceResult> {
  const principal = dto.principalOB ?? 0;
  const interest = dto.interestOB ?? 0;
  const serviceTax =
    dto.balanceType === OpeningBalanceType.REGULAR ? (dto.serviceTaxOB ?? 0) : 0;
  const total = principal + interest + serviceTax;

  if (total <= 0) {
    throw Object.assign(new Error('Opening balance total must be greater than zero.'), {
      code: 'VALIDATION_ERROR',
    });
  }

  const member = await client.member.findUniqueOrThrow({
    where: { id: dto.memberId },
    include: {
      subsidiaryLedger: true,
      unit: { select: { unitNo: true } },
    },
  });

  if (!member.subsidiaryLedger) {
    throw Object.assign(new Error('Member subsidiary ledger account is missing.'), {
      code: 'VALIDATION_ERROR',
    });
  }

  const parameters = await client.societyParameters.findFirst();
  const interestAccountId = parameters?.interestAccountId;
  const serviceTaxAccountId = parameters?.serviceTaxAccountId;

  const maintenanceAccount = await client.accountMaster.findFirst({
    where: { shortCode: 'MNCE' },
  });

  if (!maintenanceAccount) {
    throw Object.assign(new Error('Maintenance Charges account (MNCE) not found in CoA.'), {
      code: 'VALIDATION_ERROR',
    });
  }

  const fy = await client.financialYear.findUniqueOrThrow({
    where: { id: financialYearId },
    select: { startDate: true },
  });

  const existing = await client.memberOpeningBalance.findUnique({
    where: {
      memberId_balanceType: {
        memberId: dto.memberId,
        balanceType: dto.balanceType,
      },
    },
  });

  if (existing?.ledgerVoucherId) {
    throw Object.assign(
      new Error('Opening balance already posted for this partition. Edit is not supported.'),
      { code: 'VALIDATION_ERROR' },
    );
  }

  const reconciliationWarning = await computeReconciliationWarning(
    client,
    parameters?.memberSubgroupId,
  );

  if (reconciliationWarning && !dto.acknowledgeReconciliation) {
    return {
      ob: existing
        ? mapOb(existing)
        : {
            id: '',
            memberId: dto.memberId,
            balanceType: dto.balanceType,
            principalOB: principal,
            interestOB: interest,
            serviceTaxOB: serviceTax,
            ledgerVoucherId: null,
            createdAt: new Date().toISOString(),
            createdBy: actorId,
            updatedAt: new Date().toISOString(),
            updatedBy: actorId,
          },
      ledgerVoucherId: null,
      reconciliationWarning,
    };
  }

  const result = await client.$transaction(async (tx) => {
    const voucher = await tx.voucher.create({
      data: {
        financialYearId,
        voucherDate: fy.startDate,
        status: VoucherStatus.POSTED,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    const lines: Array<{
      lineNo: number;
      accountMasterId: string;
      memberId?: string;
      drAmount: number;
      crAmount: number;
      particulars: string;
    }> = [];

    lines.push({
      lineNo: 1,
      accountMasterId: member.subsidiaryLedger!.id,
      memberId: member.id,
      drAmount: total,
      crAmount: 0,
      particulars: `Opening balance — ${member.memberName} (${member.unit.unitNo})`,
    });

    let lineNo = 2;
    if (principal > 0) {
      lines.push({
        lineNo: lineNo++,
        accountMasterId: maintenanceAccount.id,
        drAmount: 0,
        crAmount: principal,
        particulars: 'Principal opening balance',
      });
    }
    if (interest > 0 && interestAccountId) {
      lines.push({
        lineNo: lineNo++,
        accountMasterId: interestAccountId,
        drAmount: 0,
        crAmount: interest,
        particulars: 'Interest opening balance',
      });
    }
    if (serviceTax > 0 && serviceTaxAccountId) {
      lines.push({
        lineNo: lineNo++,
        accountMasterId: serviceTaxAccountId,
        drAmount: 0,
        crAmount: serviceTax,
        particulars: 'Service tax opening balance',
      });
    }

    const totalDr = lines.reduce((sum, line) => sum + line.drAmount, 0);
    const totalCr = lines.reduce((sum, line) => sum + line.crAmount, 0);
    if (Math.abs(totalDr - totalCr) > 0.005) {
      throw Object.assign(new Error('Opening balance voucher is not balanced.'), {
        code: 'ACCOUNTING_IMBALANCE',
      });
    }

    for (const line of lines) {
      await tx.voucherLine.create({
        data: {
          voucherId: voucher.id,
          lineNo: line.lineNo,
          accountMasterId: line.accountMasterId,
          memberId: line.memberId,
          drAmount: line.drAmount,
          crAmount: line.crAmount,
          particulars: line.particulars,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }

    await tx.accountMaster.update({
      where: { id: member.subsidiaryLedger!.id },
      data: {
        openingBalanceDr: total,
        updatedBy: actorId,
      },
    });

    const ob = await tx.memberOpeningBalance.upsert({
      where: {
        memberId_balanceType: {
          memberId: dto.memberId,
          balanceType: dto.balanceType,
        },
      },
      create: {
        memberId: dto.memberId,
        balanceType: dto.balanceType,
        principalOB: principal,
        interestOB: interest,
        serviceTaxOB: serviceTax,
        ledgerVoucherId: voucher.id,
        createdBy: actorId,
        updatedBy: actorId,
      },
      update: {
        principalOB: principal,
        interestOB: interest,
        serviceTaxOB: serviceTax,
        ledgerVoucherId: voucher.id,
        updatedBy: actorId,
      },
    });

    return { ob, voucherId: voucher.id };
  });

  return {
    ob: mapOb(result.ob),
    ledgerVoucherId: result.voucherId,
    reconciliationWarning,
  };
}
