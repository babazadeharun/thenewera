# New Era — Events & Promoter Management — Phase 1

Implemented according to the supplied Events & Promoter Management specification.

## Included

- Additive Events role architecture:
  - `SUPER_ADMIN`
  - `EVENTS_ADMIN`
  - `EVENTS_FINANCE`
  - `PROMOTER`
- Existing `CLIENT`, `ADMIN`, and `CREATOR` roles preserved.
- Event domain models:
  - `Event`
  - `EventOrganizer`
  - `Promoter`
  - `PromoterSocialAccount`
  - `PromoterApplication`
  - `PromoterEvent`
- Event/application/promoter status enums.
- Event cover reuses the existing `Media` model.
- Decimal-based event pricing fields.
- Promoter price calculation helper using Decimal arithmetic.
- Promoter price snapshot fields on `PromoterEvent` for historical integrity.
- Events authorization helpers and promoter ownership protection.
- Additive Prisma migration: `20261001160000_add_events_promoter_phase1`.

## Intentionally not included yet

Per the specification's phased development rule, Phase 2+ functionality is not implemented in this package:

- Public `/events` UI
- Event detail UI
- Promoter registration UI
- Admin Events UI
- Ticket inventory/allocation transactions
- Ticket lifecycle
- Sales
- Payments
- Ledger/debt
- Reports/audit UI

These belong to later phases after the Phase 1 build/database foundation is verified.

## Verification note

The environment did not have `node_modules`, and both `npm ci --no-audit --no-fund` and `npx prisma@5.17.0 validate` timed out during dependency retrieval. Therefore no false `npm run build` PASS is claimed in this archive.
