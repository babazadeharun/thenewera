import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rejectCsrf } from '@/lib/mail/auth';
export async function POST(req:NextRequest){const csrf=rejectCsrf(req);if(csrf)return csrf;const user=await getCurrentUser();if(!user)return NextResponse.json({error:'Authentication required'},{status:401});if(!['ADMIN','SUPER_ADMIN'].includes(user.role))return NextResponse.json({error:'Forbidden'},{status:403});await prisma.notification.updateMany({where:{isRead:false,OR:[{userId:user.id},{userId:null}]},data:{isRead:true,readAt:new Date()}});return NextResponse.json({ok:true});}
