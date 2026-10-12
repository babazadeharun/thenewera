import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { projectRepository } from '@/lib/data/repository'
import type { ProjectStatus } from '@/lib/data/types'
import { getWorkspaceContext, hasPermission, PERMISSIONS } from '@/lib/workspace'
import { prisma } from '@/lib/prisma'
const statuses: ProjectStatus[]=['Brief Submitted','Reviewing','Approved','In Progress','Review','Completed']
export async function GET(){
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:'Authentication required'},{status:401});
 const context=await getWorkspaceContext(user.id); if(user.role!=='ADMIN' && !hasPermission(context, PERMISSIONS.VIEW_PROJECTS)) return NextResponse.json({error:'Forbidden'},{status:403}); const projects=await projectRepository.list(); const visible=user.role==='ADMIN'?projects:projects.filter(p=>p.clientEmail===user.email); return NextResponse.json({projects:visible})
}
export async function POST(request:NextRequest){
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:'Authentication required'},{status:401});
 const context=await getWorkspaceContext(user.id); if(user.role!=='ADMIN' && !hasPermission(context, PERMISSIONS.CREATE_PROJECT)) return NextResponse.json({error:'Bu əməliyyat üçün icazəniz yoxdur.'},{status:403});
 try{const body=await request.json(); const clientEmail=user.role==='CLIENT'?user.email:String(body.clientEmail||'').toLowerCase(); if(!clientEmail||!body?.title||!body?.service||!body?.brief)return NextResponse.json({error:'başlıq, xidmət və brief tələb olunur'},{status:400}); const status:ProjectStatus=statuses.includes(body.status)?body.status:'Brief Submitted'; const project=await projectRepository.create({clientEmail,clientName:String(body.clientName??''),company:body.company?String(body.company):undefined,service:String(body.service),title:String(body.title),brief:String(body.brief),goal:body.goal?String(body.goal):undefined,audience:body.audience?String(body.audience):undefined,deliverables:body.deliverables?String(body.deliverables):undefined,references:body.references?String(body.references):undefined,deadline:body.deadline?String(body.deadline):undefined,budget:body.budget?String(body.budget):undefined,creator:body.creator?String(body.creator):undefined,status}); if(user.role!=='ADMIN'){ await prismaAudit(user.id, project.id); } return NextResponse.json({project},{status:201})}catch(e){console.error('project create',e);return NextResponse.json({error:'Layihə yaratmaq mümkün olmadı. Verilənlər bazası sxeminin tətbiq olunduğundan əmin olun.'},{status:500})}
}

async function prismaAudit(userId:string, projectId:string){ await prisma.auditLog.create({data:{event:'PROJECT_CREATED',actorId:userId,targetUserId:userId,metadata:{projectId}}}).catch(()=>undefined); }
