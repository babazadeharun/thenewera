# New Era — Events & Promoter Management — Phase 2

Implemented on top of the Phase 1 archive.

## Included

- Public `/events` page.
- Public `/events/[slug]` event detail page.
- Public promoter application flow at `/events/[slug]/apply`.
- Application API at `/api/events/[slug]/apply`.
- Personal information, promotion experience and social-media fields.
- Promoter account is created with `PROMOTER` role and `PENDING` promoter status.
- Event application is created as `PENDING` in the same database transaction.
- Duplicate email protection.
- Duplicate application protection through the Phase 1 unique constraint.
- Pending promoter login is blocked until the promoter is activated.
- Public pages never expose promoter discount or promoter price.
- Existing Marketing authentication/client registration remains separate.
- Prisma relation metadata completed for `User`, `Media`, `Promoter` and application reviewer relationships.

## Deliberately not included

Phase 3+ admin event management, application approval UI, promoter management, ticket inventory, sales, payments, debt, ledger, reports and audit UI are not included yet.

## Verification

A full production build could not be executed in this environment because `node_modules` was absent and `npm ci --no-audit --no-fund` timed out while retrieving dependencies. `tsc` was also unable to resolve the project's installed framework/type packages for the same reason. No successful build result is claimed.
