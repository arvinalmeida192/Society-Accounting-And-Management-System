/*
  Warnings:

  - Added the required column `systemVoucherNo` to the `vouchers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "voucher_lines" ADD COLUMN "bankAccountId" TEXT;

-- CreateTable
CREATE TABLE "general_bill_settlements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "supplementaryBillId" TEXT NOT NULL,
    "amountAllocated" DECIMAL NOT NULL DEFAULT 0,
    "settlementDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "general_bill_settlements_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "general_bill_settlements_supplementaryBillId_fkey" FOREIGN KEY ("supplementaryBillId") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bill_settlements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "voucherId" TEXT,
    "settlementDate" DATETIME NOT NULL,
    "principalAllocated" DECIMAL NOT NULL DEFAULT 0,
    "interestAllocated" DECIMAL NOT NULL DEFAULT 0,
    "serviceTaxAllocated" DECIMAL NOT NULL DEFAULT 0,
    "chargeHeadBreakdown" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "bill_settlements_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bill_settlements_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_bill_settlements" ("billId", "chargeHeadBreakdown", "createdAt", "createdBy", "id", "interestAllocated", "principalAllocated", "serviceTaxAllocated", "settlementDate", "updatedAt", "updatedBy", "voucherId") SELECT "billId", "chargeHeadBreakdown", "createdAt", "createdBy", "id", "interestAllocated", "principalAllocated", "serviceTaxAllocated", "settlementDate", "updatedAt", "updatedBy", "voucherId" FROM "bill_settlements";
DROP TABLE "bill_settlements";
ALTER TABLE "new_bill_settlements" RENAME TO "bill_settlements";
CREATE INDEX "bill_settlements_voucherId_idx" ON "bill_settlements"("voucherId");
CREATE TABLE "new_cheque_details" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherLineId" TEXT NOT NULL,
    "chequeNo" TEXT NOT NULL,
    "chequeDate" DATETIME NOT NULL,
    "isPostDated" BOOLEAN NOT NULL DEFAULT false,
    "bankSlipNo" TEXT,
    "micrCode" TEXT,
    "chequeType" TEXT,
    "bankName" TEXT,
    "branchName" TEXT,
    "drawerName" TEXT,
    "bankMasterId" TEXT,
    "clearedOnDate" DATETIME,
    "cancelledOn" DATETIME,
    "cancellationReasonId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "cheque_details_voucherLineId_fkey" FOREIGN KEY ("voucherLineId") REFERENCES "voucher_lines" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cheque_details_cancellationReasonId_fkey" FOREIGN KEY ("cancellationReasonId") REFERENCES "cheque_cancellation_reasons" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_cheque_details" ("bankName", "branchName", "cancellationReasonId", "cancelledOn", "chequeDate", "chequeNo", "clearedOnDate", "createdAt", "createdBy", "drawerName", "id", "micrCode", "updatedAt", "updatedBy", "voucherLineId") SELECT "bankName", "branchName", "cancellationReasonId", "cancelledOn", "chequeDate", "chequeNo", "clearedOnDate", "createdAt", "createdBy", "drawerName", "id", "micrCode", "updatedAt", "updatedBy", "voucherLineId" FROM "cheque_details";
DROP TABLE "cheque_details";
ALTER TABLE "new_cheque_details" RENAME TO "cheque_details";
CREATE UNIQUE INDEX "cheque_details_voucherLineId_key" ON "cheque_details"("voucherLineId");
CREATE INDEX "cheque_details_cancellationReasonId_idx" ON "cheque_details"("cancellationReasonId");
CREATE INDEX "cheque_details_bankSlipNo_idx" ON "cheque_details"("bankSlipNo");
CREATE TABLE "new_vouchers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "voucherType" TEXT NOT NULL DEFAULT 'JV',
    "subType" TEXT,
    "systemVoucherNo" TEXT NOT NULL,
    "manualVoucherNo" TEXT,
    "voucherDate" DATETIME NOT NULL,
    "narration" TEXT NOT NULL DEFAULT '',
    "narrationMasterId" TEXT,
    "reconciliationAudited" BOOLEAN NOT NULL DEFAULT false,
    "recordAudited" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "reversalOfVoucherId" TEXT,
    "reversedByVoucherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "vouchers_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_vouchers" ("createdAt", "createdBy", "financialYearId", "id", "status", "updatedAt", "updatedBy", "voucherDate", "systemVoucherNo", "voucherType", "narration") SELECT "createdAt", "createdBy", "financialYearId", "id", "status", "updatedAt", "updatedBy", "voucherDate", ('OB-' || substr("id", 1, 12)), 'JV', 'Opening balance journal' FROM "vouchers";
DROP TABLE "vouchers";
ALTER TABLE "new_vouchers" RENAME TO "vouchers";
CREATE INDEX "vouchers_voucherDate_idx" ON "vouchers"("voucherDate");
CREATE INDEX "vouchers_voucherType_idx" ON "vouchers"("voucherType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "general_bill_settlements_voucherId_idx" ON "general_bill_settlements"("voucherId");

-- CreateIndex
CREATE INDEX "general_bill_settlements_supplementaryBillId_idx" ON "general_bill_settlements"("supplementaryBillId");
