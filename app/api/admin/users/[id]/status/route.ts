import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addCustomerNotification } from '@/lib/workspace';
const allowed = new Set(['REGISTERED','QUALIFIED','CLIENT','SUSPENDED','ARCHIVED']);
const transitions: Record<string,string[]> = { REGISTERED:['QUALIFIED','SUSPENDED','ARCHIVED'], QUALIFIED:['CLIENT','REGISTERED','SUSPENDED','ARCHIVED'], CLIENT:['SUSPENDED','ARCHIVED'], SUSPENDED:['CLIENT','ARCHIVED'], ARCHIVED:[] };
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error:'Authentication required' },{status:401}); if (!['ADMIN','SUPER_ADMIN'].includes(actor.role)) return NextResponse.json({ error:'Forbidden' },{status:403});
  const {id}=await params; const body=await req.json().catch(()=>({})); const next=String(body.status||''); const reason=String(body.reason||'').trim();
  if (!allowed.has(next)) return NextResponse.json({error:'Yanlış status.'},{status:400});
  const target=await prisma.user.findUnique({where:{id},select:{id:true,role:true,accountStatus:true,email:true,client:{select:{firstName:true,lastName:true}}}});
  if(!target||target.role!=='CLIENT') return NextResponse.json({error:'İstifadəçi tapılmadı.'},{status:404});
  if(!transitions[target.accountStatus].includes(next) && target.accountStatus!==next) return NextResponse.json({error:'Bu status keçidi icazəli deyil.'},{status:409});
  const now = new Date();
  const event = next==='CLIENT' ? 'CLIENT_APPROVED' : next==='SUSPENDED' ? 'ACCOUNT_SUSPENDED' : next==='ARCHIVED' ? 'ACCOUNT_ARCHIVED' : next==='REGISTERED' && target.accountStatus==='SUSPENDED' ? 'ACCOUNT_RESTORED' : 'ACCOUNT_STATUS_CHANGED';
  const updated=await prisma.$transaction(async tx=>{
    const u=await tx.user.update({where:{id},data:{accountStatus:next as any}});
    await tx.auditLog.create({data:{event: event as any, actorId:actor.id,targetUserId:id,oldValue:target.accountStatus,newValue:next,reason:reason||null}});
    if(next==='CLIENT') await tx.customerNotification.create({data:{userId:id,type:'ACCOUNT_APPROVED',title:'New Era hesabınız təsdiqləndi',message:'Hesabınız müştəri hesabı kimi aktivləşdirildi. İndi genişləndirilmiş iş məkanınızdan istifadə edə bilərsiniz.',link:'/account'}});
    else if(next!==target.accountStatus) await tx.customerNotification.create({data:{userId:id,type:'ACCOUNT_STATUS_CHANGED',title:'Hesab statusunuz yeniləndi',message:`Hesab statusunuz ${next === 'QUALIFIED' ? 'Qualified' : next === 'SUSPENDED' ? 'dayandırılmış' : next === 'ARCHIVED' ? 'arxivlənmiş' : 'Registered'} olaraq dəyişdirildi.`,link:'/account'}});
    return u;
  });
  return NextResponse.json({ok:true,user:{id:updated.id,accountStatus:updated.accountStatus}});
}
