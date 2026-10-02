import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMarketingAdmin } from '@/lib/marketing/authorization';

export async function GET(request: Request) {
  try {
    await requireMarketingAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();
    const status = url.searchParams.get('status');
    const leads = await prisma.lead.findMany({
      where: {
        ...(status && status !== 'ALL' ? { status: status as any } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }, { category: { contains: q, mode: 'insensitive' } }] } : {}),
      }, orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }], take: 250,
    });
    return NextResponse.json({ leads });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load leads.' }, { status: 500 }); }
}
