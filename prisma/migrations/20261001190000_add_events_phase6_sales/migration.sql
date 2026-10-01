CREATE TABLE "TicketSale" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "allocationId" TEXT NOT NULL,
  "promoterId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "promoterPrice" DECIMAL(12,2) NOT NULL,
  "actualSalePrice" DECIMAL(12,2) NOT NULL,
  "margin" DECIMAL(12,2) NOT NULL,
  "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketSale_ticketId_key" ON "TicketSale"("ticketId");
CREATE UNIQUE INDEX "TicketSale_allocationId_key" ON "TicketSale"("allocationId");
CREATE INDEX "TicketSale_promoterId_soldAt_idx" ON "TicketSale"("promoterId", "soldAt");
CREATE INDEX "TicketSale_eventId_soldAt_idx" ON "TicketSale"("eventId", "soldAt");
CREATE INDEX "TicketSale_allocationId_idx" ON "TicketSale"("allocationId");

ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "TicketAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_promoterId_fkey" FOREIGN KEY ("promoterId") REFERENCES "Promoter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
