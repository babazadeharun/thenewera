import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function GET(){const user=await getCurrentUser();if(!user)return NextResponse.json({error:'Authentication required'},{status:401});if(!['ADMIN','SUPER_ADMIN'].includes(user.role))return NextResponse.json({error:'Forbidden'},{status:403});try{const [creators,services]=await Promise.all([prisma.creator.findMany({select:{id:true,name:true,role:true},orderBy:{name:'asc'}}),prisma.service.findMany({select:{id:true,name:true},orderBy:{name:'asc'}})]);return NextResponse.json({creators,services})}catch{return NextResponse.json({error:'İş məkanı kataloqu yüklənmədi'},{status:500})}}
