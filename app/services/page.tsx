import Link from 'next/link';

const services = [
  { slug:'graphic-design', title:'Qrafik dizayn', text:'Sosial paylaşımlar, kampaniya vizualları, qablaşdırma və çap.', tags:['Sosial paylaşımlar','Kampaniyalar','Qablaşdırma'] },
  { slug:'branding', title:'Brendinq', text:'Kimlik sistemləri, art-direksiya və yadda qalan brend dünyaları.', tags:['Kimlik','Art-direksiya','Təlimatlar'] },
  { slug:'video-motion', title:'Video və Motion', text:'Reklam videoları, reels, montaj və motion qrafika.', tags:['Reklam','Reels','Motion'] },
  { slug:'photography', title:'Fotoqrafiya', text:'Məhsul, moda, lifestyle və kampaniya fotoqrafiyası.', tags:['Məhsul','Moda','Kampaniya'] },
  { slug:'social-media', title:'Sosial media', text:'Strategiya, məzmun sistemləri və auditoriya artımı.', tags:['Strategiya','Məzmun','Artım'] },
  { slug:'web-design', title:'Veb dizayn', text:'Konversiya üçün hazırlanmış premium rəqəmsal təcrübələr.', tags:['UX/UI','Landing səhifələr','E-ticarət'] },
  { slug:'development', title:'Proqramlaşdırma', text:'Vebsaytlar, platformalar və xüsusi rəqəmsal məhsullar.', tags:['Next.js','Platformalar','İnteqrasiyalar'] },
  { slug:'marketing-seo', title:'Marketinq və SEO', text:'Artım, reklam, analitika və axtarış optimizasiyası.', tags:['Reklam','SEO','Analitika'] },
];

export default function ServicesPage(){
  return <main className="innerPage"><div className="container innerHero"><Link className="back" href="/">← New Era</Link><div className="eyebrow">NEW ERA XİDMƏTLƏR ALƏMİ</div><h1>Məqsədi seçin.<br/><span>İstedadla tanış olun.</span></h1><p>Xidmətlə başlayın, sonra vizyonunuza uyğun üsluba sahib mütəxəssisləri kəşf edin.</p></div><div className="container serviceList">{services.map((s,i)=><Link href={`/creators?service=${s.slug}`} className="serviceRow" key={s.slug}><span className="serviceNumber">0{i+1}</span><div><h2>{s.title}</h2><p>{s.text}</p><div className="tagLine">{s.tags.map(t=><span key={t}>{t}</span>)}</div></div><span className="rowArrow">↗</span></Link>)}</div></main>
}
