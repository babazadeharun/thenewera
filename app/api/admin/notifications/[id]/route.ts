import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rejectCsrf } from '@/lib/mail/auth';
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){const csrf=rejectCsrf(req);if(csrf)return csrf;const user=await getCurrentUser();if(!user)return NextResponse.json({error:'Authentication required'},{status:401});if(!['ADMIN','SUPER_ADMIN'].includes(user.role))return NextResponse.json({error:'Forbidden'},{status:403});const{id}=await params;const result=await prisma.notification.deleteMany({where:{id,OR:[{userId:user.id},{userId:null}]}});if(!result.count)return NextResponse.json({error:'Notification not found'},{status:404});return NextResponse.json({ok:true});}
