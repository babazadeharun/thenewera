import '../../product-experience.css';
import './project-detail-reference.css';
import Link from 'next/link';
import PortfolioImage from './PortfolioImage';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MediaItem = {
  id: string;
  originalName: string;
  url: string;
  mimeType: string;
  alt: string | null;
  createdAt: Date;
};

type PortfolioMeta = { problem?:string;workDone?:string;duration?:string;result?:string;evidenceUrl?:string;isConcept?:boolean;
  title?: string;
  client?: string;
  description?: string;
  fullDescription?: string;
  services?: string;
  projectUrl?: string;
  itemId?: string;
  role?: string;
  featured?: boolean;
  status?: string;
  year?: string;
  category?: string;
};

const META_PREFIX = 'NEPORTFOLIO:';

function mediaMeta(media: MediaItem): PortfolioMeta | null {
  if (!media.alt?.startsWith(META_PREFIX)) return null;
  try {
    return JSON.parse(media.alt.slice(META_PREFIX.length)) as PortfolioMeta;
  } catch {
    return null;
  }
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const media = await prisma.media.findMany({
    where: {
      category: { in: ['PORTFOLIO', 'PORTFOLIO_VIDEO', 'PORTFOLIO_DESIGN'] },
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  }).catch(() => [] as MediaItem[]);

  const anchor = media.find((item) => mediaMeta(item)?.itemId === id && mediaMeta(item)?.status === 'PUBLISHED');
  if (!anchor) notFound();
  const anchorMeta = mediaMeta(anchor) || {};
  const anchorTitle = (anchorMeta.title || '').trim().toLocaleLowerCase('az-AZ').replace(/\s+/g,' ');
  const anchorClient = (anchorMeta.client || '').trim().toLocaleLowerCase('az-AZ').replace(/\s+/g,' ');

  // Older portfolio records may have been saved as separate itemIds even though
  // they represent the same project. Keep them together by project title/client.
  const projectMedia = media.filter((item) => {
    const meta = mediaMeta(item);
    if (!meta || meta.status !== 'PUBLISHED') return false;
    if (meta.itemId === id) return true;
    const title = (meta.title || '').trim().toLocaleLowerCase('az-AZ').replace(/\s+/g,' ');
    const client = (meta.client || '').trim().toLocaleLowerCase('az-AZ').replace(/\s+/g,' ');
    return Boolean(anchorTitle || anchorClient) && title === anchorTitle && client === anchorClient;
  });

  const cover = projectMedia.find((item) => mediaMeta(item)?.role === 'cover') || anchor;
  const coverMeta = mediaMeta(cover) || anchorMeta;
  const gallery = projectMedia.filter((item) => item.id !== cover.id && mediaMeta(item)?.role === 'gallery');
  const videos = projectMedia.filter((item) => mediaMeta(item)?.role === 'video' || item.mimeType.startsWith('video/'));
  const otherImages = projectMedia.filter((item) => item.id !== cover.id && !gallery.some((galleryItem) => galleryItem.id === item.id) && !videos.some((video) => video.id === item.id) && item.mimeType.startsWith('image/'));
  const allImages = [...gallery, ...otherImages];

  return (
    <main className="innerPage portfolioDetailPage">
      <section className="container portfolioDetailHero">
        <Link className="portfolioBackLink" href="/portfolio"><ArrowLeft size={16} /> Bütün işlərə qayıt</Link>
        <div className="portfolioDetailHeroGrid">
          <div className="portfolioDetailCover">
            {cover.mimeType.startsWith('video/') ? (
              <video src={cover.url} controls preload="metadata" />
            ) : (
              <PortfolioImage src={cover.url} alt={coverMeta.title || cover.originalName} />
            )}
          </div>
          <div className="portfolioDetailIntro">
            <div className="eyebrow">{coverMeta.isConcept ? 'KONSEPT LAYİHƏ · NÜMUNƏ İŞ' : 'PORTFOLİO LAYİHƏSİ'}</div>
            <h1>{coverMeta.title || cover.originalName}</h1>
            {coverMeta.client && <div className="portfolioDetailClient">{coverMeta.client}</div>}
            {coverMeta.description && <p>{coverMeta.description}</p>}
            <div className="portfolioDetailFacts">
              {coverMeta.year && <div><small>İL</small><strong>{coverMeta.year}</strong></div>}
              {coverMeta.services && <div><small>XİDMƏTLƏR</small><strong>{coverMeta.services}</strong></div>}
            </div>
            {coverMeta.projectUrl && /^https?:\/\//i.test(coverMeta.projectUrl) && (
              <a className="primary portfolioProjectLink" href={coverMeta.projectUrl} target="_blank" rel="noreferrer">
                Layihəyə bax <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="container portfolioDetailDescription"><h2>Problem, iş və nəticə</h2>{coverMeta.isConcept&&<p>Bu iş konsept nümunəsidir. Real müştəri nəticəsi və ya kommersiya göstəricisi kimi təqdim edilmir.</p>}<dl className="productCaseFacts">{[['Başlanğıc problem',coverMeta.problem],['Gördüyümüz iş',coverMeta.workDone],['İcra müddəti',coverMeta.duration],['Nəticə',coverMeta.result]].map(([label,value])=><div key={label}><dt>{label}</dt><dd style={{whiteSpace:'pre-wrap'}}>{value || 'Bu layihə üçün hələ paylaşılmayıb.'}</dd></div>)}</dl>{coverMeta.evidenceUrl&&/^https?:\/\//i.test(coverMeta.evidenceUrl)&&<a href={coverMeta.evidenceUrl} target="_blank" rel="noreferrer">Paylaşılmış nəticəyə bax →</a>}</section>
      {coverMeta.fullDescription && (
        <section className="container portfolioDetailDescription">
          <div className="eyebrow">LAYİHƏ HAQQINDA</div>
          <p>{coverMeta.fullDescription}</p>
        </section>
      )}

      {allImages.length > 0 && (
        <section className="container portfolioDetailGallery">
          <div className="sectionHeading">
            <div><div className="eyebrow">LAYİHƏNİN MEDİALARI</div><h2>Layihədən digər görüntülər.</h2></div>
            <span>{allImages.length} əlavə media</span>
          </div>
          <div className="portfolioDetailMediaGrid">
            {allImages.map((item) => (
              <figure key={item.id}>
                <PortfolioImage src={item.url} alt={coverMeta.title || item.originalName} loading="lazy" />
              </figure>
            ))}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="container portfolioDetailVideos">
          <div className="sectionHeading">
            <div><div className="eyebrow">VİDEO</div><h2>Layihədən video.</h2></div>
            <span>{videos.length} video</span>
          </div>
          <div className="portfolioDetailVideoGrid">
            {videos.map((item) => <video key={item.id} src={item.url} controls preload="metadata" />)}
          </div>
        </section>
      )}

      <section className="container portfolioDetailCta">
        <div>
          <div className="eyebrow">NÖVBƏTİ LAYİHƏ</div>
          <h2>İdeyanızı birlikdə <span>nəticəyə çevirək.</span></h2>
        </div>
        <Link className="primary" href="/contact">Layihəyə başla <ArrowRight size={16} /></Link>
      </section>
    </main>
  );
}
