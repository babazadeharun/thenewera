import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const services = [
  { slug:'branding', title:'Brendinq', text:'Brend strategiyası, vizual kimlik, art-direksiya və tətbiqetmə sistemi.', tags:['Strategiya','Kimlik','Art-direksiya'] },
  { slug:'creative-design', title:'Kreativ dizayn', text:'Kampaniya vizualları, sosial media, reklam materialları və kreativ konseptlər.', tags:['Kampaniya','Sosial media','Reklam'] },
  { slug:'video-motion', title:'Video və Motion', text:'Reklam videoları, məhsul çəkilişləri, reels, montaj və motion qrafika.', tags:['Reklam','Çəkiliş','Motion'] },
  { slug:'photography', title:'Fotoqrafiya', text:'Məhsul, moda, lifestyle və kampaniya üçün peşəkar foto istehsalı.', tags:['Məhsul','Lifestyle','Kampaniya'] },
  { slug:'social-media', title:'Sosial media', text:'Strategiya, məzmun sistemləri, kreativ istehsal və davamlı kommunikasiya.', tags:['Strategiya','Məzmun','Kreativ'] },
  { slug:'digital-marketing', title:'Rəqəmsal marketinq', text:'Performans kampaniyaları, reklam, analitika və rəqəmsal böyümə.', tags:['Reklam','Performans','Analitika'] },
  { slug:'web-design', title:'Veb və rəqəmsal', text:'Konversiya yönümlü premium vebsaytlar, platformalar və rəqəmsal məhsullar.', tags:['UX/UI','Veb','Platforma'] },
  { slug:'marketing-strategy', title:'Marketinq strategiyası', text:'Məqsəd, auditoriya, mövqeləndirmə və artım üçün vahid strategiya.', tags:['Strategiya','Auditoriya','Artım'] },
];

export default function ServicesPage(){
  return <main className="innerPage"><div className="container innerHero"><Link className="back" href="/">← New Era</Link><div className="eyebrow">NEW ERA XİDMƏTLƏRİ</div><h1>Biznesiniz üçün <span>vahid marketinq tərəfdaşı.</span></h1><p>Strategiyadan kreativ istehsala və rəqəmsal icraya qədər əsas marketinq istiqamətlərini bir komanda kimi idarə edirik.</p></div><div className="container serviceList">{services.map((s,i)=><Link href="/start-project" className="serviceRow" key={s.slug}><span className="serviceNumber">0{i+1}</span><div><h2>{s.title}</h2><p>{s.text}</p><div className="tagLine">{s.tags.map(t=><span key={t}>{t}</span>)}</div></div><ArrowRight className="rowArrow" size={18}/></Link>)}</div><section className="container finalCta"><div className="eyebrow">NÖVBƏTİ ADDIM</div><h2>Layihənizi <span>danışaq.</span></h2><p>Məqsədinizi və ehtiyacınızı paylaşın. New Era sizin üçün uyğun istiqaməti formalaşdırsın.</p><Link className="primary" href="/start-project">Layihəyə başla <ArrowRight size={17}/></Link></section></main>
}
