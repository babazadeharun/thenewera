CREATE TABLE "SalesWhatsappContact" (
  "phone" TEXT PRIMARY KEY,
  "consentNote" TEXT,
  "consentAt" TIMESTAMP(3),
  "optedOutAt" TIMESTAMP(3),
  "lastInboundAt" TIMESTAMP(3),
  "stage" TEXT NOT NULL DEFAULT 'NEW',
  "followUpAt" TIMESTAMP(3)
);
CREATE TABLE "SalesWhatsappMessage" (
  "id" TEXT PRIMARY KEY,
  "phone" TEXT NOT NULL REFERENCES "SalesWhatsappContact"("phone") ON DELETE CASCADE ON UPDATE CASCADE,
  "providerId" TEXT,
  "requestKey" TEXT,
  "direction" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SalesWhatsappMessage_providerId_key" ON "SalesWhatsappMessage"("providerId");
CREATE UNIQUE INDEX "SalesWhatsappMessage_requestKey_key" ON "SalesWhatsappMessage"("requestKey");
CREATE INDEX "SalesWhatsappMessage_phone_createdAt_idx" ON "SalesWhatsappMessage"("phone", "createdAt");
