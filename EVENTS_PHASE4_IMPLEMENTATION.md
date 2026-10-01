# New Era Events — Phase 4

## Included

- Promoter dashboard at `/promoter`.
- Server-side ownership check using the authenticated PROMOTER user.
- Promoter event list containing only the logged-in promoter's `PromoterEvent` records.
- Promoter application history containing only the logged-in promoter's applications.
- Summary cards for events, allocation, sold quantity and pending applications.
- Event detail links back to the public event pages.
- Historical promoter discount and promoter price displayed from the `PromoterEvent` snapshot.
- Promoter profile information.
- Logout from the promoter portal.
- Login redirect for PROMOTER users to `/promoter`.
- Dedicated `/api/promoter/dashboard` endpoint protected by `requirePromoter()`.
- Responsive mobile/tablet layout.

## Database

No new Prisma model or migration is required in Phase 4. Existing `Promoter`, `PromoterApplication`, `PromoterEvent` and `Event` models are reused.

## Security

The dashboard does not accept a promoter ID from the browser. The server resolves the promoter from the authenticated session and queries by that promoter ID. The API uses the same ownership-aware `requirePromoter()` helper.

## Intentionally deferred

- Ticket allocation mutation
- Ticket lifecycle
- Actual customer sale price
- Sales/margin calculations
- Payments
- Debt
- Ledger
- Reports
- Audit logs

Those belong to later phases in the authoritative specification.

## Build verification

The project environment used for this implementation does not have the project's installed `node_modules`, and the previous dependency installation attempt did not complete. Therefore a production `npm run build` has not been claimed as verified.
