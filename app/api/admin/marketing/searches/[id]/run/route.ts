import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMarketingAdmin } from '@/lib/marketing/authorization';
import { runLeadSearch } from '@/lib/marketing/research';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMarketingAdmin();
    const { id } = await params;
    const search = await prisma.leadSearch.findUnique({ where: { id } });
    if (!search) return NextResponse.json({ error: 'Search not found.' }, { status: 404 });
    if (search.status === 'RUNNING') return NextResponse.json({ search });
    if (search.status === 'COMPLETED') return NextResponse.json({ search });
    void runLeadSearch(id).catch(() => undefined);
    const updated = await prisma.leadSearch.findUnique({ where: { id } });
    return NextResponse.json({ search: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lead research failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
