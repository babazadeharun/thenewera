import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const migrations = await prisma.$queryRawUnsafe(`
    SELECT migration_name, finished_at
    FROM _prisma_migrations
    ORDER BY started_at
  `);

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'EventGalleryMedia',
        'Event',
        'Ticket',
        'TicketAllocation',
        'TicketSale',
        'PromoterPayment',
        'PromoterLedgerEntry',
        'EventAuditLog'
      )
    ORDER BY table_name
  `);

  console.log("\n=== MIGRATIONS ===");
  console.table(migrations);

  console.log("\n=== EVENTS TABLES ===");
  console.table(tables);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());