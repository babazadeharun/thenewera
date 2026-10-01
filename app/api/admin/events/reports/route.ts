import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsFinance } from '@/lib/events/authorization';

export async function GET() {
  try {
    await requireEventsFinance();

    const [events, promoters, sales, payments] = await Promise.all([
      prisma.event.findMany({
        orderBy: { startsAt: 'desc' },
        select: {
          id: true,
          name: true,
          startsAt: true,
          status: true,
          totalInventory: true,
        },
      }),

      prisma.promoter.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      }),

      prisma.ticketSale.findMany({
        select: {
          eventId: true,
          promoterId: true,
          promoterPrice: true,
          actualSalePrice: true,
          margin: true,
          soldAt: true,
        },
      }),

      prisma.promoterPayment.findMany({
        select: {
          promoterId: true,
          eventId: true,
          amount: true,
          paidAt: true,
        },
      }),
    ]);

    const byEvent = events.map((e) => {
      const ss = sales.filter((s) => s.eventId === e.id);
      const pp = payments.filter((p) => p.eventId === e.id);

      return {
        id: e.id,
        name: e.name,
        startsAt: e.startsAt,
        status: e.status,
        inventory: e.totalInventory,
        sold: ss.length,
        revenue: ss.reduce((a, s) => a + Number(s.actualSalePrice), 0),
        promoterCost: ss.reduce((a, s) => a + Number(s.promoterPrice), 0),
        margin: ss.reduce((a, s) => a + Number(s.margin), 0),
        payments: pp.reduce((a, p) => a + Number(p.amount), 0),
      };
    });

    const byPromoter = promoters.map((p) => {
      const ss = sales.filter((s) => s.promoterId === p.id);
      const pp = payments.filter((x) => x.promoterId === p.id);

      const debit = ss.reduce(
        (a, s) => a + Number(s.promoterPrice),
        0
      );

      const credit = pp.reduce(
        (a, x) => a + Number(x.amount),
        0
      );

      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        sales: ss.length,
        revenue: ss.reduce(
          (a, s) => a + Number(s.actualSalePrice),
          0
        ),
        margin: ss.reduce(
          (a, s) => a + Number(s.margin),
          0
        ),
        payments: credit,
        debt: debit - credit,
      };
    });

    return NextResponse.json({
      summary: {
        events: events.length,
        sales: sales.length,
        revenue: sales.reduce(
          (a, s) => a + Number(s.actualSalePrice),
          0
        ),
        margin: sales.reduce(
          (a, s) => a + Number(s.margin),
          0
        ),
        payments: payments.reduce(
          (a, p) => a + Number(p.amount),
          0
        ),
        debt:
          sales.reduce(
            (a, s) => a + Number(s.promoterPrice),
            0
          ) -
          payments.reduce(
            (a, p) => a + Number(p.amount),
            0
          ),
      },
      byEvent,
      byPromoter,
    });
  } catch (e) {
    const m =
      e instanceof Error ? e.message : 'REQUEST_FAILED';

    return NextResponse.json(
      { error: m },
      { status: m === 'UNAUTHORIZED' ? 401 : 403 }
    );
  }
}
