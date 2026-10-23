import { NextResponse } from 'next/server';
import { LeadError, submitLead } from '@/lib/public-leads';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({error:'Müraciəti saytdan göndərin.'},{status:403});
    if (!(request.headers.get('content-type') || '').includes('application/json')) return NextResponse.json({error:'Sorğu formatı düzgün deyil.'},{status:415});
    const reader = request.body?.getReader(); let text = '', size = 0;
    if (!reader) throw new LeadError(400,'Məlumat daxil edin.');
    const decoder = new TextDecoder();
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > 4096) { await reader.cancel(); throw new LeadError(413,'Müraciət çox uzundur.'); } text += decoder.decode(chunk.value,{stream:true}); }
    text += decoder.decode();
    let b: Record<string,unknown>; try { b = JSON.parse(text); } catch { throw new LeadError(400,'Sorğu formatı düzgün deyil.'); }
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw new LeadError(400,'Sorğu formatı düzgün deyil.');
    if (b.website) return NextResponse.json({ok:true,reference:'RECEIVED'});
    return NextResponse.json(await submitLead(request,b),{status:201,headers:{'Cache-Control':'no-store'}});
  } catch (e) {
    if (e instanceof LeadError) return NextResponse.json({error:e.message},{status:e.status,headers:e.retryAfter?{'Retry-After':String(e.retryAfter)}:{}});
    console.error('PUBLIC_LEAD_SAVE_FAILED');
    return NextResponse.json({error:'Müraciət saxlanmadı. Bir qədər sonra yenidən cəhd edin.'},{status:503});
  }
}
