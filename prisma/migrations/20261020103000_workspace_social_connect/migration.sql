-- CreateTable
CREATE TABLE "CrmSocialConnection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "assetKey" TEXT,
    "externalId" TEXT NOT NULL,
    "parentId" TEXT,
    "displayName" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CONNECTING',
    "attemptId" TEXT,
    "subjectId" TEXT,
    "readyAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmSocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmSocialAuth" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "secret" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmSocialAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmSocialConnection_assetKey_key" ON "CrmSocialConnection"("assetKey");

-- CreateIndex
CREATE INDEX "CrmSocialConnection_state_lastCheckedAt_idx" ON "CrmSocialConnection"("state", "lastCheckedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmSocialConnection_companyId_channel_key" ON "CrmSocialConnection"("companyId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "CrmSocialAuth_stateHash_key" ON "CrmSocialAuth"("stateHash");

-- CreateIndex
CREATE INDEX "CrmSocialAuth_companyId_userId_createdAt_idx" ON "CrmSocialAuth"("companyId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "CrmSocialAuth_expiresAt_idx" ON "CrmSocialAuth"("expiresAt");

-- AddForeignKey
ALTER TABLE "CrmSocialConnection" ADD CONSTRAINT "CrmSocialConnection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSocialConnection" ADD CONSTRAINT "CrmSocialConnection_companyId_memberId_fkey" FOREIGN KEY ("companyId", "memberId") REFERENCES "CrmSeat"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSocialAuth" ADD CONSTRAINT "CrmSocialAuth_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmSocialAuth" ADD CONSTRAINT "CrmSocialAuth_companyId_memberId_fkey" FOREIGN KEY ("companyId", "memberId") REFERENCES "CrmSeat"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
