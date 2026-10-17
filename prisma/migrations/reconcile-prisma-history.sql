-- MANUAL ONLY: use the audited wrapper; never an automatic hook.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL search_path=pg_catalog,public;
SELECT pg_catalog.set_config('newera.preflight', :'preflight_evidence', true);
SELECT pg_catalog.pg_advisory_xact_lock(72707369);
SELECT id FROM public."_prisma_migrations" FOR UPDATE;
DO $reconcile$
DECLARE
 e jsonb := pg_catalog.current_setting('newera.preflight')::jsonb;
 expected jsonb := $release${"20261006152000_add_client_instagram": "3c6bc07ce29f1f53334febc02aa679430d9e27f624f08ccd742470f864d085e7", "20261008130000_add_mail_module": "d8d04825e4678a5e786a4c6d3a11c712ef282fb2952b37f918664f1c91d7ee98", "20261012130000_add_client_updated_at": "a52bf2e57191c646235a8890ced9b75746c719c942adc34abaa37816a3515281", "20260929170000_add_cms_media_hero_homepage": "a036ccc0c3ddf769e42cd60005d938571b8b201a6313bac150ebf72ac065871e", "20261001160000_add_events_promoter_phase1": "2b75a638b346a2e1df051b75f2552dc1fc81413ffada64107bb807c0500fdbf3", "20261008180000_add_notifications_center": "57a5e2fa271e5812b0a1d59d6b6d1c09ab039c83197bf864b1f9ce97f36da6f7", "20260929140000_baseline": "4c576bd5ce6a51d1c2ee0c8d800b72de4c15a6e3a510bbf8b04684e955751857", "20261001170000_add_events_phase3_admin_gallery": "cb6875741739ea040e4632763cf03d068a69e13fc6aa010b5df52061c06cb041", "20261006123000_sales_crm_upgrade": "98a1873b1113c2c53aa6c1bdddfcd746b43263d305b4c504212eccb7269b9033", "20261008193000_add_account_lifecycle": "99da26ae19303118800417b6f5e24c21ea5d305a90c53f998b2abcf19b4c1186", "20261006140000_add_professional_finance": "9c2446052af3b308b5fb05cf86b5eb55013189d9a323e79a9e514e6e1d500a85", "20261002110000_add_external_event_sync": "3282d4ab444a34a19d9adf4eca421881f64f64ebaad2dd4f402598de00b595ed", "20260929150000_add_verified_contacts_and_site_settings": "7fd4050a2aef8cd1bf472b4afd10484d8fb76639d82964482a100a3eeda34bd4", "20261001190000_add_events_phase6_sales": "33a1c55e675a2645a1bc484d4a7bec10cbd6028650bf1dcd70dfaa94dd81b2c8", "20261001200000_add_events_phase7_finance_phase8_audit": "9ee1eab28be87336e51f7918cfa2c5520eaa4826f67e5bda7122aacfee3fc54b", "20261001180000_add_events_phase5_tickets": "58c5d7ee544a81bce2d9dee966ce395d32d066d750e05360459609ee9619fd0a", "20260929170000_add_cms_foundation": "651257061c4a268db413b06598a6f96fc0cbd2914682028ec9e110933aa28023", "20261008150000_add_homepage_section_eyebrow": "c87ad6f4d528cc4988fe5a3f915f8dbeefdb42b2db8d2b27c0decd66000ea477", "20261002153000_add_marketing_intelligence": "9de1e86443ab4cd945e2af0f3cdcdd4f46345bb04094ad26df2bbf8083c13dbe", "20261001143000_add_portfolio_media_categories": "35d980ec80fe77c61889f0e9dfc970919b5ce09b88808012d0b05f1296474880"}$release$::jsonb;
 accepted jsonb := $legacy${"20260929170000_add_cms_media_hero_homepage": ["096405c24bac5888923cf485a71092956b20d4ce3a9a2fd8e6c2c946aaccd793", "e435decc19450774e797ae0cbd970c1a4b2b32f6447ad57643f2855fd8b4e097"], "20261008193000_add_account_lifecycle": ["15e9002bee02b4b52c8edca482111f59bf9ab189aaaae89ab18b91b7159cabce"]}$legacy$::jsonb;
 r record; actual_backfill jsonb := jsonb_build_object('clients_without_workspace',(SELECT count(*) FROM public."Client" c WHERE NOT EXISTS(SELECT 1 FROM public."Workspace" w WHERE w."clientId"=c.id)),'owners_without_membership',(SELECT count(*) FROM public."Workspace" w WHERE w."ownerUserId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public."WorkspaceMembership" m WHERE m."workspaceId"=w.id AND m."userId"=w."ownerUserId" AND m.active AND m.role='OWNER')),'account_fields_null',(SELECT count(*) FROM public."User" WHERE "accountStatus" IS NULL OR "accountType" IS NULL)); actual_schema text := encode(pg_catalog.sha256(pg_catalog.convert_to((jsonb_build_object('relations',(SELECT jsonb_object_agg(c.relname,jsonb_build_object('kind',c.relkind,'persistence',c.relpersistence,'rls',c.relrowsecurity,'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) ORDER BY a.attnum) FROM pg_catalog.pg_attribute a LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'constraints',(SELECT jsonb_object_agg(conname,jsonb_build_object('definition',pg_catalog.pg_get_constraintdef(oid),'validated',convalidated,'deferrable',condeferrable,'deferred',condeferred)) FROM pg_catalog.pg_constraint WHERE conrelid=c.oid),'indexes',(SELECT jsonb_object_agg(ic.relname,jsonb_build_object('definition',pg_catalog.pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'unique',i.indisunique)) FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid))) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND c.relname<>'_prisma_migrations'),'enums',(SELECT jsonb_object_agg(t.typname,(SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_catalog.pg_enum e WHERE e.enumtypid=t.oid)) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e')))::text,'UTF8')),'hex');
BEGIN
 IF (e->>'version'='1' AND e->>'reviewed'='true'
 AND e->'identity'->>'database'=current_database()
 AND e->'identity'->>'database_oid'=(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database())
 AND e->'identity'->>'server_identifier'=(SELECT system_identifier::text FROM pg_catalog.pg_control_system())
 AND e->'identity'->>'schema'='public'
 AND e->'identity'->>'server_address'=coalesce(inet_server_addr()::text,'local-socket')
 AND (e->'identity'->>'server_port')::int=coalesce(inet_server_port(),0)
 AND e->'backup'->>'restore_verified'='true'
 AND e->'backup'->>'sha256' ~ '^[a-f0-9]{64}$'
 AND e->'backup'->'restore_identity'->>'database_oid'<>e->'identity'->>'database_oid'
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_database WHERE datname=e->'backup'->'restore_identity'->>'database' AND oid::text=e->'backup'->'restore_identity'->>'database_oid')
 AND e->'schema'->>'sha256'=actual_schema
 AND e->'schema'->'reference_identity'->>'database_oid'<>e->'identity'->>'database_oid'
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_database WHERE datname=e->'schema'->'reference_identity'->>'database' AND oid::text=e->'schema'->'reference_identity'->>'database_oid')
 AND e->'backfill'->>'sha256'=encode(pg_catalog.sha256(pg_catalog.convert_to(regexp_replace(actual_backfill::text,'\s','','g'),'UTF8')),'hex')
 AND NOT EXISTS(SELECT 1 FROM jsonb_each(actual_backfill) b WHERE b.value<>'0'::jsonb)
 AND (e->>'checked_at')::timestamptz BETWEEN clock_timestamp()-interval '1 hour' AND clock_timestamp()+interval '1 minute') IS DISTINCT FROM true THEN
 RAISE EXCEPTION 'Reconciliation identity or backup/schema/backfill evidence is missing, stale or inconsistent';
 END IF;
 IF (SELECT count(*) FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)<>20
 OR (SELECT count(DISTINCT migration_name) FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)<>20
 OR EXISTS(SELECT 1 FROM public."_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
 RAISE EXCEPTION 'Reconciliation requires exactly 20 completed migrations and no unresolved attempts';
 END IF;
 FOR r IN SELECT * FROM public."_prisma_migrations" LOOP
 IF NOT expected ? r.migration_name OR (r.checksum<>expected->>r.migration_name AND NOT coalesce(accepted->r.migration_name ? r.checksum,false)) THEN
 RAISE EXCEPTION 'Unknown migration history checksum: %',r.migration_name;
 END IF;
 END LOOP;
 FOR r IN SELECT * FROM public."_prisma_migrations" WHERE checksum<>expected->>migration_name LOOP
 RAISE NOTICE 'Reviewed change id=% migration=% field=checksum old=% new=%',r.id,r.migration_name,r.checksum,expected->>r.migration_name;
 UPDATE public."_prisma_migrations" SET checksum=expected->>r.migration_name WHERE id=r.id AND checksum=r.checksum;
 END LOOP;
END
$reconcile$;
COMMIT;
