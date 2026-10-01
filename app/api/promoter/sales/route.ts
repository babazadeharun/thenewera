import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePromoter } from '@/lib/events/authorization';

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
  const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'PROMOTER_NOT_ACTIVE' ? 403 : message === 'NOT_FOUND' ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}

function text(value: unknown, max = 500) {
  if (value == null) return null;
  const valueText = String(value).trim();
  return valueText ? valueText.slice(0, max) : null;
}

export async function GET() {
  try {
    const { promoter } = await requirePromoter();
    const sales = await prisma.ticketSale.findMany({
      where: { promoterId: promoter.id },
      orderBy: { soldAt: 'desc' },
      select: {
        id: true,
        soldAt: true,
        promoterPrice: true,
        actualSalePrice: true,
        margin: true,
        customerName: true,
        customerPhone: true,
        notes: true,
        ticket: { select: { ticketNumber: true, status: true } },
        event: { select: { id: true, name: true, slug: true, startsAt: true, city: true, venue: true } },
      },
    });
    return NextResponse.json({ sales });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const { promoter } = await requirePromoter();
    const body = await req.json();
    const ticketId = text(body.ticketId, 100);
    if (!ticketId) throw new Error('TICKET_REQUIRED');

    const rawSalePrice = Number(body.actualSalePrice);
    if (!Number.isFinite(rawSalePrice) || rawSalePrice < 0) throw new Error('INVALID_ACTUAL_SALE_PRICE');
    const actualSalePrice = new Prisma.Decimal(rawSalePrice.toFixed(2));

    const result = await prisma.$transaction(async (tx) => {
      const allocation = await tx.ticketAllocation.findFirst({
        where: { ticketId, promoterId: promoter.id, releasedAt: null },
        include: { ticket: true },
      });
      if (!allocation) throw new Error('TICKET_NOT_ASSIGNED_TO_PROMOTER');
      if (allocation.ticket.status !== 'ALLOCATED') throw new Error('TICKET_NOT_AVAILABLE_FOR_SALE');

      const existing = await tx.ticketSale.findUnique({ where: { ticketId } });
      if (existing) throw new Error('TICKET_ALREADY_SOLD');

      const promoterPrice = new Prisma.Decimal(allocation.promoterPrice);
      const margin = actualSalePrice.minus(promoterPrice).toDecimalPlaces(2);

      const sale = await tx.ticketSale.create({
        data: {
          ticketId,
          allocationId: allocation.id,
          promoterId: promoter.id,
          eventId: allocation.eventId,
          promoterPrice,
          actualSalePrice,
          margin,
          customerName: text(body.customerName, 200),
          customerPhone: text(body.customerPhone, 100),
          notes: text(body.notes, 1000),
        },
      });

      await tx.ticket.update({ where: { id: ticketId }, data: { status: 'SOLD' } });
      await tx.promoterEvent.update({
        where: { promoterId_eventId: { promoterId: promoter.id, eventId: allocation.eventId } },
        data: { soldQuantity: { increment: 1 }, remainingQuantity: { decrement: 1 } },
      });

      return sale;
    });

    return NextResponse.json({
      sale: {
        id: result.id,
        ticketId: result.ticketId,
        promoterPrice: result.promoterPrice.toString(),
        actualSalePrice: result.actualSalePrice.toString(),
        margin: result.margin.toString(),
        soldAt: result.soldAt,
      },
    }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
