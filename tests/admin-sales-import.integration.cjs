// Real Prisma + disposable PostgreSQL. No production DB, accounts or messages.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.resolve(__dirname,'..');process.chdir(root);
(async()=>{
 const {PGlite}=await import(require('node:url').pathToFileURL(path.join(root,'.crm-test-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
 const {PGLiteSocketServer}=await import(require('node:url').pathToFileURL(path.join(root,'.crm-test-runtime/node_modules/@electric-sql/pglite-socket/dist/index.js')).href);
 const pg=await PGlite.create();await pg.exec(require('node:child_process').execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'],{encoding:'utf8',env:{...process.env,DATABASE_URL:'postgresql://unused:unused@127.0.0.1:1/unused'}}));
 const server=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:55441});await server.start();process.env.DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55441/postgres?connection_limit=1';
 const {PrismaClient}=require('@prisma/client'),db=new PrismaClient();let current=null;let checks=0;
 const ts=require('typescript');require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
 const original=Module._load;Module._load=function(name,parent,isMain){if(name==='@/lib/prisma')return {prisma:db};if(name==='@/lib/auth')return {getCurrentUser:async()=>current};if(name.startsWith('@/'))name=path.resolve(root,'src',name.slice(2));return original.call(this,name,parent,isMain);};
 const imports=require('../app/api/admin/sales/import/route.ts'),sales=require('../app/api/admin/sales/route.ts'),parser=require('../src/lib/sales/import.ts');
 async function post(body,who=current,headers={origin:'https://thenewera.space'}){current=who;const form=body instanceof FormData;const r=await imports.POST(new Request('https://thenewera.space/api/admin/sales/import',{method:'POST',headers:{...headers,...(form?{}:{'Content-Type':'application/json'})},body:form?body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}
 async function patch(body){const r=await sales.PATCH(new Request('https://thenewera.space/api/admin/sales',{method:'PATCH',headers:{origin:'https://thenewera.space','Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}
 function eq(a,b){assert.deepEqual(a,b);checks++;}
 function ok(a){assert(a);checks++;}
 const admin=await db.user.create({data:{email:'admin@test.local',passwordHash:'test-only',verifiedAt:new Date(),role:'SUPER_ADMIN'}}),client=await db.user.create({data:{email:'client@test.local',passwordHash:'test-only',verifiedAt:new Date(),role:'CLIENT'}}),ordinaryAdmin=await db.user.create({data:{email:'other@test.local',passwordHash:'test-only',verifiedAt:new Date(),role:'ADMIN'}});
 try {
 const mapping={title:0,contactName:1,email:2,phone:3,instagram:4,industry:5,notes:6},row=['Clinic Alpha','Doctor One','doctor@example.test','050 123 45 67','@doctor','Dental','Initial note'];
 const preview={action:'preview',rows:[row],mapping};
 eq((await post(preview,null)).status,403);eq((await post(preview,client)).status,403);eq((await post(preview,admin,{origin:'https://evil.test'})).status,403);eq((await post(preview,admin,{})).status,403);
 eq((await post({...preview,rows:Array(26).fill(row)},admin)).status,400);
 let d=await post(preview,admin);eq(d.data.results[0].status,'ready');eq(await db.salesDeal.count(),0);
 eq((await post({...preview,action:'commit'},admin)).status,400);
 d=await post({...preview,action:'commit',confirm:true},admin);eq(d.data.results[0].status,'created');const id=d.data.results[0].id;
 let deal=await db.salesDeal.findUnique({where:{id},include:{activities:true}});eq(deal.proposalStatus,'TODO');eq(deal.assignedUserId,admin.id);ok(deal.notes.includes('Instagram: @doctor'));ok(deal.notes.includes('Dental'));eq(deal.activities.length,1);eq(await db.client.count(),0);
 d=await post({...preview,action:'commit',confirm:true},admin);eq(d.data.results[0].status,'duplicate');eq(await db.salesDeal.count(),1);
 d=await post({...preview,rows:[['Other name','X','DOCTOR@EXAMPLE.TEST','']]},admin);eq(d.data.results[0].status,'duplicate');
 d=await post({...preview,rows:[['Other name','X','','+994501234567']]},admin);eq(d.data.results[0].status,'duplicate');
 const sameFile=await post({...preview,rows:[['Beta','D','beta@example.test'],['Beta again','D','BETA@EXAMPLE.TEST']]},admin);eq(sameFile.data.results.map(x=>x.status),['ready','duplicate']);
 const invalid=await post({...preview,rows:[['','','bad',''],['Bad','B','invalid',''],['Phone','B','','123'],['Name only','Person']]},admin);eq(invalid.data.results.map(x=>x.status),['error','error','error','ready']);
 d=await post({...preview,rows:[['Partial invalid','P','bad'],['Valid','V','valid@example.test']],action:'commit',confirm:true},admin);eq(d.data.results.map(x=>x.status),['error','created']);eq(await db.salesDeal.count(),2);
 // Concurrent/retried imports are serialized and cannot duplicate each other.
 const concurrent={...preview,rows:[['Concurrent','C','concurrent@example.test']],action:'commit',confirm:true};
 const parallel=await Promise.all([post(concurrent,admin),post(concurrent,admin)]);eq(parallel.map(r=>r.data.results[0].status).sort(),['created','duplicate']);eq(await db.salesDeal.count(),3);
 // Existing manual records are matched, never overwritten.
 const manual=await db.salesDeal.create({data:{title:'Manual lead',email:'manual@example.test',phone:'+994551112233',notes:'Keep me',proposalStatus:'DRAFT'}});
 d=await post({...preview,rows:[['Overwrite attempt','X','MANUAL@example.test']],action:'commit',confirm:true},admin);eq(d.data.results[0].status,'duplicate');eq((await db.salesDeal.findUnique({where:{id:manual.id}})).notes,'Keep me');
 eq((await post(preview,ordinaryAdmin)).status,200);
 // Tracking: explicit acknowledgement, date, history, rejection reason, no sends.
 current=admin;eq((await patch({id,proposalStatus:'SENT'})).status,400);
 eq((await patch({id,proposalStatus:'BOGUS'})).status,400);
 eq((await patch({id,proposalStatus:'SENT',confirmSent:true,proposalChannel:'UNSAFE'})).status,400);
 d=await patch({id,proposalStatus:'SENT',confirmSent:true,proposalChannel:'EMAIL'});eq(d.status,200);ok(d.data.deal.proposalSentAt);ok(d.data.deal.activities.some(a=>a.type==='PROPOSAL'&&a.text.includes('EMAIL')));const sent=d.data.deal.proposalSentAt;
 eq((await patch({id,proposalStatus:'WAITING',nextFollowUp:'2026-10-25'})).status,200);
 eq((await db.salesDeal.findUnique({where:{id}})).proposalSentAt.toISOString(),sent);
 eq((await patch({id,proposalStatus:'DECLINED'})).status,400);eq((await patch({id,proposalStatus:'DECLINED',proposalResponse:'Budget unavailable'})).status,200);
 current=client;eq((await patch({id,proposalStatus:'INTERESTED'})).status,401);current=admin;
 // Manual creation and legacy pipeline/actions remain available.
 let response=await sales.POST(new Request('https://thenewera.space/api/admin/sales',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Manual new',stage:'QUALIFIED',notes:'Manual flow'})}));eq(response.status,201);eq((await response.json()).deal.proposalStatus,'TODO');
 response=await sales.GET();eq(response.status,200);ok((await response.json()).deals.some(d=>d.id===manual.id));
 // Actual parsers: spreadsheet, DOCX tables, CSV quoting, validation & malformed ZIP.
 const ExcelJS=require('exceljs'),Zip=require('jszip');const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('Customers');sheet.addRow(['Şirkət','Ad soyad','Email']);sheet.addRow(['Real XLSX','Person','xlsx@example.test']);const xlsx=Buffer.from(await wb.xlsx.writeBuffer());
 let parsed=await parser.parseSalesFile(xlsx,'clients.xlsx');eq(parsed.rows[0][0],'Real XLSX');
 sheet.getCell('B2').value={formula:'1+1',result:2};await assert.rejects(()=>parser.parseSalesFile(Buffer.alloc(0),'x.doc'));checks++;
 const formulaBytes=Buffer.from(await wb.xlsx.writeBuffer());await assert.rejects(()=>parser.parseSalesFile(formulaBytes,'formula.xlsx'));checks++;
 parsed=await parser.parseSalesFile(Buffer.from('Şirkət;Ad soyad;Email\n"Clinic; B";"Doctor ""B""";b@example.test\n'),'clients.csv');eq(parsed.rows[0],['Clinic; B','Doctor "B"','b@example.test']);
 const xml='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl>'+[['Şirkət','Ad soyad','Email'],['Clinic &amp; Doctor','Doktor Əli','word@example.test']].map(r=>'<w:tr>'+r.map(c=>'<w:tc><w:p><w:r><w:t>'+c+'</w:t></w:r></w:p></w:tc>').join('')+'</w:tr>').join('')+'</w:tbl></w:body></w:document>';
 const zip=new Zip();zip.file('word/document.xml',xml);const docx=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});parsed=await parser.parseSalesFile(docx,'clients.docx');eq(parsed.headers,['Şirkət','Ad soyad','Email']);eq(parsed.rows[0][0],'Clinic & Doctor');
 for(const [bytes,name]of [[Buffer.alloc(2*1024*1024+1),'big.xlsx'],[Buffer.from('invalid'),'broken.docx'],[Buffer.from('invalid'),'old.doc'],[Buffer.from('Title,Email\n"unclosed'),'bad.csv']]){await assert.rejects(()=>parser.parseSalesFile(bytes,name));checks++;}
 const noTable=new Zip();noTable.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>No table</w:t></w:r></w:p></w:body></w:document>');const noTableBytes=await noTable.generateAsync({type:'nodebuffer'});await assert.rejects(()=>parser.parseSalesFile(noTableBytes,'no-table.docx'));checks++;
 // Upload action cannot write; content size limits are checked before parsing.
 const form=new FormData();form.append('file',new File([docx],'customers.docx'));eq((await post(form,admin)).data.rows[0][0],'Clinic & Doctor');
 eq((await post(preview,admin,{origin:'https://thenewera.space','content-length':'9000000'})).status,400);
 eq(parser.phoneKey('00994501234567'),parser.phoneKey('050 123 45 67'));eq(parser.phoneKey('+123456789'),'123456789');
 console.log(`PASS ${checks} checks — admin sales import and tracking`);
 }finally{await db.$disconnect();await server.stop();await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
