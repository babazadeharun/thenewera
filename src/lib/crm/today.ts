import { Prisma } from '@prisma/client';
import { where, permit, type DB, type Context } from './db';
import { CRMError } from './policy';
import { fingerprint } from './preferences';
// Every bucket uses the existing tenant + role + OWN/TEAM/ALL policy.
export async function today(db:DB,c:Context,q:URLSearchParams,now=new Date()) {
 const scopes:Record<string,Prisma.CrmEntryWhereInput|null>={};
 for(const kind of ['customers','sales','tasks','messages','payments','quotes']) {
  try{scopes[kind]=await where(db,c,kind);}catch(e){if(!(e instanceof CRMError)||e.status!==403)throw e;scopes[kind]=null;}
 }
 // Azerbaijan uses UTC+04:00; the heading explicitly names Baku time.
 const dayEnd=new Date(Math.floor((now.getTime()+4*3600000)/86400000)*86400000+86400000-4*3600000);
 const select={id:true,kind:true,title:true,status:true,dueAt:true,assigneeId:true,data:true,amount:true,currency:true,customerId:true} as const;
 type Row={id:string;kind:string;title:string;status?:string;dueAt?:Date|null;assigneeId?:string|null;data?:Prisma.JsonValue;amount?:Prisma.Decimal;currency?:string;balance?:string;overdue?:boolean};
 const buckets:Record<string,{label:string;items:Row[];count:number;available:boolean}>={};
 const make=(key:string,label:string,items:Row[],available:boolean)=>buckets[key]={label,items,count:items.length,available};
 const contacts=scopes.sales?await db.crmEntry.findMany({where:{AND:[scopes.sales,{status:'OPEN',data:{path:['nextContactAt'],lt:dayEnd.toISOString()}}]},select,orderBy:{updatedAt:'asc'}}):[];
 make('contacts','Əlaqə vaxtı çatmış satışlar',contacts.filter(x=>typeof (x.data as Record<string,unknown>)?.nextContactAt==='string'&&Boolean((x.data as Record<string,unknown>).nextContactAt)),!!scopes.sales);
 const tasks=scopes.tasks?await db.crmEntry.findMany({where:{AND:[scopes.tasks,{status:{in:['OPEN','IN_PROGRESS']},dueAt:{lt:now}}]},select,orderBy:{dueAt:'asc'}}):[];
 make('tasks','Gecikmiş tapşırıqlar',tasks,!!scopes.tasks);
 let unanswered:Row[]=[];
 if(scopes.messages){
  const ids=(await db.crmEntry.findMany({where:scopes.messages,select:{id:true}})).map(x=>x.id);
  if(ids.length){
   const rows=await db.$queryRaw<Array<{id:string}>>`SELECT (array_agg("id" ORDER BY "createdAt" DESC) FILTER (WHERE "status"='RECEIVED'))[1] AS id FROM "CrmEntry" WHERE "companyId"=${c.company.id} AND "id"=ANY(${ids}::text[]) GROUP BY "data"->>'channel', CASE WHEN "data"->>'channel'='WHATSAPP' THEN regexp_replace("data"->>'to','[^0-9]','','g') ELSE lower("data"->>'to') END HAVING MAX("createdAt") FILTER (WHERE "status"='RECEIVED') > COALESCE(MAX("createdAt") FILTER (WHERE "status"='SENT'),'-infinity'::timestamp) ORDER BY MAX("createdAt") DESC`;
   unanswered=await db.crmEntry.findMany({where:{AND:[scopes.messages,{id:{in:rows.map(x=>x.id)}}]},select,orderBy:{createdAt:'desc'}});
  }
 }
 make('messages','Cavabsız yazışmalar',unanswered,!!scopes.messages);
 let balances:Row[]=[];
 if(scopes.sales&&scopes.payments){
  const sales=await db.crmEntry.findMany({where:{AND:[scopes.sales,{status:{in:['OPEN','WON']},amount:{gt:0}}]},select,orderBy:{dueAt:'asc'}});
  const sums=await db.crmEntry.groupBy({by:['saleId','currency'],where:{AND:[scopes.payments,{status:'RECORDED',saleId:{in:sales.map(s=>s.id)}}]},_sum:{amount:true}});
  const totals=new Map(sums.map(p=>[p.saleId+'|'+p.currency,p._sum.amount||new Prisma.Decimal(0)]));
  balances=sales.map(s=>{const balance=s.amount.minus(totals.get(s.id+'|'+s.currency)||0);const due=(s.data as Record<string,unknown>)?.paymentDueAt;return {...s,balance:balance.toFixed(2),overdue:typeof due==='string'&&Number.isFinite(Date.parse(due))&&new Date(due)<now};}).filter(s=>Number(s.balance)>0);
  balances.sort((a,b)=>Number(b.overdue)-Number(a.overdue));
 }
 make('payments','Qalıq ödənişi olan satışlar',balances,!!scopes.sales&&!!scopes.payments);
 let pending:Row[]=[];
 // Only users able to decide approvals get the "waiting for me" bucket.
 let canDecide=false;try{permit(c,'settings','update');canDecide=true;}catch(e){if(!(e instanceof CRMError)||e.status!==403)throw e;}
 if(scopes.quotes&&canDecide){const quotes=await db.crmEntry.findMany({where:scopes.quotes,select});const pendingIds=new Set((await db.crmApproval.findMany({where:{companyId:c.company.id,status:'PENDING',entryId:{in:quotes.map(x=>x.id)}},select:{entryId:true,fingerprint:true}})).map(x=>x.entryId+'|'+x.fingerprint));pending=quotes.filter(x=>pendingIds.has(x.id+'|'+fingerprint(x)));}
 make('approvals','Qərar gözləyən təkliflər',pending,!!scopes.quotes&&canDecide);
 const count=async(kind:string,extra:Prisma.CrmEntryWhereInput={})=>scopes[kind]?await db.crmEntry.count({where:{AND:[scopes[kind]!,extra]}}):null;
 let invited:number|null=null;try{permit(c,'team','read');invited=(await db.crmSeat.count({where:{companyId:c.company.id,active:true,userId:{not:c.user.id}}}))+(await db.crmInvitation.count({where:{companyId:c.company.id,revokedAt:null,acceptedAt:null,expiresAt:{gt:now}}}));}catch(e){if(!(e instanceof CRMError)||e.status!==403)throw e;}
 const setup={customers:await count('customers'),sales:await count('sales'),team:invited,nextStep:await count('sales',{status:'OPEN',AND:[{data:{path:['nextStep'],gt:''}},{data:{path:['nextContactAt'],gt:''}}]})};
 if(c.member&&!c.support&&c.state!=='SUSPENDED') {
  const day=new Date(now.getTime()+4*3600000).toISOString().slice(0,10);
  await db.crmEvent.upsert({where:{companyId_key:{companyId:c.company.id,key:'daily-use:'+c.user.id+':'+day}},create:{companyId:c.company.id,key:'daily-use:'+c.user.id+':'+day,type:'PRODUCT_USAGE',userId:c.user.id,data:{screen:'daily',day}},update:{}});
 }
 const key=q.get('bucket')||'contacts',bucket=buckets[key]||buckets.contacts,page=Math.max(1,Math.min(100000,Math.floor(Number(q.get('page'))||1)));
 return {asOf:now.toISOString(),timezone:'Asia/Baku',cards:Object.entries(buckets).filter(([,b])=>b.available).map(([key,b])=>({key,label:b.label,count:b.count})),bucket:key in buckets?key:'contacts',label:bucket.label,items:bucket.items.slice((page-1)*25,page*25),total:bucket.count,page,pageSize:25,setup,paymentNotice:'Qalıq yalnız baxmağa icazəniz olan satış və ödənişlərdən hesablanır. Bu göstərici faktiki bank balansı deyil.'};
}
