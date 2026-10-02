import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PromoterApplyForm from './PromoterApplyForm';

export default async function PromoterApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ verified?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      artist: true,
      status: true,
      startsAt: true,
      isPublic: true,
    },
  });

  if (!event || !event.isPublic || event.status !== 'APPLICATION_OPEN') {
    notFound();
  }

  return (
    <main className="promoterApplyPage">
      <div className="promoterApplyContainer">
        <Link
          href={`/events/${event.slug}`}
          className="eventDetailBack"
        >
          <ArrowLeft size={15} />
          Tədbirə qayıt
        </Link>

        <div className="promoterApplyHeader">
          <div className="eventsEyebrow">
            PROMOTER APPLICATION
          </div>

          <h1>{event.name}</h1>

          <p>
            {event.artist ? `${event.artist} · ` : ''}
            Bu tədbir üçün promoter kimi əməkdaşlıq müraciəti göndər.
          </p>
        </div>

        <PromoterApplyForm
          eventSlug={event.slug}
          eventName={event.name}
          verified={query.verified === '1'}
        />
      </div>
    </main>
  );
}