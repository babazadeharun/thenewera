-- AlterTable
ALTER TABLE "CrmCompany" ADD COLUMN     "jobCursor" TEXT,
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "CrmEntry" ADD COLUMN     "custom" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "pipelineId" TEXT NOT NULL DEFAULT 'main';

-- AlterTable
ALTER TABLE "CrmAttachment" ADD COLUMN     "portalVisible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CrmThread" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "channel" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "claimedBy" TEXT,
    "claimUntil" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "responseDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmSchedule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Baku',
    "duration" INTEGER NOT NULL DEFAULT 30,
    "buffer" INTEGER NOT NULL DEFAULT 10,
    "leadHours" INTEGER NOT NULL DEFAULT 2,
    "horizonDays" INTEGER NOT NULL DEFAULT 30,
    "availability" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmBooking" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "calendarEntryId" TEXT,
    "email" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "requestKey" TEXT NOT NULL,
    "external" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPortalAccess" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "hash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmPortalAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmApproval" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requesterId" TEXT NOT NULL,
    "approverId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "CrmApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'QUEUED',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAccountSecurity" (
    "userId" TEXT NOT NULL,
    "secret" TEXT,
    "pendingSecret" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastCounter" BIGINT NOT NULL DEFAULT -1,
    "recoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmAccountSecurity_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CrmMfaProof" (
    "sessionHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmMfaProof_pkey" PRIMARY KEY ("sessionHash")
);

-- CreateTable
CREATE TABLE "CrmConnection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "cursor" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmThread_companyId_status_responseDueAt_idx" ON "CrmThread"("companyId", "status", "responseDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmThread_companyId_channel_contact_key" ON "CrmThread"("companyId", "channel", "contact");

-- CreateIndex
CREATE UNIQUE INDEX "CrmSchedule_slug_key" ON "CrmSchedule"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CrmSchedule_companyId_id_key" ON "CrmSchedule"("companyId", "id");

-- CreateIndex
CREATE INDEX "CrmBooking_companyId_assigneeId_startsAt_endsAt_idx" ON "CrmBooking"("companyId", "assigneeId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmBooking_companyId_requestKey_key" ON "CrmBooking"("companyId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPortalAccess_hash_key" ON "CrmPortalAccess"("hash");

-- CreateIndex
CREATE INDEX "CrmPortalAccess_userId_revokedAt_idx" ON "CrmPortalAccess"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmPortalAccess_companyId_customerId_email_key" ON "CrmPortalAccess"("companyId", "customerId", "email");

-- CreateIndex
CREATE INDEX "CrmApproval_companyId_status_idx" ON "CrmApproval"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CrmApproval_companyId_entryId_fingerprint_key" ON "CrmApproval"("companyId", "entryId", "fingerprint");

-- CreateIndex
CREATE INDEX "CrmJob_state_runAt_idx" ON "CrmJob"("state", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmJob_companyId_key_key" ON "CrmJob"("companyId", "key");

-- CreateIndex
CREATE INDEX "CrmMfaProof_userId_idx" ON "CrmMfaProof"("userId");

-- CreateIndex
CREATE INDEX "CrmConnection_companyId_active_idx" ON "CrmConnection"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CrmConnection_companyId_channel_memberId_key" ON "CrmConnection"("companyId", "channel", "memberId");

-- AddForeignKey
ALTER TABLE "CrmThread" ADD CONSTRAINT "CrmThread_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmThread" ADD CONSTRAINT "CrmThread_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "CrmEntry"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmThread" ADD CONSTRAINT "CrmThread_companyId_assigneeId_fkey" FOREIGN KEY ("companyId", "assigneeId") REFERENCES "CrmSeat"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSchedule" ADD CONSTRAINT "CrmSchedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSchedule" ADD CONSTRAINT "CrmSchedule_companyId_assigneeId_fkey" FOREIGN KEY ("companyId", "assigneeId") REFERENCES "CrmSeat"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmBooking" ADD CONSTRAINT "CrmBooking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmBooking" ADD CONSTRAINT "CrmBooking_companyId_scheduleId_fkey" FOREIGN KEY ("companyId", "scheduleId") REFERENCES "CrmSchedule"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmBooking" ADD CONSTRAINT "CrmBooking_companyId_assigneeId_fkey" FOREIGN KEY ("companyId", "assigneeId") REFERENCES "CrmSeat"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmBooking" ADD CONSTRAINT "CrmBooking_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "CrmEntry"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmBooking" ADD CONSTRAINT "CrmBooking_companyId_calendarEntryId_fkey" FOREIGN KEY ("companyId", "calendarEntryId") REFERENCES "CrmEntry"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPortalAccess" ADD CONSTRAINT "CrmPortalAccess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPortalAccess" ADD CONSTRAINT "CrmPortalAccess_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "CrmEntry"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmApproval" ADD CONSTRAINT "CrmApproval_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmApproval" ADD CONSTRAINT "CrmApproval_companyId_entryId_fkey" FOREIGN KEY ("companyId", "entryId") REFERENCES "CrmEntry"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmJob" ADD CONSTRAINT "CrmJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmConnection" ADD CONSTRAINT "CrmConnection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmConnection" ADD CONSTRAINT "CrmConnection_companyId_memberId_fkey" FOREIGN KEY ("companyId", "memberId") REFERENCES "CrmSeat"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

