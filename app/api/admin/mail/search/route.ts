import { NextRequest, NextResponse } from 'next/server';
import { listMailbox } from '@/lib/mail/service';
import { friendlyMailError, requireMailAdmin } from '@/lib/mail/auth';
export async function GET(req:NextRequest){ const {response}=await requireMailAdmin(); if(response)return response; try{const q=req.nextUrl.searchParams.get('q')?.trim(); if(!q)return NextResponse.json({error:'Axtarış sözü daxil edin.'},{status:400}); const folder=req.nextUrl.searchParams.get('folder')||'inbox'; const page=Math.max(1,Number(req.nextUrl.searchParams.get('page')||1)); return NextResponse.json(await listMailbox(folder,page,q));}catch(e){console.error('mail search',e instanceof Error?e.message:'unknown');return NextResponse.json({error:friendlyMailError(e,'Axtarış mümkün olmadı.')},{status:502});}}
