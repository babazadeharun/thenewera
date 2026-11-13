# Prisma CMS migration investigation

## FINAL DISPOSITION — code review closed

**MERGE: APPROVED** for the current remediation changes in this repository.
**DATABASE DEPLOYMENT: BLOCKED** for any production/existing deployment target.
This is an evidence-based technical merge decision, not execution or permission
for automatic application/database deployment. No merge or deployment occurred.
This disposition supersedes earlier requests for general investigation rounds.

### Scope and final classification

No outstanding schema difference is MUST FIX BEFORE MERGE for this bounded
remediation. None requires an automatic schema/database change before deploying
these exact checked-in SQL files: those files preserve the objects below. Every
listed difference is SAFE TO DEFER for this merge and retained-SQL workflow.
This classification does **not** approve db push, automatic migrate-dev generation,
accepting a destructive diff, removal of retained objects, or a different future
migration release. Those workflows require a separate intended-schema decision.

| Outstanding difference | Final classification | Evidence-based justification |
|---|---|---|
| Lead | SAFE TO DEFER | Explicitly deferred Marketing feature; original table retained; active routes/client do not depend on the missing model. |
| LeadSearch | SAFE TO DEFER | Deferred search/job implementation and historical migration deliberately preserved; no new drop or runtime change. |
| LeadResearchItem | SAFE TO DEFER | Deferred research model/data relationships retained by migration history; no need to reactivate feature to merge this fix. |
| Notification | SAFE TO DEFER | Active service uses CustomerNotification; this patch preserves the legacy Notification table and does not certify that its data is expendable. |
| LeadSearchStatus | SAFE TO DEFER | Enum belongs to explicitly deferred, retained search jobs; migration still creates it. |
| LeadStatus | SAFE TO DEFER | Deferred lead-state enum preserved; active application does not require client exposure. |
| LeadTargetType | SAFE TO DEFER | Deferred provider taxonomy preserved; no change to provider contract in this remediation. |
| NotificationType | SAFE TO DEFER | Legacy enum retained; current service's TypeScript types and CustomerNotification storage remain unchanged. |
| NotificationPriority | SAFE TO DEFER | Legacy priority enum retained; no active persisted-priority feature added or removed. |
| HomepageSection.eyebrow | SAFE TO DEFER | Column retained; no model-backed active reads/writes found. Enabling the editorial field is a separate feature decision. |
| Client.updatedAt database default | SAFE TO DEFER | Migration keeps CURRENT_TIMESTAMP and active Prisma @updatedAt behavior is unchanged; no fallback default is removed. |
| Event_externalSource_externalId_idx | SAFE TO DEFER | Checked-in SQL retains the lookup index; redundancy with the unique index does not justify a drop. |
| Event_externalSource_externalId_key | SAFE TO DEFER | SQL retains the actual uniqueness protection used by source/id ingestion; missing @@unique metadata does not remove the database constraint. |
| Event_isPublic_startsAt_idx | SAFE TO DEFER | Performance/visibility index remains in the database; deciding future public-query semantics is outside this patch. |
| Invoice_status_dueDate_id_idx | SAFE TO DEFER | Notification query tuning retained; no index removal or changed invoice behavior. |
| Project_deadline_status_idx | SAFE TO DEFER | Scheduled deadline-query index retained; no new performance regression from this remediation. |
| LeadResearchItem_leadId_fkey | SAFE TO DEFER | Existing SET NULL/CASCADE relation remains enforced; deferred model exposure is not needed to preserve it. |
| LeadResearchItem_searchId_fkey | SAFE TO DEFER | Existing CASCADE/CASCADE relation retained; no retention-policy change executed. |
| LeadSearch_createdByUserId_fkey | SAFE TO DEFER | Existing RESTRICT/CASCADE creator protection retained; no change to account-deletion behavior in this patch. |
| Notification_userId_fkey | SAFE TO DEFER | Existing SET NULL/CASCADE relation retained; legacy notification retirement/data treatment remains deferred. |

### Why Git merge is approved

The CMS duplicate has a strict, stage-specific catalog validator, not permissive
object-existence handling. Original SQL and hashes are archived; migration names
are preserved. The lifecycle change quotes the actual camelCase columns. The
compatibility plan explicitly addresses changed historical checksums and rejects
unknown/failed lifecycle variants. Maintenance tooling is manually invoked,
local-only and evidence-gated; package, Vercel and saved environment hooks do not
invoke reconciliation. Application schema and active application logic were not
changed by this remediation. The genuine pre-existing diff remains visible.

Previously collected evidence is sufficient for this bounded merge decision:
59 read-only tests, 11 guard integration tests, one full disposable-database
workflow, all 20 fresh migrations, repeat deployment/status, validation, direct
non-reset full-history replay, restored synthetic-backup reconciliation, and two
builds passed. Restored reconciliation changed only three checksum fields while
preserving all 21 ledger records and application data/schema. Read-only comparison
still exits 2. Prisma-managed reset/replay was **not run** and is not claimed
passed. It is not used by migrate deploy and is not, by itself, a blocker for
merging this tested SQL repair. Ordinary automatic migrate-dev generation remains
outside the approval while the datamodel differs from retained history.

### Exact database-deployment blockers

The intended existing/production target's ledger, checksums, persisted partial
DDL/backfills, custom catalog changes and verified backup are not known or
certified by these local tests. Both historical CMS and lifecycle hashes changed.
A production target could contain a completed old variant, a failed partial
lifecycle attempt, manual resolution, or drift incompatible with the strict
foundation guard. A synthetic fixture cannot authorize choosing a repair for it.
The current rehearsal adapter deliberately rejects arbitrary production endpoints.

These are MUST FIX BEFORE DATABASE DEPLOYMENT compatibility gates, not an
instruction to alter the Prisma schema blindly. No production reset or access is
required from this assistant to make the merge decision. A failed original
lifecycle target needs its own forward-repair transaction; it cannot be approved
by normalizing its checksum or rerunning CREATE/ALTER over partial DDL.

### Fixes, checks and single next action

The source fixes and targeted tests are already implemented and passed. No new
source, migration or schema blocker was identified that warrants another edit
or repeat of completed tests. This finalization changes only the report; no tests
or database operations were rerun.

**Single next action:** have the authorized database owner approve one
**target-specific compatibility rollout record**, backed by a verified backup
and rehearsal of that target's actual history on an isolated restored copy.
That record must select the completed-history reconciliation or failed-lifecycle
forward repair as appropriate, verify schema/backfill postconditions, and specify
an approved executor/identity policy. Until that owner sign-off exists, database
deployment remains blocked. This is a concrete change-control action, not another
open-ended investigation prompt. Git merge of the reviewed remediation may
proceed through the repository's normal approval process without authorizing
production maintenance or generating corrective migrations.

## Read-only follow-up: VERIFIED / PARTIAL / BLOCKED

The investigation is **not fully complete**. This follow-up did not run any
migration, reconciliation, shadow replay, reset, DROP or production operation.
Only this report was edited; the current migration/code/test work was preserved.
The compatibility plan was read and remains applicable within its local scope.

### VERIFIED now versus historical results

- Current files still contain the strict foundation catalog guard, all original
  archives/manifests, the quoted lifecycle fix, policy/datasource/RPC safeguards,
  audited manual reconciliation, and all three automated test files.
- `node --test scripts/tests/prisma-safety.test.mjs`: exit 0; **59 passed**,
  zero failures/skips. This suite has no database writes.
- Read-only `diagnose-prisma-history.mjs` on the registered local fresh fixture:
  exit 0; sanitized identity below; no missing, edited or failed migration history.
- `prisma validate`: exit 0.
- Read-only live-schema versus datamodel comparison: exit **2**, with the same
  individually listed differences. No corrective SQL was generated or executed.
- Documented future Bash/Node commands: syntax checked only with bash -n and
  node --check; none executed. All 406 other recorded working-tree files unchanged.
- `git diff --check`: passed. The 11 guard tests, full local workflow and two
  builds remain recorded prior successes; their files/evidence were inspected,
  but the write-capable integration suites and builds were not rerun here.

Exact safe commands executed from `/workspace/thenewera`:

```bash
node --test scripts/tests/prisma-safety.test.mjs
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_verify_0d147d41_fresh?schema=public' node scripts/diagnose-prisma-history.mjs --policy /workspace/.onboarding/thenewera/final-hardening/newera_verify_0d147d41-policy.json
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_verify_0d147d41_fresh?schema=public' ./node_modules/.bin/prisma validate
./node_modules/.bin/prisma migrate diff --from-url 'postgresql://thenewera@127.0.0.1:5432/newera_verify_0d147d41_fresh?schema=public' --to-schema-datamodel prisma/schema.prisma --exit-code
git diff --check
```

Verified sanitized fixture identity: database `newera_verify_0d147d41_fresh`,
database OID `51155`, PostgreSQL system identifier `7696469598012088349`, schema
`public`, endpoint `127.0.0.1:5432`, registered Docker container ID
`cbb4279935cca83cf30524c20f8be5175ab6397746722c6e7a4780957c9e1d3d`.
The psql verification probe runs through the container's local socket (reported
address `local-socket`, port 0), separately from the verified TCP port binding.
These pins describe this instance; do not transplant them or blindly refresh
pins when another instance differs.

### PARTIAL: precise shadow configuration and reset boundary

The pinned Prisma 5.17 engine's PostgreSQL implementation resets the schema
selected by the shadow URL before replay. It executes DROP SCHEMA CASCADE and
CREATE SCHEMA, and also attempts to drop its migration ledger in that shadow.
Providing a pre-created empty database does **not** disable this reset path.
Without an explicit shadow URL the engine can create a database automatically;
the helper instead constructs a verified temporary datasource containing the
explicit SHADOW_DATABASE_URL. Never rely on automatic shadow creation here.

Configuration required by the current helper:

- PostgreSQL 16 on the verified **local development-only** Docker container
  `thenewera-postgres`, bound solely to `127.0.0.1:5432`.
- A newly named, independently created database, using template0, owned by local
  role `thenewera`, with UTF-8/public schema, no application objects, and no other
  client sessions. No restores, shared data or other applications may use it.
- Explicit URL `postgresql://thenewera@127.0.0.1:5432/<new_database>?schema=public`.
  Other hosts, roles, credentials, schemas and URL options are rejected by this
  local adapter. Do not work around those rejections.
- The shadow login must CONNECT, own the database/schema (including PostgreSQL
  16's pg_database_owner ownership of public), and be able to drop/recreate only
  the selected shadow schema and apply its DDL. Explicitly provided shadows do
  not require the engine to create a database. Provisioning itself needs CREATEDB.
  Current local role was verified LOGIN/CREATEDB/superuser, database owner, with
  CONNECT and public CREATE. That broad role is local-only; this is not a
  recommendation or authorization for equivalent production privileges.
- Policy pins must match container ID/port binding and actual PostgreSQL system
  identifier, database name/OID, public schema and probe address/port. Actual
  server identifier + database OID must differ from the main target.
- Register purpose `disposable-shadow`, with `allow_reset:false` initially.
  Only an explicit identity-specific confirmation may grant a temporary,
  one-command `allow_reset:true` policy. Recheck identity and exclusive use after
  confirmation and immediately before engine startup.

A physically separate server or least-privilege alternative role would require
reviewed adapter changes; the current helper does not support it. Do not reuse
an unknown/shared server just to satisfy the helper's hard-coded endpoint.

### Exact next-step commands (NOT EXECUTED; future approval required)

The following procedure is provided for a future approved local rehearsal.
**It is not authorized or executed in this follow-up.** Review that the pinned
container is exclusively a synthetic development instance before provisioning.
All metadata probes are read-only. Creation refuses a pre-existing database name;
no existing database is migrated, restored, reset or reconciled by preparation.

```bash
cd /workspace/thenewera
export DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_verify_0d147d41_fresh?schema=public'
export NEWERA_SHADOW_BASE_POLICY='/workspace/.onboarding/thenewera/final-hardening/newera_verify_0d147d41-policy.json'
export NEWERA_SHADOW_PLAN='/workspace/.onboarding/thenewera/final-hardening/next-shadow-plan.json'
node --input-type=module <<'JS'
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {identityFromUrl,probe,query,identityQuery,assertSeparateTargets} from './scripts/prisma-safety.mjs';
const policy=JSON.parse(readFileSync(process.env.NEWERA_SHADOW_BASE_POLICY,'utf8'));
if(existsSync(process.env.NEWERA_SHADOW_PLAN)) throw new Error('Plan already exists; review it, do not overwrite it.');
const target=probe(policy,identityFromUrl(process.env.DATABASE_URL));
const admin=probe(policy,{database:'postgres',schema:'public',endpoint:'127.0.0.1:5432'});
assert.equal(admin.server_identifier,target.server_identifier);
const database='newera_shadow_'+randomBytes(8).toString('hex');
execFileSync('docker',['exec','thenewera-postgres','createdb','-U','thenewera','--owner=thenewera','--template=template0','--encoding=UTF8',database]);
const shadow=JSON.parse(query(database,identityQuery));
assert.equal(shadow.database,database);
assert.equal(shadow.server_identifier,admin.server_identifier);
assertSeparateTargets(target,shadow);
policy.databases[database]={...shadow,purpose:'disposable-shadow',allow_reset:false};
const checks=JSON.parse(query(database,`SELECT jsonb_build_object(
 'owner',(SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()),
 'public_exists',EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='public'),
 'public_create',has_schema_privilege('thenewera','public','CREATE'),
 'objects',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%'),
 'other_clients',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'));`));
assert.equal(checks.owner,'thenewera');assert.equal(checks.public_exists,true);
assert.equal(checks.public_create,true);assert.equal(checks.objects,0);assert.equal(checks.other_clients,0);
writeFileSync(process.env.NEWERA_SHADOW_PLAN,JSON.stringify({policy,target,shadow,checks},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({endpoint:policy.endpoint,container_id:policy.container_id,target,shadow,checks,allow_reset:false},null,2));
JS
```

**STOP and review the printed identity.** The following reset-capable command
requires explicit confirmation that this particular target is disposable, not
shared, contains no valuable data, and the local container is development-only.
Creation alone is not confirmation. Do not run it under the current no-reset
instruction. It approves one shadow diagnosis only, not migration generation,
main-database resets, reconciliation, cleanup, merging or deployment.

```bash
node --input-type=module -e '
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {createInterface} from "node:readline/promises";
import assert from "node:assert/strict";
import {identityFromUrl,probe,query,assertSeparateTargets} from "./scripts/prisma-safety.mjs";
const plan=JSON.parse(readFileSync(process.env.NEWERA_SHADOW_PLAN,"utf8"));
const target=probe(plan.policy,identityFromUrl(process.env.DATABASE_URL));
const shadow=probe(plan.policy,{database:plan.shadow.database,schema:"public",endpoint:plan.policy.endpoint});
assert.deepEqual(target,plan.target);assert.deepEqual(shadow,plan.shadow);
assertSeparateTargets(target,shadow);
console.log(JSON.stringify({endpoint:plan.policy.endpoint,container_id:plan.policy.container_id,target,shadow},null,2));
const phrase=`CONFIRM DISPOSABLE ${shadow.server_identifier}/${shadow.database_oid}/${shadow.database}/public`;
const terminal=createInterface({input:process.stdin,output:process.stdout});
let answer;try {answer=await terminal.question(`This will DROP/recreate only this shadow public schema. Type exactly: ${phrase}\n`);} finally {terminal.close();}
if(answer!==phrase) throw new Error("No identity-specific disposable confirmation; reset denied.");
probe(plan.policy,identityFromUrl(process.env.DATABASE_URL));
probe(plan.policy,{database:shadow.database,schema:"public",endpoint:plan.policy.endpoint});
const checks=JSON.parse(query(shadow.database,`SELECT jsonb_build_object(
 $$owner$$,(SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()),
 $$public_exists$$,EXISTS(SELECT 1 FROM pg_namespace WHERE nspname=$$public$$),
 $$public_create$$,has_schema_privilege($$thenewera$$,$$public$$,$$CREATE$$),
 $$objects$$,(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ($$pg_catalog$$,$$information_schema$$) AND n.nspname NOT LIKE $$pg_%$$),
 $$other_clients$$,(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type=$$client backend$$));`));
assert.equal(checks.owner,"thenewera");assert.equal(checks.public_exists,true);assert.equal(checks.public_create,true);
assert.equal(checks.objects,0);assert.equal(checks.other_clients,0);
const temporary=mkdtempSync(join(tmpdir(),"newera-approved-shadow-"));
try {
 const path=join(temporary,"policy.json");
 plan.policy.databases[shadow.database].allow_reset=true;
 writeFileSync(path,JSON.stringify(plan.policy),{mode:0o600});
 execFileSync(process.execPath,["scripts/diagnose-prisma-history.mjs","--policy",path,"--shadow"],
  {stdio:"inherit",env:{...process.env,SHADOW_DATABASE_URL:`postgresql://thenewera@127.0.0.1:5432/${shadow.database}?schema=public`}});
} finally {rmSync(temporary,{recursive:true,force:true});}
'
```

The prepared policy keeps reset disabled. The approved policy is temporary and
removed on success/failure; no database cleanup is performed. Do not rerun a
reset-capable command without fresh identity checks and explicit confirmation.
The confirmed command has not been executed, so engine-managed replay remains
BLOCKED. Direct file replay from the previous round remains PARTIAL evidence,
not proof of the engine-managed reset/replay path.

### Individual schema-difference decisions

No automatic schema changes or corrective migrations are proposed for execution.
The same database-versus-datamodel comparison remains exit 2. The migration
schema is not assumed wrong simply because Prisma omits an object. Production
record counts and performance plans must come from an authorized owner as
sanitized evidence; no production access was performed to obtain them.

| Exact object | Current evidence and classification | Decision/evidence needed; conditional change |
|---|---|---|
| Lead | Explicitly deferred Marketing model; migration retains company/contact/status records. | Retention and feature roadmap. Restore a compatible model only if client exposure is approved; otherwise choose a reviewed retained-object/migration-schema strategy without dropping it. |
| LeadSearch | Deferred job/search model; original migration records creator and job status. | Job lifecycle and retained-search contract. Same schema representation decision; no active job code reactivation without approval. |
| LeadResearchItem | Deferred provider/research evidence linked to searches/leads. | Audit/research retention and provider-field contract. Preserve data; schema/relation restoration only if approved. |
| Notification | Active notification service writes CustomerNotification, not this richer legacy table. Candidate intentional storage transition; retirement is not proven. | Confirm storage contract, legacy-record treatment, eventKey deduplication, metadata and priority requirements. Restore model/code only if legacy semantics remain required. |
| LeadSearchStatus | Deferred job-state enum (QUEUED/RUNNING/COMPLETED/FAILED/CANCELLED). | Confirm job transitions and deferred-model strategy; represent retained enum with retained model if chosen. |
| LeadStatus | Deferred lead qualification/contact/conversion states. | Confirm CRM/lead lifecycle values and retained-model strategy; do not remove persisted enum. |
| LeadTargetType | Deferred search/provider target taxonomy. | Confirm supported search categories/provider mappings before client/schema restoration. |
| NotificationType | Legacy SQL enum; active service uses a matching TypeScript union and CustomerNotification.type string. | Decide whether DB-level enum validation is intended for the active store or only retained legacy data. Requires schema/code design if restored, not an automatic enum removal. |
| NotificationPriority | Legacy enum; TypeScript priority type exists, but current CustomerNotification writes do not persist this field. | Product priority/ordering requirements and legacy-data contract. Add schema/code only if priority storage is required. |
| HomepageSection.eyebrow | Migration adds nullable TEXT; no model-backed property reads/writes found in current source. CSS classes called eyebrow are not this field. | CMS design/editorial contract and history; restore nullable Prisma field plus UI/API mapping if desired. Otherwise retain dormant column intentionally. |
| Client.updatedAt database default | Migration intentionally creates NOT NULL with CURRENT_TIMESTAMP; model has @updatedAt without @default. | Inventory ORM versus raw SQL/import writers and timestamp contract. If DB fallback is intended, @default(now()) plus @updatedAt is a schema-only candidate; if application-only is intended, any future default removal needs separate review. |
| Event_externalSource_externalId_idx | Active sync filters exactly these fields; nonunique B-tree overlaps the unique B-tree on the same fields. | Query plans and index workload. Add @@index metadata if retention intended; redundancy is only a candidate, never grounds for dropping without evidence. |
| Event_externalSource_externalId_key | Active sync uses source/id identity; existing unique index protects concurrent duplicate ingestion even though Prisma lacks compound uniqueness. | Confirm cross-provider idempotency and null semantics. Likely @@unique metadata restoration if that contract is retained; consider compound upsert code separately. |
| Event_isPublic_startsAt_idx | Public flag exists, but current public page filters status and orders startsAt rather than filtering isPublic. | Approved visibility rules and representative public/admin query plans. May be anticipatory/manual tuning; represent @@index if retained. |
| Invoice_status_dueDate_id_idx | Scheduled notifications filter status/dueDate; model already has a two-column status/dueDate index. | Plans, pagination/tie-breaker/coverage needs and row cardinality. Third-column index may be intentional tuning; @@index metadata if retained, no automatic drop of either index. |
| Project_deadline_status_idx | Scheduled notifications use deadline ranges and incomplete status; model lacks this index. | Query plans and notification throughput. Likely schema metadata restoration if the performance contract is retained; code changes only if query semantics change. |
| LeadResearchItem_leadId_fkey | Legacy relation ON DELETE SET NULL / ON UPDATE CASCADE; retained research can outlive a lead. | Confirm deletion/retention semantics. Represent matching nullable relation with retained models if chosen; do not infer obsolete constraint from missing Prisma model. |
| LeadResearchItem_searchId_fkey | Legacy relation ON DELETE CASCADE / ON UPDATE CASCADE. | Confirm whether deleting a search should delete research items. Restore matching relation metadata only under approved retained-model contract. |
| LeadSearch_createdByUserId_fkey | Legacy creator relation ON DELETE RESTRICT / ON UPDATE CASCADE. | Account deletion versus retained-search ownership contract. Missing Prisma relation does not justify removing protection or changing account-deletion behavior. |
| Notification_userId_fkey | Legacy optional user relation ON DELETE SET NULL / ON UPDATE CASCADE; newer CustomerNotification uses a different storage/retention design. | Decide whether user deletion should retain legacy notifications and how the storage transition treats them. Preserve FK unless a separate migration/data plan is approved. |

Strong evidence for intentional Marketing drift is `_deferred/marketing/README.md`:
it explicitly excludes Marketing from the active app and Prisma client while
preserving the historical migration. Relevant code is confined to _deferred and
excluded by tsconfig. That intent does not make a destructive generated diff safe.
A reviewed way to represent retained objects in the migration datamodel, or a
separately maintained migration/client-schema strategy, is still required before
ordinary migrate-dev generation is treated as safe. Choosing such a strategy
is a coding/tooling decision, not a reason to delete historical tables.

Notification storage, unused eyebrow, manual/overlapping indexes and the timestamp
default have differing levels of evidence; they remain product/schema decisions,
not all confirmed bugs. Active external-sync and scheduled-notification queries
provide concrete reasons to preserve integrity/performance objects until review.

### Remaining blockers and next steps

1. Obtain explicit disposable-target confirmation for one future engine-managed
   replay only after the provision/identity checks above; current instruction
   still prohibits its reset. Do not infer confirmation from provisioning or
   prior successful direct replay.
2. Review each schema decision with the feature/data owner; retain read-only
   comparison exit 2 until differences are genuinely resolved or a maintained
   migration/client-schema boundary is approved. Do not silence or drop them.
3. After those decisions, scope any code/schema changes and their tests as a
   separate approved task. Failed lifecycle histories still require their own
   restored-backup forward-repair plan; no reconciliation was run here.
4. Keep merge, deployment and production maintenance blocked. This report does
   not claim that the investigation or production compatibility is complete.

## Final hardening verification (supersedes earlier guard/tool instructions)

The CMS guard, CLI/response handling, and reconciliation findings are fixed
within the supported local PostgreSQL 16/public workflow. Shadow routing is
**partially fixed**: safeguards are implemented, but Prisma-managed shadow
replay is **not revalidated**
in this round: it resets the shadow schema, prohibited by the latest instruction.
The safe substitute is direct full-history replay into a newly created empty
shadow. No production database, merge, application deployment, database reset,
object drop or destructive generated migration was performed.

### Changes and compatibility

- Strict CMS guard: explicit public-schema checks; ordered enum labels/type;
  exact Media/Hero/HomepageSection/SiteSetting column definitions including
  types, nullability, defaults, identity/generation; primary/unique/foreign/check
  constraints and validation/deferral; indexes, uniqueness, predicates and
  validity/readiness. Errors identify the table, column, enum, index or constraint.
  It is stage-specific: later enum additions and eyebrow are not accepted when
  manually rerunning this foundation guard on a fully migrated database.
- Structural temporary datasource: tokenize and verify exactly one supported
  datasource, then build a minimal temporary PostgreSQL schema with explicit
  target/shadow environment bindings. No whitespace replacement or checked-in
  schema modification. Ambiguous/unsupported configuration fails closed.
- Policy/identity checks: loopback Docker container ID and endpoint, PostgreSQL
  system identifier, database OID/name, intended schema and server connection
  identity. Actual server/OID separation is checked, not URL spelling.
  Remote endpoints fail closed; this is intentionally a local rehearsal tool.
- Strict options and responses: --shdaow and all unknown/repeated arguments fail;
  missing targets fail; full pinned RPC result shapes are validated; executed
  mode and sanitized identity are printed. Child termination has a bounded
  fallback and all temporary configuration files are removed.
- Manual reconciliation: new audited wrapper defaults to read-only preflight.
  Explicit --apply requires reviewed identity policy, actual backup SHA-256,
  verified distinct restore/reference identities, expected schema fingerprint,
  required backfill-state hash, evidence freshness and recognized completed
  history. SQL repeats guards under advisory/row locks. Before/after evidence
  records exactly which checksum fields change. No hook invokes it.

Current CMS checksum: `a036ccc0c3ddf769e42cd60005d938571b8b201a6313bac150ebf72ac065871e`. The old existence-only guard is archived at
`prisma/migration-history/cms-existence-guard-v1.sql`; its e435de... checksum is an
explicit accepted compatibility variant. Original SQL archives remain unchanged.
The original scripts/reconcile-prisma-history.sql was moved to the audit-only
`prisma/migration-history/reconcile-v1.sql`; the stronger manual SQL is now at
`prisma/migrations/reconcile-prisma-history.sql`, as requested. It is a root SQL
file, not an automatically discovered migration directory.

### Automated verification: actual commands and outcomes

Read-only tests ran before creating/writing integration databases:

```bash
node --test scripts/tests/prisma-safety.test.mjs
```

First run: 46 passed, zero failures/skips. Final expanded run: **59 passed**,
zero failures/skips. Covers invalid CLI arguments and actual subprocess exits,
missing/unsupported targets, identity mismatch properties, same actual database
identity, explicit shadow reset denial, mode selection, varying whitespace and
ambiguous datasource definitions, malformed/unsafe RPC results, missing/stale
backup/schema/backfill evidence, unknown/incomplete ledger states, release hashes,
and equality of embedded catalog with its reviewed snapshot.

```bash
NEWERA_LOCAL_INTEGRATION=1 NEWERA_POLICY=/workspace/.onboarding/thenewera/final-hardening/policy.json NEWERA_INTEGRATION_RECORD=/workspace/.onboarding/thenewera/final-hardening/integration-record.json node --test scripts/tests/prisma-integration.test.mjs
```

**11 passed**, zero failures/skips. Positive foundation plus incompatible enum
labels, wrong enum kind, malformed column type/nullability, wrong default,
wrong index, wrong primary key, wrong foreign-key action, extra check constraint,
and wrong intended schema. The first run had one fixture failure: changing the
primary key removed the uniqueness needed by the foundation's foreign keys.
The fixture was corrected to retain id uniqueness while testing the incompatible
primary key, and the full suite passed. No assertion was weakened or skipped.
Every case created a new local database, verified server/name/OID and empty
public catalog before writing, and retained it without reset/drop cleanup.

```bash
NEWERA_LOCAL_INTEGRATION=1 NEWERA_POLICY=/workspace/.onboarding/thenewera/final-hardening/policy.json node --test scripts/tests/prisma-workflow.test.mjs
```

**1 full integration workflow passed**, zero failures/skips. Its recorded
identities and command exits are in
`/workspace/.onboarding/thenewera/final-hardening/newera_verify_0d147d41-results.json`.
Targets: `newera_verify_0d147d41_fresh`, `newera_verify_0d147d41_shadow`,
`newera_verify_0d147d41_restored`, `newera_verify_0d147d41_restore_evidence`.
The recorded policy binds every name to its actual OID, server and container.

| Check | Actual result |
|---|---|
| Fresh local `prisma migrate deploy` | Exit 0; all 20 migrations, no manual recovery |
| Repeated deploy and `migrate status`, fresh and restored | Exit 0; no pending migrations, up to date |
| `prisma validate`, fresh and restored | Exit 0 |
| Read-only history diagnosis, fresh and restored | Exit 0; no missing/failed/edited history |
| Direct replay of all 20 migration SQL files into new empty shadow | Exit 0; catalog fingerprint exactly matches fresh deployment |
| Prisma-managed shadow mode with current no-reset policy | Exit 1 before engine startup; explicitly denied |
| Verified synthetic backup restored into two new empty databases | Both exit 0; known SHA-256 checked |
| Reconciliation dry-run with complete evidence | Exit 0; records identity/evidence/proposed changes |
| Direct SQL with missing evidence | Exit 3; transaction aborted, no checksum changes |
| Wrapper with wrong server evidence | Exit 1; no apply operation |
| Explicit reconciliation on verified restored fixture | Exit 0; exactly three checksum changes, all 21 ledger rows retained |
| Schema/application data before versus after reconciliation | Equal; all non-checksum ledger fields preserved |
| Read-only migration-database versus Prisma datamodel diff | Exit 2; genuine differences remain |
| `npm run build`, fresh and restored | Both exit 0; Prisma generation, compilation/type checking, 73 static pages |
| Final updated CLI diagnosis and dry-run | Both exit 0; no remaining checksum changes |

The workflow invokes Prisma migrate deploy only for these verified disposable
local test databases; no application or production deployment was performed.
It runs psql file replay without resets/drops. Logs for every subprocess are
retained beside its result manifest. The final diagnostic and dry-run commands:

```bash
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_verify_0d147d41_restored?schema=public' node scripts/diagnose-prisma-history.mjs --policy /workspace/.onboarding/thenewera/final-hardening/newera_verify_0d147d41-policy.json
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_verify_0d147d41_restored?schema=public' node scripts/reconcile-prisma-history.mjs --policy /workspace/.onboarding/thenewera/final-hardening/newera_verify_0d147d41-policy.json --evidence /workspace/.onboarding/thenewera/final-hardening/newera_verify_0d147d41-evidence.json --audit /workspace/.onboarding/thenewera/final-hardening/final-read-only-audit-v3.json
```

The full workflow's explicit --apply command ran only after this backup/schema/
backfill rehearsal and target verification. Before/after JSON audit files use
exclusive creation and are retained; missing evidence cannot authorize apply.
Manual evidence of restoration/business-state review remains a human obligation,
not something inferred from matching database names. The current evidence covers
coverage checks, not all possible subsequent legitimate business-state changes.

### Exact schema-difference inventory (no destructive fixes)

This read-only comparison remains exit **2**:

```bash
./node_modules/.bin/prisma migrate diff --from-url 'postgresql://thenewera@127.0.0.1:5432/newera_verify_0d147d41_fresh?schema=public' --to-schema-datamodel prisma/schema.prisma --exit-code
```

Objects present in migration history but absent/different in the current datamodel:

| Kind | Exact object |
|---|---|
| Table | Lead |
| Table | LeadResearchItem |
| Table | LeadSearch |
| Table | Notification |
| Enum | LeadSearchStatus |
| Enum | LeadStatus |
| Enum | LeadTargetType |
| Enum | NotificationPriority |
| Enum | NotificationType |
| Column | Missing HomepageSection.eyebrow |
| Default | Missing database default on Client.updatedAt |
| Index | Event_externalSource_externalId_idx |
| Unique index | Event_externalSource_externalId_key |
| Index | Event_isPublic_startsAt_idx |
| Index | Invoice_status_dueDate_id_idx |
| Index | Project_deadline_status_idx |
| Foreign key | LeadResearchItem_leadId_fkey |
| Foreign key | LeadResearchItem_searchId_fkey |
| Foreign key | LeadSearch_createdByUserId_fkey |
| Foreign key | Notification_userId_fkey |

No schema object was dropped, no destructive diff script was executed, and the
Prisma schema was not assumed correct. Decide the intended application behavior
for each object in a separate reviewed task. Do not accept automatic destructive
migrate-dev output. Direct non-reset replay is validated; Prisma-managed reset-
based shadow replay and other schemas/platforms remain explicitly untested here.

### Safe rollout boundaries

Use the updated COMPATIBILITY.md and manifest, not the superseded recipes below.
Only manually approved local rehearsals may invoke the reconciliation wrapper;
it is not installed into hooks. Expanding beyond the verified loopback adapter
requires additional review and endpoint/identity adapters. Existing failed
unquoted lifecycle attempts remain a separate forward-repair plan and cannot be
normalized by this completed-history procedure. Merge/application rollout/live
maintenance still require approval; none was performed. Preserve audited backup,
restore identities, schema/backfill evidence and metadata before/after records.
All unrelated tracked user work was checked against the pre-edit snapshot.

## Earlier remediation (superseded safety instructions): repeatable deployment and shadow replay

This section supersedes the earlier CMS-recovery instructions below. Those
sections are retained as historical investigation results. The compatibility
plan was written and the risks were reported before changing the active CMS file.
See `prisma/migration-history/COMPATIBILITY.md` for the reviewed transition.
No production access, merge, or application deployment occurred.

### What changed and why

Prisma 5.17.0's pinned engine commit
`393aa359c9ad4a4bb28630fb5613f9c281cde053` was inspected directly:

- [PostgreSQL shadow replay](https://github.com/prisma/prisma-engines/blob/393aa359c9ad4a4bb28630fb5613f9c281cde053/schema-engine/connectors/sql-schema-connector/src/flavour/postgres.rs#L393)
  resets the designated shadow schema and replays migration files. Deployment
  ledger resolution cannot make duplicate SQL replay-safe.
- [History diagnosis](https://github.com/prisma/prisma-engines/blob/393aa359c9ad4a4bb28630fb5613f9c281cde053/schema-engine/core/src/commands/diagnose_migration_history.rs#L83)
  compares file checksums with stored records, including a retained earlier
  failed record for the same name.
- [Mark-applied behavior](https://github.com/prisma/prisma-engines/blob/393aa359c9ad4a4bb28630fb5613f9c281cde053/schema-engine/core/src/commands/mark_migration_applied.rs)
  rejects a name already successfully applied. It is not a checksum replacement
  operation for completed migrations.

The duplicate `20260929170000_add_cms_media_hero_homepage` retains its name but
now performs a guarded no-op. Its enum and three tables must exist from the
preceding foundation; missing foundation objects raise an exception. It changes
no schema or application data. All 13 original statements were redundant.
The guard is deliberately an existence precondition, not a full drift validator.
Existing databases require the separate schema comparison described below.

Original CMS SQL and both historical lifecycle versions are preserved byte for
byte in `prisma/migration-history/`, with original and reviewed active hashes
in `manifest.json`. The reviewed active CMS checksum is
`e435decc19450774e797ae0cbd970c1a4b2b32f6447ad57643f2855fd8b4e097`.
The quoted lifecycle SQL remains unchanged from the previous fix, checksum
`99da26ae19303118800417b6f5e24c21ea5d305a90c53f998b2abcf19b4c1186`.
All 20 active migration identities remain present. All 388 unrelated tracked
files still match HEAD byte-for-byte.

Two explicit maintenance tools were added:

- `scripts/diagnose-prisma-history.mjs`: pinned-engine JSON-RPC history diagnosis;
  read-only by default, optionally with an explicitly disposable shadow database.
  It fails if migrations are edited, failed, missing, or drifted. It must be
  reassessed on a Prisma upgrade because it uses engine JSON-RPC directly.
- `scripts/reconcile-prisma-history.sql`: a one-time, guarded metadata transition
  for this exact 20-migration release. It requires a checked backup, schema and
  backfills, locks the ledger using Prisma's advisory lock plus row locks, checks
  database identity, accepts only known hashes, and updates only those hashes.
  It does not establish the external backup/schema/data preconditions itself.
  Never attach it to install hooks or ordinary deployment.

### Representative backup and lifecycle reconciliation

Only synthetic local data was used. A legacy fixture was built using original
CMS SQL and the actually runnable, quoted lifecycle SQL from Git commit
`c93a1a9fa149af03683b57acb61ab5bcaffe1002`, checksum
`15e9002bee02b4b52c8edca482111f59bf9ab189aaaae89ab18b91b7159cabce`.
That lifecycle version differs from the current quoted SQL only by a final
blank line, verified by exact trailing-whitespace normalization. The legacy CMS
failure was resolved using the original file, all remaining migrations applied,
and synthetic client, user, workspace, membership and CMS media/settings rows
were added. No hashes were invented to manufacture a legacy fixture.

The custom-format backup was written to
`/workspace/.onboarding/thenewera/compatibility/legacy.dump`, SHA-256
`09b0f925a37d960af257b3958113045996c0fb9cd7f850a84cc3412a83851450`,
and restored into the newly created `newera_legacy_restored` database.
Commands (repository working directory: `/workspace/thenewera`):

```bash
docker exec thenewera-postgres pg_dump -U thenewera -Fc newera_legacy_backup_source > /workspace/.onboarding/thenewera/compatibility/legacy.dump
docker exec thenewera-postgres createdb -U thenewera newera_legacy_restored
docker exec -i thenewera-postgres pg_restore -U thenewera -d newera_legacy_restored --exit-on-error < /workspace/.onboarding/thenewera/compatibility/legacy.dump
```

Separate lifecycle reconciliation states:

1. Completed current quoted checksum: leave it unchanged.
2. Completed historical quoted checksum `15e900...`: after a verified backup,
   zero schema diff and backfill checks, reconcile only the checksum. No SQL
   backfill is rerun, because the versions are semantically identical.
3. Failed original unquoted checksum `0aa266...`: reject this transaction.
   Restore a backup locally, inspect persisted enums/columns/tables/constraints
   and the two account updates, then design a transaction that adds only missing
   objects and performs the corrected workspace/membership backfills. Verify
   every lifecycle postcondition before marking the failed migration applied
   through Prisma. Do not rerun the entire CREATE/ALTER file over partial DDL.
   A restored failed fixture was tested for rejection; forward repair is planned,
   not performed or claimed validated.
4. A completed record with the unquoted checksum cannot be presumed legitimate
   against the canonical camelCase schema; investigate and reject automatic
   reconciliation. Other unknown variants also require review.
5. Not yet attempted: run the corrected migration normally after inspecting CMS
   history. Do not fabricate an applied lifecycle record.

### Exact test commands and results

Fresh database, without manual CMS resolution:

```bash
docker exec thenewera-postgres createdb -U thenewera newera_guard_fresh
export DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_guard_fresh?schema=public'
./node_modules/.bin/prisma migrate deploy
```

Exit 0: all **20 migrations applied in one sequence**, 20 ledger rows, zero
failed or rolled-back attempts. Repeated deploy exited 0 with no pending migrations.

Before reconciling the restored fixture, compare it to this independent fresh
reference and diagnose its real history checksums:

```bash
./node_modules/.bin/prisma migrate diff --from-url 'postgresql://thenewera@127.0.0.1:5432/newera_guard_fresh?schema=public' --to-url 'postgresql://thenewera@127.0.0.1:5432/newera_legacy_restored?schema=public' --exit-code
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_legacy_restored?schema=public' node scripts/diagnose-prisma-history.mjs
```

Schema comparison: exit 0, no difference. History diagnosis before maintenance:
exit 1, edited CMS and lifecycle names, no failed migrations or missing history.
The before ledger was exported as complete JSON rows. Full schema and data-only
pg_dump snapshots were retained, excluding only the migration ledger from the
application-data snapshot and normalizing randomized dump restriction tokens.

```bash
docker exec -i thenewera-postgres psql -U thenewera -d newera_legacy_restored -v expected_database=WRONG_DATABASE -f - < scripts/reconcile-prisma-history.sql
docker exec -i thenewera-postgres psql -U thenewera -d newera_legacy_restored -v expected_database=newera_legacy_restored -f - < scripts/reconcile-prisma-history.sql
```

Wrong identity: exit 3 with a guard error; transaction rolled back. Correct
identity: exit 0, UPDATE 3 and COMMIT. Exactly two CMS records (retained rolled-back
attempt plus completed resolution) and one completed lifecycle checksum changed.
All 21 ledger rows remained; every non-checksum field matched its before export.
Full application-data and schema dumps remained byte-for-byte equal after
normalization. Repeated deployment did not alter application data.

A backup of the original failed-lifecycle investigation database was also restored
into `newera_failed_restored`. Running the same transaction with that correct
identity exited 3 at the complete-history guard. Its entire ledger remained
unchanged. Directly executing the CMS guard in the newly empty
`newera_cms_guard_missing` database exited 3 with `CMS foundation is missing`.

For both fresh and reconciled-restored targets:

```bash
for database_name in newera_guard_fresh newera_legacy_restored; do
  export DATABASE_URL="postgresql://thenewera@127.0.0.1:5432/$database_name?schema=public"
  ./node_modules/.bin/prisma migrate deploy
  ./node_modules/.bin/prisma migrate status
  ./node_modules/.bin/prisma validate
done
```

Every command exited 0. Deploy: no pending migrations. Status: database schema
up to date. Validation: valid schema. Read-only history diagnosis exited 0 for
both targets with empty edited/failed arrays and no missing history.

Dedicated disposable shadows were created as `newera_guard_shadow` and
`newera_guard_shadow_restored`. For each corresponding target/shadow pair:

```bash
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_guard_fresh?schema=public' SHADOW_DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_guard_shadow?schema=public' node scripts/diagnose-prisma-history.mjs --shadow
./node_modules/.bin/prisma migrate diff --from-migrations prisma/migrations --to-url 'postgresql://thenewera@127.0.0.1:5432/newera_guard_fresh?schema=public' --shadow-database-url 'postgresql://thenewera@127.0.0.1:5432/newera_guard_shadow?schema=public' --exit-code
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_legacy_restored?schema=public' SHADOW_DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_guard_shadow_restored?schema=public' node scripts/diagnose-prisma-history.mjs --shadow
./node_modules/.bin/prisma migrate diff --from-migrations prisma/migrations --to-url 'postgresql://thenewera@127.0.0.1:5432/newera_legacy_restored?schema=public' --shadow-database-url 'postgresql://thenewera@127.0.0.1:5432/newera_guard_shadow_restored?schema=public' --exit-code
```

All four commands exited 0: full shadow replay completed with no migration
history drift, no P3006, and no differences against either deployed database.
Prisma rebuilt only these explicitly disposable shadow schemas.

```bash
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_guard_fresh?schema=public' NEXT_TELEMETRY_DISABLED=1 npm run build
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_legacy_restored?schema=public' NEXT_TELEMETRY_DISABLED=1 npm run build
```

Both builds exited 0, including Prisma generation, Next.js compilation/type
checking, generation of 73 static pages, and optimization. Archive hashes and
unrelated tracked files passed byte-for-byte checks; `git diff --check` passed.

### Remaining datamodel mismatch and safe rollout

This additional check successfully replayed the files but reported differences:

```bash
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_guard_fresh?schema=public' ./node_modules/.bin/prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url 'postgresql://thenewera@127.0.0.1:5432/newera_guard_shadow?schema=public' --exit-code
```

Exit **2 (nonempty diff)**, not P3006. The current datamodel omits the Lead,
LeadSearch, LeadResearchItem and Notification tables and five associated enums;
`HomepageSection.eyebrow`; Event external-source indexes and public/date index;
Invoice status/due-date/id and Project deadline/status indexes. It also omits
Client.updatedAt's database default. This pre-existing mismatch is outside the
CMS history transition. No generated destructive diff was executed and no model
or table was removed. Ordinary `migrate dev` can now replay history but must not
be used to accept those destructive changes automatically. Reconcile intended
models/indexes/defaults in a separate reviewed coding/migration task.

Rollout requires explicit approval before merging, application deployment or
any live database maintenance. Review the archived originals, manifest, exact
source diff and compatibility plan. For each database, freeze migration writers,
verify a restorable backup, inspect all ledger states/checksums, compare schema
against an independent fresh reference, and verify backfills. Only a recognized,
fully completed history is eligible for the guarded checksum transaction; keep
its before/after exports and backup permanently. Then confirm history diagnosis,
deploy/status, replay, validation and build before releasing that database from
maintenance. Coordinate source-version rollout so older migration binaries and
SQL revisions cannot run concurrently. Treat the failed lifecycle case as a
separate forward-repair operation with its own restored-backup rehearsal.

Artifacts retained under `/workspace/.onboarding/thenewera/compatibility/` include
both local backups, ledger before/after exports, reconciliation audit output,
and pre-maintenance schema/data snapshots. These test results do not establish
that any production database has the same history or is eligible for transition.

## Earlier investigation (historical results; superseded where noted)

## Verified lifecycle fix and fresh-database retest

The workspace backfill statement at lines 82–92 of
`20261008193000_add_account_lifecycle/migration.sql` is an `INSERT INTO
"Workspace" ... SELECT ... FROM "Client" c LEFT JOIN "User" u ...`.
Its name expression formerly referenced unquoted `c.firstName` and `c.lastName`.
The baseline migration creates `"firstName" TEXT NOT NULL` and
`"lastName" TEXT NOT NULL`; Prisma's `Client` model has the same names without
`@map`. `information_schema.columns` in the investigation database confirmed
both exact camelCase names. PostgreSQL folds unquoted names to lowercase.

The complete SQL diff was reviewed before applying this one-line change:

```diff
-       COALESCE(NULLIF(c.company,''), NULLIF(TRIM(c.firstName || ' ' || c.lastName),''), 'New Era Workspace'),
+       COALESCE(NULLIF(c.company,''), NULLIF(TRIM(c."firstName" || ' ' || c."lastName"),''), 'New Era Workspace'),
```

No migration files were removed or renamed. The other 21 tracked Prisma files,
including the schema and both CMS migrations, still match HEAD byte-for-byte.
Only the lifecycle migration and this investigation report changed.

### Exact commands and results

Commands ran in `/workspace/thenewera` with Prisma 5.17.0 and PostgreSQL 16.15.
These URLs identify newly created local test databases, never production.

```bash
docker exec thenewera-postgres createdb -U thenewera newera_fresh_quote_fix
export DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_fresh_quote_fix?schema=public'
./node_modules/.bin/prisma migrate deploy
```

The first deployment exited 1: P3018 / PostgreSQL 42710 at the duplicate CMS
migration. Three migrations completed; the duplicate failed with zero applied
steps. Before resolution, all 13 duplicate SQL statements were rechecked against
the foundation, the seven original enum labels were verified, and PostgreSQL
schema-only dumps of all three CMS tables, indexes and constraints matched the
independently applied `newera_cms_expected` reference database. Dump commands:

```bash
docker exec thenewera-postgres pg_dump -U thenewera --schema-only --no-owner --no-privileges \
  -t 'public."Media"' -t 'public."Hero"' -t 'public."HomepageSection"' newera_fresh_quote_fix
docker exec thenewera-postgres pg_dump -U thenewera --schema-only --no-owner --no-privileges \
  -t 'public."Media"' -t 'public."Hero"' -t 'public."HomepageSection"' newera_cms_expected
```

Comparison excluded only pg_dump's randomized `\restrict`/`\unrestrict` lines.
Both dumps matched exactly. A local client/user fixture was inserted before
continuing to exercise the lifecycle data backfill, not just empty-table DDL:

Fixture SQL executed with `docker exec ... psql -U thenewera -d
newera_fresh_quote_fix -v ON_ERROR_STOP=1 -c`:

```sql
INSERT INTO "Client" (id,email,"firstName","lastName") VALUES ('quote-proof','quote-proof@example.invalid','Ada','Lovelace');
INSERT INTO "User" (id,email,"passwordHash","clientId","verifiedAt","updatedAt") VALUES ('quote-proof-user','quote-proof@example.invalid','not-a-login-credential','quote-proof',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
```

The subsequent commands were:

```bash
./node_modules/.bin/prisma migrate resolve --applied 20260929170000_add_cms_media_hero_homepage
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/prisma migrate status
./node_modules/.bin/prisma validate
NEXT_TELEMETRY_DISABLED=1 npm run build
```

- Resolve: exit 0, with the failed CMS record retained and a completed record added.
- Second deploy: exit 0; all 16 remaining migrations applied successfully,
  including lifecycle and `20261012130000_add_client_updated_at`.
- Ledger: **20 distinct completed migrations, one retained rolled-back CMS
  attempt, zero unresolved failures**.
- Status: exit 0, `Database schema is up to date!`.
- Validation: exit 0, schema valid.
- Build: exit 0, compilation, type checking, generation of 73 static pages,
  and optimization completed.
- Repeated deploy: exit 0, `No pending migrations to apply.`
- Backfill assertion: client names remain `Ada`/`Lovelace`, workspace name is
  `Ada Lovelace`, workspace type `INDIVIDUAL`, membership role `OWNER`, and
  verified client account status `CLIENT`.
- `git diff --check`: exit 0.

### Shadow replay and existing-database limitations

A separate, newly created disposable database was used for the shadow test:

```bash
docker exec thenewera-postgres createdb -U thenewera newera_quote_shadow
./node_modules/.bin/prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url 'postgresql://thenewera@127.0.0.1:5432/newera_quote_shadow?schema=public' \
  --exit-code
```

Exit 1: **P3006**, duplicate CMS migration fails with `MediaCategory already
exists`. This occurred after the deployment database's CMS resolution and full
successful deployment. Shadow replay executes migration files independently;
the deployment database's resolved ledger does not make the duplicate SQL safe.
Prisma's shadow workflow may clear/rebuild its explicitly designated disposable
shadow schema; it was pointed only at the new test database. No production or
pre-existing database was used as a shadow target.

The fresh deployment sequence is verified **with the explicit, verified CMS
recovery step**. Unassisted fresh deployment and automatic shadow replay remain
blocked by the unchanged CMS duplication. Resolving that requires a separately
planned baseline/history reconciliation; adding a later migration cannot repair
an earlier replay failure.

The lifecycle edit changes that historical file's checksum. Existing databases
with an applied or failed old lifecycle checksum must be inspected individually
before adopting the change. Do not alter ledger checksums, rerun the whole file,
or blindly mark it applied: an earlier failed attempt can leave additive schema
changes present. No old lifecycle failure was repaired in place here. Existing
migration records and data were preserved; the new tests are retained for review.
No production database was reset, dropped, or modified.

## Cause

Both migrations were introduced by commit `5dc2efced5fadc3c3437657a7a31160abdcb5151`:

- `20260929170000_add_cms_foundation`
- `20260929170000_add_cms_media_hero_homepage`

Prisma applies the foundation migration first. All 13 SQL statements in the
second migration are present in the first, differing only in whitespace and
comments. They duplicate the seven-value `MediaCategory` enum, `Media`, `Hero`,
and `HomepageSection` tables (including their primary keys), five indexes, and
four foreign keys. The foundation additionally adds 11 `SiteSetting` columns
and three foreign keys. The second migration has no unique schema changes.

The current Prisma schema defines these objects once. The subsequent portfolio
migration adds `PORTFOLIO_VIDEO`, `PORTFOLIO_DESIGN`, and `PARTNER_LOGO` to the
enum. A recovered database can therefore have ten values rather than seven.

## Smallest history-preserving recovery

Leave both files and their checksums intact. Before using the following command,
inspect the target database's `_prisma_migrations` records and catalog definitions.
Confirm the foundation is successfully applied and **every** object from the
duplicate migration has the expected columns, defaults, constraints, indexes,
and enum values (allowing verified subsequent migrations). Enum existence alone
is insufficient. Inspect any failure logs for partial changes. If the duplicate CMS
migration has already been successfully recorded, do not resolve it again.

With that verified, use Prisma's supported migration-ledger recovery:

```bash
# DATABASE_URL must explicitly identify the reviewed target database.
npx --no-install prisma migrate resolve --applied 20260929170000_add_cms_media_hero_homepage
```

This records the duplicate as applied without executing its SQL. On a failed
attempt, Prisma preserves the old record, marks it rolled back in the ledger,
and adds a completed record. It does not undo schema changes or delete data.
Review remaining migrations before resuming deployment on an existing database.
No production database was inspected or modified in this investigation.

For a fresh installation, ordinary `migrate deploy` still encounters the
duplicate; it requires the verified resolution step before continuing.
Existing databases that completed the foundation but failed this duplicate
can use the same recovery after catalog verification. Other history states
require separate assessment, especially databases provisioned through `db push`
or with only the second CMS migration recorded: the extra `SiteSetting` changes
must not be assumed present.

This is an operational recovery, not an automatic fix for replaying the entire
history. `migrate dev` shadow-database replay still hits the duplicate. A new
later migration cannot repair an earlier replay failure. A coordinated baseline
or history-reconciliation workflow would be needed to support automatic clean
replay while retaining the original migration files. Do not rewrite historical
SQL, reset databases, or suppress duplicate-object errors indiscriminately.

## Original investigation checks (before the lifecycle fix)

Tests used PostgreSQL 16.15 and Prisma 5.17.0 in two newly created local databases:
`newera_migration_investigation` and `newera_cms_expected`. Both are retained for
inspection. The pre-existing `thenewera` database was not changed.

- `npm ci`: passed; generated Prisma Client 5.17.0 with verification enabled.
- `prisma validate`: passed.
- Unmodified fresh `prisma migrate deploy`: failed with P3018 / PostgreSQL
  42710 at `20260929170000_add_cms_media_hero_homepage`, `MediaCategory already exists`.
- SQL comparison: all 13 duplicate statements matched the foundation's 17
  statements after whitespace/comment normalization.
- Independent PostgreSQL schema-only dumps: the three CMS tables, indexes,
  and constraints matched the separately applied duplicate migration exactly.
- Verified enum catalog: seven original labels in their expected order.
- `prisma migrate resolve --applied` on the investigation database: exit 0.
  The failed record remained, with a separate completed record added.
- Subsequent `prisma migrate deploy`: exit 1 after 14 additional migrations
  succeeded. It failed at `20261008193000_add_account_lifecycle` with P3018 /
  PostgreSQL 42703: `column c.firstname does not exist`. Line 84 uses unquoted
  `c.firstName` and `c.lastName`; PostgreSQL folds unquoted names to lowercase.
  This separate defect was not changed or resolved.
- Sentinel rows in `Media`, `Hero`, `HomepageSection`, and `SiteSetting`:
  every original column remained unchanged after recovery and later deployment.
- Final ledger: 18 distinct migrations completed, lifecycle failed, and
  `20261012130000_add_client_updated_at` remained unapplied. `migrate status`
  exited 1; full migration readiness is not established.
- Existing schema and migration files remained byte-for-byte unchanged.

No database was reset, no tables or databases were dropped, and no application
data in an existing database was modified.

## Merge preparation verification

Fetch and push origins were verified as github.com/babazadeharun/thenewera.
Remote default branch main and the original local work branch both pointed to
8fcad221b6df661d1df9a990411deb12c3c65965. The reviewed changes were placed on
codex/prisma-migration-remediation without changing or rewriting the base history.
The complete staged scope is 19 remediation/report/archive/test files; no
unrelated tracked changes, environment files, credential files, database dumps,
node_modules or build outputs are included. The two password-shaped strings in
unit tests are explicitly synthetic rejection fixtures, not credentials.

Staging newly added files exposed one inherited trailing blank line in
lifecycle-historical-quoted.sql. It was deliberately preserved byte-for-byte
against Git commit c93a1a9 and its documented SHA-256. All other staged files
passed the whitespace check. Archive and active checksums were verified again.
Previously tested code/SQL/test inputs are unchanged; completed suites and builds
were not repeated. No active local Git hooks or repository migration/reconciliation
deployment hooks were found. GitHub API access was forbidden; Git read access was
verified independently through the existing Git authentication route.

These Git preparation checks do not change DATABASE DEPLOYMENT: BLOCKED and do
not authorize or execute migrations, reconciliation, resets or production access.
