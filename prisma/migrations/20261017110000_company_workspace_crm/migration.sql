-- CreateEnum
CREATE TYPE "CrmRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'VIEWER');

-- CreateTable
CREATE TABLE "CrmPlan" (
    "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 11,
    "bytes" INTEGER NOT NULL DEFAULT 104857600,
    "records" INTEGER NOT NULL DEFAULT 10000,
    "features" TEXT[] DEFAULT ARRAY['customers', 'sales', 'tasks', 'calendar', 'quotes', 'payments', 'messages', 'reports', 'automation']::TEXT[],
    "trialDefault" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CrmPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "taxId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'TRIAL',
    "trialStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEnd" TIMESTAMP(3) NOT NULL,
    "paidUntil" TIMESTAMP(3),
    "reason" TEXT,
    "planId" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "records" INTEGER NOT NULL,
    "features" TEXT[],
    "stages" TEXT[] DEFAULT ARRAY['Yeni', 'Əlaqə', 'Təklif', 'Danışıqlar']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastJobAt" TIMESTAMP(3),

    CONSTRAINT "CrmCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmSeat" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CrmRole" NOT NULL,
    "team" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "grants" JSONB,
    "welcomedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmInvitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CrmRole" NOT NULL,
    "team" TEXT,
    "hash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "CrmInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL,
    "stage" TEXT,
    "stageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigneeId" TEXT,
    "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT NOT NULL,
    "customerId" TEXT,
    "saleId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "dueAt" TIMESTAMP(3),
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entryId" TEXT,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'MEMBER',
    "entryId" TEXT,
    "userId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAutomation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "stage" TEXT,
    "assigneeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CrmAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmSupportSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmSupportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPlatformLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmPlatformLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmCompany_state_trialEnd_idx" ON "CrmCompany"("state", "trialEnd");

-- CreateIndex
CREATE INDEX "CrmSeat_userId_active_idx" ON "CrmSeat"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CrmSeat_companyId_userId_key" ON "CrmSeat"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmSeat_companyId_id_key" ON "CrmSeat"("companyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CrmInvitation_hash_key" ON "CrmInvitation"("hash");

-- CreateIndex
CREATE INDEX "CrmInvitation_email_companyId_idx" ON "CrmInvitation"("email", "companyId");

-- CreateIndex
CREATE INDEX "CrmEntry_companyId_kind_deletedAt_createdAt_idx" ON "CrmEntry"("companyId", "kind", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "CrmEntry_companyId_assigneeId_idx" ON "CrmEntry"("companyId", "assigneeId");

-- CreateIndex
CREATE INDEX "CrmEntry_companyId_email_idx" ON "CrmEntry"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "CrmEntry_companyId_id_key" ON "CrmEntry"("companyId", "id");

-- CreateIndex
CREATE INDEX "CrmAttachment_companyId_entryId_idx" ON "CrmAttachment"("companyId", "entryId");

-- CreateIndex
CREATE INDEX "CrmEvent_companyId_type_createdAt_idx" ON "CrmEvent"("companyId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmEvent_companyId_key_key" ON "CrmEvent"("companyId", "key");

-- CreateIndex
CREATE INDEX "CrmAutomation_companyId_active_idx" ON "CrmAutomation"("companyId", "active");

-- CreateIndex
CREATE INDEX "CrmSupportSession_companyId_actorId_idx" ON "CrmSupportSession"("companyId", "actorId");

-- AddForeignKey
ALTER TABLE "CrmCompany" ADD CONSTRAINT "CrmCompany_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CrmPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSeat" ADD CONSTRAINT "CrmSeat_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSeat" ADD CONSTRAINT "CrmSeat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInvitation" ADD CONSTRAINT "CrmInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmEntry" ADD CONSTRAINT "CrmEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmEntry" ADD CONSTRAINT "CrmEntry_companyId_assigneeId_fkey" FOREIGN KEY ("companyId", "assigneeId") REFERENCES "CrmSeat"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmEntry" ADD CONSTRAINT "CrmEntry_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "CrmEntry"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmEntry" ADD CONSTRAINT "CrmEntry_companyId_saleId_fkey" FOREIGN KEY ("companyId", "saleId") REFERENCES "CrmEntry"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAttachment" ADD CONSTRAINT "CrmAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAttachment" ADD CONSTRAINT "CrmAttachment_companyId_entryId_fkey" FOREIGN KEY ("companyId", "entryId") REFERENCES "CrmEntry"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmEvent" ADD CONSTRAINT "CrmEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAutomation" ADD CONSTRAINT "CrmAutomation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSupportSession" ADD CONSTRAINT "CrmSupportSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

