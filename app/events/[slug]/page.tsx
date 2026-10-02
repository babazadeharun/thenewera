import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Clock3, MapPin, ArrowLeft, ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';

const date=(v:Date)=>new Intl.DateTimeFormat('az-AZ',{day:'2-digit',month:'long',year:'numeric'}).format(v);
const time=(v:Date)=>new Intl.DateTimeFormat('az-AZ',{hour:'2-digit',minute:'2-digit'}).format(v);
const money=(v:unknown)=>`${new Intl.NumberFormat('az-AZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v))} AZN`;
const status=(s:string)=>s==='APPLICATION_OPEN'?'Müraciət açıqdır':s==='SOLD_OUT'?'Biletlər bitib':'Aktiv';

export default async function EventDetailPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const event=await prisma.event.findUnique({where:{slug},include:{coverMedia:true,organizer:true,gallery:{include:{media:true},orderBy:{sortOrder:'asc'}}}});
 if(!event||!event.isPublic||event.status==='CANCELLED')notFound();
 const open=event.status==='APPLICATION_OPEN';
 return <main className="eventDetailPage"><div className="eventDetailContainer"><Link href="/events" className="eventDetailBack"><ArrowLeft size={15}/> Bütün tədbirlər</Link><section className="eventDetailHero"><div className="eventDetailCover">{event.coverMedia?.url?<img src={event.coverMedia.url} alt={event.coverMedia.alt||event.name}/>:<div className="eventCardImageFallback">NEW ERA</div>}<span className="eventDetailStatus">{status(event.status)}</span></div><div className="eventDetailContent"><div className="eventsEyebrow">{event.artist||'NEW ERA EVENTS'}</div><h1>{event.name}</h1><div className="eventDetailFacts"><div><CalendarDays size={17}/><span>{date(event.startsAt)}</span></div><div><Clock3 size={17}/><span>{time(event.startsAt)}</span></div><div><MapPin size={17}/><span>{[event.venue,event.city].filter(Boolean).join(', ')||'Məkan müəyyən ediləcək'}</span></div></div><div className="eventDetailPrice"><small>PUBLIC TICKET PRICE</small><strong>{money(event.publicTicketPrice)}</strong></div>{event.description&&<p className="eventDetailDescription">{event.description}</p>}{open?<Link href={`/events/${event.slug}/apply`} className="eventPrimaryCta">Promoter kimi əməkdaşlıq et <ArrowUpRight size={15}/></Link>:<div className="eventClosedNotice">Əməkdaşlıq müraciəti bağlıdır</div>}</div></section>{event.gallery.length>0&&<section className="eventDetailGallerySection"><div className="eventsSectionLabel"><span>EVENT GALLERY</span><i/><ImageIcon size={15}/></div><div className="eventGallery">{event.gallery.map((item)=><figure key={item.id}><img src={item.media.url} alt={item.media.alt||event.name}/></figure>)}</div></section>}<section className="eventInfoCards"><div><small>DATE & TIME</small><strong>{date(event.startsAt)}</strong><span>{time(event.startsAt)}</span></div><div><small>VENUE</small><strong>{event.venue||'TBA'}</strong><span>{event.city||'City TBA'}</span></div><div><small>TICKET</small><strong>{money(event.publicTicketPrice)}</strong><span>Public price</span></div></section>{event.organizer?.name&&<div className="eventOrganizerNote">Təşkilatçı: <strong>{event.organizer.name}</strong></div>}</div></main>;
}
