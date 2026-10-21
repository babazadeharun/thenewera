CREATE TABLE "SalesInstagramProspect" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "draft" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "version" INTEGER NOT NULL DEFAULT 1,
  "lastContactAt" TIMESTAMP(3),
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesInstagramProspect_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesInstagramProspect_status_check" CHECK ("status" IN ('NEW','DRAFT','FIRST_SENT','WAITING','INTERESTED','OFFER_SHARED','DECLINED','NO_REPLY','DO_NOT_CONTACT')),
  CONSTRAINT "SalesInstagramProspect_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "SalesInstagramProspect_dealId_key" ON "SalesInstagramProspect"("dealId");
CREATE INDEX "SalesInstagramProspect_status_updatedAt_idx" ON "SalesInstagramProspect"("status", "updatedAt");
ALTER TABLE "SalesInstagramProspect" ADD CONSTRAINT "SalesInstagramProspect_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "SalesDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
