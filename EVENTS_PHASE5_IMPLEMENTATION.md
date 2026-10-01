# New Era — Events & Promoter Management — Phase 5

## Status
Implemented: Ticket Inventory, per-ticket Allocation and ticket lifecycle foundation.

## Added
- `TicketStatus`: `AVAILABLE`, `ALLOCATED`, `SOLD`, `RETURNED`, `CANCELLED`.
- `Ticket` model with unique ticket number per issued ticket.
- `TicketAllocation` model with historical promoter-price and discount snapshots.
- Allocation history is preserved with `releasedAt`; released tickets can return to `AVAILABLE` and be reallocated later.
- Event inventory synchronization endpoint generates missing ticket records up to `Event.totalInventory`.
- Admin allocation endpoint assigns/releases individual tickets to an approved promoter event.
- Allocation cannot exceed the event inventory or available tickets.
- Allocation cannot be reduced below already sold quantity.
- `PromoterEvent.allocation` and `remainingQuantity` are kept in sync with ticket allocation.
- Promoter can see only their own currently allocated tickets.
- Admin Events UI now has a dedicated `Bilet / Allocation` section.
- Promoter portal now has a `Biletlərim` section showing ticket numbers and the historical promoter price snapshot.

## Security
- Admin inventory/allocation endpoints require Events Admin authorization.
- Promoter ticket reads use the authenticated promoter from the session; no promoter ID is accepted from the browser.
- Public Events pages do not expose ticket numbers, promoter price, promoter discount, or allocation data.
- Existing Marketing authorization and routes are untouched.

## Inventory rules
1. Admin sets `totalInventory` on the event.
2. Admin clicks `Inventarı sinxronlaşdır`.
3. Missing `Ticket` rows are generated; existing tickets are never deleted by synchronization.
4. Inventory cannot be reduced below already issued ticket count.
5. Admin chooses an approved promoter and sets an allocation quantity.
6. The system selects available tickets and creates allocation records with the promoter price/discount snapshot.
7. Reducing allocation releases the newest unsold allocated tickets back to `AVAILABLE` while retaining allocation history.

## Deferred to Phase 6
- Actual customer/reseller sale price.
- Sale records.
- Margin calculation.
- Sale confirmation workflow.
- Financial payment/debt/ledger integration.
- Final reports and audit log suite.

## Verification limitation
The current working environment does not have the project's installed `node_modules`, and dependency installation previously timed out. A full `npm run build` has therefore not been claimed as passing. The TypeScript parser was run against the Phase 5 files; remaining diagnostics are dominated by missing project dependencies/types in this environment.
