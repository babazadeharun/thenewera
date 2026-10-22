-- AlterTable
ALTER TABLE "FinancePayment" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "requestHash" TEXT;

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MailSentCopy" (
    "messageId" TEXT NOT NULL,
    "raw" BYTEA NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailSentCopy_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE INDEX "AuthRateLimit_resetAt_idx" ON "AuthRateLimit"("resetAt");

-- CreateIndex
CREATE INDEX "MailSentCopy_state_nextAttemptAt_idx" ON "MailSentCopy"("state", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancePayment_idempotencyKey_key" ON "FinancePayment"("idempotencyKey");

