// Explicit manual maintenance only. Default mode never changes the ledger.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {options,identityFromUrl,probe,query,validateReleaseHistory} from './prisma-safety.mjs';
import {preflight} from './prisma-preflight.mjs';
try {
 const args=options(process.argv.slice(2),{'--policy':'value','--evidence':'value','--audit':'value','--apply':'flag'});
 for(const key of ['--policy','--evidence','--audit']) if(!args[key]) throw new Error(`${key} is required.`);
 const target=identityFromUrl(process.env.DATABASE_URL);
 const policy=JSON.parse(readFileSync(args['--policy'],'utf8'));
 if(policy.databases?.[target.database]?.allow_reconciliation!==true) throw new Error('Target policy does not authorize manual reconciliation.');
 const actual=probe(policy,target); const evidence=JSON.parse(readFileSync(args['--evidence'],'utf8'));
 if(typeof evidence.backup?.path!=='string') throw new Error('Backup artifact is required.');
 const checked=preflight(policy,actual,evidence,readFileSync(evidence.backup.path));
 const before=JSON.parse(query(target.database,`SELECT jsonb_agg(to_jsonb(m) ORDER BY started_at,id) FROM public."_prisma_migrations" m;`));
 const transaction=readFileSync(fileURLToPath(new URL('../prisma/migrations/reconcile-prisma-history.sql',import.meta.url)),'utf8');
 const expected=JSON.parse(transaction.match(/\$release\$(.*?)\$release\$/s)?.[1]||'null');
 const accepted=JSON.parse(transaction.match(/\$legacy\$(.*?)\$legacy\$/s)?.[1]||'null');
 if(!expected||!accepted) throw new Error('Reviewed reconciliation release manifest is missing.');
 validateReleaseHistory(before,expected,accepted);
 const manifest=JSON.parse(readFileSync(fileURLToPath(new URL('../prisma/migration-history/manifest.json',import.meta.url)),'utf8'));
 const changes=before.filter(row=>manifest.some(m=>m.migration===row.migration_name&&m.reviewed_active_sha256!==row.checksum)).map(row=>({id:row.id,migration:row.migration_name,field:'checksum',from:row.checksum,to:manifest.find(m=>m.migration===row.migration_name).reviewed_active_sha256}));
 const audit={mode:args['--apply']?'manual-apply':'read-only-preflight',endpoint_policy:{container_id:policy.container_id,endpoint:policy.endpoint,intended_schema:target.schema},identity:actual,evidence_checked:checked,preflight:evidence,changes,before};
 // Exclusive creation: never overwrite a previous audit or user file.
 writeFileSync(args['--audit'],JSON.stringify(audit,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({mode:audit.mode,endpoint_policy:audit.endpoint_policy,identity:actual,evidence_checked:checked,changes},null,2));
 if(args['--apply']) {
  const sql=readFileSync(fileURLToPath(new URL('../prisma/migrations/reconcile-prisma-history.sql',import.meta.url)),'utf8');
  execFileSync('docker',['exec','-i','thenewera-postgres','psql','-X','-U','thenewera','-d',target.database,'-v','ON_ERROR_STOP=1','-v',`preflight_evidence=${JSON.stringify(evidence)}`,'-f','-'],{input:sql,stdio:['pipe','pipe','pipe']});
  audit.after=JSON.parse(query(target.database,`SELECT jsonb_agg(to_jsonb(m) ORDER BY started_at,id) FROM public."_prisma_migrations" m;`));
  writeFileSync(args['--audit']+'.after.json',JSON.stringify(audit,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Reviewed checksum transaction completed; before/after audit retained.');
 }
}catch(error){console.error(error instanceof SyntaxError?'Invalid policy/evidence/release JSON.':error.code?'Local evidence or transaction access failed; inspect the preserved audit and permissions.':error.message?.includes('Command failed')?'Preflight/checksum transaction failed; no approval is implied. Inspect the preserved audit.':error.message);process.exitCode=1;}
