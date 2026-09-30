import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const projects = [
  { image:'lumiere', title:'Lumière', client:'Lumière Cosmetics', service:'Brendinq', text:'Premium gözəllik brendi üçün vizual kimlik, art-direksiya və kampaniya istiqaməti.' },
  { image:'nova', title:'Nova Tech', client:'Nova Tech', service:'Rəqəmsal marketinq', text:'Texnologiya brendi üçün rəqəmsal kommunikasiya və məhsul təqdimat kampaniyası.' },
  { image:'pulse', title:'Pulse Campaign', client:'Pulse', service:'Sosial media', text:'Kampaniya konsepti, məzmun sistemi və sosial media üçün kreativ istehsal.' },
  { image:'velora', title:'Velora', client:'Velora', service:'Brendinq', text:'Brend kimliyi, vizual sistem və bütün əsas kommunikasiya tətbiqləri.' },
  { image:'orbit', title:'Orbit Digital', client:'Orbit', service:'Rəqəmsal', text:'Premium rəqəmsal məhsul üçün UX, vizual dil və veb təcrübə.' },
  { image:'aurora', title:'Aurora Fashion', client:'Aurora', service:'Kreativ kampaniya', text:'Moda brendi üçün kampaniya konsepti, art-direksiya və vizual istehsal.' },
  { image:'eclipse', title:'Eclipse Magazine', client:'Eclipse', service:'Kreativ dizayn', text:'Redaksiya art-direksiyası və premium çap kommunikasiya sistemi.' },
  { image:'solace', title:'Solace Wellness', client:'Solace', service:'Sosial media', text:'Wellness brendi üçün məzmun istiqaməti və rəqəmsal kommunikasiya sistemi.' },
];

export default function PortfolioPage(){
  return <main className="innerPage agencyPortfolioPage">
    <div className="container innerHero"><Link className="back" href="/">← New Era</Link><div className="eyebrow">İŞLƏRİMİZ</div><h1>İdeyadan <span>nəticəyə.</span></h1><p>New Era tərəfindən həyata keçirilən brendinq, kreativ, marketinq və rəqəmsal layihələrdən seçilmiş nümunələr.</p></div>
    <section className="container agencyPortfolioGrid portfolioPageGrid">{projects.map((p)=><article className="agencyPortfolioCard" key={p.image}><div className="agencyPortfolioImage"><img src={`/portfolio/${p.image}.jpg`} alt={p.title}/><span>{p.service}</span></div><div className="agencyPortfolioBody"><div><strong>{p.title}</strong><small>{p.client}</small></div><ArrowRight size={17}/><p>{p.text}</p></div></article>)}</section>
    <section className="container finalCta portfolioCta"><div className="eyebrow">NÖVBƏTİ LAYİHƏ</div><h2>İdeyanızı <span>birlikdə</span> həyata keçirək.</h2><p>Biznes məqsədinizi paylaşın, New Era sizin üçün uyğun strategiya və kreativ istiqaməti hazırlasın.</p><Link className="primary" href="/start-project">Layihəyə başla <ArrowRight size={17}/></Link></section>
  </main>;
}
