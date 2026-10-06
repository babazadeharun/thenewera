import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const stages = ['NEW','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST'] as const;
const priorities = ['LOW','NORMAL','HIGH','URGENT'] as const;
const activityTypes = ['CALL','EMAIL','MEETING','WHATSAPP','FOLLOW_UP','NOTE','PROPOSAL'] as const;

const adminOnly = async () => {
  const user = await getCurrentUser();
  if (!user || !['ADMIN','SUPER_ADMIN'].includes(user.role)) return null;
  return user;
};

const iso = (v: Date | null | undefined) => v ? v.toISOString() : null;
const money = (v: unknown) => v == null ? null : Number(v);

function serializeDeal(d: any) {
  return {
    ...d,
    budget: money(d.budget), value: money(d.value), proposalValue: money(d.proposalValue),
    expectedCloseDate: iso(d.expectedCloseDate), nextFollowUp: iso(d.nextFollowUp), proposalDate: iso(d.proposalDate), proposalSentAt: iso(d.proposalSentAt),
    createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString(),
    activities: d.activities?.map((a:any)=>({...a, dueAt:iso(a.dueAt), completedAt:iso(a.completedAt), createdAt:a.createdAt.toISOString()})) ?? [],
  };
}

export async function GET() {
  const user = await adminOnly();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const [deals, clients, services, users, projects]: any = await Promise.all([
      (prisma as any).salesDeal.findMany({ orderBy: { updatedAt: 'desc' }, include: { client: true, service: true, project: true, assignedUser: { select: { id:true, email:true, role:true } }, activities: { orderBy: { createdAt: 'desc' }, take: 30 } } }),
      prisma.client.findMany({ orderBy: { company: 'asc' }, select: { id:true, firstName:true, lastName:true, company:true, email:true, phone:true, website:true, instagram:true } }),
      prisma.service.findMany({ orderBy: { name: 'asc' }, select: { id:true, name:true } }),
      prisma.user.findMany({ where: { role: { in: ['ADMIN','SUPER_ADMIN'] } }, orderBy: { email: 'asc' }, select: { id:true, email:true, role:true } }),
      prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, select: { id:true, title:true, clientId:true, serviceId:true } }),
    ]);
    const active: any[] = deals.filter((d:any) => !['WON','LOST'].includes(d.stage));
    const won: any[] = deals.filter((d:any) => d.stage === 'WON');
    const proposals: any[] = deals.filter((d:any) => ['PROPOSAL','NEGOTIATION'].includes(d.stage));
    const pipelineValue = active.reduce((s:number,d:any)=>s+money(d.value||d.budget||0)!,0);
    const weightedForecast = active.reduce((s:number,d:any)=>s+(money(d.value||d.budget||0)! * Math.max(0,Math.min(100,d.probability))/100),0);
    const wonRevenue = won.reduce((s:number,d:any)=>s+money(d.value||0)!,0);
    const leads = deals.length;
    const converted = won.length;
    const today = new Date(); today.setHours(23,59,59,999);
    const dayStart = new Date(); dayStart.setHours(0,0,0,0);
    const followUps: any[] = deals.filter((d:any)=>d.nextFollowUp && d.stage !== 'LOST' && d.stage !== 'WON');
    const todayFollowUps: any[] = followUps.filter((d:any)=>d.nextFollowUp! >= dayStart && d.nextFollowUp! <= today);
    const overdue: any[] = followUps.filter((d:any)=>d.nextFollowUp! < dayStart);
    return NextResponse.json({ deals: deals.map(serializeDeal), clients, services, users, projects, kpis: { pipelineValue, weightedForecast, wonRevenue, activeDeals:active.length, conversionRate: leads ? (converted/leads)*100 : 0, proposals:proposals.length, followUps:followUps.length }, followUps: { today: todayFollowUps.map(serializeDeal), overdue: overdue.map(serializeDeal) } });
  } catch (e) { console.error('sales GET', e); return NextResponse.json({ error: 'Satış məlumatlarını yükləmək mümkün olmadı.' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const user = await adminOnly();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const b = await req.json();
    if (b.action === 'convertProject') {
      if (!b.id) return NextResponse.json({ error: 'Satış ID tələb olunur.' }, { status: 400 });
      const deal:any = await (prisma as any).salesDeal.findUnique({ where:{id:b.id}, include:{client:true, service:true} });
      if (!deal) return NextResponse.json({ error:'Satış tapılmadı.' }, { status:404 });
      if (deal.stage !== 'WON') return NextResponse.json({ error:'Yalnız Qazanıldı mərhələsində olan satış layihəyə çevrilə bilər.' }, { status:400 });
      if (!deal.clientId || !deal.serviceId) return NextResponse.json({ error:'Layihəyə çevirmək üçün müştəri və xidmət seçilməlidir.' }, { status:400 });
      if (deal.projectId) return NextResponse.json({ projectId:deal.projectId });
      const project = await prisma.project.create({ data:{ title:deal.title, brief:deal.notes || `Satışdan yaradılan layihə: ${deal.title}`, budget:deal.value != null ? String(Number(deal.value)) : null, clientId:deal.clientId, serviceId:deal.serviceId, activities:{create:{type:'sales-conversion',text:'Layihə Sales CRM-də Qazanıldı satışından yaradıldı.'}} } });
      await (prisma as any).salesDeal.update({ where:{id:deal.id}, data:{projectId:project.id} });
      await (prisma as any).salesActivity.create({ data:{dealId:deal.id,type:'NOTE',text:`Layihəyə çevrildi: ${project.id}`,createdByUserId:user.id,clientId:deal.clientId,projectId:project.id} });
      return NextResponse.json({ projectId:project.id });
    }
    if (!b.title?.trim()) return NextResponse.json({ error: 'Satış adı tələb olunur.' }, { status: 400 });
    const stage = stages.includes(b.stage) ? b.stage : 'NEW';
    const priority = priorities.includes(b.priority) ? b.priority : 'NORMAL';
    const deal = await (prisma as any).salesDeal.create({ data: {
      title:String(b.title).trim(), contactName:b.contactName?String(b.contactName):null, email:b.email?String(b.email):null, phone:b.phone?String(b.phone):null,
      source:b.source?String(b.source):null, stage, priority, budget:b.budget==null||b.budget===''?null:Number(b.budget), value:b.value==null||b.value===''?null:Number(b.value), probability:Math.max(0,Math.min(100,Number(b.probability)||20)),
      expectedCloseDate:b.expectedCloseDate?new Date(b.expectedCloseDate):null, nextFollowUp:b.nextFollowUp?new Date(b.nextFollowUp):null, notes:b.notes?String(b.notes):null,
      clientId:b.clientId||null, serviceId:b.serviceId||null, projectId:b.projectId||null, assignedUserId:b.assignedUserId||user.id,
      proposalStatus:b.proposalStatus?String(b.proposalStatus):null, proposalValue:b.proposalValue==null||b.proposalValue===''?null:Number(b.proposalValue), proposalDate:b.proposalDate?new Date(b.proposalDate):null,
    }});
    await (prisma as any).salesActivity.create({ data: { dealId:deal.id, type:'NOTE', text:'Satış yaradıldı.', createdByUserId:user.id, clientId:deal.clientId, projectId:deal.projectId } });
    return NextResponse.json({ deal: serializeDeal(await (prisma as any).salesDeal.findUnique({ where:{id:deal.id}, include:{client:true,service:true,project:true,assignedUser:{select:{id:true,email:true,role:true}},activities:{orderBy:{createdAt:'desc'}}} })) }, { status:201 });
  } catch(e) { console.error('sales POST',e); return NextResponse.json({error:'Satış yaratmaq mümkün olmadı.'},{status:500}); }
}

export async function PATCH(req: NextRequest) {
  const user = await adminOnly();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const b = await req.json(); if (!b.id) return NextResponse.json({error:'Satış ID tələb olunur.'},{status:400});
    const before = await (prisma as any).salesDeal.findUnique({where:{id:b.id}}); if (!before) return NextResponse.json({error:'Satış tapılmadı.'},{status:404});
    const data:any = {};
    for (const k of ['title','contactName','email','phone','source','lossReason','notes','proposalStatus','proposalResponse','revisionStatus']) if (k in b) data[k] = b[k] ? String(b[k]) : null;
    if ('stage' in b) { data.stage = stages.includes(b.stage) ? b.stage : before.stage; if (b.stage === 'LOST' && !((b.lossReason ?? before.lossReason) || '').trim()) return NextResponse.json({error:'İtirilmiş satış üçün səbəb daxil edin.'},{status:400}); }
    if ('priority' in b) data.priority = priorities.includes(b.priority) ? b.priority : before.priority;
    if ('probability' in b) data.probability = Math.max(0,Math.min(100,Number(b.probability)||0));
    for (const k of ['budget','value','proposalValue']) if (k in b) data[k] = b[k]===''||b[k]==null?null:Number(b[k]);
    for (const k of ['expectedCloseDate','nextFollowUp','proposalDate']) if (k in b) data[k] = b[k]?new Date(b[k]):null;
    for (const k of ['clientId','serviceId','projectId','assignedUserId']) if (k in b) data[k] = b[k]||null;
    const deal = await (prisma as any).salesDeal.update({where:{id:b.id},data});
    if (b.stage && b.stage !== before.stage) await (prisma as any).salesActivity.create({data:{dealId:deal.id,type:'NOTE',text:`Mərhələ dəyişdi: ${before.stage} → ${deal.stage}`,createdByUserId:user.id,clientId:deal.clientId,projectId:deal.projectId}});
    return NextResponse.json({deal:serializeDeal(await (prisma as any).salesDeal.findUnique({where:{id:deal.id},include:{client:true,service:true,project:true,assignedUser:{select:{id:true,email:true,role:true}},activities:{orderBy:{createdAt:'desc'}}}}))});
  } catch(e){console.error('sales PATCH',e);return NextResponse.json({error:'Satış yenilənə bilmədi.'},{status:500});}
}

export async function DELETE(req:NextRequest){
  const user=await adminOnly(); if(!user)return NextResponse.json({error:'Authentication required'},{status:401});
  try{const b=await req.json();if(!b.id)return NextResponse.json({error:'ID tələb olunur.'},{status:400});await (prisma as any).salesDeal.delete({where:{id:b.id}});return NextResponse.json({ok:true});}
  catch(e){console.error('sales DELETE',e);return NextResponse.json({error:'Satış silinə bilmədi.'},{status:500});}
}

export async function PUT(req:NextRequest){
  const user=await adminOnly(); if(!user)return NextResponse.json({error:'Authentication required'},{status:401});
  try{const b=await req.json();if(!b.dealId||!b.text?.trim())return NextResponse.json({error:'Fəaliyyət məlumatı natamamdır.'},{status:400});const type=activityTypes.includes(b.type)?b.type:'NOTE';const activity=await (prisma as any).salesActivity.create({data:{dealId:b.dealId,type,text:String(b.text).trim(),dueAt:b.dueAt?new Date(b.dueAt):null,clientId:b.clientId||null,projectId:b.projectId||null,createdByUserId:user.id}});return NextResponse.json({activity:{...activity,dueAt:iso(activity.dueAt),completedAt:iso(activity.completedAt),createdAt:activity.createdAt.toISOString()}},{status:201});}
  catch(e){console.error('sales activity',e);return NextResponse.json({error:'Fəaliyyət əlavə olunmadı.'},{status:500});}
}
