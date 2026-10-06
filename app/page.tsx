import { prisma } from '@/lib/prisma';
import { ArrowRight, BarChart3, Code2, Layers3, Megaphone, Palette, Search, Sparkles, Target, Video } from 'lucide-react';

export const dynamic = 'force-dynamic';

const services = [
  ['Brendinq', 'Brend strategiyasÄ±, vizual kimlik vÉ™ art-direksiya', Layers3],
  ['Kreativ dizayn', 'Kampaniya vizuallarÄ±, sosial media vÉ™ reklam materiallarÄ±', Palette],
  ['Video vÉ™ foto', 'Reklam Ã§É™kiliÅŸlÉ™ri, mÉ™hsul, lifestyle vÉ™ motion mÉ™zmun', Video],
  ['Sosial media', 'Strategiya, mÉ™zmun sistemi vÉ™ davamlÄ± kommunikasiya', Megaphone],
  ['RÉ™qÉ™msal marketinq', 'Kampaniyalar, performans vÉ™ rÉ™qÉ™msal bÃ¶yÃ¼mÉ™', BarChart3],
  ['Veb vÉ™ rÉ™qÉ™msal', 'Premium vebsaytlar, platformalar vÉ™ rÉ™qÉ™msal mÉ™hsullar', Code2],
  ['Reklam kampaniyalarÄ±', 'Ä°deyadan kreativ istehsala vÉ™ media aktivlÉ™ÅŸdirmÉ™sinÉ™ qÉ™dÉ™r', Target],
  ['Marketinq strategiyasÄ±', 'MÉ™qsÉ™d, auditoriya, mÃ¶vqelÉ™ndirmÉ™ vÉ™ artÄ±m istiqamÉ™ti', Sparkles],
] as const;

const fallbackPortfolio = [
  { image: 'lumiere', title: 'LumiÃ¨re', client: 'LumiÃ¨re Cosmetics', service: 'Brendinq', text: 'Premium gÃ¶zÉ™llik brendi Ã¼Ã§Ã¼n vizual kimlik vÉ™ kampaniya istiqamÉ™ti.' },
  { image: 'nova', title: 'Nova Tech', client: 'Nova Tech', service: 'RÉ™qÉ™msal marketinq', text: 'Texnologiya brendi Ã¼Ã§Ã¼n rÉ™qÉ™msal kommunikasiya vÉ™ kampaniya sistemi.' },
  { image: 'pulse', title: 'Pulse Campaign', client: 'Pulse', service: 'Sosial media', text: 'Kampaniya konsepti, mÉ™zmun sistemi vÉ™ sosial media vizuallarÄ±.' },
  { image: 'velora', title: 'Velora', client: 'Velora', service: 'Brendinq', text: 'Brend kimliyi, art-direksiya vÉ™ tÉ™tbiqetmÉ™ sistemi.' },
  { image: 'orbit', title: 'Orbit Digital', client: 'Orbit', service: 'RÉ™qÉ™msal', text: 'MÃ¼asir rÉ™qÉ™msal mÉ™hsul Ã¼Ã§Ã¼n premium vizual vÉ™ UX istiqamÉ™ti.' },
  { image: 'aurora', title: 'Aurora Fashion', client: 'Aurora', service: 'Kreativ kampaniya', text: 'Moda brendi Ã¼Ã§Ã¼n kampaniya vizuallarÄ± vÉ™ yaradÄ±cÄ± istiqamÉ™t.' },
];

export default async function Home() {
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
    client: meta.client || 'New Era layihÉ™si',
    service: meta.category || 'Portfolio',
    text: meta.description || 'New Era tÉ™rÉ™findÉ™n hÉ™yata keÃ§irilmiÅŸ kreativ vÉ™ marketinq iÅŸi.',
    itemId: meta.itemId,
  }));
  const portfolio = dynamicPortfolio.length ? dynamicPortfolio : fallbackPortfolio;
  const section = (key: string) => sections.find((item) => item.key === key);
  const showSection = (key: string) => section(key)?.enabled !== false;
  const heroes = await prisma.hero.findMany({ where: { active: true }, include: { desktopMedia: true, mobileMedia: true, videoMedia: true }, orderBy: { displayOrder: 'asc' }, take: 10 }).catch(() => []);
  const hero = heroes[0];
  const heroImage = hero?.desktopMedia?.url || cms?.heroImage || '/hero-space-4k.png';
  const heroTitle = hero?.title && !['New Era Hero', 'New Era', 'NÃ¶vbÉ™ti Era Buradan BaÅŸlayÄ±r.'].includes(hero.title) ? hero.title : 'NÃ¶vbÉ™ti Era Buradan BaÅŸlayÄ±r.';
  const heroDescription = hero?.description && !['Find the right creative for your next big idea. From design to development, connect with top talent in Azerbaijan.', 'Find the right creative for your next big idea. From design to development, connect with top talent in Azerbaijan'].includes(hero.description.trim())
    ? hero.description
    : 'Brendiniz Ã¼Ã§Ã¼n strategiyanÄ±, kreativ ideyanÄ± vÉ™ rÉ™qÉ™msal icranÄ± bir komandada birlÉ™ÅŸdiririk.';
  const heroCtaText = hero?.ctaText === 'Create Client Account' ? 'LayihÉ™yÉ™ baÅŸla' : (hero?.ctaText || 'LayihÉ™yÉ™ baÅŸla');

  return (
    <main>
      <section id="top" className="hero screenshotHero">
        <nav className="nav container">
          <a className="brand" href="#top"><img src="/new-era-logo.png" alt={cms?.siteName || 'New Era'} /></a>
          <div className="navLinks">
            <a className="active" href="#top">Ana sÉ™hifÉ™</a>
            <a href="#services">XidmÉ™tlÉ™r</a>
            <a href="#portfolio">Ä°ÅŸlÉ™rimiz</a>
            <a href="#about">HaqqÄ±mÄ±zda</a>
            <a href="/analysis">Analiz</a>
            <a href="/events">TÉ™dbirlÉ™r</a>
            <a href="/start-project">LayihÉ™yÉ™ baÅŸla</a>
          </div>
          <div className="navActions"><button className="iconBtn" aria-label="AxtarÄ±ÅŸ"><Search size={19}/></button><a href="/login" className="login">Daxil ol</a><a href="/register" className="pill">Hesab yarat</a></div>
        </nav>
        <div className="heroArt" aria-hidden="true" style={{ ['--hero-desktop' as string]: `url(${heroImage})`, ['--hero-mobile' as string]: `url(${hero?.mobileMedia?.url || heroImage})` } as React.CSSProperties}>
          {hero?.videoMedia?.url && <video className="heroVideo" src={hero.videoMedia.url} autoPlay muted loop playsInline aria-hidden="true" />}
        </div>
        <div className="stars" />
        <div className="container heroInner">
          <div className="eyebrow">B2B MARKETÄ°NQ &amp; KREATÄ°V AGENTLÄ°YÄ°</div>
          <h1>{hero ? (heroTitle === 'NÃ¶vbÉ™ti Era Buradan BaÅŸlayÄ±r.' ? <>NÃ¶vbÉ™ti Era<br/><span>Buradan BaÅŸlayÄ±r.</span></> : heroTitle) : <>NÃ¶vbÉ™ti Era<br/><span>Buradan BaÅŸlayÄ±r.</span></>}</h1>
          <p>{heroDescription}</p>
          <div className="heroCtas"><a className="primary" href="/start-project">{heroCtaText} <ArrowRight size={17}/></a><a className="secondary" href="#portfolio">Ä°ÅŸlÉ™rimizÉ™ baxÄ±n</a></div>
          <a className="auditCta auditCtaHero" href="/analysis"><span><strong>Biznes Audit</strong><small>Biznesiniz Ã¼Ã§Ã¼n real ekspert analizi vÉ™ tÉ™kliflÉ™r</small></span><ArrowRight size={18}/></a>
        </div>
        <div className="scrollHint">AÅŸaÄŸÄ± sÃ¼rÃ¼ÅŸdÃ¼r <span>â†“</span></div>
      </section>

      {showSection('services') && <section id="services" className="section container servicesSection">
        <div className="sectionIntro"><div><div className="eyebrow">XÄ°DMÆTLÆRÄ°MÄ°Z</div><h2>Brendinizi <span>bÃ¶yÃ¼tmÉ™k Ã¼Ã§Ã¼n.</span></h2></div><p>Strategiyadan kreativ istehsala, rÉ™qÉ™msal marketinqdÉ™n veb hÉ™llÉ™rÉ™ qÉ™dÉ™r bÃ¼tÃ¼n É™sas istiqamÉ™tlÉ™ri bir komandada idarÉ™ edirik.</p></div>
        <div className="serviceGrid">{services.map(([title, desc, Icon])=><a className="serviceCard" href="/services" key={title}><div className="serviceIcon"><Icon size={21}/></div><h3>{title}</h3><p>{desc}</p></a>)}</div>
        <a className="outlineBtn" href="/services">BÃ¼tÃ¼n xidmÉ™tlÉ™rÉ™ bax <ArrowRight size={16}/></a>
      </section>}

      {showSection('portfolio') !== false && <section id="portfolio" className="section portfolioSection">
        <div className="container">
          <div className="sectionIntro"><div><div className="eyebrow">Ä°ÅžLÆRÄ°MÄ°Z</div><h2>Ä°deyadan <span>nÉ™ticÉ™yÉ™.</span></h2></div><p>FÉ™rqli sahÉ™lÉ™rdÉ™ hÉ™yata keÃ§irdiyimiz brend, kreativ vÉ™ rÉ™qÉ™msal iÅŸlÉ™rdÉ™n seÃ§ilmiÅŸ nÃ¼munÉ™lÉ™r.</p></div>
          <div className="agencyPortfolioGrid">{portfolio.map((item) => (
            <a className="agencyPortfolioCard" href={('itemId' in item && item.itemId) ? `/portfolio/${encodeURIComponent(String(item.itemId))}` : '/portfolio'} key={item.image}>
              <div className="agencyPortfolioImage"><img src={item.image.startsWith('/') || item.image.startsWith('http') ? item.image : `/portfolio/${item.image}.jpg`} alt={item.title}/><span>{item.service}</span></div>
              <div className="agencyPortfolioBody"><div><strong>{item.title}</strong><small>{item.client}</small></div><ArrowRight size={17}/><p>{item.text}</p></div>
            </a>
          ))}</div>
          <a className="outlineBtn" href="/portfolio">BÃ¼tÃ¼n iÅŸlÉ™rimizÉ™ bax <ArrowRight size={16}/></a>
        </div>
      </section>}

      {showSection('how') && <section id="how" className="howSection"><div className="container howBox"><div className="howVisual"><div className="howArt" style={section('how')?.image?.url ? ({ backgroundImage: `url(${section('how')?.image?.url})` } as React.CSSProperties) : undefined}/><div className="eyebrow">NECÆ Ä°ÅžLÆYÄ°R</div><h2>Biznesiniz Ã¼Ã§Ã¼n <span>vahid komanda.</span></h2><p>Brief-dÉ™n strategiyaya, kreativdÉ™n icraya qÉ™dÉ™r layihÉ™ni New Era idarÉ™ edir.</p></div><div className="steps"><div><b>01</b><span>MÉ™qsÉ™di paylaÅŸÄ±n</span><small>Biznesinizi, hÉ™dÉ™finizi vÉ™ ehtiyacÄ±nÄ±zÄ± bizÉ™ danÄ±ÅŸÄ±n.</small></div><div><b>02</b><span>Strategiya quraq</span><small>UyÄŸun istiqamÉ™ti vÉ™ kreativ hÉ™lli birlikdÉ™ mÃ¼É™yyÉ™nlÉ™ÅŸdirÉ™k.</small></div><div><b>03</b><span>Ä°cra edÉ™k</span><small>New Era komandasÄ± iÅŸi hÉ™yata keÃ§irir vÉ™ nÉ™ticÉ™ni tÉ™qdim edir.</small></div><a className="stepArrow" href="/start-project">â†’</a></div></div></section>}

      {showSection('about') && <section id="about" className="finalCta container"><div className="eyebrow">NEW ERA YANAÅžMASI</div><h2>AyrÄ±-ayrÄ± podratÃ§Ä± axtarmayÄ±n.<br/><span>New Era ilÉ™ iÅŸlÉ™yin.</span></h2><p>LayihÉ™niz Ã¼Ã§Ã¼n mÃ¼xtÉ™lif peÅŸÉ™karlarÄ± ayrÄ±-ayrÄ±lÄ±qda idarÉ™ etmÉ™k É™vÉ™zinÉ™, strategiyadan kreativ istehsala qÉ™dÉ™r bÃ¼tÃ¼n prosesi vahid tÉ™rÉ™fdaÅŸ kimi bizÉ™ hÉ™valÉ™ edin.</p></section>}

      <section id="analysis" className="analysisTeaser"><div className="container analysisTeaserInner"><div><div className="eyebrow">BÄ°ZNES AUDÄ°T</div><h2>Biznesinizi daha dÉ™rindÉ™n <span>anlamaq Ã¼Ã§Ã¼n.</span></h2><p>QÄ±sa sorÄŸunu cavablandÄ±rÄ±n. New Era ekspertlÉ™ri mÉ™lumatlarÄ± real insan baxÄ±ÅŸÄ± ilÉ™ tÉ™hlil edib nÉ™ticÉ™lÉ™ri vÉ™ inkiÅŸaf tÉ™kliflÉ™rini e-poÃ§tunuza gÃ¶ndÉ™rÉ™cÉ™k.</p></div><a className="secondary" href="/analysis">Biznes AuditÉ™ keÃ§in <ArrowRight size={16}/></a></div></section>

      <footer className="footer container"><a className="brand" href="#top"><img src="/new-era-logo.png" alt={cms?.siteName || 'New Era'} /></a><span>B2B marketinq vÉ™ kreativ tÉ™rÉ™fdaÅŸlÄ±q.</span><span>Â© 2026 New Era</span></footer>
    </main>
  );
}



