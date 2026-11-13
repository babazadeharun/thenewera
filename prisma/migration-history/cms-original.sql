-- Phase 1A CMS foundation: Media, Hero and HomepageSection.
-- Additive only. Existing models/data are preserved.

CREATE TYPE "MediaCategory" AS ENUM ('HERO', 'CREATORS', 'PORTFOLIO', 'CLIENTS', 'SERVICES', 'BLOG', 'GENERAL');

CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "url" TEXT NOT NULL,
    "storageKey" TEXT,
    "category" "MediaCategory" NOT NULL DEFAULT 'GENERAL',
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Hero" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "overlay" TEXT,
    "desktopMediaId" TEXT,
    "mobileMediaId" TEXT,
    "videoMediaId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hero_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageSection" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");
CREATE INDEX "Media_category_idx" ON "Media"("category");
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");
CREATE INDEX "Hero_active_displayOrder_idx" ON "Hero"("active", "displayOrder");
CREATE INDEX "HomepageSection_enabled_displayOrder_idx" ON "HomepageSection"("enabled", "displayOrder");

ALTER TABLE "Hero" ADD CONSTRAINT "Hero_desktopMediaId_fkey"
    FOREIGN KEY ("desktopMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Hero" ADD CONSTRAINT "Hero_mobileMediaId_fkey"
    FOREIGN KEY ("mobileMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Hero" ADD CONSTRAINT "Hero_videoMediaId_fkey"
    FOREIGN KEY ("videoMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HomepageSection" ADD CONSTRAINT "HomepageSection_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
