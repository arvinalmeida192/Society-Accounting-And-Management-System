-- CreateTable
CREATE TABLE "tds_challans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "bsrCode" TEXT,
    "bankName" TEXT,
    "branchName" TEXT,
    "challanNo" TEXT,
    "challanDate" DATETIME,
    "chequeNo" TEXT,
    "chequeDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "tds_challans_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tds_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "voucherLineId" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "natureOfPayment" TEXT,
    "partyAccountId" TEXT,
    "partyName" TEXT NOT NULL,
    "billNo" TEXT,
    "billDate" DATETIME,
    "billAmount" DECIMAL NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL NOT NULL DEFAULT 0,
    "tdsRate" DECIMAL NOT NULL DEFAULT 0,
    "tdsAmount" DECIMAL NOT NULL DEFAULT 0,
    "surchargeRate" DECIMAL NOT NULL DEFAULT 0,
    "surchargeAmount" DECIMAL NOT NULL DEFAULT 0,
    "educationCessRate" DECIMAL NOT NULL DEFAULT 0,
    "educationCessAmount" DECIMAL NOT NULL DEFAULT 0,
    "totalRate" DECIMAL NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "challanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "tds_records_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tds_records_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tds_records_voucherLineId_fkey" FOREIGN KEY ("voucherLineId") REFERENCES "voucher_lines" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tds_records_partyAccountId_fkey" FOREIGN KEY ("partyAccountId") REFERENCES "account_masters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tds_records_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "tds_challans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "tds_challans_financialYearId_idx" ON "tds_challans"("financialYearId");

-- CreateIndex
CREATE UNIQUE INDEX "tds_records_voucherLineId_key" ON "tds_records"("voucherLineId");

-- CreateIndex
CREATE INDEX "tds_records_financialYearId_idx" ON "tds_records"("financialYearId");

-- CreateIndex
CREATE INDEX "tds_records_voucherId_idx" ON "tds_records"("voucherId");

-- CreateIndex
CREATE INDEX "tds_records_partyAccountId_idx" ON "tds_records"("partyAccountId");

-- CreateIndex
CREATE INDEX "tds_records_challanId_idx" ON "tds_records"("challanId");
