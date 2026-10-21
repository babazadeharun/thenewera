-- CreateTable
CREATE TABLE "SalesInstagramAccount" (
    "configHash" TEXT NOT NULL,
    "id" TEXT NOT NULL DEFAULT 'PLATFORM',
    "externalId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastWebhookAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesInstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInstagramAuth" (
    "configHash" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "secret" TEXT,
    "externalId" TEXT,
    "subjectId" TEXT,
    "displayName" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesInstagramAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInstagramThread" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "displayName" TEXT,
    "profileCheckedAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3) NOT NULL,
    "lastMessage" TEXT NOT NULL,
    "lastOutboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesInstagramThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInstagramInbound" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "providerAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesInstagramInbound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInstagramDelivery" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "accountExternalId" TEXT NOT NULL,
    "accountRevision" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'SENDING',
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SalesInstagramDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesInstagramAuth_stateHash_key" ON "SalesInstagramAuth"("stateHash");

-- CreateIndex
CREATE INDEX "SalesInstagramAuth_userId_createdAt_idx" ON "SalesInstagramAuth"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesInstagramThread_externalId_lastInboundAt_idx" ON "SalesInstagramThread"("externalId", "lastInboundAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInstagramThread_externalId_contact_key" ON "SalesInstagramThread"("externalId", "contact");

-- CreateIndex
CREATE INDEX "SalesInstagramInbound_receivedAt_idx" ON "SalesInstagramInbound"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInstagramDelivery_requestKey_key" ON "SalesInstagramDelivery"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInstagramDelivery_providerMessageId_key" ON "SalesInstagramDelivery"("providerMessageId");

-- CreateIndex
CREATE INDEX "SalesInstagramDelivery_offerId_createdAt_idx" ON "SalesInstagramDelivery"("offerId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesInstagramDelivery_state_createdAt_idx" ON "SalesInstagramDelivery"("state", "createdAt");

-- AddForeignKey
ALTER TABLE "SalesInstagramInbound" ADD CONSTRAINT "SalesInstagramInbound_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SalesInstagramThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInstagramDelivery" ADD CONSTRAINT "SalesInstagramDelivery_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SalesOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInstagramDelivery" ADD CONSTRAINT "SalesInstagramDelivery_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SalesInstagramThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
