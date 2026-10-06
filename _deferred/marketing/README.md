# Marketing — Deferred

This implementation is intentionally excluded from the active New Era application build.

Reason: Marketing / AI Lead Finder is not part of the current implementation phase. Its previous application routes, APIs and `src/lib/marketing` code are preserved here for a future phase and are excluded from TypeScript compilation and the active Next.js `app` tree.

The historical Prisma migration `prisma/migrations/20261002153000_add_marketing_intelligence` is intentionally preserved and was not deleted or recreated. The active `prisma/schema.prisma` does not expose the deferred Marketing models.

No database reset, destructive migration, seed data, or production-data operation was performed.
