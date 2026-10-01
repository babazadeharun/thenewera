import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';

function fail(e: unknown) {
  const m = e instanceof Error ? e.message : 'Request failed';
  const status = m === 'UNAUTHORIZED' ? 401 : m === 'FORBIDDEN' ? 403 : 400;
  return NextResponse.json({ error: m }, { status });
}

function ticketNumber(eventId: string, sequence: number) {
  return `NE-${eventId.slice(-8).toUpperCase()}-${String(sequence).padStart(6, '0')}`;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireEventsAdmin();
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id }, select: { id: true, totalInventory: true } });
      if (!event) throw new Error('NOT_FOUND');
      if (event.totalInventory < 0) throw new Error('INVALID_INVENTORY');

      const existing = await tx.ticket.findMany({
        where: { eventId: id },
        select: { ticketNumber: true },
        orderBy: { ticketNumber: 'asc' },
      });

      const existingNumbers = new Set(existing.map((ticket) => ticket.ticketNumber));
      const missing = Math.max(0, event.totalInventory - existing.length);
      const rows: { eventId: string; ticketNumber: string }[] = [];
      let sequence = 1;

      while (rows.length < missing) {
        const number = ticketNumber(event.id, sequence++);
        if (!existingNumbers.has(number)) {
          existingNumbers.add(number);
          rows.push({ eventId: id, ticketNumber: number });
        }
      }

      if (rows.length) {
        await tx.ticket.createMany({ data: rows });
      }

      const counts = await tx.ticket.groupBy({
        by: ['status'],
        where: { eventId: id },
        _count: { _all: true },
      });

      return {
        totalInventory: event.totalInventory,
        generated: rows.length,
        ticketCount: existing.length + rows.length,
        counts: Object.fromEntries(counts.map((item) => [item.status, item._count._all])),
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
