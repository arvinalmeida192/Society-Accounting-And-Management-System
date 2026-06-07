-- CreateTable
CREATE TABLE "account_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "account_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "balanceSheetSr" INTEGER NOT NULL,
    "nature" TEXT NOT NULL,
    "substituteGroupName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "account_groups_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "account_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account_subgroups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "subgroupName" TEXT NOT NULL,
    "subgroupSr" INTEGER NOT NULL,
    "substituteSubgroupName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "account_subgroups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "account_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account_masters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subgroupId" TEXT NOT NULL,
    "particulars" TEXT NOT NULL,
    "openingBalanceDr" DECIMAL NOT NULL DEFAULT 0,
    "openingBalanceCr" DECIMAL NOT NULL DEFAULT 0,
    "previousYearAmount" DECIMAL NOT NULL DEFAULT 0,
    "estimateAmount" DECIMAL NOT NULL DEFAULT 0,
    "shortCode" TEXT,
    "serviceTaxApplicable" BOOLEAN NOT NULL DEFAULT false,
    "rebateApplicable" BOOLEAN NOT NULL DEFAULT false,
    "interestFree" BOOLEAN NOT NULL DEFAULT false,
    "pettyCash" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "archivedBy" TEXT,
    "memberSubsidiaryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "account_masters_subgroupId_fkey" FOREIGN KEY ("subgroupId") REFERENCES "account_subgroups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "voucherDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "vouchers_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voucher_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "accountMasterId" TEXT NOT NULL,
    "drAmount" DECIMAL NOT NULL DEFAULT 0,
    "crAmount" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "voucher_lines_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "voucher_lines_accountMasterId_fkey" FOREIGN KEY ("accountMasterId") REFERENCES "account_masters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "account_groups_categoryId_groupName_key" ON "account_groups"("categoryId", "groupName");

-- CreateIndex
CREATE UNIQUE INDEX "account_subgroups_groupId_subgroupName_key" ON "account_subgroups"("groupId", "subgroupName");

-- CreateIndex
CREATE UNIQUE INDEX "account_masters_shortCode_key" ON "account_masters"("shortCode");

-- CreateIndex
CREATE INDEX "voucher_lines_accountMasterId_idx" ON "voucher_lines"("accountMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_lines_voucherId_lineNo_key" ON "voucher_lines"("voucherId", "lineNo");
