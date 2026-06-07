-- CreateTable
CREATE TABLE "bank_masters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "address" TEXT,
    "telephone" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "url" TEXT,
    "contactPerson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "bank_micr_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankMasterId" TEXT NOT NULL,
    "micrCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "bank_micr_codes_bankMasterId_fkey" FOREIGN KEY ("bankMasterId") REFERENCES "bank_masters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "narration_masters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherTableType" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "narrationText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "address_book_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountMasterId" TEXT NOT NULL,
    "partyType" TEXT NOT NULL,
    "officeAddress" TEXT,
    "otherAddress" TEXT,
    "bankBranchName" TEXT,
    "bankAccountNo" TEXT,
    "pan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "address_book_entries_accountMasterId_fkey" FOREIGN KEY ("accountMasterId") REFERENCES "account_masters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cheque_cancellation_reasons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reasonCode" TEXT NOT NULL,
    "reasonDescription" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "contractor_details" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractorName" TEXT NOT NULL,
    "contractType" TEXT,
    "contractDate" DATETIME,
    "buildingName" TEXT,
    "address" TEXT,
    "telephone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "cheque_details" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherLineId" TEXT NOT NULL,
    "chequeNo" TEXT NOT NULL,
    "chequeDate" DATETIME NOT NULL,
    "bankName" TEXT,
    "branchName" TEXT,
    "drawerName" TEXT,
    "micrCode" TEXT,
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

-- CreateIndex
CREATE UNIQUE INDEX "bank_masters_bankName_branchName_key" ON "bank_masters"("bankName", "branchName");

-- CreateIndex
CREATE UNIQUE INDEX "bank_micr_codes_micrCode_key" ON "bank_micr_codes"("micrCode");

-- CreateIndex
CREATE UNIQUE INDEX "narration_masters_voucherTableType_shortCode_key" ON "narration_masters"("voucherTableType", "shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "address_book_entries_accountMasterId_key" ON "address_book_entries"("accountMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "cheque_cancellation_reasons_reasonCode_key" ON "cheque_cancellation_reasons"("reasonCode");

-- CreateIndex
CREATE UNIQUE INDEX "cheque_details_voucherLineId_key" ON "cheque_details"("voucherLineId");

-- CreateIndex
CREATE INDEX "cheque_details_cancellationReasonId_idx" ON "cheque_details"("cancellationReasonId");
