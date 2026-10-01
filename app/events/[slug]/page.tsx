import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Clock3, MapPin, ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';

function formatDate(value: Date) { return new Intl.DateTimeFormat('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' }).format(value); }
function formatTime(value: Date) { return new Intl.DateTimeFormat('az-AZ', { hour: '2-digit', minute: '2-digit' }).format(value); }
function formatPrice(value: unknown) { return `${new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} AZN`; }

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug }, include: { coverMedia: true, organizer: true, gallery: { include: { media: true }, orderBy: { sortOrder: 'asc' } } } });
  if (!event || event.status === 'DRAFT' || event.status === 'CANCELLED') notFound();
  const applicationOpen = event.status === 'APPLICATION_OPEN';

  return (
    <main className="eventDetailPage">
      <div className="eventDetailContainer">
        <Link href="/events" className="eventDetailBack"><ArrowLeft size={15} /> Bütün tədbirlər</Link>
        <section className="eventDetailHero">
          <div className="eventDetailCover">
            {event.coverMedia?.url ? <img src={event.coverMedia.url} alt={event.coverMedia.alt || event.name} /> : <div className="eventCardImageFallback">NEW ERA</div>}
          </div>
          <div className="eventDetailContent">
            <div className="eventsEyebrow">{event.artist || 'NEW ERA EVENTS'}</div>
            <h1>{event.name}</h1>
            <div className="eventDetailFacts">
              <div><CalendarDays size={17} /><span>{formatDate(event.startsAt)}</span></div>
              <div><Clock3 size={17} /><span>{formatTime(event.startsAt)}</span></div>
              <div><MapPin size={17} /><span>{[event.venue, event.city].filter(Boolean).join(', ') || 'Məkan müəyyən ediləcək'}</span></div>
            </div>
            <div className="eventDetailPrice"><small>Public ticket price</small><strong>{formatPrice(event.publicTicketPrice)}</strong></div>
            {event.description && <p className="eventDetailDescription">{event.description}</p>}
            {applicationOpen ? (
              <Link href={`/events/${event.slug}/apply`} className="eventPrimaryCta">Promoter kimi əməkdaşlıq et <span>→</span></Link>
            ) : (
              <div className="eventClosedNotice">Əməkdaşlıq müraciəti bağlıdır</div>
            )}
          </div>
        </section>
        {event.gallery.length > 0 && <section className="eventGallery">{event.gallery.map((item) => <img key={item.id} src={item.media.url} alt={item.media.alt || event.name} />)}</section>}
        {event.organizer?.name && <div className="eventOrganizerNote">Təşkilatçı: <strong>{event.organizer.name}</strong></div>}
      </div>
    </main>
  );
}
