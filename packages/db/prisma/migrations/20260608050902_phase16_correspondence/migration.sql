-- CreateTable
CREATE TABLE "letter_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "letterType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "generated_letters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "letterTemplateId" TEXT,
    "memberId" TEXT,
    "letterType" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "balanceAsOnDate" DATETIME NOT NULL,
    "amountDue" DECIMAL NOT NULL DEFAULT 0,
    "renderedHtml" TEXT NOT NULL,
    "pdfPath" TEXT,
    "subject" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "generated_letters_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "generated_letters_letterTemplateId_fkey" FOREIGN KEY ("letterTemplateId") REFERENCES "letter_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "generated_letters_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "committee_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "termEndsOn" DATETIME,
    "buildingId" TEXT,
    "wingId" TEXT,
    "unitId" TEXT,
    "memberId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "committee_members_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "committee_members_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "committee_members_wingId_fkey" FOREIGN KEY ("wingId") REFERENCES "wings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "committee_members_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "committee_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meeting_minutes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialYearId" TEXT NOT NULL,
    "meetingNo" INTEGER NOT NULL,
    "meetingDate" DATETIME NOT NULL,
    "meetingTime" TEXT,
    "natureOfMeeting" TEXT,
    "resolutionDetails" TEXT,
    "commentsNotings" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "meeting_minutes_financialYearId_fkey" FOREIGN KEY ("financialYearId") REFERENCES "financial_years" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meeting_attendees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "designation" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "meeting_attendees_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meeting_minutes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "meeting_attendees_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "generated_letters_referenceNo_key" ON "generated_letters"("referenceNo");

-- CreateIndex
CREATE INDEX "generated_letters_financialYearId_idx" ON "generated_letters"("financialYearId");

-- CreateIndex
CREATE INDEX "generated_letters_memberId_idx" ON "generated_letters"("memberId");

-- CreateIndex
CREATE INDEX "generated_letters_letterType_idx" ON "generated_letters"("letterType");

-- CreateIndex
CREATE INDEX "committee_members_financialYearId_idx" ON "committee_members"("financialYearId");

-- CreateIndex
CREATE INDEX "committee_members_memberId_idx" ON "committee_members"("memberId");

-- CreateIndex
CREATE INDEX "committee_members_status_idx" ON "committee_members"("status");

-- CreateIndex
CREATE INDEX "meeting_minutes_financialYearId_idx" ON "meeting_minutes"("financialYearId");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_minutes_financialYearId_meetingNo_key" ON "meeting_minutes"("financialYearId", "meetingNo");

-- CreateIndex
CREATE INDEX "meeting_attendees_meetingId_idx" ON "meeting_attendees"("meetingId");

-- CreateIndex
CREATE INDEX "meeting_attendees_memberId_idx" ON "meeting_attendees"("memberId");
