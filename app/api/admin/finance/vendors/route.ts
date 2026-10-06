import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
const db: any = prisma;
import { financeError, financeGuard, clean } from '../_shared';
export async function GET(){try{await financeGuard();return NextResponse.json({vendors:await db.vendor.findMany({orderBy:{name:'asc'}})});}catch(e){return financeError(e)}}
export async function POST(req:Request){try{await financeGuard();const b=await req.json();const name=clean(b.name,160);if(!name)return NextResponse.json({error:'Təchizatçı adı tələb olunur.'},{status:400});const vendor=await db.vendor.create({data:{name,company:clean(b.company,160)||null,phone:clean(b.phone,60)||null,email:clean(b.email,160)||null,taxId:clean(b.taxId,80)||null,address:clean(b.address,500)||null,notes:clean(b.notes,1000)||null}});return NextResponse.json({vendor},{status:201})}catch(e){return financeError(e)}}
