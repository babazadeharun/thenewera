import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';
function fail(e:unknown){const m=e instanceof Error?e.message:'Request failed';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400})}
export async function GET(req:Request){try{await requireEventsAdmin();const status=new URL(req.url).searchParams.get('status')||'PENDING';const applications=await prisma.promoterApplication.findMany({where:status==='ALL'?{}:{status:status as never},include:{promoter:{include:{user:true,socialAccounts:true}},event:true,reviewedBy:{select:{id:true,email:true,role:true}}},orderBy:{createdAt:'desc'}});return NextResponse.json({applications})}catch(e){return fail(e)}}
