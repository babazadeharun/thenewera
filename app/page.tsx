import { prisma } from '@/lib/prisma';
import { ArrowRight, Camera, Code2, Layers3, Megaphone, Palette, Play, Search, Sparkles, Star, Video, Zap } from 'lucide-react';

const services = [
  ['Graphic Design','Logos, social media, print and more',Palette],
  ['Video Editing','Engaging videos for your brand',Play],
  ['Photography','Professional shots, real impact',Camera],
  ['Social Media','Strategy, content, management',Megaphone],
  ['Branding','Build a lasting identity',Layers3],
  ['Web Design','Modern, responsive, user-friendly',Code2],
  ['Development','Web & mobile solutions',Zap],
  ['Marketing & SEO','Grow your presence, boost your results',Sparkles],
] as const;

const creators = [
  {name:'Aysel M.',role:'Graphic Designer',meta:'4.9 (28 reviews)',projects:'12 projects',image:'/creator-presets/graphic-designer.jpg'},
  {name:'Rashad A.',role:'Video Editor',meta:'4.8 (24 reviews)',projects:'18 projects',image:'/creator-presets/videographer.jpg'},
  {name:'Leyla Q.',role:'SMM Specialist',meta:'4.9 (32 reviews)',projects:'21 projects',image:'/creator-presets/smm-specialist.jpg'},
  {name:'Tural S.',role:'Web Developer',meta:'4.7 (19 reviews)',projects:'14 projects',image:'/creator-presets/web-developer.jpg'},
  {name:'Nigar R.',role:'Branding Specialist',meta:'4.8 (26 reviews)',projects:'16 projects',image:'/creator-presets/branding-specialist.jpg'},
];

export default async function Home() {
  const cms = await prisma.siteSetting.findUnique({ where: { id: 'main' }, include: { logoMedia: true } }).catch(() => null);
  const sections = await prisma.homepageSection.findMany({ include: { image: true }, orderBy: { displayOrder: 'asc' } }).catch(() => []);
  const section = (key: string) => sections.find((item) => item.key === key);
  const showSection = (key: string) => section(key)?.enabled !== false;
  const heroes = await prisma.hero.findMany({ where: { active: true }, include: { desktopMedia: true, mobileMedia: true, videoMedia: true }, orderBy: { displayOrder: 'asc' }, take: 10 }).catch(() => []);
  const hero = heroes[0];
  const heroImage = hero?.desktopMedia?.url || cms?.heroImage || '/hero-space-4k.png';
  const heroTitle = hero?.title || 'Your Vision.';
  const heroDescription = hero?.description || 'Find the right creative for your next big idea. From design to development, connect with top talent in Azerbaijan.';
  return (
    <main>
      <nav className="nav container">
        <a className="brand" href="#top"><img src={cms?.logoMedia?.url || "/new-era-logo.svg"} alt={cms?.siteName || "New Era"} /></a>
        <div className="navLinks">
          <a className="active" href="#top">Home</a><a href="#services">Services</a><a href="#creators">Creators</a><a href="#portfolio">Portfolio</a><a href="#about">About</a><a href="#how">How It Works</a><a href="#pricing">Pricing</a>
        </div>
        <div className="navActions"><button className="iconBtn" aria-label="Search"><Search size={19}/></button><a href="/login" className="login">Log In</a><a href="/register" className="pill">Create Account</a></div>
      </nav>

      <section id="top" className="hero screenshotHero">
        <div className="heroArt" aria-hidden="true" style={{ ["--hero-desktop" as string]: `url(${heroImage})`, ["--hero-mobile" as string]: `url(${hero?.mobileMedia?.url || heroImage})` } as React.CSSProperties}>
          {hero?.videoMedia?.url && <video className="heroVideo" src={hero.videoMedia.url} autoPlay muted loop playsInline aria-hidden="true" />}
        </div>
        <div className="stars" />
        <div className="container heroInner">
          <div className="eyebrow">CREATIVE TALENT MARKETPLACE</div>
          <h1>{hero ? <>{heroTitle}<br/><span>One New Era.</span></> : <>Your Vision.<br/>Their Talent.<br/><span>One New Era.</span></>}</h1>
          <p>{heroDescription}</p>
          <div className="heroCtas"><a className="primary" href={hero?.ctaUrl || "/register"}>{hero?.ctaText || "Create Client Account"} <ArrowRight size={17}/></a><a className="secondary" href="#creators">Meet Our Creators</a></div>
          <div className="proof"><div className="avatars">{creators.slice(0,4).map((c,i)=><img key={c.name} src={c.image} alt="" style={{zIndex:10-i}}/>)}</div><div><strong>500+ satisfied clients</strong><small>across Azerbaijan</small></div></div>
        </div>
        <div className="scrollHint">Scroll <span>↓</span></div>
      </section>

      {showSection('services') && <section id="services" className="section container servicesSection">
        <div className="sectionIntro"><div><div className="eyebrow">EXPLORE OUR SERVICES</div><h2>{section('services')?.title || <>Everything You Need,<br/><span>Under One Universe.</span></>}</h2></div><p>{section('services')?.description || 'From creative design to digital growth, we bring together the best specialists for your project.'}</p></div>
        <div className="serviceGrid">{services.map(([title,desc,Icon])=><a className="serviceCard" href="/creators" key={title}><div className="serviceIcon"><Icon size={21}/></div><h3>{title}</h3><p>{desc}</p></a>)}</div>
        <a className="outlineBtn" href="/services">View All Services <ArrowRight size={16}/></a>
      </section>}

      {showSection('creators') && <section id="creators" className="section creatorsSection"><div className="container"><div className="sectionIntro creatorIntro"><div><div className="eyebrow">FEATURED CREATORS</div><h2>{section('creators')?.title || <>Top Talent. <span>Real Results.</span></>}</h2><p className="introCopy">{section('creators')?.description || 'Meet some of our handpicked specialists. Browse their portfolios, compare styles, and choose the perfect fit for your project.'}</p></div><div className="filters"><span className="selected">All</span><span>Design</span><span>Video</span><span>SMM</span><span>Development</span><span>Marketing</span></div></div>
        <div className="creatorGrid">{creators.map((c)=><article className="creatorCard" key={c.name}><div className="portrait"><img src={c.image} alt=""/><span className="portraitBadge">◉</span></div><div className="creatorBody"><div className="creatorHead"><div><h3>{c.name}</h3><p>{c.role}</p></div><ArrowRight size={15}/></div><div className="creatorMeta"><span><Star size={12} fill="currentColor"/> {c.meta}</span><span>{c.projects}</span></div><a className="profileBtn" href={`/creators/${c.name.toLowerCase().replace(/[^a-z]+/g,"-").replace(/(^-|-$)/g,"")}`}>View Profile</a></div></article>)}</div>
      </div></section>}

      {showSection('how') && <section id="how" className="howSection"><div className="container howBox"><div className="howVisual"><div className="howArt" style={section('how')?.image?.url ? ({ backgroundImage: `url(${section('how')?.image?.url})` } as React.CSSProperties) : undefined}/><div className="eyebrow">HOW IT WORKS</div><h2>{section('how')?.title || 'From Brief to Brilliance'}</h2><p>{section('how')?.description || 'Get your project done in just a few simple steps.'}</p></div><div className="steps"><div><b>✎</b><span>1. Choose Service</span><small>Select what you need</small></div><div><b>♧</b><span>2. Pick a Creator</span><small>Browse portfolios & reviews</small></div><div><b>◉</b><span>3. Start Project</span><small>Discuss, create, get results</small></div><a className="stepArrow" href="/start-project">→</a></div></div></section>}

      {showSection('about') && <section id="about" className="finalCta container"><div className="eyebrow">THE NEW ERA STANDARD</div><h2>{section('about')?.title || <>Your vision deserves<br/><span>the right talent.</span></>}</h2><p>{section('about')?.description || 'Choose your specialist, keep the project inside New Era, and turn your idea into something real.'}</p><a className="primary" href="/start-project">Get Started <ArrowRight size={17}/></a></section>}
      <footer id="contact" className="footer container"><a className="brand" href="#top"><img src={cms?.logoMedia?.url || "/new-era-logo.svg"} alt={cms?.siteName || "New Era"} /></a><span>Creative talent, connected.</span><span>© 2026 New Era</span></footer>
    </main>
  );
}
