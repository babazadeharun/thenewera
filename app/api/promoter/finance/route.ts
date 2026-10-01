import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePromoter } from '@/lib/events/authorization';
export async function GET(){ try{ const {promoter}=await requirePromoter();
 const [debits,credits,entries]=await Promise.all([
  prisma.promoterLedgerEntry.aggregate({where:{promoterId:promoter.id,type:'DEBIT'},_sum:{amount:true}}),
  prisma.promoterLedgerEntry.aggregate({where:{promoterId:promoter.id,type:'CREDIT'},_sum:{amount:true}}),
  prisma.promoterLedgerEntry.findMany({where:{promoterId:promoter.id},orderBy:{createdAt:'desc'},take:100,select:{id,type,amount,description,createdAt,event:{select:{name:true}}}}),
 ]); const debit=Number(debits._sum.amount||0), credit=Number(credits._sum.amount||0);
 return NextResponse.json({debit:debit.toFixed(2),credit:credit.toFixed(2),debt:(debit-credit).toFixed(2),entries});
 }catch(e){const m=e instanceof Error?e.message:'REQUEST_FAILED';return NextResponse.json({error:m},{status:m==='UNAUTHORIZED'?401:403})}}
