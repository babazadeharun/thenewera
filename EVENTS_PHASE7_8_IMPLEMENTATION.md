# New Era Events — Phase 7 + Phase 8

## Phase 7
- PromoterPayment with method, amount, event, reference, paidAt and recorder.
- PromoterLedgerEntry with DEBIT/CREDIT entries.
- Every ticket sale creates a DEBIT for promoter price.
- Every recorded payment creates a CREDIT.
- Debt = ledger debits - credits.
- Finance authorization uses EVENTS_FINANCE / ADMIN / SUPER_ADMIN.
- Promoter finance endpoint is ownership scoped.

## Phase 8
- Event reports by event and promoter.
- Audit log model and admin endpoint.
- Payment and sale actions write audit entries.
- Global security response headers.
- Responsive finance/report/audit panels reuse Events admin responsive shell.

## Database
Migration: `20261001200000_add_events_phase7_finance_phase8_audit`

## Verification
Full build requires installed project dependencies; do not claim build success unless `npm run build` is actually executed successfully. No destructive database reset is used.
