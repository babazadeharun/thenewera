import { prisma } from '@/lib/prisma'
import type { ProjectRecord, ProjectStatus } from './types'

export interface ProjectRepository {
  list(): Promise<ProjectRecord[]>
  get(id: string): Promise<ProjectRecord | null>
  create(input: Omit<ProjectRecord, 'id' | 'createdAt' | 'messages' | 'activity' | 'revisionRequests'>): Promise<ProjectRecord>
  update(id: string, patch: Partial<ProjectRecord>): Promise<ProjectRecord | null>
}

const statusToDb: Record<ProjectStatus, any> = {
  'Brief Submitted': 'BRIEF_SUBMITTED', Reviewing: 'REVIEWING', Approved: 'APPROVED', 'In Progress': 'IN_PROGRESS', Review: 'REVIEW', Completed: 'COMPLETED'
}
const statusFromDb: Record<string, ProjectStatus> = { BRIEF_SUBMITTED:'Brief Submitted', REVIEWING:'Reviewing', APPROVED:'Approved', IN_PROGRESS:'In Progress', REVIEW:'Review', COMPLETED:'Completed' }

function toRecord(p: any): ProjectRecord {
  return {
    id: p.id, clientEmail: p.client.email, clientName: `${p.client.firstName} ${p.client.lastName}`.trim(), company: p.client.company ?? undefined,
    service: p.service.name, title: p.title, brief: p.brief, goal: p.goal ?? undefined, audience: p.audience ?? undefined,
    deliverables: p.deliverables ?? undefined, references: p.references ?? undefined, deadline: p.deadline?.toISOString(), budget: p.budget ?? undefined,
    creator: p.creator?.name ?? undefined, status: statusFromDb[p.status], createdAt: p.createdAt.toISOString(),
    messages: p.messages.map((m:any)=>({from:m.fromRole, text:m.text, at:m.createdAt.toISOString()})),
    activity: p.activities.map((a:any)=>({type:a.type, text:a.text, at:a.createdAt.toISOString()})),
    delivery: p.deliveries.length ? {version:p.deliveries[p.deliveries.length-1].version, notes:p.deliveries[p.deliveries.length-1].notes, link:p.deliveries[p.deliveries.length-1].link ?? undefined, submittedAt:p.deliveries[p.deliveries.length-1].submittedAt.toISOString()} : undefined,
    revisionRequests: p.revisions.map((r:any)=>({text:r.text, at:r.createdAt.toISOString()})),
    review: p.review ? {rating:p.review.rating, text:p.review.text, at:p.review.createdAt.toISOString()} : undefined,
  }
}

const include = { client:true, creator:true, service:true, messages:{orderBy:{createdAt:'asc'}}, activities:{orderBy:{createdAt:'asc'}}, deliveries:{orderBy:{version:'asc'}}, revisions:{orderBy:{createdAt:'asc'}}, review:true } as const

class PrismaProjectRepository implements ProjectRepository {
  async list(){ const rows=await prisma.project.findMany({include,orderBy:{createdAt:'desc'}}); return rows.map(toRecord) }
  async get(id:string){ const row=await prisma.project.findUnique({where:{id},include}); return row?toRecord(row):null }
  async create(input: Omit<ProjectRecord,'id'|'createdAt'|'messages'|'activity'|'revisionRequests'>){
    const client=await prisma.client.findUnique({where:{email:input.clientEmail}}); if(!client) throw new Error('Client not found')
    const service=await prisma.service.upsert({where:{name:input.service},update:{},create:{name:input.service}})
    const creator=input.creator && input.creator!=='No preference' ? await prisma.creator.findFirst({where:{name:input.creator}}) : null
    const row=await prisma.project.create({data:{title:input.title,brief:input.brief,goal:input.goal,audience:input.audience,deliverables:input.deliverables,references:input.references,deadline:input.deadline?new Date(input.deadline):undefined,budget:(input as any).budget,status:statusToDb[input.status],clientId:client.id,serviceId:service.id,creatorId:creator?.id,activities:{create:{type:'created',text:'Project created through the New Era platform'}}},include})
    return toRecord(row)
  }
  async update(id:string,patch:Partial<ProjectRecord>){
    const data:any={}
    if(patch.title!==undefined)data.title=patch.title
    if(patch.brief!==undefined)data.brief=patch.brief
    if(patch.goal!==undefined)data.goal=patch.goal
    if(patch.audience!==undefined)data.audience=patch.audience
    if(patch.deliverables!==undefined)data.deliverables=patch.deliverables
    if(patch.references!==undefined)data.references=patch.references
    if(patch.deadline!==undefined)data.deadline=patch.deadline?new Date(patch.deadline):null
    if(patch.budget!==undefined)data.budget=patch.budget
    if(patch.status!==undefined)data.status=statusToDb[patch.status]
    if(patch.service!==undefined){const s=await prisma.service.upsert({where:{name:patch.service},update:{},create:{name:patch.service}});data.serviceId=s.id}
    if(patch.creator!==undefined){const c=patch.creator&&patch.creator!=='No preference'?await prisma.creator.findFirst({where:{name:patch.creator}}):null;data.creatorId=c?.id??null}
    if(patch.messages?.length){const m=patch.messages[patch.messages.length-1];await prisma.projectMessage.create({data:{projectId:id,fromRole:m.from,text:m.text}})}
    if(patch.activity?.length){const a=patch.activity[patch.activity.length-1];await prisma.projectActivity.create({data:{projectId:id,type:a.type,text:a.text}})}
    if(patch.revisionRequests?.length){const r=patch.revisionRequests[patch.revisionRequests.length-1];await prisma.revisionRequest.create({data:{projectId:id,text:r.text}})}
    if(patch.delivery){const d=patch.delivery;await prisma.delivery.upsert({where:{projectId_version:{projectId:id,version:d.version}},update:{notes:d.notes,link:d.link},create:{projectId:id,version:d.version,notes:d.notes,link:d.link}})}
    if(patch.review){await prisma.projectReview.upsert({where:{projectId:id},update:{rating:patch.review.rating,text:patch.review.text},create:{projectId:id,rating:patch.review.rating,text:patch.review.text}})}
    if(Object.keys(data).length)await prisma.project.update({where:{id},data})
    return this.get(id)
  }
}

export const projectRepository: ProjectRepository = new PrismaProjectRepository()
