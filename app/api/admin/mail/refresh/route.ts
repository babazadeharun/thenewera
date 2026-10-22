import { retrySentCopies } from '@/lib/mail/sent';
import { NextRequest, NextResponse } from 'next/server';
import { listMailbox } from '@/lib/mail/service';
import { friendlyMailError, requireMailAdmin } from '@/lib/mail/auth';
export async function POST(req:NextRequest){const {response}=await requireMailAdmin();if(response)return response;try{const b=await req.json().catch(()=>({}));const folder=String(b.folder||'inbox');const page=Math.max(1,Number(b.page||1));const q=String(b.q||'').trim()||undefined;await retrySentCopies(Date.now()+5000,true).catch(()=>undefined);const data=await listMailbox(folder,page,q);return NextResponse.json({...data,syncedAt:new Date().toISOString()});}catch(e){console.error('mail refresh',e instanceof Error?e.message:'unknown');return NextResponse.json({error:friendlyMailError(e,'Mail qutusu yenilənmədi.')},{status:502});}}
