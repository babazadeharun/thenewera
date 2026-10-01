import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireEventsAdmin();
    const { id } = await params;
    const sales = await prisma.ticketSale.findMany({
      where: { eventId: id },
      orderBy: { soldAt: 'desc' },
      select: {
        id: true, soldAt: true, promoterPrice: true, actualSalePrice: true, margin: true,
        ticket: { select: { ticketNumber: true } },
        promoter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const totals = sales.reduce((acc, sale) => {
      acc.count += 1;
      acc.promoterCost += Number(sale.promoterPrice);
      acc.revenue += Number(sale.actualSalePrice);
      acc.margin += Number(sale.margin);
      return acc;
    }, { count: 0, promoterCost: 0, revenue: 0, margin: 0 });
    return NextResponse.json({ sales, totals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
