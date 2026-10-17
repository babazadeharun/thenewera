import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function options(args, allowed) {
 const out={};
 for(let i=0;i<args.length;i++) {
  const key=args[i]; if(!Object.hasOwn(allowed,key)||Object.hasOwn(out,key)) throw new Error(`Invalid or repeated option: ${/^--[a-z][a-z0-9-]*$/i.test(key)?key:'unsupported argument'}`);
  if(allowed[key]==='flag') out[key]=true;
  else {if(!args[i+1]||args[i+1].startsWith('--')) throw new Error(`Missing value for ${key}`); out[key]=args[++i];}
 }
 return out;
}
export function identityFromUrl(raw) {
 if(!raw) throw new Error('DATABASE_URL is required.');
 let u; try {u=new URL(raw);} catch {throw new Error('Invalid PostgreSQL target URL.');}
 if(!['postgresql:','postgres:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||u.port!=='5432'||decodeURIComponent(u.username)!=='thenewera'||u.password) throw new Error('Only the reviewed loopback Docker endpoint and local thenewera role are supported.');
 const database=decodeURIComponent(u.pathname.slice(1));
 if(!/^[a-z][a-z0-9_]*$/.test(database)||u.searchParams.get('schema')!=='public'||[...u.searchParams.keys()].some(k=>k!=='schema')||u.searchParams.getAll('schema').length!==1) throw new Error('Target must name one database and explicit public schema.');
 return {database,schema:'public',endpoint:'127.0.0.1:5432'};
}
export function validatePolicy(policy,target,shadow=false) {
 if(policy?.version!==1||typeof policy.container_id!=='string'||!/^\w{64}$/.test(policy.container_id)||policy.endpoint!=='127.0.0.1:5432'||!policy.databases||typeof policy.databases!=='object') throw new Error('Missing or unsupported endpoint policy.');
 const entry=policy.databases[target.database];
 if(!entry||entry.schema!==target.schema||!/^\d+$/.test(entry.database_oid)||!/^\d+$/.test(entry.server_identifier)||entry.server_address!=='local-socket'||entry.server_port!==0) throw new Error('Target identity is not registered in the reviewed policy.');
 if(shadow&&(entry.purpose!=='disposable-shadow'||entry.allow_reset!==true)) throw new Error('Shadow policy must explicitly authorize resetting this registered disposable database.');
 return entry;
}
export function assertIdentity(expected,actual) {
 for(const key of ['database','schema','database_oid','server_identifier','server_address','server_port']) if(expected[key]!==actual[key]) throw new Error(`Target identity mismatch: ${key}`);
}
export const identityQuery=`SELECT jsonb_build_object('database',current_database(),'database_oid',(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()),'server_identifier',(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),'schema','public','server_address',coalesce(inet_server_addr()::text,'local-socket'),'server_port',coalesce(inet_server_port(),0));`;
export function verifyEndpoint(policy) {
 const info=JSON.parse(execFileSync('docker',['inspect','thenewera-postgres'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}))[0];
 const ports=info.NetworkSettings?.Ports?.['5432/tcp'];
 if(info.Id!==policy.container_id||ports?.length!==1||ports[0].HostIp!=='127.0.0.1'||ports[0].HostPort!=='5432') throw new Error('Docker container or bound endpoint identity differs.');
}
export function query(database,sql) {
 if(!/^[a-z][a-z0-9_]*$/.test(database)) throw new Error('Invalid database identifier.');
 try {return execFileSync('docker',['exec','thenewera-postgres','psql','-X','-U','thenewera','-d',database,'-v','ON_ERROR_STOP=1','-Atc',sql],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
 catch {throw new Error('Local PostgreSQL probe failed; check policy, permissions and connectivity.');}
}
export function probe(policy,target,shadow=false) {
 const entry=validatePolicy(policy,target,shadow); verifyEndpoint(policy);
 const actual=JSON.parse(query(target.database,identityQuery));
 assertIdentity({...entry,database:target.database},actual); return actual;
}
export function temporarySchema(source,shadow=false) {
 // Tokenize strings/comments separately so braces inside either cannot create
 // phantom datasource blocks. Reject unsupported datasource syntax explicitly.
 const tokens=[...source.matchAll(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_][A-Za-z0-9_]*|[{}=().]|\S/g)].map(m=>m[0]).filter(t=>!t.startsWith('//')&&!t.startsWith('/*'));
 let depth=0; const blocks=[];
 for(let i=0;i<tokens.length;i++) {
  if(depth===0&&tokens[i]==='datasource') {
   if(!/^[A-Za-z_]\w*$/.test(tokens[i+1]||'')||tokens[i+2]!=='{') throw new Error('Unsupported datasource declaration.');
   const body=[]; i+=3;
   for(;i<tokens.length&&tokens[i]!=='}';i++) {if(tokens[i]==='{') throw new Error('Unsupported nested datasource.');body.push(tokens[i]);}
   if(tokens[i]!=='}') throw new Error('Unclosed datasource configuration.'); blocks.push(body);
  } else if(tokens[i]==='{') depth++; else if(tokens[i]==='}') depth--;
 }
 if(blocks.length!==1) throw new Error('Exactly one datasource is required.');
 const fields={}; const b=blocks[0];
 for(let i=0;i<b.length;) {
  const key=b[i++]; if(!['provider','url','shadowDatabaseUrl'].includes(key)||Object.hasOwn(fields,key)||b[i++]!=='=') throw new Error('Ambiguous or unsupported datasource property.');
  if(b[i]==='env') {if(b[i+1]!=='('||!/^"[^"\\]+"$/.test(b[i+2]||'')||b[i+3]!==')') throw new Error('Unsupported datasource environment expression.');fields[key]=b.slice(i,i+4).join('');i+=4;}
  else if(/^"[^"\\]*"$/.test(b[i]||'')) fields[key]=b[i++]; else throw new Error('Unsupported datasource value.');
 }
 if(fields.provider!=='"postgresql"'||fields.url!=='env("DATABASE_URL")') throw new Error('Only one PostgreSQL datasource bound to DATABASE_URL is supported.');
 return `datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n${shadow?'  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")\n':''}}\n`;
}
export function validateResponse(response) {
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 if(!object(response)||Object.keys(response).some(k=>!['jsonrpc','id','result','error'].includes(k))||response.jsonrpc!=='2.0'||response.id!==1||Object.hasOwn(response,'error')===Object.hasOwn(response,'result')) throw new Error('Malformed Prisma RPC envelope.');
 if(response.error) {
  if(!object(response.error)||Object.keys(response.error).some(k=>!['code','message','data'].includes(k))||(response.error.data!=null&&!object(response.error.data))||!Number.isInteger(response.error.code)||typeof response.error.message!=='string') throw new Error('Malformed Prisma RPC error.');
  throw new Error(`Prisma engine rejected diagnosis (RPC code ${response.error.code}); inspect the reviewed engine version and datasource configuration.`);
 }
 const r=response.result; const allowed=['history','failedMigrationNames','editedMigrationNames','hasMigrationsTable','drift','errorInUnappliedMigration'];
 if(!object(r)||Object.keys(r).some(k=>!allowed.includes(k))||typeof r.hasMigrationsTable!=='boolean'||!Object.hasOwn(r,'history')||!Array.isArray(r.failedMigrationNames)||!Array.isArray(r.editedMigrationNames)||[...r.failedMigrationNames,...r.editedMigrationNames].some(v=>typeof v!=='string')) throw new Error('Unsupported Prisma diagnosis result structure.');
 if(r.history!==null) {
  const h=r.history, shapes={databaseIsBehind:['unappliedMigrationNames'],migrationsDirectoryIsBehind:['unpersistedMigrationNames'],historiesDiverge:['lastCommonMigrationName','unappliedMigrationNames','unpersistedMigrationNames']};
  if(!object(h)||!Object.hasOwn(shapes,h.diagnostic)||Object.keys(h).some(k=>!['diagnostic',...shapes[h.diagnostic]].includes(k))) throw new Error('Unsupported history diagnostic.');
  for(const k of shapes[h.diagnostic]) if(k==='lastCommonMigrationName' ? !(h[k]===null||typeof h[k]==='string') : !(Array.isArray(h[k])&&h[k].every(v=>typeof v==='string'))) throw new Error('Malformed history diagnostic fields.');
 }
 // Non-null drift/errors are unsafe findings; do not interpret an unknown
 // engine-specific shape as a clean result or print potentially secret text.
 for(const k of ['drift','errorInUnappliedMigration']) if(r[k]!=null) throw new Error(`Prisma reports ${k}; this pinned helper requires a separate reviewed investigation.`);
 return r;
}
export function isClean(r) {return r.hasMigrationsTable&&r.history===null&&r.failedMigrationNames.length===0&&r.editedMigrationNames.length===0;}
export function validateEvidence(e,actual,backupHash,schemaHash,backfill) {
 if(!backfill||typeof backfill!=='object'||Object.keys(backfill).sort().join(',')!=='account_fields_null,clients_without_workspace,owners_without_membership'||Object.values(backfill).some(n=>!Number.isSafeInteger(n)||n<0)) throw new Error('Malformed required backfill coverage response.');
 if(!e||e.version!==1||e.reviewed!==true) throw new Error('Reviewed preflight evidence is required.');
 assertIdentity(actual,e.identity);
 if(e.backup?.sha256!==backupHash||e.backup?.restore_verified!==true||typeof e.backup.path!=='string'||!e.backup.restore_identity) throw new Error('Backup and verified restore evidence are required.');
 if(e.backup.restore_identity.server_identifier!==actual.server_identifier||e.backup.restore_identity.database_oid===actual.database_oid) throw new Error('Restore rehearsal must identify a distinct local database on the verified server.');
 if(e.schema?.sha256!==schemaHash||!e.schema.reference_identity||e.schema.reference_identity.database_oid===actual.database_oid) throw new Error('Independent expected-schema evidence is required.');
 if(e.backfill?.sha256!==sha256(JSON.stringify(backfill))||Object.values(backfill).some(n=>n!==0)) throw new Error('Required backfill coverage is missing or differs from evidence.');
 if(!Number.isFinite(Date.parse(e.checked_at))||Date.now()-Date.parse(e.checked_at)>3600000||Date.parse(e.checked_at)>Date.now()+60000) throw new Error('Preflight evidence must be recent and timestamped.');
}

export function assertSeparateTargets(a,b) {
 if(a.server_identifier===b.server_identifier&&a.database_oid===b.database_oid) throw new Error('Target and shadow resolve to the same database identity.');
}
export function validateReleaseHistory(rows,expected,accepted) {
 if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.migration_name!=='string'||typeof r.checksum!=='string')) throw new Error('Malformed migration ledger response.');
 const completed=rows.filter(r=>r.finished_at!==null&&r.rolled_back_at===null);
 if(completed.length!==20||new Set(completed.map(r=>r.migration_name)).size!==20||rows.some(r=>r.finished_at===null&&r.rolled_back_at===null)) throw new Error('Exactly 20 completed migrations and no unresolved attempts are required.');
 for(const r of rows) if(!Object.hasOwn(expected,r.migration_name)||(r.checksum!==expected[r.migration_name]&&!accepted[r.migration_name]?.includes(r.checksum))) throw new Error(`Unknown checksum or migration identity: ${r.migration_name}`);
}
