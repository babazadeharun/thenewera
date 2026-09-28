import Link from 'next/link';

const services = [
  { slug:'graphic-design', title:'Graphic Design', text:'Social posts, campaign visuals, packaging and print.', tags:['Social posts','Campaigns','Packaging'] },
  { slug:'branding', title:'Branding', text:'Identity systems, art direction and memorable brand worlds.', tags:['Identity','Art direction','Guidelines'] },
  { slug:'video-motion', title:'Video & Motion', text:'Commercials, reels, editing and motion graphics.', tags:['Commercial','Reels','Motion'] },
  { slug:'photography', title:'Photography', text:'Product, fashion, lifestyle and campaign photography.', tags:['Product','Fashion','Campaign'] },
  { slug:'social-media', title:'Social Media', text:'Strategy, content systems and community growth.', tags:['Strategy','Content','Growth'] },
  { slug:'web-design', title:'Web Design', text:'Premium digital experiences built for conversion.', tags:['UX/UI','Landing pages','E-commerce'] },
  { slug:'development', title:'Development', text:'Websites, platforms and custom digital products.', tags:['Next.js','Platforms','Integrations'] },
  { slug:'marketing-seo', title:'Marketing & SEO', text:'Growth, advertising, analytics and search.', tags:['Ads','SEO','Analytics'] },
];

export default function ServicesPage(){
  return <main className="innerPage"><div className="container innerHero"><Link className="back" href="/">← New Era</Link><div className="eyebrow">THE NEW ERA SERVICE UNIVERSE</div><h1>Choose the mission.<br/><span>Meet the talent.</span></h1><p>Start with a service, then explore the specialists whose style matches your vision.</p></div><div className="container serviceList">{services.map((s,i)=><Link href={`/creators?service=${s.slug}`} className="serviceRow" key={s.slug}><span className="serviceNumber">0{i+1}</span><div><h2>{s.title}</h2><p>{s.text}</p><div className="tagLine">{s.tags.map(t=><span key={t}>{t}</span>)}</div></div><span className="rowArrow">↗</span></Link>)}</div></main>
}
