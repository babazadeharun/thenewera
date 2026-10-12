import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser(); if (!actor || !['ADMIN','SUPER_ADMIN'].includes(actor.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const user = await prisma.user.findUnique({ where:{id}, include:{ client:true, workspaceMemberships:{include:{workspace:true}}, auditTargets:{orderBy:{createdAt:'desc'},take:30,include:{actor:{select:{email:true}}}} } });
  if (!user || user.role !== 'CLIENT') return NextResponse.json({ error:'İstifadəçi tapılmadı.' }, {status:404});
  return NextResponse.json({ user });
}
