-- CreateTable
CREATE TABLE "SalesCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "steps" JSONB NOT NULL,
    "sender" TEXT NOT NULL,
    "replyTo" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "configHash" TEXT NOT NULL,
    "dailyLimit" INTEGER NOT NULL DEFAULT 20,
    "startHour" INTEGER NOT NULL DEFAULT 9,
    "endHour" INTEGER NOT NULL DEFAULT 18,
    "weekdaysOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "dealId" TEXT,
    "email" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "nextStep" INTEGER NOT NULL DEFAULT 0,
    "nextAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "lastReplyCheckedAt" TIMESTAMP(3),
    "stopReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCampaignDelivery" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'ATTEMPTING',
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "errorCode" TEXT,

    CONSTRAINT "SalesCampaignDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesEmailSuppression" (
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesEmailSuppression_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "SalesCampaignWorker" (
    "id" TEXT NOT NULL,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "leaseToken" TEXT NOT NULL,
    "nextSendAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "SalesCampaignWorker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesCampaign_state_startsAt_idx" ON "SalesCampaign"("state", "startsAt");

-- CreateIndex
CREATE INDEX "SalesCampaignRecipient_state_nextAt_idx" ON "SalesCampaignRecipient"("state", "nextAt");

-- CreateIndex
CREATE INDEX "SalesCampaignRecipient_email_state_idx" ON "SalesCampaignRecipient"("email", "state");

-- CreateIndex
CREATE INDEX "SalesCampaignRecipient_dealId_idx" ON "SalesCampaignRecipient"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCampaignRecipient_campaignId_email_key" ON "SalesCampaignRecipient"("campaignId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCampaignDelivery_messageId_key" ON "SalesCampaignDelivery"("messageId");

-- CreateIndex
CREATE INDEX "SalesCampaignDelivery_attemptedAt_idx" ON "SalesCampaignDelivery"("attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCampaignDelivery_recipientId_step_key" ON "SalesCampaignDelivery"("recipientId", "step");

-- AddForeignKey
ALTER TABLE "SalesCampaignRecipient" ADD CONSTRAINT "SalesCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SalesCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCampaignRecipient" ADD CONSTRAINT "SalesCampaignRecipient_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "SalesDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCampaignDelivery" ADD CONSTRAINT "SalesCampaignDelivery_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "SalesCampaignRecipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
