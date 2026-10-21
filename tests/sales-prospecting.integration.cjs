// Real disposable PostgreSQL + Prisma + HTTP handlers. No external messages.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), Module = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..'); process.chdir(root);
(async () => {
  const { PGlite } = await import(pathToFileURL(path.join(root,'.crm-test-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
  const pg = await PGlite.create(), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'new-era-prospect-'));
  let baseline = fs.readFileSync('prisma/schema.prisma','utf8').replace(/model SalesInstagramProspect \{[\s\S]*?\n\}/, '').replace(/^.*instagramProspect\s+SalesInstagramProspect\?.*\n/gm, '');
  fs.writeFileSync(path.join(tmp,'baseline.prisma'), baseline);
  const sql = require('node:child_process').execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema-datamodel',path.join(tmp,'baseline.prisma'),'--script'],{ encoding:'utf8', env:{...process.env,DATABASE_URL:'postgresql://unused:unused@127.0.0.1:1/unused'} });
  await pg.exec(sql);
  await pg.exec(`INSERT INTO "SalesDeal" (id,title,"updatedAt") VALUES ('legacy','Unchanged',NOW())`);
  await pg.exec(fs.readFileSync('prisma/migrations/20261021190000_sales_instagram_prospecting/migration.sql','utf8'));
  assert.equal((await pg.query('SELECT title FROM "SalesDeal" WHERE id=\'legacy\'')).rows[0].title,'Unchanged');
  process.env.SALES_OFFER_SECRET='test-prospect-only-key-1234567890123456789'; process.env.SALES_OFFER_APP_URL='https://www.thenewera.space';
  const db=await require('./helpers/pglite-prisma.cjs')(pg,root);
  const ts=require('typescript');
  require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
  let actor=null, mfa=false, externalCalls=0;
  const orig=Module._load;
  Module._load=function(name,parent,main){
    if(name==='@/lib/prisma')return {prisma:db};
    if(name==='@/lib/auth')return {getCurrentUser:async()=>actor};
    if(name==='@/lib/crm/security')return {ensureSecondFactor:async()=>{if(mfa)throw {status:403,message:'MFA required'};}};
    if(name.startsWith('@/')) name=path.resolve(root,'src',name.slice(2));
    return orig.call(this,name,parent,main);
  };
  global.fetch=async()=>{externalCalls++;throw Error('External network forbidden in prospecting');};
  const route=require('../app/api/admin/sales/prospecting/route.ts'), policy=require('../src/lib/sales/prospecting-policy.ts'), shared=require('../src/lib/sales/prospecting-shared.ts'), tokens=require('../src/lib/sales/offer-policy.ts');
  let checks=1;
  function eq(a,b){assert.deepEqual(a,b);checks++;}
  async function get(q=''){const r=await route.GET(new Request('https://www.thenewera.space/api/admin/sales/prospecting'+q));return {status:r.status,data:await r.json()};}
  async function post(b,origin='https://www.thenewera.space'){const r=await route.POST(new Request('https://www.thenewera.space/api/admin/sales/prospecting',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(b)}));return {status:r.status,data:await r.json()};}
  try {
    eq((await get()).status,403);
    const user=await db.user.create({data:{email:'admin@example.test',passwordHash:'test',role:'SUPER_ADMIN'}});
    actor={...user,role:'CLIENT'};eq((await get()).status,403);
    actor={...user,role:'ADMIN'};eq((await get()).status,200); // legacy unverified internal admins preserved
    actor={...user,accountStatus:'SUSPENDED'};eq((await get()).status,403);
    actor={...user,accountStatus:'ARCHIVED'};eq((await get()).status,403);
    actor=user;mfa=true;eq((await get()).status,403);mfa=false;
    eq((await post({action:'save'},'https://evil.test')).status,403);
    eq((await post([])).status,400);
    eq((await get('?page=-1')).status,400);eq((await get('?status=BAD')).status,400);
    eq((await get('?q='+encodeURIComponent('x'.repeat(201)))).status,400);
    const sale=await db.salesDeal.create({data:{title:'Clinic growth',contactName:'Nazrin',source:'Instagram',stage:'QUALIFIED',proposalStatus:'TODO',value:550,notes:'Profile: https://www.instagram.com/doctor.example/?igsh=abc'}});
    const before=await db.salesDeal.findUnique({where:{id:sale.id}});
    for(let i=0;i<26;i++)await db.salesDeal.create({data:{title:'Page '+i}});
    eq((await get()).data.items.length,25);eq((await get('?page=2')).data.items.length,3);
    const detail=await get('?id='+sale.id);eq(detail.data.suggestedUsername,'doctor.example');
    eq((await get('?id=missing')).status,404);
    for(const input of ['https://evil.test/doctor','https://instagram.com@evil.test/doctor','https://instagram.com/p/abc','javascript:alert(1)','https://www.instagram.com:444/doctor','https://www.instagram.com/doctor/extra','a..b','bad user','@','https://www.instagram.com/direct/']){assert.throws(()=>policy.usernameInput(input));checks++;}
    eq(policy.usernameInput('https://www.instagram.com/Doctor.Example/?igsh=abc'),'doctor.example');eq(policy.usernameInput('@Doctor_Example'),'doctor_example');
    eq(shared.fillOutreachTemplate('{ad} — {sirket}','Nazrin','Clinic'),'Nazrin — Clinic');
    eq((await post({action:'save',dealId:sale.id,version:0,username:'@Doctor.Example',draft:'Salam, Nazrin.'})).status,200);
    let record=await db.salesInstagramProspect.findUnique({where:{dealId:sale.id}});eq(record.status,'NEW');eq(record.version,1);eq(record.lastContactAt,null);
    const historyCount=await db.salesActivity.count({where:{dealId:sale.id}});
    eq((await post({action:'save',dealId:sale.id,version:1,username:'doctor.example',draft:'Salam, Nazrin.'})).status,200);
    eq(await db.salesActivity.count({where:{dealId:sale.id}}),historyCount); // unchanged saves do not spam history
    eq((await post({action:'status',dealId:sale.id,version:1,status:'FIRST_SENT'})).status,400);
    eq((await post({action:'status',dealId:sale.id,version:1,status:'FIRST_SENT',confirm:true})).status,200);
    record=await db.salesInstagramProspect.findUnique({where:{dealId:sale.id}});eq(record.version,2);assert(record.lastContactAt);checks++;
    eq((await post({action:'status',dealId:sale.id,version:1,status:'FIRST_SENT',confirm:true})).status,409);
    eq((await post({action:'status',dealId:sale.id,version:2,status:'WAITING'})).status,200);
    eq((await get('?status=WAITING')).data.total,1);
    eq((await get('?status=NEW')).data.total,27);
    eq((await get('?q=doctor.example')).data.total,1);
    eq((await post({action:'save',dealId:sale.id,version:3,username:'evil/link',draft:'x'})).status,400);
    eq((await post({action:'save',dealId:sale.id,version:3,username:'doctor.example',draft:'x'.repeat(4001)})).status,400);
    eq((await post({action:'status',dealId:sale.id,version:3,status:'INVALID'})).status,400);
    eq((await post({action:'status',dealId:sale.id,version:'3',status:'INTERESTED'})).status,409);
    eq((await post({action:'save',dealId:'missing',version:0,username:'doctor',draft:'x'})).status,404);
    // Race: only one update with a matching version wins; history stays consistent.
    const race=await Promise.all(['INTERESTED','NO_REPLY'].map(status=>post({action:'status',dealId:sale.id,version:3,status})));
    eq(race.map(r=>r.status).sort(),[200,409]);
    const offer=await db.salesOffer.create({data:{groupId:sale.id,version:1,dealId:sale.id,state:'OPEN',recipientEmail:'client@example.test',recipientName:'Client',company:'Clinic',title:'Offer',introduction:'Details',services:[],currency:'AZN',totalMinor:50000,terms:'Terms',expiresAt:new Date(Date.now()+86400000),createdByUserId:user.id}});
    await db.salesOffer.update({where:{id:offer.id},data:{tokenHash:tokens.sha(tokens.tokenFor(offer.id))}});
    const linked=await post({action:'offer-link',dealId:sale.id,offerId:offer.id});eq(linked.status,200);eq(linked.data.link,tokens.linkFor(offer.id));
    eq((await post({action:'offer-link',dealId:'legacy',offerId:offer.id})).status,409);
    for(const state of ['DRAFT','REVOKED','SUPERSEDED','ACCEPTED','DECLINED']){
      await db.salesOffer.update({where:{id:offer.id},data:{state}});eq((await post({action:'offer-link',dealId:sale.id,offerId:offer.id})).status,409);
    }
    await db.salesOffer.update({where:{id:offer.id},data:{state:'OPEN',expiresAt:new Date(Date.now()-1000)}});eq((await post({action:'offer-link',dealId:sale.id,offerId:offer.id})).status,409);
    await db.salesOffer.update({where:{id:offer.id},data:{expiresAt:new Date(Date.now()+86400000),tokenHash:'0'.repeat(64)}});eq((await post({action:'offer-link',dealId:sale.id,offerId:offer.id})).status,409);
    await db.salesOffer.update({where:{id:offer.id},data:{tokenHash:tokens.sha(tokens.tokenFor(offer.id))}});
    eq((await post({action:'status',dealId:sale.id,version:4,status:'DO_NOT_CONTACT'})).status,200);
    eq((await post({action:'status',dealId:sale.id,version:5,status:'FIRST_SENT',confirm:true})).status,409);
    eq((await post({action:'offer-link',dealId:sale.id,offerId:offer.id})).status,409);
    const full=await get('?id='+sale.id);assert(full.data.history.every(h=>h.text.startsWith('[Instagram əlaqəsi]')));checks++;
    const after=await db.salesDeal.findUnique({where:{id:sale.id}});eq(after,before);
    eq((await db.salesOffer.findUnique({where:{id:offer.id}})).firstViewedAt,null); // creating a link does not fake a view
    eq(externalCalls,0);
    const dto=await get('?q=Clinic');eq(dto.data.items[0].notes,undefined);eq(dto.data.items[0].profile,'https://www.instagram.com/doctor.example/');
    console.log('PASS: '+checks+' prospecting integration checks; no external sends; legacy sale preserved.');
  } finally {
    await db.$disconnect(); await pg.close(); fs.rmSync(tmp,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
