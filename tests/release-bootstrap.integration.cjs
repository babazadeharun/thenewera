const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawn,execFileSync}=require('node:child_process');const root=path.resolve(__dirname,'..');process.chdir(root);
(async()=>{
 const {PGlite}=await import(require('node:url').pathToFileURL(path.join(root,'.crm-test-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
 const {PGLiteSocketServer}=await import(require('node:url').pathToFileURL(path.join(root,'.crm-test-runtime/node_modules/@electric-sql/pglite-socket/dist/index.js')).href);
 async function run(db,port){const server=new PGLiteSocketServer({db,host:'127.0.0.1',port});server.addEventListener('connection',()=>{void db.exec('DEALLOCATE ALL')});await server.start();const child=spawn(process.execPath,['scripts/deploy-db.cjs'],{cwd:root,env:{...process.env,DATABASE_URL:`postgresql://postgres:postgres@127.0.0.1:${port}/postgres?connection_limit=1&statement_cache_size=0&pgbouncer=true`,PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK:'1'},stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);const exit=await new Promise(r=>child.on('exit',r));await Promise.race([server.stop(),new Promise(r=>setTimeout(r,300))]);await new Promise(r=>setTimeout(r,150));assert.equal(exit,0,log);return log;}
 const fresh=await PGlite.create();await run(fresh,55473);
 assert.equal((await fresh.query('SELECT COUNT(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')).rows[0].n,28);
 assert.equal((await fresh.query(`SELECT COUNT(*)::int AS n FROM pg_tables WHERE tablename='_new_era_bootstrap'`)).rows[0].n,0);
 assert.equal((await fresh.query(`SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_name='FinancePayment' AND column_name='idempotencyKey'`)).rows[0].n,1);
 await fresh.close();
 const upgrade=await PGlite.create();let baseline=fs.readFileSync('prisma/schema.prisma','utf8');
 for(const model of ['AuthRateLimit','MailSentCopy'])baseline=baseline.replace(new RegExp('model '+model+' \\{[\\s\\S]*?\\n\\}','g'),'');
 baseline=baseline.replace(/model FinancePayment \{[\s\S]*?\n\}/,m=>m.replace(/^\s*(idempotencyKey|requestHash)\s+.*$/gm,''));
 const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'new-era-upgrade-'));fs.writeFileSync(path.join(tmp,'old.prisma'),baseline);
 const oldSql=execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema-datamodel',path.join(tmp,'old.prisma'),'--script'],{encoding:'utf8',env:{...process.env,DATABASE_URL:'postgresql://unused:unused@127.0.0.1:1/unused'}});
 await upgrade.exec(oldSql);
 await upgrade.exec(`CREATE TABLE "_prisma_migrations" (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), applied_steps_count INTEGER NOT NULL DEFAULT 0); INSERT INTO "Client" ("id","email","firstName","lastName","updatedAt") VALUES ('preserve','preserve@example.test','Preserved','Client',NOW());`);
 for(const name of fs.readdirSync('prisma/migrations').sort()){
  const file=path.join('prisma/migrations',name,'migration.sql');if(name==='20261022120000_release_hardening'||!fs.existsSync(file))continue;
  await upgrade.query('INSERT INTO "_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count) VALUES ($1,$2,$3,NOW(),1)',[crypto.randomUUID(),crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),name]);
 }
 await run(upgrade,55474);await run(upgrade,55474);
 assert.equal((await upgrade.query('SELECT "firstName" FROM "Client" WHERE id=\'preserve\'')).rows[0].firstName,'Preserved');
 assert.equal((await upgrade.query('SELECT COUNT(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')).rows[0].n,28);
 assert.equal((await upgrade.query(`SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_name='FinancePayment' AND column_name='idempotencyKey'`)).rows[0].n,1);
 await upgrade.exec('DROP TABLE "_prisma_migrations"');
 await run(upgrade,55474);
 assert.equal((await upgrade.query('SELECT COUNT(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')).rows[0].n,28);
 assert.equal((await upgrade.query('SELECT "firstName" FROM "Client" WHERE id=\'preserve\'')).rows[0].firstName,'Preserved');
 await upgrade.close();
 const legacy=await PGlite.create();await legacy.exec(oldSql);
 await legacy.exec(`INSERT INTO "Client" ("id","email","firstName","lastName","updatedAt") VALUES ('legacy','legacy@example.test','Legacy','Client',NOW())`);
 await run(legacy,55475);
 assert.equal((await legacy.query('SELECT COUNT(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')).rows[0].n,28);
 assert.equal((await legacy.query('SELECT "firstName" FROM "Client" WHERE id=\'legacy\'')).rows[0].firstName,'Legacy');
 await legacy.close();fs.rmSync(tmp,{recursive:true,force:true});console.log('PASS: clean bootstrap records 28 migrations; existing-data upgrade is additive and repeatable; verified schema without history is baselined; history files unchanged.');
})().catch(e=>{console.error(e);process.exit(1)});
