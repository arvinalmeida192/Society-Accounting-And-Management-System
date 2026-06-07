-- CreateTable
CREATE TABLE "tariff_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "scopeLevel" TEXT NOT NULL,
    "scopeRefId" TEXT,
    "isAdvanceMethod" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "tariff_definitions_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tariff_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tariffDefinitionId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL,
    "accountMasterId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "tariffType" TEXT NOT NULL DEFAULT 'BOTH',
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "tariff_lines_tariffDefinitionId_fkey" FOREIGN KEY ("tariffDefinitionId") REFERENCES "tariff_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tariff_lines_accountMasterId_fkey" FOREIGN KEY ("accountMasterId") REFERENCES "account_masters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tariff_settlement_sequences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "tariff_settlement_sequences_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tariff_settlement_sequence_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sequenceId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL,
    "accountMasterId" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "tariff_settlement_sequence_lines_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "tariff_settlement_sequences" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tariff_settlement_sequence_lines_accountMasterId_fkey" FOREIGN KEY ("accountMasterId") REFERENCES "account_masters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tariff_bill_register_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL,
    "accountMasterId" TEXT NOT NULL,
    "displayMode" TEXT NOT NULL DEFAULT 'SHORT_CODE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "tariff_bill_register_mappings_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tariff_bill_register_mappings_accountMasterId_fkey" FOREIGN KEY ("accountMasterId") REFERENCES "account_masters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "tariff_definitions_scopeLevel_scopeRefId_idx" ON "tariff_definitions"("scopeLevel", "scopeRefId");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_definitions_financialYearId_scopeLevel_scopeRefId_effectiveDate_key" ON "tariff_definitions"("financialYearId", "scopeLevel", "scopeRefId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_lines_tariffDefinitionId_srNo_key" ON "tariff_lines"("tariffDefinitionId", "srNo");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_settlement_sequences_financialYearId_effectiveDate_key" ON "tariff_settlement_sequences"("financialYearId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_settlement_sequence_lines_sequenceId_srNo_key" ON "tariff_settlement_sequence_lines"("sequenceId", "srNo");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_bill_register_mappings_financialYearId_srNo_key" ON "tariff_bill_register_mappings"("financialYearId", "srNo");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_bill_register_mappings_financialYearId_accountMasterId_key" ON "tariff_bill_register_mappings"("financialYearId", "accountMasterId");
