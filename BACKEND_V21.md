# New Era V21 — Backend Foundation

V21 introduces a server API contract and a PostgreSQL/Prisma data model while keeping the existing localStorage demo UI intact.

## API

- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`

## Persistence

The included API currently uses a repository abstraction with an in-memory demo adapter. It intentionally does **not** pretend to persist data on Vercel.

The PostgreSQL schema is included in `prisma/schema.prisma`. To enable persistent storage in a real environment:

1. Install `prisma` and `@prisma/client` at the pinned project version.
2. Set `DATABASE_URL` from `.env.example` in the deployment environment.
3. Run `npx prisma migrate dev --name init` locally to create the first migration.
4. Review the migration before applying it to production.
5. Replace the demo repository with a Prisma repository implementing the same `ProjectRepository` interface.
6. Move authentication/authorization checks into the API before exposing write operations publicly.

No database reset, destructive migration, or secret is included in this version.
