import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePromoter } from '@/lib/events/authorization';

export async function GET() {
  try {
    const { promoter } = await requirePromoter();
    const [events, applications] = await Promise.all([
      prisma.promoterEvent.findMany({
        where: { promoterId: promoter.id },
        orderBy: { event: { startsAt: 'asc' } },
        select: {
          eventId: true, status: true, allocation: true, soldQuantity: true, remainingQuantity: true,
          promoterDiscountPercent: true, promoterPrice: true, joinedAt: true,
          event: { select: { id: true, name: true, slug: true, artist: true, venue: true, city: true, startsAt: true, status: true, coverMedia: { select: { url: true, alt: true } } } },
        },
      }),
      prisma.promoterApplication.findMany({
        where: { promoterId: promoter.id }, orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, rejectReason: true, adminNotes: true, createdAt: true, reviewedAt: true, event: { select: { id: true, name: true, slug: true, startsAt: true, city: true, venue: true, coverMedia: { select: { url: true, alt: true } } } } },
      }),
    ]);
    return NextResponse.json({ promoter: { id: promoter.id, firstName: promoter.firstName, lastName: promoter.lastName, email: promoter.email, phone: promoter.phone, city: promoter.city, status: promoter.status }, events, applications });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNAUTHORIZED';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'PROMOTER_NOT_ACTIVE' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
