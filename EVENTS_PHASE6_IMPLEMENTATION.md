# New Era — Events & Promoter Phase 6

## Scope

Sales, actual customer sale price and promoter margin.

## Database

Added `TicketSale`.

A sale stores:

- ticket
- allocation
- promoter
- event
- historical promoter price snapshot
- actual customer sale price
- calculated margin
- sold timestamp
- optional customer name/phone/notes

Margin is calculated server-side:

`actualSalePrice - promoterPrice`

The system does not impose a recommended, fixed, minimum or required resale price.

Migration:

`20261001190000_add_events_phase6_sales`

## Sale lifecycle

Only the promoter who owns an active allocation can record its sale.

Transaction:

1. verify active allocation belongs to current promoter
2. verify ticket is `ALLOCATED`
3. verify ticket has not already been sold
4. snapshot promoter price
5. record actual customer sale price
6. calculate margin
7. set ticket to `SOLD`
8. increment `PromoterEvent.soldQuantity`
9. decrement `PromoterEvent.remainingQuantity`

All steps occur in one Prisma transaction.

## Promoter

`/promoter` now has:

- Biletlərim
- Satışlarım
- actual sale price
- promoter price snapshot
- margin

Allocated tickets can be marked as sold from the promoter portal.

The promoter API resolves the promoter from the authenticated session; no promoter ID is accepted from the browser.

## Admin

Events admin now has a `Satışlar` tab with event-level:

- sales count
- promoter ticket cost
- customer sale revenue
- total promoter margin
- individual sale records

## Security

- promoter ownership is checked server-side
- ticket ownership is checked through active allocation
- another promoter cannot sell another promoter's ticket through the API
- duplicate sales are blocked by both application logic and unique ticket sale constraints
- historical promoter price is never recalculated from the current event discount

## Public data

No promoter sale price, promoter margin, customer information or ticket number is exposed on public event pages.

## Verification limitation

The source environment does not currently contain installed `node_modules`. A full `npm run build` cannot be honestly reported as passed until dependencies are installed and the project is built in an environment with the required packages.
