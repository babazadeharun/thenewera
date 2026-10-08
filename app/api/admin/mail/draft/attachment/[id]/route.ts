import { NextRequest, NextResponse } from 'next/server';
import { getDraftAttachment } from '@/lib/mail/db';
import { requireMailAdmin } from '@/lib/mail/auth';
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){const {response,user}=await requireMailAdmin();if(response||!user)return response!;try{const a=await getDraftAttachment(user.id,(await params).id);if(!a)return NextResponse.json({error:'Fayl tapılmadı.'},{status:404});return new NextResponse(new Uint8Array(a.data),{headers:{'Content-Type':a.mimeType,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(a.filename)}`,'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'Fayl açıla bilmədi.'},{status:500});}}
