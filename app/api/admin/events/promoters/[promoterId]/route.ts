import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';
function fail(e:unknown){const m=e instanceof Error?e.message:'Request failed';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400})}
export async function PATCH(req:Request,{params}:{params:Promise<{promoterId:string}>}){try{await requireEventsAdmin();const {promoterId}=await params;const status=String((await req.json()).status||'');if(!['PENDING','ACTIVE','SUSPENDED','BLOCKED','INACTIVE'].includes(status))throw new Error('INVALID_STATUS');const promoter=await prisma.promoter.update({where:{id:promoterId},data:{status:status as never}});return NextResponse.json({promoter})}catch(e){return fail(e)}}
