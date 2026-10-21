-- CreateTable
CREATE TABLE "SalesOffer" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "dealId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "services" JSONB NOT NULL,
    "currency" TEXT NOT NULL,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "terms" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "tokenHash" TEXT,
    "publishedAt" TIMESTAMP(3),
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "responseAt" TIMESTAMP(3),
    "responseMessage" TEXT,
    "mailState" TEXT NOT NULL DEFAULT 'NONE',
    "mailAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOfferChallenge" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'SENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOfferChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOfferEvent" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOfferEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesOffer_dealId_createdAt_idx" ON "SalesOffer"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesOffer_state_expiresAt_idx" ON "SalesOffer"("state", "expiresAt");

-- CreateIndex
CREATE INDEX "SalesOffer_createdAt_idx" ON "SalesOffer"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOffer_groupId_version_key" ON "SalesOffer"("groupId", "version");

-- CreateIndex
CREATE INDEX "SalesOfferChallenge_offerId_createdAt_idx" ON "SalesOfferChallenge"("offerId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesOfferChallenge_email_createdAt_idx" ON "SalesOfferChallenge"("email", "createdAt");

-- CreateIndex
CREATE INDEX "SalesOfferEvent_offerId_createdAt_idx" ON "SalesOfferEvent"("offerId", "createdAt");

-- AddForeignKey
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "SalesDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOfferChallenge" ADD CONSTRAINT "SalesOfferChallenge_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SalesOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOfferEvent" ADD CONSTRAINT "SalesOfferEvent_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SalesOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
