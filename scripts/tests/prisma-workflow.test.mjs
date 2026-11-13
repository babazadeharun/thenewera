// Full local rehearsal. Creates only new, verified empty databases. No DROP,
// reset, production endpoint, merge, or application deployment operations.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {probe,verifyEndpoint,identityQuery,query,sha256} from '../prisma-safety.mjs';
import {schemaHash,backfills} from '../prisma-preflight.mjs';
if(process.env.NEWERA_LOCAL_INTEGRATION!=='1'||!process.env.NEWERA_POLICY)throw new Error('Reviewed local integration opt-in required.');
const dir='/workspace/.onboarding/thenewera/final-hardening';
const policy=JSON.parse(readFileSync(process.env.NEWERA_POLICY,'utf8'));
const admin=probe(policy,{database:'postgres',schema:'public',endpoint:'127.0.0.1:5432'});
const prefix='newera_verify_'+randomBytes(4).toString('hex'),records=[];
const url=db=>`postgresql://thenewera@127.0.0.1:5432/${db}?schema=public`;
const policyPath=dir+'/'+prefix+'-policy.json';
function savePolicy(){writeFileSync(policyPath,JSON.stringify(policy,null,2)+'\n')}
function create(suffix,purpose='isolated-test'){
 verifyEndpoint(policy);assert.equal(JSON.parse(query('postgres',identityQuery)).server_identifier,admin.server_identifier);
 const db=prefix+'_'+suffix;execFileSync('docker',['exec','thenewera-postgres','createdb','-U','thenewera',db]);
 const id=JSON.parse(query(db,identityQuery));assert.equal(id.database,db);assert.equal(id.server_identifier,admin.server_identifier);
 assert.equal(query(db,"SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public';"),'0');
 policy.databases[db]={...id,purpose,allow_reset:false,allow_reconciliation:purpose==='restored-test'};savePolicy();return db;
}
function run(label,bin,args,env={},input,expected=0){
 let status=0,output='';try{output=execFileSync(bin,args,{encoding:'utf8',env:{...process.env,...env},input,stdio:['pipe','pipe','pipe']})}catch(e){status=e.status??1;output=String(e.stdout||'')+'\n'+String(e.stderr||'')}
 writeFileSync(dir+'/'+prefix+'-'+label+'.log',output);records.push({label,status});assert.equal(status,expected,`${label}: ${output.slice(-1200)}`);return output;
}
function verify(db){return probe(policy,{database:db,schema:'public',endpoint:'127.0.0.1:5432'})}
function dataDump(db){verify(db);const s=execFileSync('docker',['exec','thenewera-postgres','pg_dump','-U','thenewera','--data-only','--no-owner','--no-privileges','--exclude-table=public._prisma_migrations',db],{encoding:'utf8'});return s.split('\n').filter(l=>!l.startsWith('\\restrict')&&!l.startsWith('\\unrestrict')).join('\n')}
test('fresh, direct non-reset shadow replay, restored reconciliation and builds',()=>{
 const fresh=create('fresh');verify(fresh);
 run('fresh-deploy','./node_modules/.bin/prisma',['migrate','deploy'],{DATABASE_URL:url(fresh)});
 assert.equal(query(fresh,'SELECT count(*) FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;'),'20');
 for(const cmd of [['migrate','deploy'],['migrate','status'],['validate']])run('fresh-'+cmd.join('-'),'./node_modules/.bin/prisma',cmd,{DATABASE_URL:url(fresh)});
 run('fresh-diagnose','node',['scripts/diagnose-prisma-history.mjs','--policy',policyPath],{DATABASE_URL:url(fresh)});
 // Direct file replay into a new empty shadow substitutes for Prisma's reset-
 // based shadow command, which is intentionally not permitted in this session.
 const shadow=create('shadow','disposable-shadow');verify(shadow);
 const sql=readdirSync('prisma/migrations',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort().map(d=>readFileSync(`prisma/migrations/${d}/migration.sql`,'utf8')).join('\n');
 run('direct-shadow-replay','docker',['exec','-i','thenewera-postgres','psql','-X','-U','thenewera','-d',shadow,'-v','ON_ERROR_STOP=1'],{},sql);
 assert.equal(schemaHash(fresh),schemaHash(shadow));
 run('shadow-policy-denial','node',['scripts/diagnose-prisma-history.mjs','--policy',policyPath,'--shadow'],{DATABASE_URL:url(fresh),SHADOW_DATABASE_URL:url(shadow)},undefined,1);
 const backupPath='/workspace/.onboarding/thenewera/compatibility/legacy.dump';const backup=readFileSync(backupPath);
 assert.equal(sha256(backup),'09b0f925a37d960af257b3958113045996c0fb9cd7f850a84cc3412a83851450');
 const target=create('restored','restored-test'),restore=create('restore_evidence');
 for(const db of [target,restore]){verify(db);run('restore-'+db,'docker',['exec','-i','thenewera-postgres','pg_restore','-U','thenewera','-d',db,'--exit-on-error'],{},backup)}
 const identity=verify(target),reference=verify(fresh),restoreIdentity=verify(restore);
 assert.equal(schemaHash(target),schemaHash(fresh));assert.equal(dataDump(target),dataDump(restore));
 const evidence={version:1,reviewed:true,identity,checked_at:new Date().toISOString(),backup:{path:backupPath,sha256:sha256(backup),restore_verified:true,restore_identity:restoreIdentity},schema:{sha256:schemaHash(target),reference_identity:reference},backfill:{sha256:sha256(JSON.stringify(backfills(target)))}};
 const evidencePath=dir+'/'+prefix+'-evidence.json';writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
 const cli=['scripts/reconcile-prisma-history.mjs','--policy',policyPath,'--evidence',evidencePath];
 const beforeLedger=JSON.parse(query(target,'SELECT jsonb_agg(to_jsonb(m) ORDER BY started_at,id) FROM public."_prisma_migrations" m;'));
 const beforeData=dataDump(target),beforeSchema=schemaHash(target);
 run('reconcile-dry-run','node',[...cli,'--audit',dir+'/'+prefix+'-dry-audit.json'],{DATABASE_URL:url(target)});
 // Fail-closed SQL with absent evidence: connection closes the aborted
 // transaction; there are no persistent writes or object drops.
 verify(target);run('sql-missing-evidence','docker',['exec','-i','thenewera-postgres','psql','-X','-U','thenewera','-d',target,'-v','ON_ERROR_STOP=1','-v','preflight_evidence={}','-f','-'],{},readFileSync('prisma/migrations/reconcile-prisma-history.sql','utf8'),3);
 const bad=structuredClone(evidence);bad.identity.server_identifier='0';const badPath=dir+'/'+prefix+'-bad-evidence.json';writeFileSync(badPath,JSON.stringify(bad));
 run('wrapper-wrong-server','node',['scripts/reconcile-prisma-history.mjs','--policy',policyPath,'--evidence',badPath,'--audit',dir+'/'+prefix+'-bad-audit.json','--apply'],{DATABASE_URL:url(target)},undefined,1);
 run('reconcile-apply','node',[...cli,'--audit',dir+'/'+prefix+'-apply-audit.json','--apply'],{DATABASE_URL:url(target)});
 const afterLedger=JSON.parse(query(target,'SELECT jsonb_agg(to_jsonb(m) ORDER BY started_at,id) FROM public."_prisma_migrations" m;'));
 assert.equal(beforeLedger.length,21);assert.equal(afterLedger.length,21);let changed=0;
 for(let i=0;i<21;i++){const a={...beforeLedger[i]},b={...afterLedger[i]};if(a.checksum!==b.checksum)changed++;delete a.checksum;delete b.checksum;assert.deepEqual(a,b)}
 assert.equal(changed,3);assert.equal(beforeData,dataDump(target));assert.equal(beforeSchema,schemaHash(target));
 for(const cmd of [['migrate','deploy'],['migrate','status'],['validate']])run('restored-'+cmd.join('-'),'./node_modules/.bin/prisma',cmd,{DATABASE_URL:url(target)});
 run('restored-diagnose','node',['scripts/diagnose-prisma-history.mjs','--policy',policyPath],{DATABASE_URL:url(target)});
 run('datamodel-diff','./node_modules/.bin/prisma',['migrate','diff','--from-url',url(fresh),'--to-schema-datamodel','prisma/schema.prisma','--exit-code'],{},undefined,2);
 for(const [name,db] of [['fresh',fresh],['restored',target]])run(name+'-build','npm',['run','build'],{DATABASE_URL:url(db),NEXT_TELEMETRY_DISABLED:'1'});
 writeFileSync(dir+'/'+prefix+'-results.json',JSON.stringify({fresh,shadow,target,restore,policyPath,evidencePath,records,ledgerRows:21,changedChecksums:changed,directShadowReplay:'pass',prismaResetBasedShadow:'not run: resets forbidden'},null,2)+'\n');
});
