CREATE TYPE "SalesDealStage" AS ENUM ('NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');
CREATE TYPE "SalesPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "SalesActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'WHATSAPP', 'FOLLOW_UP', 'NOTE', 'PROPOSAL');

CREATE TABLE "SalesDeal" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "source" TEXT,
  "stage" "SalesDealStage" NOT NULL DEFAULT 'NEW',
  "priority" "SalesPriority" NOT NULL DEFAULT 'NORMAL',
  "budget" DECIMAL(14,2),
  "value" DECIMAL(14,2),
  "probability" INTEGER NOT NULL DEFAULT 20,
  "expectedCloseDate" TIMESTAMP(3),
  "nextFollowUp" TIMESTAMP(3),
  "lossReason" TEXT,
  "notes" TEXT,
  "proposalStatus" TEXT,
  "proposalValue" DECIMAL(14,2),
  "proposalDate" TIMESTAMP(3),
  "proposalSentAt" TIMESTAMP(3),
  "proposalResponse" TEXT,
  "revisionStatus" TEXT,
  "clientId" TEXT,
  "serviceId" TEXT,
  "projectId" TEXT,
  "assignedUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesDeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesActivity" (
  "id" TEXT NOT NULL,
  "type" "SalesActivityType" NOT NULL,
  "text" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dealId" TEXT NOT NULL,
  "clientId" TEXT,
  "projectId" TEXT,
  "createdByUserId" TEXT,
  CONSTRAINT "SalesActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SalesDeal_stage_updatedAt_idx" ON "SalesDeal"("stage", "updatedAt");
CREATE INDEX "SalesDeal_clientId_idx" ON "SalesDeal"("clientId");
CREATE INDEX "SalesDeal_serviceId_idx" ON "SalesDeal"("serviceId");
CREATE INDEX "SalesDeal_assignedUserId_idx" ON "SalesDeal"("assignedUserId");
CREATE INDEX "SalesDeal_nextFollowUp_idx" ON "SalesDeal"("nextFollowUp");
CREATE INDEX "SalesActivity_dealId_createdAt_idx" ON "SalesActivity"("dealId", "createdAt");
CREATE INDEX "SalesActivity_dueAt_completedAt_idx" ON "SalesActivity"("dueAt", "completedAt");
CREATE INDEX "SalesActivity_clientId_idx" ON "SalesActivity"("clientId");

ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesDeal" ADD CONSTRAINT "SalesDeal_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "SalesDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
