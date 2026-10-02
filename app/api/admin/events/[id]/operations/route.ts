import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';
import { calculatePromoterPrice } from '@/lib/events/pricing';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireEventsAdmin();
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        coverMedia: true,
        organizer: true,
        gallery: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
        promoterEvents: {
          orderBy: { joinedAt: 'desc' },
          include: { promoter: true },
        },
      },
    });
    if (!event) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const [ticketCounts, sales, payments, applications, audit] = await Promise.all([
      prisma.ticket.groupBy({ by: ['status'], where: { eventId: id }, _count: { _all: true } }),
      prisma.ticketSale.findMany({
        where: { eventId: id }, orderBy: { soldAt: 'desc' }, take: 100,
        select: { id: true, soldAt: true, promoterPrice: true, actualSalePrice: true, margin: true, customerName: true, ticket: { select: { ticketNumber: true } }, promoter: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.promoterPayment.findMany({ where: { eventId: id }, orderBy: { paidAt: 'desc' }, select: { id: true, amount: true, paidAt: true, method: true, reference: true, promoter: { select: { id: true, firstName: true, lastName: true } } } }),
      prisma.promoterApplication.findMany({ where: { eventId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, createdAt: true, reviewedAt: true, promoter: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, city: true } } } }),
      prisma.eventAuditLog.findMany({ where: { eventId: id }, orderBy: { createdAt: 'desc' }, take: 80, include: { actor: { select: { id: true, email: true, role: true } }, promoter: { select: { id: true, firstName: true, lastName: true } } } }),
    ]);

    const inventory = Object.fromEntries(ticketCounts.map((x) => [x.status, x._count._all]));
    const revenue = sales.reduce((a, s) => a + Number(s.actualSalePrice), 0);
    const promoterCost = sales.reduce((a, s) => a + Number(s.promoterPrice), 0);
    const margin = sales.reduce((a, s) => a + Number(s.margin), 0);
    const collected = payments.reduce((a, p) => a + Number(p.amount), 0);
    const receivable = promoterCost;
    const outstanding = Math.max(0, receivable - collected);

    return NextResponse.json({
      event: { ...event, promoterPrice: calculatePromoterPrice(event.publicTicketPrice, event.promoterDiscountPercent).toString() },
      inventory,
      financial: { revenue, promoterCost, margin, receivable, collected, outstanding },
      sales,
      payments,
      applications,
      audit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
