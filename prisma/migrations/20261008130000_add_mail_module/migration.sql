CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TABLE "MailDraft" (
  "id" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "clientId" TEXT,
  "to" TEXT NOT NULL,
  "cc" TEXT,
  "bcc" TEXT,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MailDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MailDraft_createdById_updatedAt_idx" ON "MailDraft"("createdById", "updatedAt");
CREATE INDEX "MailDraft_clientId_updatedAt_idx" ON "MailDraft"("clientId", "updatedAt");
ALTER TABLE "MailDraft" ADD CONSTRAINT "MailDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailDraft" ADD CONSTRAINT "MailDraft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MailDraftAttachment" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MailDraftAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MailDraftAttachment_draftId_idx" ON "MailDraftAttachment"("draftId");
ALTER TABLE "MailDraftAttachment" ADD CONSTRAINT "MailDraftAttachment_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "MailDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MailMetadata" (
  "id" TEXT NOT NULL,
  "folder" TEXT NOT NULL,
  "uid" INTEGER NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "starred" BOOLEAN NOT NULL DEFAULT false,
  "messageId" TEXT,
  "clientId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT,
  CONSTRAINT "MailMetadata_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MailMetadata_folder_uid_key" ON "MailMetadata"("folder", "uid");
CREATE INDEX "MailMetadata_clientId_updatedAt_idx" ON "MailMetadata"("clientId", "updatedAt");
CREATE INDEX "MailMetadata_userId_updatedAt_idx" ON "MailMetadata"("userId", "updatedAt");
ALTER TABLE "MailMetadata" ADD CONSTRAINT "MailMetadata_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MailMetadata" ADD CONSTRAINT "MailMetadata_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EmailCommunication" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "direction" "EmailDirection" NOT NULL,
  "subject" TEXT,
  "fromAddress" TEXT NOT NULL,
  "toAddress" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailCommunication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailCommunication_messageId_key" ON "EmailCommunication"("messageId");
CREATE INDEX "EmailCommunication_clientId_sentAt_idx" ON "EmailCommunication"("clientId", "sentAt");
CREATE INDEX "EmailCommunication_direction_sentAt_idx" ON "EmailCommunication"("direction", "sentAt");
ALTER TABLE "EmailCommunication" ADD CONSTRAINT "EmailCommunication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
