-- CreateTable
CREATE TABLE "fixed_deposit_register" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "fdDate" DATETIME NOT NULL,
    "fdrNo" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "fdType" TEXT,
    "durationMonths" INTEGER NOT NULL,
    "interestRate" DECIMAL NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "maturityDate" DATETIME NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "fixed_deposit_register_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "property_register_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL,
    "coPartnerMemberId" TEXT,
    "coPartnerMemberName" TEXT,
    "possessionDate" DATETIME,
    "tenementNo" TEXT,
    "flatNo" TEXT NOT NULL,
    "floorNo" TEXT,
    "description" TEXT,
    "area" DECIMAL,
    "cost" DECIMAL,
    "landValue" DECIMAL,
    "constructionValue" DECIMAL,
    "annualGroundRent" DECIMAL,
    "cessationDate" DATETIME,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "property_register_entries_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "property_register_entries_coPartnerMemberId_fkey" FOREIGN KEY ("coPartnerMemberId") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sinking_fund_register_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL,
    "memberId" TEXT NOT NULL,
    "flatNo" TEXT NOT NULL,
    "flatValueExclLand" DECIMAL NOT NULL,
    "requiredContribution" DECIMAL NOT NULL,
    "receiptDate" DATETIME NOT NULL,
    "amountContributed" DECIMAL NOT NULL,
    "remark" TEXT,
    "sourceVoucherId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "sinking_fund_register_entries_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sinking_fund_register_entries_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sinking_fund_register_entries_sourceVoucherId_fkey" FOREIGN KEY ("sourceVoucherId") REFERENCES "vouchers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "iform_register" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL,
    "memberId" TEXT NOT NULL,
    "admissionDate" DATETIME,
    "admissionFeeDate" DATETIME,
    "fullName" TEXT NOT NULL,
    "unitNo" TEXT NOT NULL,
    "address" TEXT,
    "occupation" TEXT,
    "ageOnAdmission" INTEGER,
    "nomineeName" TEXT,
    "nominationDate" DATETIME,
    "cessationDate" DATETIME,
    "cessationReason" TEXT,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "iform_register_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "iform_register_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "iform_share_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iFormRegisterId" TEXT NOT NULL,
    "onDate" DATETIME,
    "cashBookFolio" TEXT,
    "applicationDetails" TEXT,
    "amountCall1" DECIMAL,
    "amountCall2" DECIMAL,
    "totalAmount" DECIMAL,
    "numberOfShares" INTEGER,
    "certificateSerialNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "iform_share_entries_iFormRegisterId_fkey" FOREIGN KEY ("iFormRegisterId") REFERENCES "iform_register" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "iform_share_transfers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iFormRegisterId" TEXT NOT NULL,
    "onDate" DATETIME,
    "cashBookFolio" TEXT,
    "unitNo" TEXT,
    "registerNo" TEXT,
    "serialNo" TEXT,
    "certificatesCount" INTEGER,
    "sharesTransferred" INTEGER,
    "balanceShares" INTEGER,
    "balanceCertificateSerial" TEXT,
    "balanceAmount" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "iform_share_transfers_iFormRegisterId_fkey" FOREIGN KEY ("iFormRegisterId") REFERENCES "iform_register" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "fixed_deposit_register_financialYearId_idx" ON "fixed_deposit_register"("financialYearId");

-- CreateIndex
CREATE INDEX "fixed_deposit_register_maturityDate_idx" ON "fixed_deposit_register"("maturityDate");

-- CreateIndex
CREATE INDEX "property_register_entries_financialYearId_idx" ON "property_register_entries"("financialYearId");

-- CreateIndex
CREATE UNIQUE INDEX "property_register_entries_financialYearId_srNo_key" ON "property_register_entries"("financialYearId", "srNo");

-- CreateIndex
CREATE INDEX "sinking_fund_register_entries_financialYearId_idx" ON "sinking_fund_register_entries"("financialYearId");

-- CreateIndex
CREATE INDEX "sinking_fund_register_entries_memberId_idx" ON "sinking_fund_register_entries"("memberId");

-- CreateIndex
CREATE INDEX "sinking_fund_register_entries_sourceVoucherId_idx" ON "sinking_fund_register_entries"("sourceVoucherId");

-- CreateIndex
CREATE UNIQUE INDEX "sinking_fund_register_entries_financialYearId_srNo_key" ON "sinking_fund_register_entries"("financialYearId", "srNo");

-- CreateIndex
CREATE UNIQUE INDEX "iform_register_memberId_key" ON "iform_register"("memberId");

-- CreateIndex
CREATE INDEX "iform_register_financialYearId_idx" ON "iform_register"("financialYearId");

-- CreateIndex
CREATE UNIQUE INDEX "iform_register_financialYearId_srNo_key" ON "iform_register"("financialYearId", "srNo");
