# Compatibility plan: strict catalog guard and manual reconciliation

This supersedes the existence-only guard and v1 maintenance recipe. No merge,
application deployment, production access, reset or object drop is authorized.

## Active history and stage-specific validation

All 20 migration identities are retained. The redundant CMS migration now
validates the exact original foundation-stage definition in **public**, and
rejects another intended current schema. Catalog reads use pg_catalog-qualified
relations and a controlled expression-rendering search path. It verifies the
ordered enum labels and enum kind; the kind/persistence/RLS of Media, Hero,
HomepageSection and SiteSetting; every column's type, nullability, default,
identity/generation; all primary/unique/foreign/check constraints and their
validation/deferral state; and all indexes including uniqueness, expressions,
predicates, validity/readiness. Mismatches identify the object or column.

The embedded catalog equals `cms-foundation-catalog.json`. That snapshot was
read from the independently applied original CMS SQL plus the untouched
SiteSetting foundation definition, and tested against newly applied original
foundation SQL. No ALTER/DROP repair is hidden in the guard. Semantically similar
but differently rendered definitions are rejected for review, not silently
accepted. The verified scope is PostgreSQL 16/public; other schemas/platforms
are unsupported until explicitly reviewed.

This is a **foundation-stage** guard. Later migrations add three enum labels and
HomepageSection.eyebrow. Do not execute the guard directly on a fully migrated
database: its catalog has legitimately changed. Completed-history maintenance
compares the full current schema against an independent fresh reference instead.

Original SQL, original unquoted lifecycle SQL, historical quoted lifecycle SQL,
and the superseded existence-only guard are archived with hashes in manifest.json.
The strict CMS checksum is `a036ccc0c3ddf769e42cd60005d938571b8b201a6313bac150ebf72ac065871e`. The lifecycle quoting change remains
`99da26ae19303118800417b6f5e24c21ea5d305a90c53f998b2abcf19b4c1186`.
Reconciliation recognizes the original CMS and existence-only CMS versions;
the historical quoted lifecycle differs only by trailing whitespace.

## Diagnostic safety boundary

`scripts/diagnose-prisma-history.mjs` rejects unknown/repeated/missing options,
unsupported URLs/datasources, ambiguous configurations and malformed RPC results.
It prints the executed mode and credential-free identity. A tokenizer validates
exactly one PostgreSQL datasource bound to DATABASE_URL; a minimal temporary
schema is built structurally with an explicit shadowDatabaseUrl, rather than
editing checked-in text or depending on whitespace. Other datasource options
fail closed. The engine version/platform is checked explicitly.

The tool intentionally supports only the reviewed local Docker endpoint
127.0.0.1:5432, container thenewera-postgres and local role thenewera. Before any
engine starts, it checks the policy's container ID/port binding and probes the
actual PostgreSQL system identifier, database OID/name, schema and server
connection identity. Probes are read-only and close their psql connections.
An unregistered endpoint/database fails closed; arbitrary remote/production
URLs are rejected. Expanding this scope requires a new adapter and review.

Shadow mode additionally requires a registered disposable-shadow purpose and
explicit allow_reset=true. Actual server identifier + database OID must differ
from the target, regardless of URL spelling. This permission is **false** in all
current test policies. Prisma-managed shadow diagnosis inherently resets its
shadow schema and was not executed under the user's no-reset instruction.
Instead, all 20 SQL files were replayed into a newly created, verified empty
local database and its catalog compared with a fresh migration deployment.
The engine child receives termination and a bounded SIGKILL fallback; temporary
files are removed on success/failure. PostgreSQL probe processes are synchronous
and disconnected on completion. Unknown RPC shapes never count as success.

## Manual reconciliation and required evidence

Use `scripts/reconcile-prisma-history.mjs`, which is read-only by default.
`--apply` is an explicit one-time maintenance action. The SQL is now at
`prisma/migrations/reconcile-prisma-history.sql`; Prisma only loads migration
subdirectories, and the fresh test still discovers exactly 20 migrations.
The obsolete v1 recipe is retained at migration-history/reconcile-v1.sql for
audit only: **do not execute it**. No install, startup, CI or deployment hook may
invoke either maintenance tool.

1. Review the source revision and freeze all migration/application writers.
2. Verify the exact container/endpoint, PostgreSQL system identifier, database
   OID/name, public schema and connection address/port against a reviewed policy.
3. Retain a SHA-256-verified backup and rehearse restoration in a distinct local
   database. Evidence must name and verify that restored database's identity.
4. Compare the full expected catalog against an independently deployed fresh
   reference with a distinct database identity. Pin its schema fingerprint.
5. Review required backfill coverage: no Client lacking its Workspace, no
   workspace owner lacking an active OWNER membership, no null account fields.
   These checks establish coverage, not the correctness of every subsequent
   legitimate business-state change; review those before live maintenance.
6. Supply versioned, recent (one-hour maximum), explicitly reviewed evidence:
   actual identity, backup path/hash and restore verification/identity, expected
   schema hash/reference identity, backfill-state hash and checked_at timestamp.
   Missing, mismatched, stale or unsupported evidence fails before applying.
7. Require 20 completed names, no unresolved attempts, and recognized checksums
   for every retained record. Unknown history fails both preflight and SQL.
8. Write an exclusive before audit containing the evidence checked, complete
   ledger and proposed `checksum` changes. Existing audit files are never
   overwritten. Do not continue if audit creation fails.
9. Only after approval, invoke --apply. SQL repeats identity, schema, coverage,
   evidence freshness and ledger guards under Prisma's advisory lock and row
   locks. It changes only recognized checksum variants, retaining IDs, logs,
   timestamps, step counts and rolled-back attempts. Preserve the after audit.
10. Confirm deployment/status, diagnosis, schema comparison and builds; retain
    backups and both audits permanently. Do not allow old/new SQL versions to
    execute concurrently.

The wrapper independently probes reference/restored identities and hashes the
actual backup bytes. The SQL cannot itself read/restore external backup files;
backup authenticity/restoration and business-state review remain explicit
reviewed evidence, not a guarantee inferred from a bare database name. The tool
is scoped to this exact 20-migration release. Do not reuse it for other releases
without regenerating/reviewing the manifest and checks.

## Separate lifecycle reconciliation states

- Current quoted checksum: leave unchanged.
- Completed historical quoted checksum 15e900...: after all preflight checks,
  update only metadata; its SQL differs from current only by a final blank line.
- Failed original unquoted checksum 0aa266...: reject completed-history
  reconciliation. Restore a backup locally, inventory every persisted object
  and account update, design only missing-object/corrected-backfill forward
  repairs, test every postcondition, and only then use migrate resolve --applied.
  Do not rerun the full CREATE/ALTER file over partial DDL. This forward repair
  remains a separate unperformed task, not a claimed success.
- A completed unquoted checksum or another unknown version requires investigation
  and must not be normalized automatically.
- Not attempted: run the quoted migration normally after validating CMS history.

## Rollback and remaining limitations

Only two reviewed active migration SQL files differ from the original checkout;
all original archives and prior user work remain preserved. Any history
transition requires source/hash coordination and retained before evidence.
Restore metadata only under the same exact identity/ID/hash controls and matching
old source revision; prefer fixing forward. Do not overwrite a live database
with a backup merely to revert metadata.

The actual Prisma datamodel still differs from deployed migration history. The
investigation report lists every object individually. Read-only comparison exits
2; no destructive generated migration or automatic schema fix was executed.
Prisma-managed reset-based shadow replay remains unrun in this verification;
non-reset direct replay succeeded. No merge/readiness claim should conceal
these limitations or assert coverage for untested platforms/databases.
