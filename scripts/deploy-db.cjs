/* Never reset an existing database. Fresh installs baseline the current schema. */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {createHash,randomUUID} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {PrismaClient} = require('@prisma/client');
const root = path.resolve(__dirname, '..');
function cli(args, capture=false) {
  const r = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], { cwd: root, env: process.env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (r.status !== 0) throw new Error(capture ? r.stderr || 'Prisma command failed.' : 'Prisma command failed. No database reset was performed.');
  return r.stdout;
}
function schemaMatches(file) {
  const r = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate','diff','--from-schema-datasource','prisma/schema.prisma','--to-schema-datamodel',file,'--exit-code'], { cwd: root, env: process.env, encoding:'utf8',stdio:'pipe' });
  if(r.status === 0) return true;
  if(r.status === 2) return false;
  throw new Error('Schema verification failed. No baseline was recorded.');
}
async function deploy() {
  const db = new PrismaClient();
  const migrations = fs.readdirSync(path.join(root,'prisma/migrations')).sort().filter(n=>fs.existsSync(path.join(root,'prisma/migrations',n,'migration.sql')));
  const manifest = createHash('sha256').update(fs.readFileSync(path.join(root,'prisma/schema.prisma')));
  for(const name of migrations) manifest.update(name).update(fs.readFileSync(path.join(root,'prisma/migrations',name,'migration.sql')));
  const hash = manifest.digest('hex');
  let bootstrap = false;
  let baselineCount = migrations.length;
  let existingBaseline = false;
  let tmp;
  try {
    const tables = (await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = current_schema()`).map(x=>x.tablename);
    const hasMarker = tables.includes('_new_era_bootstrap');
    if (hasMarker) {
      const marker = await db.$queryRawUnsafe('SELECT "manifest", "baselineCount" FROM "_new_era_bootstrap"');
      if(marker.length !== 1 || marker[0].manifest !== hash) throw new Error('An unfinished bootstrap belongs to different source files. Restore the same source version before retrying.');
      baselineCount = marker[0].baselineCount;
      bootstrap = true;
    } else if (tables.every(t=>t==='_prisma_migrations')) {
      const applied = tables.includes('_prisma_migrations') ? await db.$queryRawUnsafe('SELECT "id" FROM "_prisma_migrations"') : [];
      const enums = await db.$queryRaw`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=current_schema() AND t.typtype='e'`;
      if(applied.length || enums.length) throw new Error('Database is partially initialized. It was not changed; inspect its migration history first.');
      bootstrap = true;
    } else if(!tables.includes('_prisma_migrations')) {
      await db.$disconnect();
      if(schemaMatches('prisma/schema.prisma')) baselineCount = migrations.length;
      else if(schemaMatches('prisma/baselines/20261022-before-release.prisma')) baselineCount = migrations.indexOf('20261022120000_release_hardening');
      else throw new Error('Existing schema differs from both verified release schemas. No changes were made; inspect the drift first.');
      existingBaseline = true;
      bootstrap = true;
    }
    await db.$disconnect();
    if(!bootstrap) { cli(['migrate','deploy']); return; }
    if(!hasMarker) {
      console.log(existingBaseline ? 'Verified existing schema: record its baseline without changing application data.' : 'Fresh database: create the current schema, then record historical migrations without replaying duplicate legacy SQL.');
      const sql = existingBaseline ? '' : cli(['migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'],true);
      tmp = fs.mkdtempSync(path.join(os.tmpdir(),'new-era-bootstrap-'));
      const file = path.join(tmp,'bootstrap.sql');
      fs.writeFileSync(file, 'BEGIN;\n'+sql+'\nCREATE TABLE "_new_era_bootstrap" ("manifest" TEXT NOT NULL, "baselineCount" INTEGER NOT NULL);\nINSERT INTO "_new_era_bootstrap" VALUES (\''+hash+'\','+baselineCount+');\nCOMMIT;\n');
      cli(['db','execute','--schema','prisma/schema.prisma','--file',file]);
    }
    // Record exactly the verified baseline in one transaction. This is the Prisma 5
    // migration receipt format (same checksums/states as migrate resolve --applied).
    // No existing receipt is deleted, and historical SQL files stay unchanged.
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY NOT NULL, "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ, "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT, "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )`);
      const receipts = await tx.$queryRawUnsafe('SELECT "migration_name", "checksum", "finished_at", "rolled_back_at" FROM "_prisma_migrations"');
      for(const name of migrations.slice(0,baselineCount)) {
        const checksum=createHash('sha256').update(fs.readFileSync(path.join(root,'prisma/migrations',name,'migration.sql'))).digest('hex');
        const prior=receipts.find(row=>row.migration_name===name&&row.rolled_back_at===null);
        if(prior) {
          if(!prior.finished_at||prior.checksum!==checksum) throw new Error('Migration history conflict; no baseline receipts were changed.');
          continue;
        }
        await tx.$executeRaw`INSERT INTO "_prisma_migrations" ("id","checksum","migration_name","finished_at","applied_steps_count") VALUES (${randomUUID()},${checksum},${name},CURRENT_TIMESTAMP,0)`;
      }
      await tx.$executeRawUnsafe('DROP TABLE "_new_era_bootstrap"');
    }, {timeout:60000});
    await db.$disconnect();
    cli(['migrate','deploy']);
  } finally { await db.$disconnect(); if(tmp)fs.rmSync(tmp,{recursive:true,force:true}); }
}
module.exports={deploy};
if(require.main===module) deploy().catch(e=>{console.error(e.message);process.exitCode=1});
