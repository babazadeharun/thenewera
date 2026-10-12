# New Era — Role-Based Account Routing Audit

## Root causes found

1. The public homepage rendered both `Hesabım` and `Profilim` with a hard-coded `/account` URL, regardless of the authenticated role.
2. Login had a separate inline role-routing switch. `EVENTS_FINANCE` was sent to `/admin/events`, but that page correctly excluded the finance-only role; the user was then redirected away from the intended panel.
3. `/admin` accepted only `ADMIN`, not `SUPER_ADMIN`, despite the latter needing full admin access.
4. The legacy `/app/admin` route rendered an old mock admin UI without a server-side session/role guard.
5. `/account` and `/projects` were client-rendered routes without a server-side role guard; APIs limited data, but the route itself did not consistently enforce the intended role.

## Central route mapping

| Role | Account entry route |
|---|---|
| `SUPER_ADMIN` | `/admin` |
| `ADMIN` | `/admin` |
| `EVENTS_ADMIN` | `/admin/events` |
| `EVENTS_FINANCE` | `/admin/events/finance` |
| `CLIENT` | `/account` |
| `CREATOR` | `/creator` |
| `PROMOTER` | `/promoter` |
| Missing/unknown role | `/login` |

The central helper is `lib/account-routing.ts`. The homepage, shared site header, login success, and email-verification success now use it. Server-side route guards remain authoritative and do not trust a URL parameter or localStorage for role decisions.

## Authorization changes

- `/admin` and shared `requireAdmin()` now permit `ADMIN` and `SUPER_ADMIN`.
- `/admin/events` and event detail pages are restricted to `ADMIN`, `SUPER_ADMIN`, and `EVENTS_ADMIN`.
- `/admin/events/finance` is restricted to `ADMIN`, `SUPER_ADMIN`, and `EVENTS_FINANCE`; the finance view calls the existing finance-protected reports/payments APIs.
- `EVENTS_ADMIN` no longer sees the finance tab in the events operations UI. API authorization remains enforced independently of UI visibility.
- `/account` and `/projects` now have server-side `CLIENT` guards.
- `/admin/users` now has a server-side admin guard; its existing UI is preserved in `UsersClient.tsx`.
- `/app/admin` no longer exposes the legacy mock admin interface; it requires a session and redirects authorized admins to `/admin`.
- `/creator` is a guarded entry page because no functional creator dashboard existed in this source. It explicitly states that creator-specific project-management tools are not implemented here and does not expose the old admin UI.
- Customer account APIs return `401` for no session and `403` for authenticated users with the wrong role. Existing session cookie/password verification behavior is unchanged.
- `ADMIN`/`SUPER_ADMIN` are recognized as administrative roles in project APIs as well.

## Validation performed

- The central route helper was compiled independently and tested against all seven roles plus an unknown role; all expected paths matched.
- All changed TypeScript/TSX files passed TypeScript parser/syntax diagnostics.
- `npm run build` was attempted but could not start because `prisma` is unavailable in the environment (`prisma: not found`).
- `npx prisma generate` timed out because dependencies were not installed. `npm ci --offline` confirmed the required packages were not cached; online installation did not complete in this environment.
- Therefore, a full Prisma generation and production build are **not verified**. Run `npm ci`, `npx prisma generate`, and `npm run build` in the project environment with registry access before deploying.
- No database schema or migration changes were made.

## Manual role test checklist

1. `SUPER_ADMIN`: login → `/admin`; homepage `Hesabım` → `/admin`; refresh preserves access.
2. `ADMIN`: login and `Hesabım` → `/admin`.
3. `EVENTS_ADMIN`: login and `Hesabım` → `/admin/events`; finance API requests remain forbidden.
4. `EVENTS_FINANCE`: login and `Hesabım` → `/admin/events/finance`; event-operations APIs remain forbidden; finance reports/payments APIs remain role-checked.
5. `CLIENT`: login and `Hesabım` → `/account`; `/projects` requires a client session.
6. `CREATOR`: login and `Hesabım` → `/creator`; `/admin` and `/app/admin` are blocked.
7. `PROMOTER`: login and `Hesabım` → `/promoter`; promoter page requires active promoter profile.
8. Guest: `Hesabım` is not shown by the shared header; protected pages redirect to `/login`.
9. Client manually opening `/admin`, `/admin/events`, `/admin/events/finance`, or `/app/admin` is redirected away; APIs independently enforce role checks.
10. Logout deletes the database session and clears the HTTP-only session cookie; protected server routes no longer resolve the session.
