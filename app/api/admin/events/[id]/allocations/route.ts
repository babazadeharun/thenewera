import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';

function fail(e: unknown) {
  const m = e instanceof Error ? e.message : 'Request failed';
  const status = m === 'UNAUTHORIZED' ? 401 : m === 'FORBIDDEN' ? 403 : 400;
  return NextResponse.json({ error: m }, { status });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireEventsAdmin();
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, totalInventory: true },
    });
    if (!event) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const promoters = await prisma.promoterEvent.findMany({
      where: { eventId: id, status: { not: 'CANCELLED' } },
      include: {
        promoter: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
      },
      orderBy: { promoter: { firstName: 'asc' } },
    });

    const activeAllocations = await prisma.ticketAllocation.groupBy({
      by: ['promoterId'],
      where: { eventId: id, releasedAt: null },
      _count: { _all: true },
    });

    const counts = new Map(activeAllocations.map((row) => [row.promoterId, row._count._all]));
    const tickets = await prisma.ticket.groupBy({
      by: ['status'],
      where: { eventId: id },
      _count: { _all: true },
    });

    return NextResponse.json({
      totalInventory: event.totalInventory,
      ticketCount: tickets.reduce((sum, row) => sum + row._count._all, 0),
      ticketCounts: Object.fromEntries(tickets.map((row) => [row.status, row._count._all])),
      promoters: promoters.map((row) => ({
        promoterId: row.promoterId,
        eventId: row.eventId,
        status: row.status,
        allocation: row.allocation,
        soldQuantity: row.soldQuantity,
        remainingQuantity: row.remainingQuantity,
        promoterPrice: row.promoterPrice.toString(),
        promoterDiscountPercent: row.promoterDiscountPercent.toString(),
        promoter: row.promoter,
        activeTicketCount: counts.get(row.promoterId) ?? 0,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}
