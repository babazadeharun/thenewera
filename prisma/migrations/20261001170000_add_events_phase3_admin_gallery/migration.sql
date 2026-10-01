CREATE TABLE "EventGalleryMedia" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventGalleryMedia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EventGalleryMedia_eventId_mediaId_key" ON "EventGalleryMedia"("eventId", "mediaId");
CREATE INDEX "EventGalleryMedia_eventId_sortOrder_idx" ON "EventGalleryMedia"("eventId", "sortOrder");
CREATE INDEX "EventGalleryMedia_mediaId_idx" ON "EventGalleryMedia"("mediaId");
ALTER TABLE "EventGalleryMedia" ADD CONSTRAINT "EventGalleryMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventGalleryMedia" ADD CONSTRAINT "EventGalleryMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
