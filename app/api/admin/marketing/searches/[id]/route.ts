import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMarketingAdmin } from '@/lib/marketing/authorization';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMarketingAdmin();
    const { id } = await params;
    const search = await prisma.leadSearch.findUnique({ where: { id }, include: { _count: { select: { researchItems: true } } } });
    if (!search) return NextResponse.json({ error: 'Search not found.' }, { status: 404 });
    return NextResponse.json({ search });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load search.' }, { status: 500 });
  }
}
