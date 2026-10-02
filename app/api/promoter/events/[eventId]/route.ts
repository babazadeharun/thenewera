import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePromoter } from '@/lib/events/authorization';

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { promoter } = await requirePromoter();
    const { eventId } = await params;
    const relation = await prisma.promoterEvent.findUnique({ where: { promoterId_eventId: { promoterId: promoter.id, eventId } }, include: { event: { include: { coverMedia: true, gallery: { include: { media: true }, orderBy: { sortOrder: 'asc' } } } } } });
    if (!relation) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    const [tickets, sales, payments] = await Promise.all([
      prisma.ticketAllocation.findMany({ where: { promoterId: promoter.id, eventId, releasedAt: null }, include: { ticket: true }, orderBy: { allocatedAt: 'desc' } }),
      prisma.ticketSale.findMany({ where: { promoterId: promoter.id, eventId }, orderBy: { soldAt: 'desc' }, include: { ticket: true } }),
      prisma.promoterPayment.findMany({ where: { promoterId: promoter.id, eventId }, orderBy: { paidAt: 'desc' } }),
    ]);
    const debit=sales.reduce((a,s)=>a+Number(s.promoterPrice),0), credit=payments.reduce((a,p)=>a+Number(p.amount),0), revenue=sales.reduce((a,s)=>a+Number(s.actualSalePrice),0), margin=sales.reduce((a,s)=>a+Number(s.margin),0);
    return NextResponse.json({ relation, tickets, sales, payments, finance:{debit,credit,debt:debit-credit,revenue,margin} });
  } catch (error) {
    const message=error instanceof Error?error.message:'UNAUTHORIZED';
    return NextResponse.json({error:message},{status:message==='UNAUTHORIZED'?401:message==='FORBIDDEN'?403:500});
  }
}
