import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';
export async function POST(req:Request){try{await requireEventsAdmin();const b=await req.json();const name=String(b.name||'').trim();if(!name)return NextResponse.json({error:'NAME_REQUIRED'},{status:400});const organizer=await prisma.eventOrganizer.create({data:{name,contact:String(b.contact||'').trim()||null,internalNotes:String(b.internalNotes||'').trim()||null}});return NextResponse.json({organizer},{status:201})}catch(e){const m=e instanceof Error?e.message:'Request failed';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400})}}
