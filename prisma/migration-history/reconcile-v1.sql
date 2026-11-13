-- One-time custom metadata reconciliation, never an install/deploy hook.
-- Read prisma/migration-history/COMPATIBILITY.md first. Require a verified
-- backup, before-ledger export, zero schema diff and checked data backfills.
-- psql must receive -v expected_database=the_reviewed_restored_database.
-- All guard failures abort and roll back; no application tables are changed.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '10s';
SELECT pg_advisory_xact_lock(72707369);
SELECT id FROM "_prisma_migrations" FOR UPDATE;
CREATE TEMP TABLE history_guard (ok BOOLEAN NOT NULL CHECK (ok)) ON COMMIT DROP;
INSERT INTO history_guard VALUES (current_database() = :'expected_database');
CREATE TEMP TABLE expected_history (name TEXT PRIMARY KEY, checksum TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO expected_history VALUES
  ('20260929140000_baseline', '4c576bd5ce6a51d1c2ee0c8d800b72de4c15a6e3a510bbf8b04684e955751857'),
  ('20260929150000_add_verified_contacts_and_site_settings', '7fd4050a2aef8cd1bf472b4afd10484d8fb76639d82964482a100a3eeda34bd4'),
  ('20260929170000_add_cms_foundation', '651257061c4a268db413b06598a6f96fc0cbd2914682028ec9e110933aa28023'),
  ('20260929170000_add_cms_media_hero_homepage', 'e435decc19450774e797ae0cbd970c1a4b2b32f6447ad57643f2855fd8b4e097'),
  ('20261001143000_add_portfolio_media_categories', '35d980ec80fe77c61889f0e9dfc970919b5ce09b88808012d0b05f1296474880'),
  ('20261001160000_add_events_promoter_phase1', '2b75a638b346a2e1df051b75f2552dc1fc81413ffada64107bb807c0500fdbf3'),
  ('20261001170000_add_events_phase3_admin_gallery', 'cb6875741739ea040e4632763cf03d068a69e13fc6aa010b5df52061c06cb041'),
  ('20261001180000_add_events_phase5_tickets', '58c5d7ee544a81bce2d9dee966ce395d32d066d750e05360459609ee9619fd0a'),
  ('20261001190000_add_events_phase6_sales', '33a1c55e675a2645a1bc484d4a7bec10cbd6028650bf1dcd70dfaa94dd81b2c8'),
  ('20261001200000_add_events_phase7_finance_phase8_audit', '9ee1eab28be87336e51f7918cfa2c5520eaa4826f67e5bda7122aacfee3fc54b'),
  ('20261002110000_add_external_event_sync', '3282d4ab444a34a19d9adf4eca421881f64f64ebaad2dd4f402598de00b595ed'),
  ('20261002153000_add_marketing_intelligence', '9de1e86443ab4cd945e2af0f3cdcdd4f46345bb04094ad26df2bbf8083c13dbe'),
  ('20261006123000_sales_crm_upgrade', '98a1873b1113c2c53aa6c1bdddfcd746b43263d305b4c504212eccb7269b9033'),
  ('20261006140000_add_professional_finance', '9c2446052af3b308b5fb05cf86b5eb55013189d9a323e79a9e514e6e1d500a85'),
  ('20261006152000_add_client_instagram', '3c6bc07ce29f1f53334febc02aa679430d9e27f624f08ccd742470f864d085e7'),
  ('20261008130000_add_mail_module', 'd8d04825e4678a5e786a4c6d3a11c712ef282fb2952b37f918664f1c91d7ee98'),
  ('20261008150000_add_homepage_section_eyebrow', 'c87ad6f4d528cc4988fe5a3f915f8dbeefdb42b2db8d2b27c0decd66000ea477'),
  ('20261008180000_add_notifications_center', '57a5e2fa271e5812b0a1d59d6b6d1c09ab039c83197bf864b1f9ce97f36da6f7'),
  ('20261008193000_add_account_lifecycle', '99da26ae19303118800417b6f5e24c21ea5d305a90c53f998b2abcf19b4c1186'),
  ('20261012130000_add_client_updated_at', 'a52bf2e57191c646235a8890ced9b75746c719c942adc34abaa37816a3515281');
INSERT INTO history_guard SELECT
  count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) = 20
  AND count(DISTINCT migration_name) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) = 20
  AND count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) = 0
FROM "_prisma_migrations";
CREATE TEMP TABLE accepted_legacy (name TEXT, checksum TEXT, PRIMARY KEY(name, checksum)) ON COMMIT DROP;
INSERT INTO accepted_legacy VALUES
  ('20260929170000_add_cms_media_hero_homepage', '096405c24bac5888923cf485a71092956b20d4ce3a9a2fd8e6c2c946aaccd793'),
  ('20261008193000_add_account_lifecycle', '15e9002bee02b4b52c8edca482111f59bf9ab189aaaae89ab18b91b7159cabce');
INSERT INTO history_guard SELECT NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" m
  LEFT JOIN expected_history e ON e.name=m.migration_name
  LEFT JOIN accepted_legacy a ON a.name=m.migration_name AND a.checksum=m.checksum
  WHERE e.name IS NULL OR (m.checksum<>e.checksum AND a.name IS NULL)
);
-- Store this output alongside the before-ledger export and verified backup.
SELECT m.id, m.migration_name, m.checksum AS original_checksum, e.checksum AS reviewed_checksum
FROM "_prisma_migrations" m JOIN expected_history e ON e.name=m.migration_name
WHERE m.checksum<>e.checksum ORDER BY m.started_at;
UPDATE "_prisma_migrations" m SET checksum=e.checksum
FROM expected_history e, accepted_legacy a
WHERE m.migration_name=e.name AND a.name=m.migration_name AND a.checksum=m.checksum
  AND m.checksum<>e.checksum;
INSERT INTO history_guard SELECT NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" m JOIN expected_history e ON e.name=m.migration_name
  WHERE m.checksum<>e.checksum
);
COMMIT;
