-- CreateTable
CREATE TABLE "society_identity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "societyName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "registrationDate" DATETIME,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressLine3" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pinCode" TEXT,
    "telephone" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "website" TEXT,
    "tan" TEXT,
    "pan" TEXT,
    "tdsCircle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "financial_years" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "previousYearDbPath" TEXT,
    "societyIdentityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "financial_years_societyIdentityId_fkey" FOREIGN KEY ("societyIdentityId") REFERENCES "society_identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
