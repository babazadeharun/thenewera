import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
const db: any = prisma;
import { financeError, financeGuard, numberValue, clean } from '../_shared';

export async function GET(){try{await financeGuard();const accounts=await db.financeAccount.findMany({orderBy:{createdAt:'asc'}});return NextResponse.json({accounts:accounts.map((a: any) =>({...a,openingBalance:Number(a.openingBalance)}))});}catch(e){return financeError(e)}}
export async function POST(req:Request){try{await financeGuard();const b=await req.json();const name=clean(b.name,120);if(!name)return NextResponse.json({error:'Hesab adı tələb olunur.'},{status:400});const account=await db.financeAccount.create({data:{name,type:['BANK','CASH','CARD','OTHER'].includes(b.type)?b.type:'BANK',openingBalance:numberValue(b.openingBalance),currency:clean(b.currency,10)||'AZN',notes:clean(b.notes,1000)||null}});return NextResponse.json({account:{...account,openingBalance:Number(account.openingBalance)}},{status:201})}catch(e){return financeError(e)}}
export async function PATCH(req:Request){try{await financeGuard();const b=await req.json();const account=await db.financeAccount.update({where:{id:clean(b.id)},data:{name:clean(b.name,120),type:b.type,status:b.status,notes:clean(b.notes,1000)||null}});return NextResponse.json({account})}catch(e){return financeError(e)}}
