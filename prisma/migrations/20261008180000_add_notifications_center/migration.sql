CREATE TYPE "NotificationType" AS ENUM ('INVOICE_OVERDUE','FOLLOW_UP_DUE','NEW_EMAIL','PAYMENT_RECEIVED','PROMOTER_APPLICATION','PROJECT_DEADLINE','SYSTEM');
CREATE TYPE "NotificationPriority" AS ENUM ('LOW','NORMAL','HIGH','URGENT');
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "eventKey" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "metadata" JSONB,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Notification_eventKey_key" ON "Notification"("eventKey");
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId","isRead","createdAt");
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type","createdAt");
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType","entityId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Invoice_status_dueDate_id_idx" ON "Invoice"("status","dueDate","id");
CREATE INDEX "Project_deadline_status_idx" ON "Project"("deadline","status");
