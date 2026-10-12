CREATE TYPE "AccountStatus" AS ENUM ('REGISTERED','QUALIFIED','CLIENT','SUSPENDED','ARCHIVED');
CREATE TYPE "AccountType" AS ENUM ('INDIVIDUAL','BUSINESS');
CREATE TYPE "WorkspaceType" AS ENUM ('INDIVIDUAL','BUSINESS');
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE','SUSPENDED','ARCHIVED');
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER','MANAGER','MEMBER','VIEWER');
CREATE TYPE "AuditEventType" AS ENUM ('USER_REGISTERED','EMAIL_VERIFIED','ACCOUNT_STATUS_CHANGED','CLIENT_APPROVED','ACCOUNT_SUSPENDED','ACCOUNT_RESTORED','ACCOUNT_ARCHIVED','LOGIN','PROJECT_CREATED','BRIEF_SUBMITTED');

ALTER TABLE "User" ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'REGISTERED';
ALTER TABLE "User" ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
CREATE INDEX "User_accountStatus_createdAt_idx" ON "User"("accountStatus","createdAt");

CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "WorkspaceType" NOT NULL DEFAULT 'BUSINESS',
  "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
  "ownerUserId" TEXT,
  "clientId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Workspace_ownerUserId_key" ON "Workspace"("ownerUserId");
CREATE UNIQUE INDEX "Workspace_clientId_key" ON "Workspace"("clientId");
CREATE INDEX "Workspace_status_createdAt_idx" ON "Workspace"("status","createdAt");
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WorkspaceMembership" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL DEFAULT 'OWNER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "WorkspaceMembership"("workspaceId","userId");
CREATE INDEX "WorkspaceMembership_userId_active_idx" ON "WorkspaceMembership"("userId","active");
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "event" "AuditEventType" NOT NULL,
  "actorId" TEXT,
  "targetUserId" TEXT,
  "oldValue" TEXT,
  "newValue" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_targetUserId_createdAt_idx" ON "AuditLog"("targetUserId","createdAt");
CREATE INDEX "AuditLog_event_createdAt_idx" ON "AuditLog"("event","createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CustomerNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomerNotification_userId_isRead_createdAt_idx" ON "CustomerNotification"("userId","isRead","createdAt");
ALTER TABLE "CustomerNotification" ADD CONSTRAINT "CustomerNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing authenticated clients are retained as clients; unverified accounts remain registered.
UPDATE "User" SET "accountStatus" = CASE WHEN "verifiedAt" IS NOT NULL AND "role" = 'CLIENT' THEN 'CLIENT'::"AccountStatus" ELSE 'REGISTERED'::"AccountStatus" END;
UPDATE "User" SET "accountType" = CASE WHEN "clientId" IS NOT NULL AND EXISTS (SELECT 1 FROM "Client" c WHERE c.id="User"."clientId" AND COALESCE(c.company,'') <> '') THEN 'BUSINESS'::"AccountType" ELSE 'INDIVIDUAL'::"AccountType" END;

-- Preserve existing customer data by creating one workspace per Client and linking its owner when possible.
INSERT INTO "Workspace" ("id","name","type","status","ownerUserId","clientId","createdAt","updatedAt")
SELECT 'ws_' || c.id,
       COALESCE(NULLIF(c.company,''), NULLIF(TRIM(c.firstName || ' ' || c.lastName),''), 'New Era Workspace'),
       CASE WHEN COALESCE(c.company,'') <> '' THEN 'BUSINESS'::"WorkspaceType" ELSE 'INDIVIDUAL'::"WorkspaceType" END,
       'ACTIVE'::"WorkspaceStatus",
       u.id,
       c.id,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "Client" c
LEFT JOIN "User" u ON u."clientId" = c.id
WHERE NOT EXISTS (SELECT 1 FROM "Workspace" w WHERE w."clientId" = c.id);

INSERT INTO "WorkspaceMembership" ("id","workspaceId","userId","role","active","createdAt","updatedAt")
SELECT 'wm_' || w.id || '_' || u.id, w.id, u.id, 'OWNER'::"WorkspaceRole", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Workspace" w
JOIN "User" u ON u.id = w."ownerUserId"
WHERE NOT EXISTS (SELECT 1 FROM "WorkspaceMembership" m WHERE m."workspaceId"=w.id AND m."userId"=u.id);
