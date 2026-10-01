import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireEventsFinance } from '@/lib/events/authorization';
import { writeEventAudit } from '@/lib/events/audit';

function fail(e: unknown){ const m=e instanceof Error?e.message:'REQUEST_FAILED'; const s=m==='UNAUTHORIZED'?401:m==='FORBIDDEN'?403:400; return NextResponse.json({error:m},{status:s}); }
function txt(v: unknown,max=300){ if(v==null)return null; const s=String(v).trim(); return s?s.slice(0,max):null; }

export async function GET(req: Request){ try {
  await requireEventsFinance(); const url=new URL(req.url); const promoterId=txt(url.searchParams.get('promoterId'),100);
  const eventId=txt(url.searchParams.get('eventId'),100);
  const payments=await prisma.promoterPayment.findMany({where:{...(promoterId?{promoterId}:{}) ,...(eventId?{eventId}:{})},orderBy:{paidAt:'desc'},include:{promoter:{select:{id:true,firstName:true,lastName:true}},event:{select:{id:true,name:true}}}});
  return NextResponse.json({payments});
 } catch(e){return fail(e)} }

export async function POST(req: Request){ try {
  const actor=await requireEventsFinance(); const b=await req.json(); const promoterId=txt(b.promoterId,100); if(!promoterId)throw new Error('PROMOTER_REQUIRED');
  const eventId=txt(b.eventId,100); const amountNumber=Number(b.amount); if(!Number.isFinite(amountNumber)||amountNumber<=0)throw new Error('INVALID_PAYMENT_AMOUNT');
  const amount=new Prisma.Decimal(amountNumber.toFixed(2)); const method=txt(b.method,30);
  if(!['CASH','BANK_TRANSFER','CARD','OTHER'].includes(method||''))throw new Error('INVALID_PAYMENT_METHOD');
  const promoter=await prisma.promoter.findUnique({where:{id:promoterId}}); if(!promoter)throw new Error('PROMOTER_NOT_FOUND');
  const payment=await prisma.$transaction(async tx=>{
    const [debits, credits] = await Promise.all([tx.promoterLedgerEntry.aggregate({where:{promoterId,type:'DEBIT'},_sum:{amount:true}}), tx.promoterLedgerEntry.aggregate({where:{promoterId,type:'CREDIT'},_sum:{amount:true}})]);
    const outstanding = new Prisma.Decimal(debits._sum.amount || 0).minus(new Prisma.Decimal(credits._sum.amount || 0));
    if (amount.greaterThan(outstanding)) throw new Error('PAYMENT_EXCEEDS_OUTSTANDING_DEBT');
    const p=await tx.promoterPayment.create({data:{promoterId,eventId: eventId||null,amount,method:method as any,reference:txt(b.reference,500),paidAt:b.paidAt?new Date(b.paidAt):new Date(),notes:txt(b.notes,2000),recordedByUserId:actor.id}});
    await tx.promoterLedgerEntry.create({data:{promoterId,eventId:eventId||null,type:'CREDIT',amount,description:'Promoter ödənişi',sourceType:'PAYMENT',sourceId:p.id,paymentId:p.id,actorUserId:actor.id}});
    return p;
  });
  await writeEventAudit({action:'PAYMENT',entityType:'PromoterPayment',entityId:payment.id,actorUserId:actor.id,promoterId,eventId,request:req,metadata:{amount:amount.toString(),method}});
  return NextResponse.json({payment},{status:201});
 }catch(e){return fail(e)} }
