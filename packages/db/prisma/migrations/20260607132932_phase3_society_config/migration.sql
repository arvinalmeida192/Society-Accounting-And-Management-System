-- CreateTable
CREATE TABLE "society_parameters" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "societyIdentityId" TEXT NOT NULL,
    "billFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "billFrequencyChangedAt" DATETIME,
    "suppressZeroTariffs" BOOLEAN NOT NULL DEFAULT true,
    "mergeParkingOnBill" BOOLEAN NOT NULL DEFAULT false,
    "tariffDecimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "regularInterestPattern" TEXT NOT NULL DEFAULT 'NONE',
    "regularSimpleSubType" TEXT NOT NULL DEFAULT 'DELAY_DAYS',
    "regularInterestRate" DECIMAL NOT NULL DEFAULT 0,
    "regularInterestRoundToRupee" BOOLEAN NOT NULL DEFAULT false,
    "regularAllowManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "supplementaryInterestPattern" TEXT NOT NULL DEFAULT 'NONE',
    "supplementarySimpleSubType" TEXT NOT NULL DEFAULT 'DELAY_DAYS',
    "supplementaryInterestRate" DECIMAL NOT NULL DEFAULT 0,
    "supplementaryInterestRoundToRupee" BOOLEAN NOT NULL DEFAULT false,
    "supplementaryAllowManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "tariffStructureBasis" TEXT NOT NULL DEFAULT '["UNIT","BUILDING"]',
    "tariffMethod" TEXT NOT NULL DEFAULT 'SIMPLE',
    "shareCapitalGroupId" TEXT,
    "shareCapitalSubgroupId" TEXT,
    "bankSubgroupId" TEXT,
    "cashSubgroupId" TEXT,
    "memberSubgroupId" TEXT,
    "tenantSubgroupId" TEXT,
    "incomeExpenseSubgroupId" TEXT,
    "interestAccountId" TEXT,
    "adjustmentAccountId" TEXT,
    "nonOccupancyAccountId" TEXT,
    "serviceTaxAccountId" TEXT,
    "educationCessAccountId" TEXT,
    "nonOccupancyChargePercent" DECIMAL NOT NULL DEFAULT 10,
    "rebateType" TEXT NOT NULL DEFAULT 'PERCENT',
    "rebateValue" DECIMAL NOT NULL DEFAULT 0,
    "serviceTaxPercent" DECIMAL NOT NULL DEFAULT 0,
    "educationCessPercent" DECIMAL NOT NULL DEFAULT 0,
    "gstPercent" DECIMAL NOT NULL DEFAULT 0,
    "billNumberingMode" TEXT NOT NULL DEFAULT 'AUTO_SERIAL',
    "bulkBillStartingNumber" INTEGER NOT NULL DEFAULT 1,
    "dualTypeUnitSupport" BOOLEAN NOT NULL DEFAULT true,
    "cashBankGroupId" TEXT,
    "authorizedSignatory1" TEXT,
    "authorizedSignatory2" TEXT,
    "authorizedSignatory3" TEXT,
    "chequeSignatory1" TEXT,
    "chequeSignatory2" TEXT,
    "colourCodedGrids" BOOLEAN NOT NULL DEFAULT false,
    "dueDateOffsetDays" INTEGER NOT NULL DEFAULT 15,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "society_parameters_societyIdentityId_fkey" FOREIGN KEY ("societyIdentityId") REFERENCES "society_identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "property_information" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "societyIdentityId" TEXT NOT NULL,
    "municipalHouseNo" TEXT,
    "surveySubDivisionNo" TEXT,
    "landType" TEXT,
    "annualLeaseRent" DECIMAL,
    "totalPlotAreaSqFt" DECIMAL,
    "constructedAreaSqFt" DECIMAL,
    "totalFlats" INTEGER,
    "landCost" DECIMAL,
    "annualNonAgriAssessment" DECIMAL,
    "buildingParticulars" TEXT,
    "completionCertificateDetails" TEXT,
    "occupationCertificateDetails" TEXT,
    "occupationDate" DATETIME,
    "municipalAssessmentYear" TEXT,
    "totalRateableValue" DECIMAL,
    "dateOfConveyance" DATETIME,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "property_information_societyIdentityId_fkey" FOREIGN KEY ("societyIdentityId") REFERENCES "society_identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportType" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "htmlTemplatePath" TEXT NOT NULL,
    "cssPath" TEXT,
    "thumbnailPath" TEXT,
    "pageSize" TEXT NOT NULL DEFAULT 'A4',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "report_format_config" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "societyIdentityId" TEXT NOT NULL,
    "billFormatId" TEXT,
    "supplementaryBillFormatId" TEXT,
    "receiptFormatId" TEXT,
    "generalReceiptFormatId" TEXT,
    "chequePrintFormatId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "report_format_config_societyIdentityId_fkey" FOREIGN KEY ("societyIdentityId") REFERENCES "society_identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "billing_period_calendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStartDate" DATETIME NOT NULL,
    "periodEndDate" DATETIME NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "billing_period_calendar_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "society_parameters_societyIdentityId_key" ON "society_parameters"("societyIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "property_information_societyIdentityId_key" ON "property_information"("societyIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "report_templates_templateCode_key" ON "report_templates"("templateCode");

-- CreateIndex
CREATE UNIQUE INDEX "report_format_config_societyIdentityId_key" ON "report_format_config"("societyIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_period_calendar_financialYearId_periodKey_key" ON "billing_period_calendar"("financialYearId", "periodKey");
