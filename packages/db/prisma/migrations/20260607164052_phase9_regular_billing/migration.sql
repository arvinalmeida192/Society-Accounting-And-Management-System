-- CreateTable
CREATE TABLE "voucher_number_series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "seriesType" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "voucher_number_series_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "billType" TEXT NOT NULL DEFAULT 'REGULAR',
    "systemBillNo" TEXT NOT NULL,
    "manualBillNo" TEXT,
    "bookSr" TEXT,
    "billSerialNo" INTEGER NOT NULL,
    "billForPeriodKey" TEXT NOT NULL,
    "billForPeriodLabel" TEXT NOT NULL,
    "billDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "memberId" TEXT,
    "tenantId" TEXT,
    "billToType" TEXT NOT NULL DEFAULT 'MEMBER',
    "generalPartyName" TEXT,
    "generalReferenceNo" TEXT,
    "buildingId" TEXT,
    "wingId" TEXT,
    "unitId" TEXT,
    "areaSnapshot" DECIMAL,
    "totalCharges" DECIMAL NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL NOT NULL DEFAULT 0,
    "interestOverride" DECIMAL,
    "serviceTaxAmount" DECIMAL NOT NULL DEFAULT 0,
    "rebateAmount" DECIMAL NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL NOT NULL DEFAULT 0,
    "billAmount" DECIMAL NOT NULL DEFAULT 0,
    "principalArrears" DECIMAL NOT NULL DEFAULT 0,
    "interestArrears" DECIMAL NOT NULL DEFAULT 0,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "isManualEntry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "bills_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bills_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bill_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "lineType" TEXT NOT NULL,
    "accountMasterId" TEXT,
    "chargeName" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "srNo" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "bill_lines_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bill_interest_details" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "sourceBillId" TEXT,
    "sourceDescription" TEXT,
    "method" TEXT NOT NULL,
    "baseAmount" DECIMAL NOT NULL,
    "ratePercent" DECIMAL NOT NULL,
    "periodFrom" DATETIME NOT NULL,
    "periodTo" DATETIME NOT NULL,
    "daysOrMonths" INTEGER NOT NULL,
    "computedInterest" DECIMAL NOT NULL,
    "overriddenInterest" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "bill_interest_details_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bill_settlements" (
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
    CONSTRAINT "bill_settlements_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "voucher_number_series_financialYearId_seriesType_key" ON "voucher_number_series"("financialYearId", "seriesType");

-- CreateIndex
CREATE INDEX "bills_billDate_idx" ON "bills"("billDate");

-- CreateIndex
CREATE INDEX "bills_billForPeriodKey_idx" ON "bills"("billForPeriodKey");

-- CreateIndex
CREATE UNIQUE INDEX "bills_memberId_billForPeriodKey_billType_key" ON "bills"("memberId", "billForPeriodKey", "billType");

-- CreateIndex
CREATE UNIQUE INDEX "bill_lines_billId_srNo_key" ON "bill_lines"("billId", "srNo");
