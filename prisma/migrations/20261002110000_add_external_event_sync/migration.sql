ALTER TABLE "Event"
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "externalSource" TEXT,
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "externalUrl" TEXT,
  ADD COLUMN "externalPosterUrl" TEXT,
  ADD COLUMN "externalCategory" TEXT,
  ADD COLUMN "externalIngestedAt" TIMESTAMP(3),
  ADD COLUMN "lastExternalSyncAt" TIMESTAMP(3);

CREATE INDEX "Event_isPublic_startsAt_idx" ON "Event"("isPublic", "startsAt");
CREATE INDEX "Event_externalSource_externalId_idx" ON "Event"("externalSource", "externalId");
CREATE UNIQUE INDEX "Event_externalSource_externalId_key" ON "Event"("externalSource", "externalId");
