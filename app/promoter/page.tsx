import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PromoterDashboardClient from './PromoterDashboardClient';

export default async function PromoterDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'PROMOTER') redirect('/account');

  const promoter = await prisma.promoter.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, city: true, status: true },
  });

  if (!promoter || promoter.status !== 'ACTIVE') redirect('/login');

  const [events, applications] = await Promise.all([
    prisma.promoterEvent.findMany({
      where: { promoterId: promoter.id },
      orderBy: { event: { startsAt: 'asc' } },
      select: {
        eventId: true,
        status: true,
        allocation: true,
        soldQuantity: true,
        remainingQuantity: true,
        promoterDiscountPercent: true,
        promoterPrice: true,
        joinedAt: true,
        notes: true,
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            artist: true,
            venue: true,
            city: true,
            startsAt: true,
            status: true,
            coverMedia: { select: { url: true, alt: true } },
          },
        },
      },
    }),
    prisma.promoterApplication.findMany({
      where: { promoterId: promoter.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        rejectReason: true,
        adminNotes: true,
        createdAt: true,
        reviewedAt: true,
        event: {
          select: { id: true, name: true, slug: true, startsAt: true, city: true, venue: true, coverMedia: { select: { url: true, alt: true } } },
        },
      },
    }),
  ]);

  const serialize = (value: unknown) => JSON.parse(JSON.stringify(value));

  return (
    <PromoterDashboardClient
      promoter={serialize(promoter)}
      events={serialize(events)}
      applications={serialize(applications)}
    />
  );
}
