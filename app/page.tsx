import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import { ArrowRight, BarChart3, Code2, Layers3, Megaphone, Palette, Play, Lightbulb, Image as ImageIcon, UsersRound, Sparkles, Target, Video } from 'lucide-react';

import HomeNavigation from './components/home/HomeNavigation';
import HeroMedia from './components/home/HeroMedia';
import { heroPresentation } from './components/home/hero-content';
import styles from './components/home/home.module.css';
import './components/home/presentation.css';

export const dynamic = 'force-dynamic';

const services = [
  ['Brendinq', 'Brend strategiyası, vizual kimlik və art-direksiya', Layers3],
  ['Kreativ dizayn', 'Kampaniya vizualları, sosial media və reklam materialları', Palette],
  ['Video və foto', 'Reklam çəkilişləri, məhsul, lifestyle və motion məzmun', Video],
  ['Sosial media', 'Strategiya, məzmun sistemi və davamlı kommunikasiya', Megaphone],
  ['Rəqəmsal marketinq', 'Kampaniyalar, performans və rəqəmsal böyümə', BarChart3],
  ['Veb və rəqəmsal', 'Premium vebsaytlar, platformalar və rəqəmsal məhsullar', Code2],
  ['Reklam kampaniyaları', 'İdeyadan kreativ istehsala və media aktivləşdirməsinə qədər', Target],
  ['Marketinq strategiyası', 'Məqsəd, auditoriya, mövqeləndirmə və artım istiqaməti', Sparkles],
] as const;

const fallbackPortfolio = [
  { image: 'lumiere', title: 'Lumière', client: 'Lumière Cosmetics', service: 'Brendinq', text: 'Premium gözəllik brendi üçün vizual kimlik və kampaniya istiqaməti.' },
  { image: 'nova', title: 'Nova Tech', client: 'Nova Tech', service: 'Rəqəmsal marketinq', text: 'Texnologiya brendi üçün rəqəmsal kommunikasiya və kampaniya sistemi.' },
  { image: 'pulse', title: 'Pulse Campaign', client: 'Pulse', service: 'Sosial media', text: 'Kampaniya konsepti, məzmun sistemi və sosial media vizualları.' },
  { image: 'velora', title: 'Velora', client: 'Velora', service: 'Brendinq', text: 'Brend kimliyi, art-direksiya və tətbiqetmə sistemi.' },
  { image: 'orbit', title: 'Orbit Digital', client: 'Orbit', service: 'Rəqəmsal', text: 'Müasir rəqəmsal məhsul üçün premium vizual və UX istiqaməti.' },
  { image: 'aurora', title: 'Aurora Fashion', client: 'Aurora', service: 'Kreativ kampaniya', text: 'Moda brendi üçün kampaniya vizualları və yaradıcı istiqamət.' },
];

export default async function Home() {
  const currentUser = await getCurrentUser();
  const cms = await prisma.siteSetting.findUnique({ where: { id: 'main' }, include: { logoMedia: true } }).catch(() => null);
  const sections = await prisma.homepageSection.findMany({ include: { image: true }, orderBy: { displayOrder: 'asc' } }).catch(() => []);
  const featuredMedia = await prisma.media.findMany({
    where: { category: 'PORTFOLIO' },
    orderBy: { createdAt: 'desc' },
    take: 12,
  }).catch(() => []);
  const parsePortfolioMeta = (alt: string | null) => {
    if (!alt?.startsWith('NEPORTFOLIO:')) return null;
    try { return JSON.parse(alt.slice('NEPORTFOLIO:'.length)) as { title?: string; client?: string; category?: string; description?: string; featured?: boolean; status?: string; itemId?: string; role?: string }; }
    catch { return null; }
  };
  const featuredProjects = new Map<string, { media: typeof featuredMedia[number]; meta: NonNullable<ReturnType<typeof parsePortfolioMeta>> }>();
  for (const m of featuredMedia) {
    const meta = parsePortfolioMeta(m.alt);
    if (meta?.status !== 'PUBLISHED' || meta.featured !== true) continue;
    const titleKey = String(meta.title || '').trim().toLocaleLowerCase('az-AZ').replace(/\s+/g,' ');
    const clientKey = String(meta.client || '').trim().toLocaleLowerCase('az-AZ').replace(/\s+/g,' ');
    const key = titleKey || clientKey ? `${titleKey}::${clientKey}` : String(meta.itemId || m.id);
    const current = featuredProjects.get(key);
    if (!current || meta.role === 'cover') featuredProjects.set(key, { media: m, meta });
  }
  const dynamicPortfolio = [...featuredProjects.values()].map(({ media: m, meta }) => ({
    image: m.url,
    title: meta.title || m.originalName.replace(/\.[^.]+$/, ''),
    client: meta.client || 'New Era layihəsi',
    service: meta.category || 'Portfolio',
    text: meta.description || 'New Era tərəfindən həyata keçirilmiş kreativ və marketinq işi.',
    itemId: meta.itemId,
  }));
  const portfolio = dynamicPortfolio.length ? dynamicPortfolio : fallbackPortfolio;
  const section = (key: string) => sections.find((item) => item.key === key);
  const showSection = (key: string) => section(key)?.enabled !== false;

  // Keep the existing CMS editable, but migrate the old hard-coded About copy
  // to the new approved wording without requiring a destructive DB migration.
  const aboutSection = section('about');
  const legacyAboutCopy =
    !aboutSection ||
    (
      aboutSection.title.trim().toLocaleLowerCase('az-AZ') === 'new era yanaşması' &&
      (aboutSection.description || '').trim().toLocaleLowerCase('az-AZ').startsWith('strategiya, kreativ və icranı vahid tərəfdaş kimi idarə edirik')
    );
  const aboutTitle = legacyAboutCopy ? 'Bir layihə. Bir tərəfdaş. Bütöv nəticə.' : aboutSection?.title;
  const aboutDescription = legacyAboutCopy
    ? 'Strategiyadan kreativə, dizayndan istehsala qədər layihənizin bütün mərhələlərini vahid sistemdə birləşdiririk. Siz isə ayrı-ayrı icraçıları deyil, nəticəni idarə edirsiniz.'
    : aboutSection?.description;
  const heroes = await prisma.hero.findMany({ where: { active: true }, include: { desktopMedia: true, mobileMedia: true, videoMedia: true }, orderBy: { displayOrder: 'asc' }, take: 10 }).catch(() => []);
  const hero = heroes[0];
  const presentation = heroPresentation(hero, cms?.heroImage);
  const heroTitle = hero?.title && !['New Era Hero', 'New Era', 'Növbəti Era Buradan Başlayır.'].includes(hero.title) ? hero.title : 'Növbəti Era Buradan Başlayır.';
  const heroDescription = hero?.description && !['Find the right creative for your next big idea. From design to development, connect with top talent in Azerbaijan.', 'Find the right creative for your next big idea. From design to development, connect with top talent in Azerbaijan'].includes(hero.description.trim())
    ? hero.description
    : 'Brendiniz üçün strategiyanı, kreativ ideyanı və rəqəmsal icranı bir komandada birləşdiririk.';
  const heroCtaText = hero?.ctaText === 'Create Client Account' ? 'Layihəyə başla' : (hero?.ctaText || 'Layihəyə başla');

  return (
    <main className={styles.home}>
      <HomeNavigation logo={cms?.logoMedia?.url || '/new-era-logo.png'} siteName={cms?.siteName || 'New Era'} accountHref={currentUser ? getAccountHomePath(currentUser.role) : null} servicesEnabled={showSection('services')} portfolioEnabled={showSection('portfolio')} aboutEnabled={showSection('about')} />
      <section id="top" className={styles.hero} data-presentation>
        <div className={styles.scene}>
          <HeroMedia desktop={presentation.desktop} mobile={presentation.mobile} video={presentation.video} defaultArtwork={presentation.defaultArtwork} />
          {<div className={styles.artCards}>
            {[
              ['Kreativ istehsal', '0% 0%', styles.creativeCard, '/services'],
              ['Rəqəmsal marketinq', '100% 0%', styles.digitalCard, '/services'],
              ['Brend strategiyası', '0% 100%', styles.brandCard, '/services'],
              ['Video istehsalı', '100% 100%', styles.videoCard, '/portfolio#videos'],
            ].map(([title, position, className, href]) => <a className={`${styles.artCard} ${className}`} key={title} href={href}><i className={styles.cardVisual} style={{ backgroundPosition: position }} aria-hidden="true" /><span>{title}</span><ArrowRight size={19} /></a>)}
          </div>}
        </div>
        <div id="home-content" className={styles.heroCopy} tabIndex={-1}>
          <div className={styles.eyebrow}>B2B MARKETİNQ &amp; KREATİV AGENTLİYİ</div>
          <h1>{heroTitle === 'Növbəti Era Buradan Başlayır.' ? <>Növbəti Era<br /><span>Buradan<br />Başlayır.</span></> : heroTitle}</h1>
          <p>{heroDescription}</p>
          <div className={styles.ctas}><a className={styles.primary} href={presentation.cta}>{heroCtaText}<ArrowRight size={20} /></a><a className={styles.secondary} href={showSection('portfolio') ? '#portfolio' : '/portfolio'}>İşlərimizə baxın <Play size={14} /></a></div>
        </div>
        {showSection('services') && <div className={styles.servicePanel}>
          <a className={styles.panelHeading} href="#services"><small>NƏ ETDİYİMİZ</small><strong>Xidmətlərimiz</strong></a>
          {([
            ['Kreativ həllər', 'Fərqlənən ideyalar', Lightbulb],
            ['Rəqəmsal marketinq', 'Daha çox görünürlük', BarChart3],
            ['Brend strategiyası', 'Davamlı inkişaf', ImageIcon],
            ['Tam layihə dəstəyi', 'İdeyadan nəticəyə', UsersRound],
          ] as const).map(([title, description, Icon]) => <a className={styles.panelService} key={title} href="/services"><Icon size={27} strokeWidth={1.25} /><strong>{title}</strong><span>{description}</span></a>)}
          <a className={styles.panelArrow} href="/services" aria-label="Bütün xidmətlər"><ArrowRight size={23} /></a>
        </div>}
        <a className={styles.scrollHint} href={showSection('services') ? '#services' : showSection('portfolio') ? '#portfolio' : '#analysis'}><span>Daha çox kəşf et</span><i aria-hidden="true" /></a>
      </section>

      {showSection('services') && <section id="services" data-presentation className="section container servicesSection">
        <div className="sectionIntro"><div><div className="eyebrow">XİDMƏTLƏRİMİZ</div><h2>{section('services')?.title || <>Brendinizi <span>böyütmək üçün.</span></>}</h2></div><p>{section('services')?.description || 'Strategiyadan kreativ istehsala, rəqəmsal marketinqdən veb həllərə qədər bütün əsas istiqamətləri bir komandada idarə edirik.'}</p></div>
        <div className="serviceGrid">{services.map(([title, desc, Icon])=><a className="serviceCard" href="/services" key={title}><div className="serviceIcon"><Icon size={21}/></div><h3>{title}</h3><p>{desc}</p></a>)}</div>
        <a className="outlineBtn" href="/services">Bütün xidmətlərə bax <ArrowRight size={16}/></a>
      </section>}

      {showSection('portfolio') !== false && <section id="portfolio" data-presentation data-free-scroll className="section portfolioSection">
        <div className="container">
          <div className="sectionIntro"><div><div className="eyebrow">İŞLƏRİMİZ</div><h2>{section('portfolio')?.title || <>İdeyadan <span>nəticəyə.</span></>}</h2></div><p>{section('portfolio')?.description || 'Fərqli sahələrdə həyata keçirdiyimiz brend, kreativ və rəqəmsal işlərdən seçilmiş nümunələr.'}</p></div>
          <div className="agencyPortfolioGrid">{portfolio.map((item) => (
            <a className="agencyPortfolioCard" href={('itemId' in item && typeof item.itemId === 'string' && item.itemId) ? `/portfolio/${encodeURIComponent(item.itemId)}` : '/portfolio'} key={item.image}>
              <div className="agencyPortfolioImage"><img src={item.image.startsWith('/') || item.image.startsWith('http') ? item.image : `/portfolio/${item.image}.jpg`} alt={item.title} loading="lazy" decoding="async"/><span>{item.service}</span></div>
              <div className="agencyPortfolioBody"><div><strong>{item.title}</strong><small>{item.client}</small></div><ArrowRight size={17}/><p>{item.text}</p></div>
            </a>
          ))}</div>
          <a className="outlineBtn" href="/portfolio">Bütün işlərimizə bax <ArrowRight size={16}/></a>
        </div>
      </section>}

      {showSection('how') && <section id="how" data-presentation className="howSection"><div className="container howBox"><div className="howVisual"><div className="howArt" style={section('how')?.image?.url ? ({ backgroundImage: `url(${section('how')?.image?.url})` } as React.CSSProperties) : undefined}/><div className="eyebrow">NECƏ İŞLƏYİR</div><h2>{section('how')?.title || <>Biznesiniz üçün <span>vahid komanda.</span></>}</h2><p>{section('how')?.description || 'Brief-dən strategiyaya, kreativdən icraya qədər layihəni New Era idarə edir.'}</p></div><div className="steps"><div><b>01</b><span>Məqsədi paylaşın</span><small>Biznesinizi, hədəfinizi və ehtiyacınızı bizə danışın.</small></div><div><b>02</b><span>Strategiya quraq</span><small>Uyğun istiqaməti və kreativ həlli birlikdə müəyyənləşdirək.</small></div><div><b>03</b><span>İcra edək</span><small>New Era komandası işi həyata keçirir və nəticəni təqdim edir.</small></div><a className="stepArrow" href="/start-project">→</a></div></div></section>}

      {showSection('about') && <section id="about" data-presentation className="finalCta container"><div className="eyebrow">NEW ERA YANAŞMASI</div><h2>{aboutTitle}</h2><p>{aboutDescription}</p></section>}

      <section id="analysis" data-presentation className="analysisTeaser"><div className="container analysisTeaserInner"><div><div className="eyebrow">BİZNES AUDİT</div><h2>Biznesinizi daha dərindən <span>anlamaq üçün.</span></h2><p>Qısa sorğunu cavablandırın. New Era ekspertləri məlumatları real insan baxışı ilə təhlil edib nəticələri və inkişaf təkliflərini e-poçtunuza göndərəcək.</p></div><a className="secondary" href="/analysis">Biznes Auditə keçin <ArrowRight size={16}/></a></div></section>

      <footer className="footer container"><a className="brand" href="#top"><img src="/new-era-logo.png" alt={cms?.siteName || 'New Era'} /></a><span>B2B marketinq və kreativ tərəfdaşlıq.</span><span>© 2026 New Era</span></footer>
    </main>
  );
}
