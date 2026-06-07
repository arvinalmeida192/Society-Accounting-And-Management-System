-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "title" TEXT,
    "memberName" TEXT NOT NULL,
    "tenantOccupancy" BOOLEAN NOT NULL DEFAULT false,
    "tenantOccupancyEffectiveFrom" DATETIME,
    "generateRegularBills" BOOLEAN NOT NULL DEFAULT true,
    "generateSupplementaryBills" BOOLEAN NOT NULL DEFAULT true,
    "chargeInterest" BOOLEAN NOT NULL DEFAULT true,
    "disposedAt" DATETIME,
    "disposeReason" TEXT,
    "photographPath" TEXT,
    "gender" TEXT,
    "dateOfBirth" DATETIME,
    "qualification" TEXT,
    "religion" TEXT,
    "occupation" TEXT,
    "panNo" TEXT,
    "bloodGroup" TEXT,
    "maritalStatus" TEXT,
    "anniversaryType" TEXT,
    "anniversaryDate" DATETIME,
    "unitPurchaseDate" DATETIME,
    "dateOfSale" DATETIME,
    "associateMember" TEXT,
    "jointMember" TEXT,
    "votingRightsMember" TEXT,
    "memberBankName" TEXT,
    "memberBankBranch" TEXT,
    "totalFamilyMembers" INTEGER,
    "memberClass" TEXT,
    "clubMembershipDeposit" DECIMAL,
    "address" TEXT,
    "residencePhone" TEXT,
    "officePhone" TEXT,
    "emailPrimary" TEXT,
    "emailSecondary" TEXT,
    "fax" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "members_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "member_dependents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT,
    "occupation" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "dateOfBirth" DATETIME,
    "idCardNo" TEXT,
    "bloodGroup" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "member_dependents_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "member_nominees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "nominationDate" DATETIME,
    "nomineeName" TEXT NOT NULL,
    "committeeMeetingDate" DATETIME,
    "subject" TEXT,
    "revocationDate" DATETIME,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "member_nominees_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "member_vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "vehicleName" TEXT,
    "vehicleNo" TEXT,
    "registrationNo" TEXT,
    "registrationDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "member_vehicles_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "member_shares" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "allotmentDate" DATETIME,
    "certificateNo" TEXT,
    "folioNo" TEXT,
    "numberOfShares" INTEGER,
    "fromShareNo" TEXT,
    "toShareNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "member_shares_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "member_housing_loans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "bankName" TEXT,
    "branchName" TEXT,
    "nocDate" DATETIME,
    "loanAmount" DECIMAL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "member_housing_loans_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "member_opening_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "balanceType" TEXT NOT NULL,
    "principalOB" DECIMAL NOT NULL DEFAULT 0,
    "interestOB" DECIMAL NOT NULL DEFAULT 0,
    "serviceTaxOB" DECIMAL NOT NULL DEFAULT 0,
    "ledgerVoucherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "member_opening_balances_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "member_opening_balances_ledgerVoucherId_fkey" FOREIGN KEY ("ledgerVoucherId") REFERENCES "vouchers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "licenseAgreementDate" DATETIME NOT NULL,
    "licenseExpiryDate" DATETIME NOT NULL,
    "monthlyRent" DECIMAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" DATETIME,
    "archivedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "tenants_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_account_masters" (
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
    CONSTRAINT "account_masters_subgroupId_fkey" FOREIGN KEY ("subgroupId") REFERENCES "account_subgroups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "account_masters_memberSubsidiaryId_fkey" FOREIGN KEY ("memberSubsidiaryId") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_account_masters" ("archivedAt", "archivedBy", "createdAt", "createdBy", "estimateAmount", "id", "interestFree", "isActive", "isArchived", "memberSubsidiaryId", "openingBalanceCr", "openingBalanceDr", "particulars", "pettyCash", "previousYearAmount", "rebateApplicable", "serviceTaxApplicable", "shortCode", "subgroupId", "updatedAt", "updatedBy") SELECT "archivedAt", "archivedBy", "createdAt", "createdBy", "estimateAmount", "id", "interestFree", "isActive", "isArchived", "memberSubsidiaryId", "openingBalanceCr", "openingBalanceDr", "particulars", "pettyCash", "previousYearAmount", "rebateApplicable", "serviceTaxApplicable", "shortCode", "subgroupId", "updatedAt", "updatedBy" FROM "account_masters";
DROP TABLE "account_masters";
ALTER TABLE "new_account_masters" RENAME TO "account_masters";
CREATE UNIQUE INDEX "account_masters_shortCode_key" ON "account_masters"("shortCode");
CREATE UNIQUE INDEX "account_masters_memberSubsidiaryId_key" ON "account_masters"("memberSubsidiaryId");
CREATE TABLE "new_member_parking_assignments" (
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
    CONSTRAINT "member_parking_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "member_parking_assignments_parkingSpaceId_fkey" FOREIGN KEY ("parkingSpaceId") REFERENCES "parking_spaces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_member_parking_assignments" ("createdAt", "createdBy", "disposeDate", "id", "isActive", "memberId", "parkingSpaceId", "purchaseDate", "updatedAt", "updatedBy") SELECT "createdAt", "createdBy", "disposeDate", "id", "isActive", "memberId", "parkingSpaceId", "purchaseDate", "updatedAt", "updatedBy" FROM "member_parking_assignments";
DROP TABLE "member_parking_assignments";
ALTER TABLE "new_member_parking_assignments" RENAME TO "member_parking_assignments";
CREATE TABLE "new_voucher_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "accountMasterId" TEXT NOT NULL,
    "memberId" TEXT,
    "drAmount" DECIMAL NOT NULL DEFAULT 0,
    "crAmount" DECIMAL NOT NULL DEFAULT 0,
    "particulars" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "voucher_lines_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "voucher_lines_accountMasterId_fkey" FOREIGN KEY ("accountMasterId") REFERENCES "account_masters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "voucher_lines_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_voucher_lines" ("accountMasterId", "crAmount", "createdAt", "createdBy", "drAmount", "id", "lineNo", "updatedAt", "updatedBy", "voucherId") SELECT "accountMasterId", "crAmount", "createdAt", "createdBy", "drAmount", "id", "lineNo", "updatedAt", "updatedBy", "voucherId" FROM "voucher_lines";
DROP TABLE "voucher_lines";
ALTER TABLE "new_voucher_lines" RENAME TO "voucher_lines";
CREATE INDEX "voucher_lines_accountMasterId_idx" ON "voucher_lines"("accountMasterId");
CREATE UNIQUE INDEX "voucher_lines_voucherId_lineNo_key" ON "voucher_lines"("voucherId", "lineNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "members_unitId_idx" ON "members"("unitId");

-- CreateIndex
CREATE INDEX "members_disposedAt_idx" ON "members"("disposedAt");

-- CreateIndex
CREATE UNIQUE INDEX "member_opening_balances_memberId_balanceType_key" ON "member_opening_balances"("memberId", "balanceType");

-- CreateIndex
CREATE INDEX "tenants_unitId_isActive_idx" ON "tenants"("unitId", "isActive");
