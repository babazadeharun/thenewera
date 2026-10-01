import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePromoter } from '@/lib/events/authorization';

export async function GET() {
  try {
    const { promoter } = await requirePromoter();
    const tickets = await prisma.ticketAllocation.findMany({
      where: { promoterId: promoter.id, releasedAt: null },
      orderBy: { allocatedAt: 'desc' },
      select: {
        id: true,
        allocatedAt: true,
        promoterPrice: true,
        promoterDiscountPercent: true,
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            event: { select: { id: true, name: true, slug: true, startsAt: true, city: true, venue: true } },
          },
        },
      },
    });
    return NextResponse.json({ tickets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHORIZED';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'PROMOTER_NOT_ACTIVE' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
