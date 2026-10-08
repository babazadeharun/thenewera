import { NextRequest, NextResponse } from 'next/server';
import { listMailbox } from '@/lib/mail/service';
import { listDrafts } from '@/lib/mail/db';
import { friendlyMailError, requireMailAdmin } from '@/lib/mail/auth';

export async function GET(req:NextRequest){
  const {response,user}=await requireMailAdmin(); if(response||!user)return response!;
  try { const folder=req.nextUrl.searchParams.get('folder')||'inbox'; const page=Math.max(1,Number(req.nextUrl.searchParams.get('page')||1)); const q=req.nextUrl.searchParams.get('q')?.trim()||undefined; if(folder==='drafts'){const all=await listDrafts(user.id); return NextResponse.json({messages:all.map(d=>({uid:d.id,flags:[],unread:false,starred:false,from:[],to:d.to?d.to.split(/[;,\n]+/).filter(Boolean).map((address:string)=>({name:null,address})):[],cc:[],subject:d.subject||'(Mövzusuz)',date:d.updatedAt.toISOString(),size:d.body.length,draftId:d.id,clientId:d.clientId,preview:d.body.slice(0,160)})),total:all.length,page:1,pageSize:50,totalPages:1,unreadCount:all.length});} return NextResponse.json(await listMailbox(folder,page,q)); }
  catch(e){ console.error('mail inbox', e instanceof Error ? e.message : 'unknown'); return NextResponse.json({error:friendlyMailError(e,'Mail qutusunu yükləmək mümkün olmadı.')},{status:502}); }
}
