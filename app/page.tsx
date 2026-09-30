import { prisma } from '@/lib/prisma';
import { ArrowRight, Camera, Code2, Layers3, Megaphone, Palette, Play, Search, Sparkles, Star, Video, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

const services = [
  ['Qrafik dizayn','Loqolar, sosial media, çap və daha çoxu',Palette],
  ['Video montajı','Brendiniz üçün cəlbedici videolar',Play],
  ['Fotoqrafiya','Peşəkar çəkilişlər, real təsir',Camera],
  ['Sosial media','Strategiya, məzmun və idarəetmə',Megaphone],
  ['Brendinq','Yadda qalan brend kimliyi yaradın',Layers3],
  ['Veb dizayn','Müasir, adaptiv və rahat istifadə',Code2],
  ['Proqramlaşdırma','Veb və mobil həllər',Zap],
  ['Marketinq və SEO','Görünürlüğünüzü və nəticələrinizi artırın',Sparkles],
] as const;

const creators = [
  {name:'Aysel M.',role:'Qrafik dizayner',meta:'4.9 (28 rəy)',projects:'12 layihə',image:'/creator-presets/graphic-designer.jpg'},
  {name:'Rashad A.',role:'Video montaj mütəxəssisi',meta:'4.8 (24 rəy)',projects:'18 layihə',image:'/creator-presets/videographer.jpg'},
  {name:'Leyla Q.',role:'SMM mütəxəssisi',meta:'4.9 (32 rəy)',projects:'21 layihə',image:'/creator-presets/smm-specialist.jpg'},
  {name:'Tural S.',role:'Veb proqramçı',meta:'4.7 (19 rəy)',projects:'14 layihə',image:'/creator-presets/web-developer.jpg'},
  {name:'Nigar R.',role:'Brendinq mütəxəssisi',meta:'4.8 (26 rəy)',projects:'16 layihə',image:'/creator-presets/branding-specialist.jpg'},
];

export default async function Home() {
  const cms = await prisma.siteSetting.findUnique({ where: { id: 'main' }, include: { logoMedia: true } }).catch(() => null);
  const sections = await prisma.homepageSection.findMany({ include: { image: true }, orderBy: { displayOrder: 'asc' } }).catch(() => []);
  const section = (key: string) => sections.find((item) => item.key === key);
  const showSection = (key: string) => section(key)?.enabled !== false;
  const sectionCopy = (key: string, fallbackTitle: React.ReactNode, fallbackDescription: string) => {
    const item = section(key);
    const englishTitles: Record<string,string[]> = {
      services: ['Services', 'Everything You Need, Under One Universe.'],
      creators: ['Creators', 'The Best Talent. Real Results.'],
      how: ['How It Works', 'From Brief to Result'],
      about: ['About', 'The Right Talent for Your Idea.'],
    };
    const englishDescriptions: Record<string,string[]> = {
      services: ['From creative design to digital growth, we bring together the best specialists for your project.'],
      creators: ['Meet our selected specialists and find the right fit for your project.'],
      how: ['Complete your project in a few simple steps.'],
      about: ['Choose your specialist, manage the project inside New Era and turn your idea into reality.'],
    };
    const title = item?.title && !englishTitles[key]?.includes(item.title) ? item.title : fallbackTitle;
    const description = item?.description && !englishDescriptions[key]?.includes(item.description) ? item.description : fallbackDescription;
    return { title, description };
  };
  const servicesCopy = sectionCopy('services', <>Lazım olan hər şey,<br/><span>bir platformada.</span></>, 'Kreativ dizayndan rəqəmsal inkişafadək layihəniz üçün ən yaxşı mütəxəssisləri bir araya gətiririk.');
  const creatorsCopy = sectionCopy('creators', <>Ən yaxşı istedad. <span>Real nəticələr.</span></>, 'Seçilmiş mütəxəssislərimizlə tanış olun. Portfolio işlərinə baxın, üslubları müqayisə edin və layihəniz üçün uyğun şəxsi seçin.');
  const howCopy = sectionCopy('how', 'Brief-dən nəticəyə', 'Layihənizi bir neçə sadə addımla tamamlayın.');
  const aboutCopy = sectionCopy('about', <>Sizin ideyanız üçün<br/><span>doğru istedad.</span></>, 'Mütəxəssisinizi seçin, layihəni New Era daxilində idarə edin və ideyanızı reallığa çevirin.');
  const heroes = await prisma.hero.findMany({ where: { active: true }, include: { desktopMedia: true, mobileMedia: true, videoMedia: true }, orderBy: { displayOrder: 'asc' }, take: 10 }).catch(() => []);
  const hero = heroes[0];
  const heroImage = hero?.desktopMedia?.url || cms?.heroImage || '/hero-space-4k.png';
  const heroTitle = hero?.title === 'New Era Hero' ? 'Növbəti Era Buradan Başlayır.' : (hero?.title || 'Növbəti Era Buradan Başlayır.');
  const heroDescription = hero?.description === 'Find the right creative for your next big idea. From design to development, connect with top talent in Azerbaijan.'
    ? 'Növbəti böyük ideyanız üçün doğru kreativ mütəxəssisi tapın. Dizayndan proqramlaşdırmaya qədər Azərbaycanın ən yaxşı istedadları ilə əlaqə qurun.'
    : (hero?.description || 'Növbəti böyük ideyanız üçün doğru kreativ mütəxəssisi tapın. Dizayndan proqramlaşdırmaya qədər Azərbaycanın ən yaxşı istedadları ilə əlaqə qurun.');
  const heroCtaText = hero?.ctaText === 'Create Client Account' ? 'Müştəri hesabı yarat' : (hero?.ctaText || 'Müştəri hesabı yarat');
  return (
    <main>
      <section id="top" className="hero screenshotHero">
        <nav className="nav container">
        <a className="brand" href="#top"><img src={"/new-era-logo-header.png"} alt={cms?.siteName || "New Era"} /></a>
        <div className="navLinks">
          <a className="active" href="#top">Ana səhifə</a><a href="#services">Xidmətlər</a><a href="#creators">Mütəxəssislər</a><a href="#portfolio">Portfel</a><a href="#about">Haqqımızda</a><a href="#how">Necə işləyir</a><a href="#pricing">Qiymətlər</a>
        </div>
        <div className="navActions"><button className="iconBtn" aria-label="Axtarış"><Search size={19}/></button><a href="/login" className="login">Daxil ol</a><a href="/register" className="pill">Hesab yarat</a></div>
      </nav>
        <div className="heroArt" aria-hidden="true" style={{ ["--hero-desktop" as string]: `url(${heroImage})`, ["--hero-mobile" as string]: `url(${hero?.mobileMedia?.url || heroImage})` } as React.CSSProperties}>
          {hero?.videoMedia?.url && <video className="heroVideo" src={hero.videoMedia.url} autoPlay muted loop playsInline aria-hidden="true" />}
        </div>
        <div className="stars" />
        <div className="container heroInner">
          <div className="eyebrow">KREATİV İSTEDAD PLATFORMASI</div>
          <h1>{hero ? (heroTitle === 'Növbəti Era Buradan Başlayır.' ? <>Növbəti Era<br/><span>Buradan Başlayır.</span></> : heroTitle) : <>Növbəti Era<br/><span>Buradan Başlayır.</span></>}</h1>
          <p>{heroDescription}</p>
          <div className="heroCtas"><a className="primary" href={hero?.ctaUrl || "/register"}>{heroCtaText} <ArrowRight size={17}/></a><a className="secondary" href="#creators">Mütəxəssislərlə tanış olun</a></div>
          <div className="proof"><div className="avatars">{creators.slice(0,4).map((c,i)=><img key={c.name} src={c.image} alt="" style={{zIndex:10-i}}/>)}</div><div><strong>500+ məmnun müştəri</strong><small>Azərbaycan üzrə</small></div></div>
        </div>
        <div className="scrollHint">Aşağı sürüşdür <span>↓</span></div>
      </section>

      {showSection('services') && <section id="services" className="section container servicesSection">
        <div className="sectionIntro"><div><div className="eyebrow">XİDMƏTLƏRİ KƏŞF EDİN</div><h2>{servicesCopy.title}</h2></div><p>{servicesCopy.description}</p></div>
        <div className="serviceGrid">{services.map(([title,desc,Icon])=><a className="serviceCard" href="/creators" key={title}><div className="serviceIcon"><Icon size={21}/></div><h3>{title}</h3><p>{desc}</p></a>)}</div>
        <a className="outlineBtn" href="/services">Bütün xidmətlərə bax <ArrowRight size={16}/></a>
      </section>}

      {showSection('creators') && <section id="creators" className="section creatorsSection"><div className="container"><div className="sectionIntro creatorIntro"><div><div className="eyebrow">SEÇİLMİŞ MÜTƏXƏSSİSLƏR</div><h2>{creatorsCopy.title}</h2><p className="introCopy">{creatorsCopy.description}</p></div><div className="filters"><span className="selected">Hamısı</span><span>Dizayn</span><span>Video</span><span>SMM</span><span>Proqramlaşdırma</span><span>Marketinq</span></div></div>
        <div className="creatorGrid">{creators.map((c)=><article className="creatorCard" key={c.name}><div className="portrait"><img src={c.image} alt=""/><span className="portraitBadge">◉</span></div><div className="creatorBody"><div className="creatorHead"><div><h3>{c.name}</h3><p>{c.role}</p></div><ArrowRight size={15}/></div><div className="creatorMeta"><span><Star size={12} fill="currentColor"/> {c.meta}</span><span>{c.projects}</span></div><a className="profileBtn" href={`/creators/${c.name.toLowerCase().replace(/[^a-z]+/g,"-").replace(/(^-|-$)/g,"")}`}>Profilə bax</a></div></article>)}</div>
      </div></section>}

      {showSection('how') && <section id="how" className="howSection"><div className="container howBox"><div className="howVisual"><div className="howArt" style={section('how')?.image?.url ? ({ backgroundImage: `url(${section('how')?.image?.url})` } as React.CSSProperties) : undefined}/><div className="eyebrow">NECƏ İŞLƏYİR</div><h2>{howCopy.title}</h2><p>{howCopy.description}</p></div><div className="steps"><div><b>✎</b><span>1. Xidmət seçin</span><small>Nəyə ehtiyacınız olduğunu seçin</small></div><div><b>♧</b><span>2. Mütəxəssis seçin</span><small>Portfolio və rəylərə baxın</small></div><div><b>◉</b><span>3. Layihəyə başlayın</span><small>Müzakirə edin, yaradın, nəticə əldə edin</small></div><a className="stepArrow" href="/start-project">→</a></div></div></section>}

      {showSection('about') && <section id="about" className="finalCta container"><div className="eyebrow">NEW ERA STANDARTI</div><h2>{aboutCopy.title}</h2><p>{aboutCopy.description}</p><a className="primary" href="/start-project">Başlayın <ArrowRight size={17}/></a></section>}
      <footer id="contact" className="footer container"><a className="brand" href="#top"><img src={"/new-era-logo-header.png"} alt={cms?.siteName || "New Era"} /></a><span>Kreativ istedad, bir platformada.</span><span>© 2026 New Era</span></footer>
    </main>
  );
}
