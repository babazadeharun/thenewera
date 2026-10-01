-- Events / Promoter Management - Phase 1
-- Additive migration. Existing Marketing tables and data are preserved.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EVENTS_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EVENTS_FINANCE';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PROMOTER';

CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'APPLICATION_OPEN', 'ACTIVE', 'SOLD_OUT', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PromoterStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'INACTIVE');
CREATE TYPE "PromoterApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PromoterEventStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'YOUTUBE', 'TELEGRAM', 'OTHER');

CREATE TABLE "EventOrganizer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventOrganizer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverMediaId" TEXT,
    "artist" TEXT,
    "venue" TEXT,
    "city" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "publicTicketPrice" DECIMAL(12,2) NOT NULL,
    "promoterDiscountPercent" DECIMAL(5,2) NOT NULL,
    "totalInventory" INTEGER NOT NULL DEFAULT 0,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "internalNotes" TEXT,
    "organizerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Promoter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "address" TEXT,
    "experience" TEXT,
    "previousEventPromotion" TEXT,
    "salesExperience" TEXT,
    "approximateAudience" INTEGER,
    "notes" TEXT,
    "status" "PromoterStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Promoter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromoterSocialAccount" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "profileUrl" TEXT,
    "username" TEXT,
    "followerCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromoterSocialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromoterApplication" (
    "id" TEXT NOT NULL,
    "promoterId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "PromoterApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    CONSTRAINT "PromoterApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromoterEvent" (
    "promoterId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "PromoterEventStatus" NOT NULL DEFAULT 'ACTIVE',
    "allocation" INTEGER NOT NULL DEFAULT 0,
    "promoterDiscountPercent" DECIMAL(5,2) NOT NULL,
    "promoterPrice" DECIMAL(12,2) NOT NULL,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "remainingQuantity" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromoterEvent_pkey" PRIMARY KEY ("promoterId", "eventId")
);

CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE UNIQUE INDEX "Promoter_userId_key" ON "Promoter"("userId");
CREATE UNIQUE INDEX "PromoterApplication_promoterId_eventId_key" ON "PromoterApplication"("promoterId", "eventId");
CREATE INDEX "EventOrganizer_name_idx" ON "EventOrganizer"("name");
CREATE INDEX "Event_status_startsAt_idx" ON "Event"("status", "startsAt");
CREATE INDEX "Event_organizerId_idx" ON "Event"("organizerId");
CREATE INDEX "Event_city_idx" ON "Event"("city");
CREATE INDEX "Promoter_status_idx" ON "Promoter"("status");
CREATE INDEX "Promoter_email_idx" ON "Promoter"("email");
CREATE INDEX "PromoterSocialAccount_promoterId_platform_idx" ON "PromoterSocialAccount"("promoterId", "platform");
CREATE INDEX "PromoterApplication_eventId_status_idx" ON "PromoterApplication"("eventId", "status");
CREATE INDEX "PromoterApplication_promoterId_status_idx" ON "PromoterApplication"("promoterId", "status");
CREATE INDEX "PromoterApplication_reviewedByUserId_idx" ON "PromoterApplication"("reviewedByUserId");
CREATE INDEX "PromoterEvent_eventId_status_idx" ON "PromoterEvent"("eventId", "status");
CREATE INDEX "PromoterEvent_promoterId_status_idx" ON "PromoterEvent"("promoterId", "status");

ALTER TABLE "Event" ADD CONSTRAINT "Event_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "EventOrganizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Promoter" ADD CONSTRAINT "Promoter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoterSocialAccount" ADD CONSTRAINT "PromoterSocialAccount_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromoterApplication" ADD CONSTRAINT "PromoterApplication_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoterApplication" ADD CONSTRAINT "PromoterApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoterApplication" ADD CONSTRAINT "PromoterApplication_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PromoterEvent" ADD CONSTRAINT "PromoterEvent_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoterEvent" ADD CONSTRAINT "PromoterEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
