import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MediaItem = { id:string; originalName:string; url:string; mimeType:string; alt:string|null; createdAt:Date };
type PortfolioMeta = {title?:string;client?:string;description?:string;itemId?:string;role?:string;featured?:boolean;status?:string;year?:string;fullDescription?:string;services?:string;projectUrl?:string;category?:string};

const fallbackProjects = [
  { image:'lumiere', title:'Lumière', client:'Lumière Cosmetics', service:'Brendinq', text:'Premium gözəllik brendi üçün vizual kimlik, art-direksiya və kampaniya istiqaməti.' },
  { image:'nova', title:'Nova Tech', client:'Nova Tech', service:'Rəqəmsal marketinq', text:'Texnologiya brendi üçün rəqəmsal kommunikasiya və məhsul təqdimat kampaniyası.' },
  { image:'pulse', title:'Pulse Campaign', client:'Pulse', service:'Sosial media', text:'Kampaniya konsepti, məzmun sistemi və sosial media üçün kreativ istehsal.' },
  { image:'velora', title:'Velora', client:'Velora', service:'Brendinq', text:'Brend kimliyi, vizual sistem və əsas kommunikasiya tətbiqləri.' },
  { image:'orbit', title:'Orbit Digital', client:'Orbit', service:'Rəqəmsal', text:'Premium rəqəmsal məhsul üçün UX, vizual dil və veb təcrübə.' },
  { image:'aurora', title:'Aurora Fashion', client:'Aurora', service:'Kreativ kampaniya', text:'Moda brendi üçün kampaniya konsepti, art-direksiya və vizual istehsal.' },
];

const META_PREFIX='NEPORTFOLIO:';
function mediaMeta(m:MediaItem){
  if(!m.alt?.startsWith(META_PREFIX)) return null;
  try{return JSON.parse(m.alt.slice(META_PREFIX.length)) as PortfolioMeta;}catch{return null;}
}
function normalizeProjectPart(value:string|undefined|null){
  return String(value||'').trim().toLocaleLowerCase('az-AZ').replace(/\s+/g,' ');
}
function projectGroupKey(m:MediaItem){
  const meta=mediaMeta(m);
  const title=normalizeProjectPart(meta?.title);
  const client=normalizeProjectPart(meta?.client);
  if(title || client) return `project:${title}::${client}`;
  if(meta?.itemId) return `project:${meta.itemId}`;
  return `media:${m.id}`;
}

function titleFromMedia(m:MediaItem){
  const meta=mediaMeta(m);
  if(meta?.title) return meta.title;
  const clean=(m.alt||m.originalName).replace(/^\[[^\]]+\]\s*/,'').replace(/\.[a-z0-9]+$/i,'');
  return clean.replace(/[-_]+/g,' ').trim() || 'New Era layihəsi';
}

export default async function PortfolioPage(){
  const [portfolio, videos, designs, partners] = await Promise.all([
    prisma.media.findMany({where:{category:'PORTFOLIO'},orderBy:{createdAt:'desc'},take:40}),
    prisma.media.findMany({where:{category:'PORTFOLIO_VIDEO'},orderBy:{createdAt:'desc'},take:24}),
    prisma.media.findMany({where:{category:'PORTFOLIO_DESIGN'},orderBy:{createdAt:'desc'},take:40}),
    prisma.media.findMany({where:{category:'PARTNER_LOGO'},orderBy:{createdAt:'asc'},take:40}),
  ]).catch(()=>[[],[],[],[]] as const);

  const isPublishedMedia = (m: MediaItem) => { const meta = mediaMeta(m); return !meta || meta.status === 'PUBLISHED'; };
  const visiblePortfolio = portfolio.filter(isPublishedMedia);
  const visibleVideos = videos.filter(isPublishedMedia);
  const visibleDesigns = designs.filter(isPublishedMedia);

  // A portfolio project can contain multiple media files. The main portfolio grid
  // should show only one cover per project; the remaining gallery/video media live
  // on the project's detail page. Legacy media without portfolio metadata remain
  // visible as individual items.
  const portfolioProjects = (() => {
    const grouped = new Map<string, MediaItem>();
    for (const m of visiblePortfolio) {
      const meta = mediaMeta(m);
      const key = projectGroupKey(m);
      const existing = grouped.get(key);
      if (!existing || meta?.role === 'cover') grouped.set(key, m);
    }
    return [...grouped.values()];
  })();
  const hasDynamic = portfolioProjects.length || visibleVideos.length || visibleDesigns.length;

  return <main className="innerPage agencyPortfolioPage">
    <section className="container portfolioIntro">
      <div className="eyebrow">PORTFOLİO VƏ ƏMƏKDAŞLIQLAR</div>
      <h1>Gördüyümüz <span>işlər.</span></h1>
      <p>Brendinqdən rəqəmsal marketinqə, çəkilişlərdən kreativ dizayna qədər New Era tərəfindən həyata keçirilən işlərdən seçilmiş nümunələr.</p>
      <div className="portfolioJumpNav">
        <a href="#portfolio">Portfolio</a><a href="#videos">Videolar</a><a href="#design">Dizayn</a><a href="#partners">Əməkdaşlıqlar</a>
      </div>
    </section>

    <section id="portfolio" className="container portfolioSection">
      <div className="sectionHeading"><div><div className="eyebrow">PORTFOLİO</div><h2>Layihələrimiz</h2></div><span>New Era tərəfindən hazırlanmış real işlər</span></div>
      {portfolioProjects.length ? <div className="agencyPortfolioGrid portfolioPageGrid">{portfolioProjects.map(m=>{const meta=mediaMeta(m); const itemId=meta?.itemId; const href=itemId?`/portfolio/${encodeURIComponent(itemId)}`:'/portfolio'; return <Link className="agencyPortfolioCard" href={href} key={m.id}><div className="agencyPortfolioImage">{m.mimeType.startsWith('video/')?<video src={m.url} muted preload="metadata"/>:<img src={m.url} alt={m.alt||m.originalName}/>}<span>{m.mimeType.startsWith('video/')?'Video':'Portfolio'}</span></div><div className="agencyPortfolioBody"><div><strong>{titleFromMedia(m)}</strong><small>{meta?.client || 'New Era layihəsi'}</small></div><ArrowRight size={17}/><p>{meta?.description || m.alt?.replace(/^\[[^\]]+\]\s*/,'')||'Brend üçün kreativ və marketinq işi.'}</p></div></Link>})}</div>
      : <div className="portfolioEmpty"><strong>Portfolio işləri burada görünəcək.</strong><span>Admin panel → CMS → Media Library bölməsindən faylı “Portfolio işi” kateqoriyası ilə əlavə edin.</span></div>}
      {!hasDynamic && <div className="agencyPortfolioGrid portfolioPageGrid portfolioFallback">{fallbackProjects.map(p=><article className="agencyPortfolioCard" key={p.image}><div className="agencyPortfolioImage"><img src={`/portfolio/${p.image}.jpg`} alt={p.title}/><span>{p.service}</span></div><div className="agencyPortfolioBody"><div><strong>{p.title}</strong><small>{p.client}</small></div><ArrowRight size={17}/><p>{p.text}</p></div></article>)}</div>}
    </section>

    <section id="videos" className="container portfolioSection">
      <div className="sectionHeading"><div><div className="eyebrow">VİDEOLAR</div><h2>Çəkdiyimiz videolar</h2></div><span>Reklam, kampaniya, məhsul və brend çəkilişləri</span></div>
      {visibleVideos.length ? <div className="videoPortfolioGrid">{visibleVideos.map(m=><article className="videoPortfolioCard" key={m.id}><div><video src={m.url} controls preload="metadata"/></div><strong>{titleFromMedia(m)}</strong><small>{mediaMeta(m)?.description || m.alt?.replace(/^\[[^\]]+\]\s*/,'')||'New Era video işi'}</small></article>)}</div> : <div className="portfolioEmpty"><strong>Videolar burada görünəcək.</strong><span>Admin paneldə “Portfolio video” kateqoriyasını seçərək video əlavə edin.</span></div>}
    </section>

    <section id="design" className="container portfolioSection">
      <div className="sectionHeading"><div><div className="eyebrow">DİZAYN</div><h2>Hazırladığımız dizaynlar</h2></div><span>Poster, kampaniya vizualları və digər kreativ materiallar</span></div>
      {visibleDesigns.length ? <div className="designPortfolioGrid">{visibleDesigns.map(m=><article key={m.id}><img src={m.url} alt={m.alt||m.originalName}/><div><strong>{titleFromMedia(m)}</strong><small>{mediaMeta(m)?.description || m.alt?.replace(/^\[[^\]]+\]\s*/,'')||'Kreativ dizayn'}</small></div></article>)}</div> : <div className="portfolioEmpty"><strong>Dizayn işləri burada görünəcək.</strong><span>Admin paneldə “Dizayn / poster” kateqoriyasını seçərək poster və vizualları əlavə edin.</span></div>}
    </section>

    <section id="partners" className="container partnerSection">
      <div className="eyebrow">ƏMƏKDAŞLIQLAR</div><h2>Birlikdə işlədiyimiz şirkətlər</h2>
      {partners.length ? <div className="partnerMarquee"><div className="partnerTrack">{[...partners,...partners].map((m,i)=><div className="partnerLogo" key={`${m.id}-${i}`}><img src={m.url} alt={m.alt||titleFromMedia(m)}/></div>)}</div></div> : <div className="partnerEmpty">Əməkdaşlıq etdiyimiz şirkətlərin loqoları burada görünəcək.</div>}
    </section>

    <section className="container finalCta portfolioCta"><div className="eyebrow">NÖVBƏTİ LAYİHƏ</div><h2>İdeyanızı <span>birlikdə</span> həyata keçirək.</h2><p>Biznes məqsədinizi paylaşın, New Era sizin üçün uyğun strategiya və kreativ istiqaməti hazırlasın.</p><Link className="primary" href="/start-project">Layihəyə başla <ArrowRight size={17}/></Link></section>
  </main>;
}
