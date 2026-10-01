CREATE TYPE "TicketStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'SOLD', 'RETURNED', 'CANCELLED');

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "ticketNumber" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketAllocation" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "promoterId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "promoterPrice" DECIMAL(12,2) NOT NULL,
  "promoterDiscountPercent" DECIMAL(5,2) NOT NULL,
  "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "TicketAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");
CREATE INDEX "Ticket_eventId_status_idx" ON "Ticket"("eventId", "status");
CREATE INDEX "Ticket_eventId_ticketNumber_idx" ON "Ticket"("eventId", "ticketNumber");
CREATE INDEX "TicketAllocation_ticketId_releasedAt_idx" ON "TicketAllocation"("ticketId", "releasedAt");
CREATE INDEX "TicketAllocation_promoterId_eventId_releasedAt_idx" ON "TicketAllocation"("promoterId", "eventId", "releasedAt");
CREATE INDEX "TicketAllocation_eventId_releasedAt_idx" ON "TicketAllocation"("eventId", "releasedAt");

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAllocation" ADD CONSTRAINT "TicketAllocation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAllocation" ADD CONSTRAINT "TicketAllocation_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAllocation" ADD CONSTRAINT "TicketAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
