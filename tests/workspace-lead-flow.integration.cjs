// In-memory PostgreSQL integration tests. Never uses a production database or sends mail.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.resolve(__dirname,'..');process.chdir(root);
(async()=>{
const {PGlite}=await import(require('node:url').pathToFileURL(path.join(root,'.crm-test-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);const {PGLiteSocketServer}=await import(require('node:url').pathToFileURL(path.join(root,'.crm-test-runtime/node_modules/@electric-sql/pglite-socket/dist/index.js')).href);const pg=await PGlite.create();await pg.exec(require('node:child_process').execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'],{encoding:'utf8',env:{...process.env,DATABASE_URL:'postgresql://unused:unused@127.0.0.1:1/unused'}}));const server=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:55439});await server.start();process.env.DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55439/postgres?connection_limit=1';process.env.CRM_APP_URL='https://thenewera.space';const {PrismaClient}=require('../node_modules/@prisma/client');const db=new PrismaClient();
let current=null;const mail=[];const cookieValues=new Map();const jar={get:k=>cookieValues.has(k)?{value:cookieValues.get(k)}:undefined,set:(k,v)=>cookieValues.set(k,v)};let liveAuth=null,authLive=false;global.prisma=db;const ts=require('../node_modules/typescript');require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);const original=Module._load;Module._load=function(name,parent,isMain){if(name==='@/lib/prisma')return {prisma:db};if(name==='@/lib/auth')return authLive?liveAuth:{getCurrentUser:async()=>current,verifyPassword:(...args)=>liveAuth.verifyPassword(...args)};if(name==='next/headers')return {cookies:async()=>jar};if(name==='@/lib/email'||(name==='./email'&&parent?.filename.endsWith('/verification.ts')))return {sendEmail:async options=>mail.push(options)};if(name.startsWith('@/'))name=path.resolve(root,'src',name.slice(2));return original.call(this,name,parent,isMain)};
const route=require('../app/api/workspace/[[...path]]/route.ts'),admin=require('../app/api/admin/company-workspaces/[[...path]]/route.ts'),policy=require('../src/lib/crm/policy.ts'),ws=require('../src/lib/crm/workspaces.ts'),core=require('../src/lib/crm/db.ts'),records=require('../src/lib/crm/records.ts');let count=0;
async function call(parts=[],b,who=current,administration=false){current=who;const url='http://localhost/api/'+(administration?'admin/company-workspaces':'workspace')+'/'+parts.join('/');const r=await (b===undefined?(administration?admin:route).GET:(administration?admin:route).POST)(new Request(url,{...(b===undefined?{}:{method:'POST',headers:{origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(b)})}),{params:Promise.resolve({path:parts.map(x=>x.split('?')[0])})});const d=r.headers.get('content-type')?.includes('application/json')?await r.json():await r.arrayBuffer();return {status:r.status,data:d};}
function status(r,n){assert.equal(r.status,n,JSON.stringify(r.data));count++;return r.data;}
async function user(email,role='CLIENT'){const u=await db.user.create({data:{email,passwordHash:'test-only',verifiedAt:new Date(),role}});return u;}
const leadFlow=require('../src/lib/crm/lead-flow.ts'),intake=require('../src/lib/crm/intake.ts'),socialHook=require('../src/lib/crm/social-webhook.ts'),inbox=require('../src/lib/crm/inbox.ts'),sync=require('../src/lib/crm/sync.ts');
try {
const owner=await user('owner@flow.test'),other=await user('other@flow.test'),a=await user('a@flow.test'),b=await user('b@flow.test'),viewer=await user('viewer@flow.test');
const id=status(await call([],{name:'Flow A',industry:'Services',email:owner.email,phone:'+994501111111'},owner),201).id;
const second=status(await call([],{name:'Flow B',industry:'Services',email:other.email,phone:'+994502222222'},other),201).id;
const seatA=await db.crmSeat.create({data:{companyId:id,userId:a.id,role:'SALES'}}),seatB=await db.crmSeat.create({data:{companyId:id,userId:b.id,role:'SALES'}}),seatV=await db.crmSeat.create({data:{companyId:id,userId:viewer.id,role:'VIEWER'}});
const ownerSeat=await db.crmSeat.findFirst({where:{companyId:id,userId:owner.id}});
const settings={enabled:true,assignment:'ROUND_ROBIN',memberIds:[seatA.id,seatB.id],escalationMinutes:30,followUpDays:2};
status(await call([id,'preferences'],{leadFlow:settings,slaMinutes:15},a),403);
status(await call([id,'preferences'],{leadFlow:{...settings,memberIds:[seatV.id]}},owner),400);
status(await call([id,'preferences'],{leadFlow:settings,slaMinutes:15},owner),200);
const key=status(await call([id,'intake-key'],{},owner),200).key;
assert(key);assert(!JSON.stringify(await db.crmEvent.findFirst({where:{companyId:id,key:'form-intake-secret'}})).includes(key));count+=2;
const form=(requestId,email,extra={})=>intake.receiveForm(id,key,{requestId,name:email,email,source:'Instagram reklamı',message:'Maraqlanıram',...extra});
await assert.rejects(()=>intake.receiveForm(id,'wrong',{requestId:'x'}));await assert.rejects(()=>intake.receiveForm(second,key,{requestId:'x'}));count+=2;
await form('f1','first@client.test');await form('f2','second@client.test');
const cs=await db.crmEntry.findMany({where:{companyId:id,kind:'customers'},orderBy:{createdAt:'asc'}});assert.equal(cs.length,2);assert.notEqual(cs[0].assigneeId,cs[1].assigneeId);count+=2;
assert.equal((await form('f1','first@client.test')).duplicate,true);await form('f3','FIRST@client.test');assert.equal(await db.crmEntry.count({where:{companyId:id,kind:'customers'}}),2);assert.equal(await db.crmEntry.count({where:{companyId:id,kind:'sales'}}),2);count+=3;
// Source attribution does not change when an existing contact returns via another campaign.
await form('f4','first@client.test',{source:'Google reklamı'});assert.equal((await db.crmEntry.findUnique({where:{id:cs[0].id}})).data.source,'Instagram reklamı');count++;
// Gmail sync exercises real ingestion with only external HTTP/credentials stubbed.
const connection=await db.crmConnection.create({data:{companyId:id,memberId:ownerSeat.id,provider:'google',channel:'MAIL',email:owner.email,secret:'test-only'}});
const connections=require('../src/lib/crm/connections.ts'),oldCredential=connections.credential,oldJSON=connections.requestJSON;
connections.credential=async()=> 'fake-access';connections.requestJSON=async url=>url.includes('?format=full')?{id:'gmail-1',internalDate:String(Date.now()),payload:{headers:[{name:'from',value:'New <mail@client.test>'},{name:'subject',value:'Email request'}],mimeType:'text/plain',body:{data:Buffer.from('Interested').toString('base64url')}}}:{messages:[{id:'gmail-1'}]};
try{await sync.syncMail(connection);await sync.syncMail(connection);}finally{connections.credential=oldCredential;connections.requestJSON=oldJSON;}
const mailCustomer=await db.crmEntry.findFirst({where:{companyId:id,kind:'customers',email:'mail@client.test'}});assert(mailCustomer);assert.equal(await db.crmEntry.count({where:{companyId:id,kind:'messages',data:{path:['providerId'],equals:'gmail-1'}}}),1);assert.equal(await db.crmEntry.count({where:{companyId:id,kind:'sales',customerId:mailCustomer.id}}),1);count+=3;
// A confirmed email reply resolves the linked form SLA.
const providers=require('../src/lib/crm/providers.ts'),oldActive=connections.activeConnection;
connections.activeConnection=async()=>connection;connections.credential=async()=> 'fake-access';
connections.requestJSON=async()=>({id:'confirmed-test-send'});
try{
 let draft=status(await call([id,'messages'],{title:'Form reply',status:'DRAFT',customerId:cs[0].id,data:{channel:'EMAIL',to:cs[0].email,body:'Reply'}},owner),200);
 await providers.send(owner,id,null,draft.id,true);let ft=await db.crmThread.findFirst({where:{companyId:id,channel:'FORM',customerId:cs[0].id}});assert.equal(ft.responseDueAt,null);count++;
}finally{connections.activeConnection=oldActive;connections.credential=oldCredential;connections.requestJSON=oldJSON;}
// Existing connected social ingress uses the same customer, sale and thread routing.
await db.crmSocialConnection.create({data:{companyId:id,memberId:ownerSeat.id,channel:'WHATSAPP',assetKey:'WHATSAPP:801',externalId:'801',parentId:'701',displayName:'Test',secret:'unused-inbound',state:'CONNECTED',readyAt:new Date()}});
const payload=(mid,at=Date.now(),from='994501234567')=>({object:'whatsapp_business_account',entry:[{id:'701',changes:[{value:{metadata:{phone_number_id:'801'},messages:[{id:mid,from,type:'text',timestamp:String(Math.floor(at/1000)),text:{body:'WhatsApp inquiry'}}]}}]}]});
await socialHook.receiveSocial('WHATSAPP',payload('wa1'));await socialHook.receiveSocial('WHATSAPP',payload('wa1'));let wa=await db.crmEntry.findFirst({where:{companyId:id,kind:'customers',phone:'+994501234567'}});assert(wa);assert.equal(await db.crmEntry.count({where:{companyId:id,kind:'messages',data:{path:['providerId'],equals:'wa1'}}}),1);count+=2;
let thread=await db.crmThread.findFirst({where:{companyId:id,channel:'WHATSAPP'}}),originalDue=thread.responseDueAt;
await socialHook.receiveSocial('WHATSAPP',payload('wa2',Date.now()+1000));thread=await db.crmThread.findUnique({where:{id:thread.id}});assert.equal(thread.responseDueAt.toISOString(),originalDue.toISOString());assert.equal(await db.crmEntry.count({where:{companyId:id,kind:'sales',customerId:wa.id}}),1);count+=2;
// Out-of-order webhook must not overwrite the latest inbound time or postpone alerts.
const latest=thread.lastInboundAt;await socialHook.receiveSocial('WHATSAPP',payload('wa-old',Date.now()-86400000));thread=await db.crmThread.findUnique({where:{id:thread.id}});assert.equal(thread.lastInboundAt.toISOString(),latest.toISOString());count++;
// Formatting differences in existing phone numbers still match the customer.
await db.crmEntry.update({where:{id:wa.id},data:{phone:'+994 (50) 123-45-67'}});await socialHook.receiveSocial('WHATSAPP',payload('wa3'));assert.equal(await db.crmEntry.count({where:{companyId:id,kind:'customers',OR:[{id:wa.id},{phone:'+994501234567'}]}}),1);count++;
const co=await db.crmCompany.findUnique({where:{id}}),due=new Date(Date.now()-60000);
await db.crmThread.update({where:{id:thread.id},data:{responseDueAt:due,assigneeId:seatA.id,lastOutboundAt:null}});
await core.tx(db=>leadFlow.unanswered(db,co));let notices=await db.crmEvent.findMany({where:{companyId:id,type:'NOTICE',key:{startsWith:'sla:'+thread.id}}});assert.equal(notices.length,1);assert.equal(notices[0].userId,a.id);count+=2;
await core.tx(db=>leadFlow.unanswered(db,co));assert.equal(await db.crmEvent.count({where:{companyId:id,type:'NOTICE',key:{startsWith:'sla:'+thread.id}}}),1);count++;
await core.tx(db=>leadFlow.unanswered(db,co,new Date(due.getTime()+31*60000)));assert.equal(await db.crmEvent.count({where:{companyId:id,type:'NOTICE',key:{startsWith:'sla:'+thread.id}}}),2);count++;
await db.crmThread.update({where:{id:thread.id},data:{lastOutboundAt:new Date(),responseDueAt:null}});await core.tx(db=>leadFlow.unanswered(db,co,new Date(Date.now()+86400000)));assert.equal(await db.crmEvent.count({where:{companyId:id,type:'NOTICE',key:{startsWith:'sla:'+thread.id}}}),2);count++;
// Manual assignment transfers linked customer and open sale as well as the thread.
const msg=await db.crmEntry.findFirst({where:{companyId:id,kind:'messages',data:{path:['providerId'],equals:'wa1'}}});status(await call([id,'inbox'],{messageId:msg.id,action:'assign',assigneeId:seatB.id},owner),200);assert.equal((await db.crmEntry.findUnique({where:{id:wa.id}})).assigneeId,seatB.id);assert.equal((await db.crmEntry.findFirst({where:{companyId:id,kind:'sales',customerId:wa.id}})).assigneeId,seatB.id);count+=2;
status(await call([id,'customers',wa.id],undefined,b),200);status(await call([second,'customers',wa.id],undefined,other),404);
// Quote transition creates one task; editing SENT and toggling to DRAFT/SENT cannot duplicate it.
const sale=await db.crmEntry.findFirst({where:{companyId:id,kind:'sales',customerId:cs[0].id}});
let quote=status(await call([id,'quotes'],{title:'Offer',status:'DRAFT',customerId:cs[0].id,saleId:sale.id,assigneeId:seatA.id,currency:'AZN',data:{lines:[{name:'Service',price:100,quantity:1}],discount:0}},owner),200);
quote=status(await call([id,'quotes',quote.id],{...quote,status:'SENT'},owner),200);
let tasks=await db.crmEntry.findMany({where:{companyId:id,kind:'tasks',data:{path:['quoteId'],equals:quote.id}}});assert.equal(tasks.length,1);assert.equal(tasks[0].saleId,sale.id);count+=2;
quote=status(await call([id,'quotes',quote.id],{...quote,status:'SENT'},owner),200);quote=status(await call([id,'quotes',quote.id],{...quote,status:'DRAFT'},owner),200);quote=status(await call([id,'quotes',quote.id],{...quote,status:'SENT'},owner),200);assert.equal(await db.crmEntry.count({where:{companyId:id,kind:'tasks',data:{path:['quoteId'],equals:quote.id}}}),1);count++;
// Conversion counts distinct customers, separates currencies and observes ownership and date filters.
await db.crmEntry.update({where:{id:sale.id},data:{status:'WON',amount:100}});
status(await call([id,'payments'],{title:'Receipt',status:'RECORDED',customerId:cs[0].id,saleId:sale.id,amount:50,currency:'AZN',assigneeId:seatA.id,data:{reference:'receipt-1'}},owner),200);
let report=status(await call([id,'reports'],undefined,owner),200).sourceConversion;let row=report.rows.find(x=>x.source==='Instagram reklamı');assert.equal(row.leads,2);assert.equal(row.conversion,50);assert.equal(row.received.AZN,50);count+=3;
report=status(await call([id,'reports?from=2099-01-01'],undefined,owner),200).sourceConversion;assert.equal(report.rows.length,0);count++;
report=status(await call([id,'reports'],undefined,a),200).sourceConversion;assert(report.rows.every(x=>x.received===null));assert(report.rows.every(x=>x.leads<=2));count+=2;
// Already-acquired customer does not get a new deal on every inbound after WON.
await form('f5','first@client.test');assert.equal(await db.crmEntry.count({where:{companyId:id,kind:'sales',customerId:cs[0].id}}),1);count++;
// Conflicting email and phone never merge distinct people.
await db.crmEntry.update({where:{id:cs[1].id},data:{phone:'+994509876543'}});await assert.rejects(()=>form('conflict','first@client.test',{phone:'+994509876543'}));count++;
// Deactivated assignees are skipped and their returning customer's open CRM records follow the active replacement.
const oldSeat=await db.crmSeat.findUnique({where:{id:mailCustomer.assigneeId}});await db.crmSeat.update({where:{id:oldSeat.id},data:{active:false}});await form('reassign','mail@client.test');const reassigned=await db.crmEntry.findUnique({where:{id:mailCustomer.id}});assert.notEqual(reassigned.assigneeId,oldSeat.id);assert.equal((await db.crmEntry.findFirst({where:{companyId:id,kind:'sales',customerId:mailCustomer.id,status:'OPEN'}})).assigneeId,reassigned.assigneeId);count+=2;await db.crmSeat.update({where:{id:oldSeat.id},data:{active:true}});
// Disabled, expired and record-limited workspaces cannot create partial CRM trees.
await db.crmCompany.update({where:{id},data:{records:await db.crmEntry.count({where:{companyId:id,deletedAt:null}})}});const before=await db.crmEntry.count({where:{companyId:id}});await assert.rejects(()=>form('limit','limit@client.test'));assert.equal(await db.crmEntry.count({where:{companyId:id}}),before);count+=2;
await db.crmCompany.update({where:{id},data:{records:10000,trialEnd:new Date(Date.now()-1000)}});await assert.rejects(()=>form('expired','expired@client.test'));count++;
await db.crmCompany.update({where:{id},data:{trialEnd:new Date(Date.now()+86400000)}});status(await call([id,'intake-key'],{revoke:true},owner),200);await assert.rejects(()=>form('revoked','revoked@client.test'));count++;
console.log(`PASS ${count} lead-flow checks: routing, deduplication, Meta ingress, SLA, follow-ups, source reports, tenant and permission isolation.`);
}finally{await db.$disconnect();await server.stop();await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
