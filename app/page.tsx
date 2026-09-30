import { prisma } from '@/lib/prisma';
import { ArrowRight, BarChart3, Camera, Code2, Layers3, Megaphone, Palette, Play, Search, Sparkles, Target, Video, Zap } from 'lucide-react';

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

const portfolio = [
  { image: 'lumiere', title: 'Lumière', client: 'Lumière Cosmetics', service: 'Brendinq', text: 'Premium gözəllik brendi üçün vizual kimlik və kampaniya istiqaməti.' },
  { image: 'nova', title: 'Nova Tech', client: 'Nova Tech', service: 'Rəqəmsal marketinq', text: 'Texnologiya brendi üçün rəqəmsal kommunikasiya və kampaniya sistemi.' },
  { image: 'pulse', title: 'Pulse Campaign', client: 'Pulse', service: 'Sosial media', text: 'Kampaniya konsepti, məzmun sistemi və sosial media vizualları.' },
  { image: 'velora', title: 'Velora', client: 'Velora', service: 'Brendinq', text: 'Brend kimliyi, art-direksiya və tətbiqetmə sistemi.' },
  { image: 'orbit', title: 'Orbit Digital', client: 'Orbit', service: 'Rəqəmsal', text: 'Müasir rəqəmsal məhsul üçün premium vizual və UX istiqaməti.' },
  { image: 'aurora', title: 'Aurora Fashion', client: 'Aurora', service: 'Kreativ kampaniya', text: 'Moda brendi üçün kampaniya vizualları və yaradıcı istiqamət.' },
];

export default async function Home() {
  const cms = await prisma.siteSetting.findUnique({ where: { id: 'main' }, include: { logoMedia: true } }).catch(() => null);
  const sections = await prisma.homepageSection.findMany({ include: { image: true }, orderBy: { displayOrder: 'asc' } }).catch(() => []);
  const section = (key: string) => sections.find((item) => item.key === key);
  const showSection = (key: string) => section(key)?.enabled !== false;
  const heroes = await prisma.hero.findMany({ where: { active: true }, include: { desktopMedia: true, mobileMedia: true, videoMedia: true }, orderBy: { displayOrder: 'asc' }, take: 10 }).catch(() => []);
  const hero = heroes[0];
  const heroImage = hero?.desktopMedia?.url || cms?.heroImage || '/hero-space-4k.png';
  const heroTitle = hero?.title && !['New Era Hero', 'New Era', 'Növbəti Era Buradan Başlayır.'].includes(hero.title) ? hero.title : 'Növbəti Era Buradan Başlayır.';
  const heroDescription = hero?.description && !['Find the right creative for your next big idea. From design to development, connect with top talent in Azerbaijan.', 'Find the right creative for your next big idea. From design to development, connect with top talent in Azerbaijan'].includes(hero.description.trim())
    ? hero.description
    : 'Brendiniz üçün strategiyanı, kreativ ideyanı və rəqəmsal icranı bir komandada birləşdiririk.';
  const heroCtaText = hero?.ctaText === 'Create Client Account' ? 'Layihəyə başla' : (hero?.ctaText || 'Layihəyə başla');

  return (
    <main>
      <section id="top" className="hero screenshotHero">
        <nav className="nav container">
          <a className="brand" href="#top"><img src="/new-era-logo-header.png" alt={cms?.siteName || 'New Era'} /></a>
          <div className="navLinks">
            <a className="active" href="#top">Ana səhifə</a>
            <a href="#services">Xidmətlər</a>
            <a href="#portfolio">İşlərimiz</a>
            <a href="#about">Haqqımızda</a>
            <a href="#analysis">Analiz</a>
            <a href="/start-project">Layihəyə başla</a>
          </div>
          <div className="navActions"><button className="iconBtn" aria-label="Axtarış"><Search size={19}/></button><a href="/login" className="login">Daxil ol</a><a href="/register" className="pill">Hesab yarat</a></div>
        </nav>
        <div className="heroArt" aria-hidden="true" style={{ ['--hero-desktop' as string]: `url(${heroImage})`, ['--hero-mobile' as string]: `url(${hero?.mobileMedia?.url || heroImage})` } as React.CSSProperties}>
          {hero?.videoMedia?.url && <video className="heroVideo" src={hero.videoMedia.url} autoPlay muted loop playsInline aria-hidden="true" />}
        </div>
        <div className="stars" />
        <div className="container heroInner">
          <div className="eyebrow">B2B MARKETİNQ &amp; KREATİV AGENTLİYİ</div>
          <h1>{hero ? (heroTitle === 'Növbəti Era Buradan Başlayır.' ? <>Növbəti Era<br/><span>Buradan Başlayır.</span></> : heroTitle) : <>Növbəti Era<br/><span>Buradan Başlayır.</span></>}</h1>
          <p>{heroDescription}</p>
          <div className="heroCtas"><a className="primary" href="/start-project">{heroCtaText} <ArrowRight size={17}/></a><a className="secondary" href="#portfolio">İşlərimizə baxın</a></div>
          <div className="proof proofStatement"><div className="proofIcon"><Zap size={16}/></div><div><strong>Strategiya · Kreativ · Rəqəmsal</strong><small>Biznesiniz üçün vahid marketinq tərəfdaşı</small></div></div>
        </div>
        <div className="scrollHint">Aşağı sürüşdür <span>↓</span></div>
      </section>

      {showSection('services') && <section id="services" className="section container servicesSection">
        <div className="sectionIntro"><div><div className="eyebrow">XİDMƏTLƏRİMİZ</div><h2>Brendinizi <span>böyütmək üçün.</span></h2></div><p>Strategiyadan kreativ istehsala, rəqəmsal marketinqdən veb həllərə qədər bütün əsas istiqamətləri bir komandada idarə edirik.</p></div>
        <div className="serviceGrid">{services.map(([title, desc, Icon])=><a className="serviceCard" href="/services" key={title}><div className="serviceIcon"><Icon size={21}/></div><h3>{title}</h3><p>{desc}</p></a>)}</div>
        <a className="outlineBtn" href="/services">Bütün xidmətlərə bax <ArrowRight size={16}/></a>
      </section>}

      {showSection('portfolio') !== false && <section id="portfolio" className="section portfolioSection">
        <div className="container">
          <div className="sectionIntro"><div><div className="eyebrow">İŞLƏRİMİZ</div><h2>İdeyadan <span>nəticəyə.</span></h2></div><p>Fərqli sahələrdə həyata keçirdiyimiz brend, kreativ və rəqəmsal işlərdən seçilmiş nümunələr.</p></div>
          <div className="agencyPortfolioGrid">{portfolio.map((item)=><a className="agencyPortfolioCard" href="/portfolio" key={item.image}><div className="agencyPortfolioImage"><img src={`/portfolio/${item.image}.jpg`} alt={item.title}/><span>{item.service}</span></div><div className="agencyPortfolioBody"><div><strong>{item.title}</strong><small>{item.client}</small></div><ArrowRight size={17}/><p>{item.text}</p></div></a>)}</div>
          <a className="outlineBtn" href="/portfolio">Bütün işlərimizə bax <ArrowRight size={16}/></a>
        </div>
      </section>}

      {showSection('how') && <section id="how" className="howSection"><div className="container howBox"><div className="howVisual"><div className="howArt" style={section('how')?.image?.url ? ({ backgroundImage: `url(${section('how')?.image?.url})` } as React.CSSProperties) : undefined}/><div className="eyebrow">NECƏ İŞLƏYİR</div><h2>Biznesiniz üçün <span>vahid komanda.</span></h2><p>Brief-dən strategiyaya, kreativdən icraya qədər layihəni New Era idarə edir.</p></div><div className="steps"><div><b>01</b><span>Məqsədi paylaşın</span><small>Biznesinizi, hədəfinizi və ehtiyacınızı bizə danışın.</small></div><div><b>02</b><span>Strategiya quraq</span><small>Uyğun istiqaməti və kreativ həlli birlikdə müəyyənləşdirək.</small></div><div><b>03</b><span>İcra edək</span><small>New Era komandası işi həyata keçirir və nəticəni təqdim edir.</small></div><a className="stepArrow" href="/start-project">→</a></div></div></section>}

      {showSection('about') && <section id="about" className="finalCta container"><div className="eyebrow">NEW ERA YANAŞMASI</div><h2>Creator axtarmayın.<br/><span>New Era ilə işləyin.</span></h2><p>Layihəniz üçün müxtəlif peşəkarları ayrı-ayrılıqda idarə etmək əvəzinə, strategiyadan kreativ istehsala qədər bütün prosesi vahid tərəfdaş kimi bizə həvalə edin.</p><a className="primary" href="/start-project">Layihəyə başlayın <ArrowRight size={17}/></a></section>}

      <section id="analysis" className="analysisTeaser"><div className="container analysisTeaserInner"><div><div className="eyebrow">ANALİZ</div><h2>Biznesinizi daha dərindən <span>anlamaq üçün.</span></h2><p>Gələcəkdə bu bölmədə biznesinizə dair məlumatları toplamaq və ekspert baxışı üçün strukturlaşdırılmış analiz prosesi yerləşəcək.</p></div><span className="analysisStatus">Hazırlanır</span></div></section>

      <footer className="footer container"><a className="brand" href="#top"><img src="/new-era-logo-header.png" alt={cms?.siteName || 'New Era'} /></a><span>B2B marketinq və kreativ tərəfdaşlıq.</span><span>© 2026 New Era</span></footer>
    </main>
  );
}
