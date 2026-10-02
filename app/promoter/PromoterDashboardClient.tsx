'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, LogOut, MapPin, Ticket, TrendingUp, XCircle } from 'lucide-react';

type EventRow = {
  eventId: string;
  status: string;
  allocation: number;
  soldQuantity: number;
  remainingQuantity: number;
  promoterDiscountPercent: string;
  promoterPrice: string;
  joinedAt: string;
  notes: string | null;
  event: { id: string; name: string; slug: string; artist: string | null; venue: string | null; city: string | null; startsAt: string; status: string; coverMedia: { url: string; alt: string | null } | null };
};

type SaleRow = {
  id: string;
  soldAt: string;
  promoterPrice: string;
  actualSalePrice: string;
  margin: string;
  customerName: string | null;
  ticket: { ticketNumber: string; status: string };
  event: { id: string; name: string; slug: string; startsAt: string; city: string | null; venue: string | null };
};

type TicketRow = {
  id: string;
  allocatedAt: string;
  promoterPrice: string;
  promoterDiscountPercent: string;
  ticket: { id: string; ticketNumber: string; status: string; event: { id: string; name: string; slug: string; startsAt: string; city: string | null; venue: string | null } };
};

type FinanceSummary = { debit: number; credit: number; debt: number };

type ApplicationRow = {
  id: string;
  status: string;
  rejectReason: string | null;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  event: { id: string; name: string; slug: string; startsAt: string; city: string | null; venue: string | null; coverMedia: { url: string; alt: string | null } | null };
};

const applicationLabels: Record<string, string> = {
  PENDING: 'Gözləyir',
  UNDER_REVIEW: 'İncələnir',
  APPROVED: 'Təsdiqləndi',
  REJECTED: 'Rədd edildi',
  CANCELLED: 'Ləğv edildi',
};

const eventLabels: Record<string, string> = {
  ACTIVE: 'Aktiv',
  PAUSED: 'Dayandırılıb',
  COMPLETED: 'Tamamlanıb',
  CANCELLED: 'Ləğv edilib',
};

function money(value: string) {
  return `${Number(value).toFixed(2)} AZN`;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('az-AZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function PromoterDashboardClient({ promoter, events, applications, tickets, sales, finance }: { promoter: { firstName: string; lastName: string; email: string | null; phone: string | null; city: string | null; status: string }; events: EventRow[]; applications: ApplicationRow[]; tickets: TicketRow[]; sales: SaleRow[]; finance: FinanceSummary }) {
  const [activeTab, setActiveTab] = useState<'events' | 'tickets' | 'sales' | 'finance' | 'applications'>('events');
  const totalAllocation = events.reduce((sum, item) => sum + item.allocation, 0);
  const totalSold = events.reduce((sum, item) => sum + item.soldQuantity, 0);
  const totalRemaining = events.reduce((sum, item) => sum + item.remainingQuantity, 0);
  const pendingApplications = applications.filter((item) => ['PENDING', 'UNDER_REVIEW'].includes(item.status)).length;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <main className="promoterPortal">
      <div className="promoterPortalGlow" />
      <div className="container promoterPortalInner">
        <header className="promoterTopbar">
          <div>
            <Link href="/events" className="promoterBack">← Events</Link>
            <div className="eyebrow">NEW ERA · PROMOTER PORTALI</div>
            <h1>Salam, <span>{promoter.firstName}.</span></h1>
            <p>Təsdiqlənmiş tədbirlərini, müraciətlərini və bilet göstəricilərini buradan idarə et.</p>
          </div>
          <button className="promoterLogout" onClick={logout}><LogOut size={16} /> Çıxış</button>
        </header>

        <section className="promoterStats">
          <div className="promoterStat"><div className="promoterStatIcon"><CalendarDays size={19} /></div><small>TƏDBİRLƏR</small><strong>{events.length}</strong><span>Təsdiqlənmiş</span></div>
          <div className="promoterStat"><div className="promoterStatIcon"><Ticket size={19} /></div><small>ALLOCATION</small><strong>{totalAllocation}</strong><span>Ümumi ayrılmış bilet</span></div>
          <div className="promoterStat"><div className="promoterStatIcon"><TrendingUp size={19} /></div><small>SATILIB</small><strong>{totalSold}</strong><span>Faktiki satış</span></div>
          <div className="promoterStat"><div className="promoterStatIcon"><Clock3 size={19} /></div><small>GÖZLƏYƏN</small><strong>{pendingApplications}</strong><span>Müraciət</span></div>
        </section>

        <div className="promoterPortalGrid">
          <section className="promoterMainPanel">
            <div className="promoterTabs">
              <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>Tədbirlərim</button>
              <button className={activeTab === 'tickets' ? 'active' : ''} onClick={() => setActiveTab('tickets')}>Biletlərim <b>{tickets.length}</b></button>
              <button className={activeTab === 'sales' ? 'active' : ''} onClick={() => setActiveTab('sales')}>Satışlarım <b>{sales.length}</b></button><button className={activeTab === 'finance' ? 'active' : ''} onClick={() => setActiveTab('finance')}>Maliyyə</button>
              <button className={activeTab === 'applications' ? 'active' : ''} onClick={() => setActiveTab('applications')}>Müraciətlərim {pendingApplications > 0 && <b>{pendingApplications}</b>}</button>
            </div>

            {activeTab === 'events' ? (
              events.length === 0 ? (
                <div className="promoterEmpty"><Ticket size={26} /><h3>Hələ təsdiqlənmiş tədbirin yoxdur</h3><p>Açıq tədbirlərə bax və əməkdaşlıq üçün müraciət et.</p><Link href="/events" className="promoterPrimary">Tədbirlərə bax <ArrowRight size={16} /></Link></div>
              ) : (
                <div className="promoterEventList">
                  {events.map((item) => (
                    <article className="promoterEventCard" key={`${item.eventId}-${item.joinedAt}`}>
                      <div className="promoterEventCover">{item.event.coverMedia ? <img src={item.event.coverMedia.url} alt={item.event.coverMedia.alt || item.event.name} /> : <div className="promoterCoverFallback">NEW ERA</div>}</div>
                      <div className="promoterEventBody">
                        <div className="promoterEventHead"><div><span className="promoterStatus">{eventLabels[item.status] || item.status}</span><h3>{item.event.name}</h3></div><Link href={`/events/${item.event.slug}`} aria-label="Tədbirə bax"><ArrowRight size={18} /></Link></div>
                        {item.event.artist && <p className="promoterArtist">{item.event.artist}</p>}
                        <div className="promoterMeta"><span><CalendarDays size={14} /> {dateTime(item.event.startsAt)}</span>{(item.event.city || item.event.venue) && <span><MapPin size={14} /> {[item.event.city, item.event.venue].filter(Boolean).join(' · ')}</span>}</div>
                        <div className="promoterEventNumbers">
                          <div><small>Promoter qiyməti</small><strong>{money(item.promoterPrice)}</strong></div>
                          <div><small>Allocation</small><strong>{item.allocation}</strong></div>
                          <div><small>Satılıb</small><strong>{item.soldQuantity}</strong></div>
                          <div><small>Qalıb</small><strong>{item.remainingQuantity}</strong></div>
                        </div>
                        <div className="promoterDiscountNote">Promoter endirimi: <b>{Number(item.promoterDiscountPercent).toFixed(2)}%</b> · Tarixi qiymət snapshot kimi qorunur.</div>
                      </div>
                    </article>
                  ))}
                </div>
              )
            ) : activeTab === 'tickets' ? (
              tickets.length === 0 ? (
                <div className="promoterEmpty"><Ticket size={26} /><h3>Hələ ayrılmış bilet yoxdur</h3><p>Admin tərəfindən sənə bilet allocation verildikdə burada görünəcək.</p></div>
              ) : (
                <div className="promoterTicketList">
                  {tickets.map((item) => (
                    <article className="promoterTicketCard" key={item.id}>
                      <div><small>{item.ticket.status === 'ALLOCATED' ? 'Ayrılıb' : item.ticket.status}</small><h3>{item.ticket.ticketNumber}</h3><p>{item.ticket.event.name}</p><span>{dateTime(item.ticket.event.startsAt)} · {[item.ticket.event.city, item.ticket.event.venue].filter(Boolean).join(' · ')}</span></div>
                      <div className="promoterTicketPrice"><small>Promoter qiyməti</small><strong>{money(item.promoterPrice)}</strong><span>{Number(item.promoterDiscountPercent).toFixed(2)}% endirim snapshot</span>{item.ticket.status === 'ALLOCATED' && <button className="promoterSellButton" onClick={async () => { const value = window.prompt(`Müştəriyə faktiki satış qiyməti (AZN). Promoter qiyməti: ${money(item.promoterPrice)}`); if (value === null) return; const salePrice = Number(value); if (!Number.isFinite(salePrice) || salePrice < 0) { alert('Düzgün satış qiyməti daxil edin.'); return; } const customerName = window.prompt('Müştəri adı (istəyə bağlı):') || ''; const r = await fetch('/api/promoter/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: item.ticket.id, actualSalePrice: salePrice, customerName }) }); const d = await r.json(); if (!r.ok) { alert(d.error); return; } window.location.reload(); }}>Satış kimi qeyd et</button>}</div>
                    </article>
                  ))}
                </div>
              )
             ) : activeTab === 'finance' ? (
              <div className="promoterFinancePanel"><div className="promoterFinanceCard"><small>ÜMUMİ BORC</small><strong>{money(String(finance.debt))}</strong><span>Debit {money(String(finance.debit))} · Kredit {money(String(finance.credit))}</span></div><div className="promoterRuleCard"><small>MALİYYƏ</small><h3>Borc hesablanması</h3><p>Satılmış biletlərin tarixi promoter qiyməti borc kimi, qeyd edilmiş ödənişlər isə kredit kimi ledger-də saxlanılır.</p><p>Faktiki müştəri satış qiyməti promoter marginidir və promoter borcunu dəyişmir.</p></div></div>
            ) : activeTab === 'sales' ? (
              sales.length === 0 ? (
                <div className="promoterEmpty"><TrendingUp size={26} /><h3>Hələ satış yoxdur</h3><p>Satış etdikdə faktiki müştəri qiyməti və margin burada görünəcək.</p></div>
              ) : (
                <div className="promoterTicketList">{sales.map((sale) => (
                  <article className="promoterTicketCard" key={sale.id}>
                    <div><small>Satılıb · {dateTime(sale.soldAt)}</small><h3>{sale.ticket.ticketNumber}</h3><p>{sale.event.name}</p><span>{sale.customerName || 'Müştəri adı qeyd edilməyib'}</span></div>
                    <div className="promoterTicketPrice"><small>Promoter qiyməti</small><strong>{money(sale.promoterPrice)}</strong><span>Satış: {money(sale.actualSalePrice)} · Margin: <b>{money(sale.margin)}</b></span></div>
                  </article>
                ))}</div>
              )
            ) : (
              applications.length === 0 ? (
                <div className="promoterEmpty"><Clock3 size={26} /><h3>Hələ müraciətin yoxdur</h3><p>İştirak etmək istədiyin tədbiri seç və müraciət göndər.</p><Link href="/events" className="promoterPrimary">Tədbirlərə bax <ArrowRight size={16} /></Link></div>
              ) : (
                <div className="promoterApplicationList">
                  {applications.map((item) => (
                    <article className="promoterApplicationCard" key={item.id}>
                      <div className="promoterApplicationImage">{item.event.coverMedia ? <img src={item.event.coverMedia.url} alt={item.event.coverMedia.alt || item.event.name} /> : null}</div>
                      <div className="promoterApplicationBody"><div className="promoterApplicationTop"><div><small>{dateTime(item.event.startsAt)}</small><h3>{item.event.name}</h3></div><span className={`applicationBadge application-${item.status.toLowerCase()}`}>{applicationLabels[item.status] || item.status}</span></div><p>{[item.event.city, item.event.venue].filter(Boolean).join(' · ') || 'Tədbir məlumatı'}</p>{item.rejectReason && <div className="applicationReason"><XCircle size={15} /> {item.rejectReason}</div>}{item.status === 'APPROVED' && <div className="applicationApproved"><CheckCircle2 size={15} /> Təsdiqləndi — tədbir artıq “Tədbirlərim” bölməsindədir.</div>}</div>
                    </article>
                  ))}
                </div>
              )
            )}
          </section>

          <aside className="promoterSidePanel">
            <div className="promoterProfileCard"><div className="promoterProfileAvatar">{promoter.firstName.slice(0, 1)}{promoter.lastName.slice(0, 1)}</div><small>PROMOTER</small><h2>{promoter.firstName} {promoter.lastName}</h2><p>{promoter.city || 'Şəhər qeyd edilməyib'}</p><div className="promoterProfileRows">{promoter.email && <div><span>E-poçt</span><b>{promoter.email}</b></div>}{promoter.phone && <div><span>Telefon</span><b>{promoter.phone}</b></div>}<div><span>Status</span><b className="profileActive">Aktiv</b></div></div></div>
            <div className="promoterRuleCard"><small>NEW ERA QAYDASI</small><h3>Qiymət necə işləyir?</h3><p>Paneldə göstərilən promoter qiyməti New Era-nın həmin tədbir üçün sənə verdiyi tarixi qiymətdir.</p><p>Müştəriyə faktiki satış qiymətini sən müəyyən edirsən. Faktiki satış qiyməti satış zamanı qeyd olunur; margin avtomatik olaraq promoter qiymətindən hesablanır.</p></div>
            <Link href="/events" className="promoterBrowseLink">Yeni tədbir tap <ArrowRight size={16} /></Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
