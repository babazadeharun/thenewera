import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
const admin = async () => { const u = await getCurrentUser(); return u && ['ADMIN','SUPER_ADMIN'].includes(u.role) ? u : null; };
export async function GET(req: NextRequest) {
  const actor = await admin(); if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = Math.max(1, Number(req.nextUrl.searchParams.get('page') || 1)); const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 25)));
  const q = (req.nextUrl.searchParams.get('q') || '').trim(); const status = req.nextUrl.searchParams.get('status');
  const where: any = { role: 'CLIENT' };
  if (status && ['REGISTERED','QUALIFIED','CLIENT','SUSPENDED','ARCHIVED'].includes(status)) where.accountStatus = status;
  if (q) where.OR = [{ email: { contains: q, mode: 'insensitive' } }, { client: { firstName: { contains: q, mode: 'insensitive' } } }, { client: { lastName: { contains: q, mode: 'insensitive' } } }, { client: { company: { contains: q, mode: 'insensitive' } } }];
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p-1)*limit, take: limit, select: { id:true,email:true,phone:true,verifiedAt:true,accountStatus:true,accountType:true,lastLoginAt:true,createdAt:true,client:{select:{firstName:true,lastName:true,company:true,jobTitle:true,industry:true,companySize:true,country:true}},workspaceMemberships:{where:{active:true},take:1,select:{role:true,workspace:{select:{id:true,name:true,status:true}}}} } }),
  ]);
  return NextResponse.json({ users, total, page:p, limit, totalPages: Math.ceil(total/limit) });
}
