-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "numberOfFloors" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "buildings_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "wings_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "unit_areas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaSqFt" DECIMAL NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "unit_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "typeName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "unit_compositions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "compositionName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "floor_masters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "srNo" INTEGER NOT NULL,
    "floorName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "wingId" TEXT NOT NULL,
    "unitNo" TEXT NOT NULL,
    "floorMasterId" TEXT,
    "unitTypeId" TEXT,
    "unitCompositionId" TEXT,
    "unitAreaId" TEXT,
    "carpetAreaSqFt" DECIMAL,
    "residentialAreaSqFt" DECIMAL,
    "commercialAreaSqFt" DECIMAL,
    "residentialRateableValue" DECIMAL,
    "commercialRateableValue" DECIMAL,
    "serialNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VACANT',
    "constructionValue" DECIMAL,
    "landValue" DECIMAL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "units_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "units_wingId_fkey" FOREIGN KEY ("wingId") REFERENCES "wings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "units_floorMasterId_fkey" FOREIGN KEY ("floorMasterId") REFERENCES "floor_masters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "units_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "unit_types" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "units_unitCompositionId_fkey" FOREIGN KEY ("unitCompositionId") REFERENCES "unit_compositions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "units_unitAreaId_fkey" FOREIGN KEY ("unitAreaId") REFERENCES "unit_areas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parking_tariff_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "typeName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "parking_tariff_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parkingTariffTypeId" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "monthlyRate" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "parking_tariff_rates_parkingTariffTypeId_fkey" FOREIGN KEY ("parkingTariffTypeId") REFERENCES "parking_tariff_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parking_spaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parkingNo" TEXT NOT NULL,
    "parkingTariffTypeId" TEXT NOT NULL,
    "chargeAccountId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "parking_spaces_parkingTariffTypeId_fkey" FOREIGN KEY ("parkingTariffTypeId") REFERENCES "parking_tariff_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "parking_spaces_chargeAccountId_fkey" FOREIGN KEY ("chargeAccountId") REFERENCES "account_masters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "member_parking_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "parkingSpaceId" TEXT NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "disposeDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "member_parking_assignments_parkingSpaceId_fkey" FOREIGN KEY ("parkingSpaceId") REFERENCES "parking_spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "buildings_shortName_key" ON "buildings"("shortName");

-- CreateIndex
CREATE UNIQUE INDEX "wings_buildingId_shortName_key" ON "wings"("buildingId", "shortName");

-- CreateIndex
CREATE UNIQUE INDEX "unit_types_typeName_key" ON "unit_types"("typeName");

-- CreateIndex
CREATE UNIQUE INDEX "unit_compositions_compositionName_key" ON "unit_compositions"("compositionName");

-- CreateIndex
CREATE UNIQUE INDEX "floor_masters_srNo_key" ON "floor_masters"("srNo");

-- CreateIndex
CREATE INDEX "units_serialNo_idx" ON "units"("serialNo");

-- CreateIndex
CREATE UNIQUE INDEX "units_buildingId_wingId_unitNo_key" ON "units"("buildingId", "wingId", "unitNo");

-- CreateIndex
CREATE UNIQUE INDEX "parking_tariff_types_typeName_key" ON "parking_tariff_types"("typeName");

-- CreateIndex
CREATE UNIQUE INDEX "parking_tariff_rates_parkingTariffTypeId_effectiveDate_key" ON "parking_tariff_rates"("parkingTariffTypeId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "parking_spaces_parkingNo_key" ON "parking_spaces"("parkingNo");
