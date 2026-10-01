import Link from 'next/link';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import { prisma } from '@/lib/prisma';

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' }).format(value);
}
function formatTime(value: Date) {
  return new Intl.DateTimeFormat('az-AZ', { hour: '2-digit', minute: '2-digit' }).format(value);
}
function formatPrice(value: unknown) {
  return `${new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} AZN`;
}

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    where: { status: { in: ['APPLICATION_OPEN', 'ACTIVE', 'SOLD_OUT'] } },
    include: { coverMedia: true },
    orderBy: { startsAt: 'asc' },
  });

  return (
    <main className="eventsPublicPage">
      <section className="eventsPublicHero">
        <div className="eventsPublicHeroGlow" />
        <div className="eventsPublicContainer">
          <Link href="/" className="eventsBackLink">← New Era</Link>
          <div className="eventsEyebrow">NEW ERA · EVENTS</div>
          <h1>Tədbirlər və<br /><span>promoter əməkdaşlığı.</span></h1>
          <p>Seçilmiş tədbirləri kəşf et. Uyğun tədbir üçün promoter kimi əməkdaşlıq müraciəti göndər.</p>
        </div>
      </section>

      <section className="eventsPublicContainer eventsGridSection">
        {events.length === 0 ? (
          <div className="eventsEmptyState">
            <Ticket size={22} />
            <strong>Hazırda açıq tədbir yoxdur.</strong>
            <span>Yeni tədbirlər əlavə edildikdə burada görünəcək.</span>
          </div>
        ) : (
          <div className="eventsGrid">
            {events.map((event) => (
              <article className="eventCard" key={event.id}>
                <Link href={`/events/${event.slug}`} className="eventCardImage">
                  {event.coverMedia?.url ? <img src={event.coverMedia.url} alt={event.coverMedia.alt || event.name} /> : <div className="eventCardImageFallback">NEW ERA</div>}
                  <span className={`eventStatus eventStatus-${event.status.toLowerCase()}`}>
                    {event.status === 'APPLICATION_OPEN' ? 'Müraciət açıqdır' : event.status === 'SOLD_OUT' ? 'Sold out' : 'Aktiv'}
                  </span>
                </Link>
                <div className="eventCardBody">
                  <div className="eventCardMeta">{event.artist || 'EVENT'}</div>
                  <Link href={`/events/${event.slug}`} className="eventCardTitle">{event.name}</Link>
                  <div className="eventCardInfo"><CalendarDays size={14} /> {formatDate(event.startsAt)} · {formatTime(event.startsAt)}</div>
                  <div className="eventCardInfo"><MapPin size={14} /> {[event.venue, event.city].filter(Boolean).join(', ') || 'Məkan müəyyən ediləcək'}</div>
                  <div className="eventCardFooter">
                    <div><small>Public ticket price</small><strong>{formatPrice(event.publicTicketPrice)}</strong></div>
                    <Link href={`/events/${event.slug}`} className="eventCardArrow">Ətraflı →</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
