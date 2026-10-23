import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {options,identityFromUrl,validatePolicy,probe,temporarySchema,validateResponse,isClean,assertSeparateTargets} from './prisma-safety.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let temporary;
try {
 const args=options(process.argv.slice(2),{'--policy':'value','--shadow':'flag'});
 if(!args['--policy']) throw new Error('--policy is required.');
 const policy=JSON.parse(await readFile(args['--policy'],'utf8'));
 const target=identityFromUrl(process.env.DATABASE_URL); validatePolicy(policy,target);
 const shadow=args['--shadow']?identityFromUrl(process.env.SHADOW_DATABASE_URL):null;
 if(shadow) validatePolicy(policy,shadow,true); // reject unauthorized reset before any probe/engine
 const schema=temporarySchema(await readFile(join(root,'prisma/schema.prisma'),'utf8'),Boolean(shadow));
 const actual=probe(policy,target);
 if(shadow) {
  const other=probe(policy,shadow,true);
  assertSeparateTargets(actual,other);
 }
 console.log(JSON.stringify({mode:shadow?'shadow-history':'read-only-history',target:actual,shadow:shadow?{database:shadow.database,schema:shadow.schema,endpoint:shadow.endpoint}:null}));
 const engine=join(root,'node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x');
 if(!execFileSync(engine,['--version'],{encoding:'utf8'}).includes('393aa359c9ad4a4bb28630fb5613f9c281cde053')) throw new Error('Unsupported Prisma engine version/platform.');
 temporary=await mkdtemp(join(tmpdir(),'newera-history-')); const path=join(temporary,'schema.prisma'); await writeFile(path,schema);
 const result=await new Promise((accept,reject)=>{
  const child=spawn(engine,['-d',path],{stdio:['pipe','pipe','pipe']}); let buffered='',finished=false;
  const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timeout);child.kill();const reaper=setTimeout(()=>child.kill('SIGKILL'),1000);reaper.unref();child.once('close',()=>clearTimeout(reaper));error?reject(error):accept(value);};
  const timeout=setTimeout(()=>finish(new Error('Prisma diagnosis timed out.')),30000);
  child.on('error',()=>finish(new Error('Prisma engine failed to start.')));
  child.on('exit',()=>{if(!finished)finish(new Error('Prisma engine exited before a valid reply.'));}); child.stderr.resume();
  child.stdout.on('data',chunk=>{
   buffered+=chunk; if(buffered.length>1048576)return finish(new Error('Oversized Prisma response.'));
   while(buffered.includes('\n')) {const end=buffered.indexOf('\n'),line=buffered.slice(0,end);buffered=buffered.slice(end+1);
    try{finish(null,validateResponse(JSON.parse(line)));}catch(error){finish(new Error(error instanceof SyntaxError?'Malformed JSON from Prisma engine.':error.message));}
   }
  });
  child.stdin.on('error',()=>finish(new Error('Prisma RPC input failed.')));
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'diagnoseMigrationHistory',params:{migrationsDirectoryPath:join(root,'prisma/migrations'),optInToShadowDatabase:Boolean(shadow)}})+'\n');
 });
 console.log(JSON.stringify(result,null,2)); if(!isClean(result)) {console.error('History is not clean: review the listed failed/edited/unapplied migration names.');process.exitCode=1;}
} catch(error) {console.error(error instanceof SyntaxError?'Invalid policy JSON.':error.code?'Local policy/schema/engine access failed; check paths and permissions.':error.message);process.exitCode=1;}
finally {if(temporary) await rm(temporary,{recursive:true,force:true});}
