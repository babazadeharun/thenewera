import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';
function fail(e:unknown){const m=e instanceof Error?e.message:'Request failed';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400})}
export async function GET(){try{await requireEventsAdmin();const promoters=await prisma.promoter.findMany({include:{user:{select:{email:true,phone:true,createdAt:true}},socialAccounts:true,applications:{include:{event:{select:{id:true,name:true,startsAt:true}},reviewedBy:{select:{email:true}}},orderBy:{createdAt:'desc'}},events:{include:{event:{select:{id:true,name:true,startsAt:true}},},orderBy:{joinedAt:'desc'}}},orderBy:{createdAt:'desc'}});return NextResponse.json({promoters})}catch(e){return fail(e)}}
