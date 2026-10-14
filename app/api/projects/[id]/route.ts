import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { projectRepository } from '@/lib/data/repository';
import { getWorkspaceContext, hasPermission, PERMISSIONS } from '@/lib/workspace';
const adminRoles=['ADMIN','SUPER_ADMIN'];
export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:'Authentication required'},{status:401});const {id}=await params;const project=await projectRepository.get(id);if(!project)return NextResponse.json({error:'Project not found'},{status:404});if(!adminRoles.includes(user.role)){const context=await getWorkspaceContext(user.id);if(user.role!=='CLIENT'||!hasPermission(context,PERMISSIONS.VIEW_PROJECTS)||(project.clientId?project.clientId!==context?.workspace?.clientId:project.clientEmail!==user.email))return NextResponse.json({error:'Forbidden'},{status:403});}return NextResponse.json({project});
}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:'Authentication required'},{status:401});const {id}=await params;const current=await projectRepository.get(id);if(!current)return NextResponse.json({error:'Project not found'},{status:404});const admin=adminRoles.includes(user.role);const context=admin?null:await getWorkspaceContext(user.id);
 if(!admin&&(user.role!=='CLIENT'||(current.clientId?current.clientId!==context?.workspace?.clientId:current.clientEmail!==user.email)||!hasPermission(context,PERMISSIONS.VIEW_PROJECTS)||!hasPermission(context,PERMISSIONS.SEND_MESSAGE)))return NextResponse.json({error:'Forbidden'},{status:403});
 try{const body=await request.json();const patch:any={};const now=new Date().toISOString();
 if(admin){for(const key of ['title','brief','goal','audience','deliverables','references','deadline','budget','service','creator','delivery','revisionRequests','review'])if(body[key]!==undefined)patch[key]=body[key];if(body.status!==undefined){if(!['Brief Submitted','Reviewing','Approved','In Progress','Review','Completed'].includes(body.status))return NextResponse.json({error:'Invalid project status'},{status:400});patch.status=body.status;}}
 else{
  if(body.status!==undefined){if(current.status!=='Review'||body.status!=='In Progress'||!Array.isArray(body.revisionRequests)||!body.revisionRequests.length)return NextResponse.json({error:'Only a reviewed delivery can be returned for revision'},{status:400});patch.status='In Progress';}
  if(body.revisionRequests!==undefined){if(current.status!=='Review'||!Array.isArray(body.revisionRequests)||!body.revisionRequests.length)return NextResponse.json({error:'Invalid revision request'},{status:400});const revision=body.revisionRequests.at(-1);if(typeof revision.text!=='string'||!revision.text.trim())return NextResponse.json({error:'Revision text is required'},{status:400});patch.revisionRequests=[{text:revision.text.trim().slice(0,10000),at:now}];}
  if(body.review!==undefined){if(current.status!=='Completed'||!Number.isInteger(body.review.rating)||body.review.rating<1||body.review.rating>5||typeof body.review.text!=='string'||!body.review.text.trim())return NextResponse.json({error:'Invalid completed-project review'},{status:400});patch.review={rating:body.review.rating,text:body.review.text.trim().slice(0,10000),at:now};}
 }
 if(body.messages!==undefined){if(!Array.isArray(body.messages)||!body.messages.length||typeof body.messages.at(-1).text!=='string'||!body.messages.at(-1).text.trim())return NextResponse.json({error:'Message is required'},{status:400});patch.messages=[{from:admin?'admin':'client',text:body.messages.at(-1).text.trim().slice(0,10000),at:now}];}
 if(admin&&Array.isArray(body.activity)&&body.activity.length){const a=body.activity.at(-1);patch.activity=[{type:String(a.type||'workflow').slice(0,100),text:String(a.text||'Layihə yeniləndi').slice(0,2000),at:now}]}else if(!admin){patch.activity=[{type:patch.messages?'message':patch.review?'review':'revision',text:patch.messages?'Müştəri layihə mesajı göndərdi':patch.review?'Müştəri layihəyə rəy bildirdi':'Müştəri düzəliş tələb etdi',at:now}]}
 const project=await projectRepository.update(id,patch);return NextResponse.json({project});
 }catch(e){console.error('project update',e);return NextResponse.json({error:'Unable to update project'},{status:500})}
}
