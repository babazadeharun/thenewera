import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { projectRepository } from '@/lib/data/repository'
import type { ProjectStatus } from '@/lib/data/types'
const statuses: ProjectStatus[]=['Brief Submitted','Reviewing','Approved','In Progress','Review','Completed']
export async function GET(){
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:'Authentication required'},{status:401});
 const projects=await projectRepository.list(); const visible=user.role==='ADMIN'?projects:projects.filter(p=>p.clientEmail===user.email); return NextResponse.json({projects:visible})
}
export async function POST(request:NextRequest){
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:'Authentication required'},{status:401});
 try{const body=await request.json(); const clientEmail=user.role==='CLIENT'?user.email:String(body.clientEmail||'').toLowerCase(); if(!clientEmail||!body?.title||!body?.service||!body?.brief)return NextResponse.json({error:'title, service and brief are required'},{status:400}); const status:ProjectStatus=statuses.includes(body.status)?body.status:'Brief Submitted'; const project=await projectRepository.create({clientEmail,clientName:String(body.clientName??''),company:body.company?String(body.company):undefined,service:String(body.service),title:String(body.title),brief:String(body.brief),goal:body.goal?String(body.goal):undefined,audience:body.audience?String(body.audience):undefined,deliverables:body.deliverables?String(body.deliverables):undefined,references:body.references?String(body.references):undefined,deadline:body.deadline?String(body.deadline):undefined,budget:body.budget?String(body.budget):undefined,creator:body.creator?String(body.creator):undefined,status}); return NextResponse.json({project},{status:201})}catch(e){console.error('project create',e);return NextResponse.json({error:'Unable to create project. Make sure the database schema is migrated.'},{status:500})}
}
