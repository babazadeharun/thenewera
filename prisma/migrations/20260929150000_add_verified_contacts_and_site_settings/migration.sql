-- New Era V26: verified email/phone access and editable homepage hero.
CREATE TYPE "VerificationChannel" AS ENUM ('EMAIL', 'PHONE');

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "verifiedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

ALTER TABLE "Client" ALTER COLUMN "email" DROP NOT NULL;
CREATE UNIQUE INDEX "Client_phone_key" ON "Client"("phone");

CREATE TABLE "VerificationCode" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "channel" "VerificationChannel" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationCode_identifier_channel_createdAt_idx" ON "VerificationCode"("identifier", "channel", "createdAt");
CREATE INDEX "VerificationCode_userId_createdAt_idx" ON "VerificationCode"("userId", "createdAt");
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SiteSetting" (
  "id" TEXT NOT NULL,
  "heroImage" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

