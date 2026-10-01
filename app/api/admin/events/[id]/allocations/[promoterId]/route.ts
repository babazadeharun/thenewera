import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';

function fail(e: unknown) {
  const m = e instanceof Error ? e.message : 'Request failed';
  const status = m === 'UNAUTHORIZED' ? 401 : m === 'FORBIDDEN' ? 403 : 400;
  return NextResponse.json({ error: m }, { status });
}

function integer(value: unknown) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error('INVALID_ALLOCATION');
  return n;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; promoterId: string }> }) {
  try {
    await requireEventsAdmin();
    const { id, promoterId } = await params;
    const body = await req.json();
    const target = integer(body.allocation);

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id }, select: { id: true, totalInventory: true } });
      if (!event) throw new Error('NOT_FOUND');

      const promoterEvent = await tx.promoterEvent.findUnique({
        where: { promoterId_eventId: { promoterId, eventId: id } },
        include: { promoter: { select: { id: true, firstName: true, lastName: true, status: true } } },
      });
      if (!promoterEvent) throw new Error('PROMOTER_EVENT_NOT_FOUND');
      if (promoterEvent.status === 'CANCELLED') throw new Error('PROMOTER_EVENT_CANCELLED');

      const active = await tx.ticketAllocation.findMany({
        where: { eventId: id, promoterId, releasedAt: null },
        select: { id: true, ticketId: true },
        orderBy: { allocatedAt: 'desc' },
      });
      const current = active.length;

      if (target === current) {
        return { promoterEvent, current, changed: 0, released: 0, allocated: 0 };
      }

      if (target < promoterEvent.soldQuantity) {
        throw new Error('ALLOCATION_BELOW_SOLD_QUANTITY');
      }

      if (target < current) {
        const releaseCount = current - target;
        const releaseRows = active.slice(0, releaseCount);
        const ids = releaseRows.map((row) => row.id);
        const ticketIds = releaseRows.map((row) => row.ticketId);

        await tx.ticketAllocation.updateMany({
          where: { id: { in: ids }, releasedAt: null },
          data: { releasedAt: new Date() },
        });
        await tx.ticket.updateMany({
          where: { id: { in: ticketIds }, status: 'ALLOCATED' },
          data: { status: 'AVAILABLE' },
        });

        const updated = await tx.promoterEvent.update({
          where: { promoterId_eventId: { promoterId, eventId: id } },
          data: { allocation: target, remainingQuantity: target - promoterEvent.soldQuantity },
        });

        return { promoterEvent: updated, current, changed: -releaseCount, released: releaseCount, allocated: 0 };
      }

      const addCount = target - current;
      const allocatedTotal = await tx.ticketAllocation.count({ where: { eventId: id, releasedAt: null } });
      const available = await tx.ticket.count({ where: { eventId: id, status: 'AVAILABLE' } });
      const maxByInventory = Math.max(0, event.totalInventory - allocatedTotal);
      if (addCount > available || addCount > maxByInventory) {
        throw new Error('INSUFFICIENT_AVAILABLE_TICKETS');
      }

      const tickets = await tx.ticket.findMany({
        where: { eventId: id, status: 'AVAILABLE' },
        select: { id: true },
        orderBy: { ticketNumber: 'asc' },
        take: addCount,
      });

      if (tickets.length !== addCount) throw new Error('INSUFFICIENT_AVAILABLE_TICKETS');

      await tx.ticketAllocation.createMany({
        data: tickets.map((ticket) => ({
          ticketId: ticket.id,
          promoterId,
          eventId: id,
          promoterPrice: promoterEvent.promoterPrice,
          promoterDiscountPercent: promoterEvent.promoterDiscountPercent,
        })),
      });
      await tx.ticket.updateMany({
        where: { id: { in: tickets.map((ticket) => ticket.id) } },
        data: { status: 'ALLOCATED' },
      });

      const updated = await tx.promoterEvent.update({
        where: { promoterId_eventId: { promoterId, eventId: id } },
        data: { allocation: target, remainingQuantity: target - promoterEvent.soldQuantity },
      });

      return { promoterEvent: updated, current, changed: addCount, released: 0, allocated: addCount };
    });

    return NextResponse.json({
      ...result,
      promoterPrice: result.promoterEvent.promoterPrice.toString(),
      promoterDiscountPercent: result.promoterEvent.promoterDiscountPercent.toString(),
    });
  } catch (e) {
    return fail(e);
  }
}
