import {query,sha256,validateEvidence,probe} from './prisma-safety.mjs';
export const backfillExpression=`jsonb_build_object('clients_without_workspace',(SELECT count(*) FROM public."Client" c WHERE NOT EXISTS(SELECT 1 FROM public."Workspace" w WHERE w."clientId"=c.id)),'owners_without_membership',(SELECT count(*) FROM public."Workspace" w WHERE w."ownerUserId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public."WorkspaceMembership" m WHERE m."workspaceId"=w.id AND m."userId"=w."ownerUserId" AND m.active AND m.role='OWNER')),'account_fields_null',(SELECT count(*) FROM public."User" WHERE "accountStatus" IS NULL OR "accountType" IS NULL))`;
export const catalogExpression=`jsonb_build_object('relations',(SELECT jsonb_object_agg(c.relname,jsonb_build_object('kind',c.relkind,'persistence',c.relpersistence,'rls',c.relrowsecurity,'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) ORDER BY a.attnum) FROM pg_catalog.pg_attribute a LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'constraints',(SELECT jsonb_object_agg(conname,jsonb_build_object('definition',pg_catalog.pg_get_constraintdef(oid),'validated',convalidated,'deferrable',condeferrable,'deferred',condeferred)) FROM pg_catalog.pg_constraint WHERE conrelid=c.oid),'indexes',(SELECT jsonb_object_agg(ic.relname,jsonb_build_object('definition',pg_catalog.pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'unique',i.indisunique)) FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid))) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND c.relname<>'_prisma_migrations'),'enums',(SELECT jsonb_object_agg(t.typname,(SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_catalog.pg_enum e WHERE e.enumtypid=t.oid)) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e'))`;
export const catalogHashExpression=`encode(pg_catalog.sha256(pg_catalog.convert_to((${catalogExpression})::text,'UTF8')),'hex')`;
export function schemaHash(database) {const h=query(database,`SET search_path=pg_catalog,public; SELECT ${catalogHashExpression};`).split('\n').at(-1);if(!/^[a-f0-9]{64}$/.test(h)) throw new Error('Malformed catalog fingerprint response.');return h;}
export function backfills(database) {return JSON.parse(query(database,`SELECT ${backfillExpression};`));}
export function preflight(policy,actual,e,backupBytes) {
 const ref=e?.schema?.reference_identity, restored=e?.backup?.restore_identity;
 if(!ref||!restored) throw new Error('Independent reference and restored backup identities required.');
 for(const expected of [ref,restored]) {
  const verified=probe(policy,{database:expected.database,schema:'public',endpoint:'127.0.0.1:5432'});
  for(const k of Object.keys(verified)) if(verified[k]!==expected[k]) throw new Error('Reference/restore identity evidence differs.');
 }
 const hash=schemaHash(actual.database);
 if(hash!==schemaHash(ref.database)) throw new Error('Expected schema differs from independently deployed reference.');
 const state=backfills(actual.database);
 validateEvidence(e,actual,sha256(backupBytes),hash,state);
 return {schemaHash:hash,backfill:state,backupSha256:sha256(backupBytes)};
}
