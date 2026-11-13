// Explicit opt-in local-only integration tests. New databases are retained;
// this suite never resets databases or drops objects.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {probe,verifyEndpoint,identityQuery,query} from '../prisma-safety.mjs';
const enabled=process.env.NEWERA_LOCAL_INTEGRATION==='1';
if(!enabled) throw new Error('Explicit NEWERA_LOCAL_INTEGRATION=1 and reviewed NEWERA_POLICY required; no implicit skips.');
const policy=JSON.parse(readFileSync(process.env.NEWERA_POLICY,'utf8'));
const admin=probe(policy,{database:'postgres',schema:'public',endpoint:'127.0.0.1:5432'});
const prefix='newera_harden_'+randomBytes(5).toString('hex');
const created=[];
const migration=n=>readFileSync(`prisma/migrations/${n}/migration.sql`,'utf8');
const base=migration('20260929140000_baseline')+migration('20260929150000_add_verified_contacts_and_site_settings');
const foundation=migration('20260929170000_add_cms_foundation'),guard=migration('20260929170000_add_cms_media_hero_homepage');
function create(name) {
 verifyEndpoint(policy);assert.equal(JSON.parse(query('postgres',identityQuery)).server_identifier,admin.server_identifier);
 execFileSync('docker',['exec','thenewera-postgres','createdb','-U','thenewera',name]);
 const id=JSON.parse(query(name,identityQuery));assert.equal(id.database,name);assert.equal(id.server_identifier,admin.server_identifier);
 assert.equal(query(name,"SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public';"),'0');
 policy.databases[name]={...id,purpose:'isolated-test',allow_reset:false};created.push(id);return name;
}
function write(database,sql) {
 probe(policy,{database,schema:'public',endpoint:'127.0.0.1:5432'});
 return execFileSync('docker',['exec','-i','thenewera-postgres','psql','-X','-U','thenewera','-d',database,'-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']});
}
const cases=[
 ['valid',s=>s,null],
 ['enum',s=>s.replace("'BLOG','GENERAL'","'BLOG','GENERAL','EXTRA'"),'MediaCategory'],
 ['enum_type',s=>s.replace(/CREATE TYPE "MediaCategory" AS ENUM \([^;]+;/,'CREATE DOMAIN "MediaCategory" AS text;'),'MediaCategory'],
 ['column_type',s=>s.replace('"size" INTEGER NOT NULL','"size" TEXT NOT NULL'),'Media.size'],
 ['nullability',s=>s.replace('"filename" TEXT NOT NULL','"filename" TEXT'),'Media.filename'],
 ['default',s=>s.replace("DEFAULT 'GENERAL'","DEFAULT 'HERO'"),'Media.category'],
 ['index',s=>s.replace('ON "Media"("category")','ON "Media"("filename")'),'Media_category_idx'],
 ['primary_key',s=>s.replace('CONSTRAINT "Media_pkey" PRIMARY KEY ("id")','CONSTRAINT "Media_pkey" PRIMARY KEY ("filename"), CONSTRAINT "Media_id_key" UNIQUE ("id")'),'Media_pkey'],
 ['foreign_key',s=>s.replace('ON DELETE SET NULL ON UPDATE CASCADE','ON DELETE CASCADE ON UPDATE CASCADE'),'Hero_desktopMediaId_fkey'],
 ['extra_constraint',s=>s.replace('CONSTRAINT "Media_pkey"','CHECK ("size">=0), CONSTRAINT "Media_pkey"'),'constraints'],
];
for(const [name,mutate,error] of cases)test('foundation catalog guard '+name,()=>{
 const db=create(prefix+'_'+name);write(db,base+mutate(foundation));
 if(!error)assert.match(write(db,guard),/DO/);
 else assert.throws(()=>write(db,guard),e=>e.stderr.toString().includes(error));
});
test('explicit schema rejects controlled alternate search path',()=>{
 const db=create(prefix+'_schema');write(db,base+foundation);
 assert.throws(()=>write(db,'SET search_path=pg_catalog;\n'+guard),e=>e.stderr.toString().includes('expected public'));
});
process.on('exit',()=>writeFileSync(process.env.NEWERA_INTEGRATION_RECORD||'/tmp/newera-integration-record.json',JSON.stringify({created,policy},null,2)+'\n'));
