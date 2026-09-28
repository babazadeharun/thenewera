import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Clock3, FolderOpen, MessageCircle, ShieldCheck, Star } from 'lucide-react';

const creators: Record<string, any> = {
  'aysel-m': { name:'Aysel M.', role:'Graphic Designer', label:'CREATIVE DESIGNER', preset:'graphic-designer', rating:'4.9', reviews:28, projects:32, years:'5+', bio:'I turn ideas into visually strong identities, campaigns and social experiences. My focus is clean systems, bold art direction and design that feels unmistakably yours.', specialties:['Graphic Design','Branding','Social Media','Logo Design'], available:true, works:[
    ['lumiere','Lumière Cosmetics','Branding','2026','Identity system, packaging direction and launch visuals.'],
    ['nova','Nova Tech','Social Media','2026','A premium social campaign system for a technology brand.'],
    ['velora','Velora','Logo Design','2025','Logo exploration and a refined visual identity.'],
    ['eclipse','Eclipse Magazine','Print','2025','Editorial art direction and premium print layout.'],
    ['aurora','Aurora Fashion','Branding','2024','Luxury packaging and brand application system.'],
    ['pulse','Pulse Campaign','Social Media','2024','Campaign visuals and motion-ready social templates.'],
    ['orbit','Orbit Digital','UI/UX','2024','Visual language for a modern digital product.'],
    ['solace','Solace Wellness','Campaign','2023','Wellness campaign art direction and creative system.'],
  ]},
  'rashad-a': { name:'Rashad A.', role:'Filmmaker / Videographer', label:'VISUAL STORYTELLER', preset:'videographer', rating:'4.8', reviews:24, projects:18, years:'6+', bio:'Commercial films, social-first video and cinematic product stories built around strong pacing, light and emotion.', specialties:['Commercial Video','Reels','Product Film','Editing'], available:true, works:[['nova','Nova Tech Film','Commercial Video','2026','Cinematic product film.'],['pulse','Pulse Motion','Social Video','2026','Campaign edits and short-form cuts.'],['lumiere','Lumière Film','Product Film','2025','Premium beauty product production.'],['orbit','Orbit Launch','Brand Film','2025','Launch story for a digital platform.']]},
  'leyla-q': { name:'Leyla Q.', role:'Brand Designer', label:'BRAND SPECIALIST', preset:'branding-specialist', rating:'4.9', reviews:32, projects:21, years:'5+', bio:'Brand identities, art direction and visual systems that make companies feel established from the first touchpoint.', specialties:['Branding','Identity','Art Direction','Packaging'], available:true, works:[['velora','Velora Identity','Branding','2026','Identity system and art direction.'],['aurora','Aurora Fashion','Packaging','2025','Luxury packaging system.'],['lumiere','Lumière','Branding','2025','Beauty brand identity.'],['eclipse','Eclipse','Editorial','2024','Editorial identity.']]},
  'tural-s': { name:'Tural S.', role:'Web Developer', label:'DIGITAL BUILDER', preset:'web-developer', rating:'4.7', reviews:19, projects:14, years:'7+', bio:'Modern web products with a focus on speed, conversion, scalable architecture and premium interaction design.', specialties:['Next.js','Web Apps','E-commerce','Integrations'], available:true, works:[['orbit','Orbit Platform','Development','2026','High-performance product platform.'],['nova','Nova Commerce','E-commerce','2025','Conversion-focused storefront.'],['pulse','Pulse Dashboard','Web App','2025','Operations dashboard.'],['solace','Solace Web','Web Design','2024','Premium wellness website.']]},
  'nigar-r': { name:'Nigar R.', role:'Social Media Strategist', label:'GROWTH CREATIVE', preset:'marketing-specialist', rating:'4.9', reviews:21, projects:26, years:'4+', bio:'Social strategy, content planning and campaign systems that connect creative direction with measurable growth.', specialties:['Social Strategy','Content','Campaigns','Growth'], available:true, works:[['pulse','Pulse Campaign','Social Media','2026','Campaign system and content calendar.'],['solace','Solace Wellness','Social Media','2025','Growth-led content direction.'],['nova','Nova Tech','Campaign','2025','Product launch campaign.'],['lumiere','Lumière','Social Media','2024','Beauty social strategy.']]},
};

export default async function CreatorProfile({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const creator=creators[slug] ?? creators['aysel-m'];
  return <main className="profilePage">
    <nav className="nav container profileNav"><Link className="brand" href="/"><img src="/new-era-logo.svg" alt="New Era"/></Link><div className="navLinks"><Link href="/">Home</Link><Link href="/services">Services</Link><Link className="active" href="/creators">Creators</Link><Link href="/creators">Portfolio</Link><Link href="/">About</Link><Link href="/">How It Works</Link><Link href="/">Pricing</Link></div><div className="navActions"><span className="profileLogin">Log In</span><Link href="/start-project" className="pill">Get Started</Link></div></nav>

    <section className="cleanProfileHero">
      <div className="cleanProfileGlow"/>
      <div className="container cleanProfileInner">
        <Link href="/creators" className="profileBack"><ArrowLeft size={15}/> Back to Creators</Link>
        <div className="cleanProfileMain v10ProfileMain">
          <div className="cleanIdentity v10Identity">
            <div className="cleanAvatar"><img src={`/creator-presets/${creator.preset}.jpg`} alt=""/><span><ShieldCheck size={14}/></span></div>
            <div className="cleanIdentityCopy v10IdentityCopy">
              <div className="eyebrow">{creator.label}</div>
              <h1>{creator.name}<b><Check size={12}/></b></h1>
              <div className="cleanRole">{creator.role} <i/> New Era Specialist</div>
              <p>{creator.bio}</p>
              <div className="cleanTags">{creator.specialties.map((s:string)=><span key={s}>{s}</span>)}</div>
            </div>
          </div>
          <aside className="cleanProfileSide v10ProfileSide">
            <div className="cleanAvailability v10Availability"><i/>{creator.available?'Available for projects':'Currently booked'}</div>
            <div className="cleanStats v10Stats">
              <div><Star/><strong>{creator.rating}</strong><small>{creator.reviews} reviews</small></div>
              <div><FolderOpen/><strong>{creator.projects}</strong><small>Projects</small></div>
              <div><Clock3/><strong>{creator.years}</strong><small>Experience</small></div>
            </div>
            <Link href={`/start-project?creator=${slug}`} className="primary cleanProjectBtn">Start a Project <ArrowRight size={16}/></Link>
            <div className="v10SideTitle">PROJECT WITH {creator.name.toUpperCase()}</div><small className="privateNote"><ShieldCheck size={13}/> Communication and project delivery stay inside New Era.</small>
          </aside>
        </div>
      </div>
    </section>

    <div className="container profileTabs"><span>Overview</span><span className="active">Portfolio</span><span>Reviews</span><span>Services</span></div>

    <section className="container profilePortfolio cleanPortfolio">
      <div className="portfolioHeading"><div><div className="eyebrow">SELECTED WORK</div><h2>{creator.name}'s <span>Portfolio.</span></h2><p>Curated projects published and managed by New Era.</p></div><div className="portfolioFilters"><span className="active">All</span><span>Branding</span><span>Social Media</span><span>Print</span><span>UI/UX</span></div></div>
      <div className="portfolioGrid">{creator.works.map((w:string[],i:number)=><article className="portfolioCard cleanPortfolioCard" key={w[0]}><Link href={`/creators/${slug}?project=${w[0]}`}><div className="portfolioImage"><img src={`/portfolio/${w[0]}.jpg`} alt=""/><span>{w[2]}</span><b><ArrowRight size={16}/></b></div><div className="portfolioCardBody"><strong>{w[1]}</strong><small>{w[3]}</small><p>{w[4]}</p></div></Link></article>)}</div>
    </section>

    <section className="container profileBottom cleanBottom"><div><div className="eyebrow">READY TO CREATE?</div><h2>Have a vision?<br/><span>Let's build it.</span></h2><p>Choose this specialist and start the project through New Era. No direct contact details are shared.</p></div><Link href={`/start-project?creator=${slug}`} className="primary">Start a Project <ArrowRight size={16}/></Link></section>
    <footer className="footer container"><Link className="brand" href="/"><img src="/new-era-logo.svg" alt="New Era"/></Link><span>Creative talent, connected.</span><span>© 2026 New Era</span></footer>
  </main>
}
