CREATE TYPE "LeadSearchStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'VERIFIED', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED', 'ARCHIVED');
CREATE TYPE "LeadTargetType" AS ENUM ('COMPANY', 'DOCTOR', 'CLINIC', 'BEAUTY_SALON', 'BEAUTY_CENTER', 'RESTAURANT', 'HOTEL', 'FASHION_BRAND', 'RETAIL', 'EVENT_COMPANY', 'MARKETING_AGENCY', 'OTHER');

CREATE TABLE "LeadSearch" (
  "id" TEXT NOT NULL,
  "targetType" "LeadTargetType" NOT NULL,
  "location" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requestedCount" INTEGER NOT NULL DEFAULT 25,
  "requiredFields" TEXT,
  "filters" TEXT,
  "status" "LeadSearchStatus" NOT NULL DEFAULT 'QUEUED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "sourcesScanned" INTEGER NOT NULL DEFAULT 0,
  "businessesFound" INTEGER NOT NULL DEFAULT 0,
  "potentialLeads" INTEGER NOT NULL DEFAULT 0,
  "duplicatesRemoved" INTEGER NOT NULL DEFAULT 0,
  "verifiedLeads" INTEGER NOT NULL DEFAULT 0,
  "provider" TEXT,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "category" TEXT,
  "website" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "instagram" TEXT,
  "facebook" TEXT,
  "linkedin" TEXT,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT,
  "source" TEXT,
  "sourceUrl" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "score" INTEGER,
  "aiSummary" TEXT,
  "aiSignals" TEXT,
  "rawData" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadResearchItem" (
  "id" TEXT NOT NULL,
  "searchId" TEXT NOT NULL,
  "leadId" TEXT,
  "provider" TEXT NOT NULL,
  "externalId" TEXT,
  "title" TEXT,
  "sourceUrl" TEXT,
  "rawData" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadResearchItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lead_dedupeKey_key" ON "Lead"("dedupeKey");
CREATE INDEX "Lead_status_updatedAt_idx" ON "Lead"("status", "updatedAt");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
CREATE INDEX "Lead_category_city_idx" ON "Lead"("category", "city");
CREATE INDEX "LeadSearch_status_createdAt_idx" ON "LeadSearch"("status", "createdAt");
CREATE INDEX "LeadSearch_createdByUserId_createdAt_idx" ON "LeadSearch"("createdByUserId", "createdAt");
CREATE UNIQUE INDEX "LeadResearchItem_searchId_fingerprint_key" ON "LeadResearchItem"("searchId", "fingerprint");
CREATE INDEX "LeadResearchItem_leadId_idx" ON "LeadResearchItem"("leadId");
CREATE INDEX "LeadResearchItem_provider_createdAt_idx" ON "LeadResearchItem"("provider", "createdAt");

ALTER TABLE "LeadSearch" ADD CONSTRAINT "LeadSearch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadResearchItem" ADD CONSTRAINT "LeadResearchItem_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "LeadSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadResearchItem" ADD CONSTRAINT "LeadResearchItem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
