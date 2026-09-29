import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
function fail(e: unknown){const m=e instanceof Error?e.message:'Request failed';return NextResponse.json({error:m==='UNAUTHORIZED'?'Unauthorized':m==='FORBIDDEN'?'Forbidden':m},{status:m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400});}
export async function GET(){try{await requireAdmin();return NextResponse.json({sections:await prisma.homepageSection.findMany({include:{image:true},orderBy:{displayOrder:'asc'}})});}catch(e){return fail(e)}}
export async function POST(req:Request){try{await requireAdmin();const b=await req.json();if(!String(b.key||'').trim()||!String(b.title||'').trim())return NextResponse.json({error:'Key and title are required'},{status:400});const section=await prisma.homepageSection.create({data:{key:String(b.key).slice(0,80),title:String(b.title).slice(0,160),description:b.description?String(b.description).slice(0,2000):null,imageId:b.imageId||null,enabled:b.enabled!==false,displayOrder:Number(b.displayOrder)||0}});return NextResponse.json({section},{status:201});}catch(e){return fail(e)}}
