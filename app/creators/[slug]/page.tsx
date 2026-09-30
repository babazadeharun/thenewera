import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Clock3, FolderOpen, MessageCircle, ShieldCheck, Star } from 'lucide-react';

const creators: Record<string, any> = {
  'aysel-m': { name:'Aysel M.', role:'Qrafik dizayner', label:'KREATİV DİZAYNER', preset:'graphic-designer', rating:'4.9', rəy:28, projects:32, years:'5+', bio:'İdeyaları güclü vizual kimliklərə, kampaniyalara və sosial media təcrübələrinə çevirirəm. Fokusum təmiz sistemlər, cəsarətli art-direksiya və sizə məxsus hiss olunan dizayndır.', specialties:['Qrafik dizayn','Brendinq','Sosial media','Loqo dizaynı'], available:true, works:[
    ['lumiere','Lumière Cosmetics','Brendinq','2026','Kimlik sistemi, qablaşdırma istiqaməti və təqdimat vizualları.'],
    ['nova','Nova Tech','Sosial media','2026','Texnologiya brendi üçün premium sosial media kampaniya sistemi.'],
    ['velora','Velora','Loqo dizaynı','2025','Loqo konseptləri və dəqiqləşdirilmiş vizual kimlik.'],
    ['eclipse','Eclipse Magazine','Çap','2025','Redaksiya art-direksiyası və premium çap tərtibatı.'],
    ['aurora','Aurora Fashion','Brendinq','2024','Premium qablaşdırma və brend tətbiqetmə sistemi.'],
    ['pulse','Pulse Campaign','Sosial media','2024','Kampaniya vizualları və motion üçün hazır sosial media şablonları.'],
    ['orbit','Orbit Digital','UI/UX','2024','Müasir rəqəmsal məhsul üçün vizual dil.'],
    ['solace','Solace Wellness','Kampaniya','2023','Wellness kampaniyası üçün art-direksiya və kreativ sistem.'],
  ]},
  'rashad-a': { name:'Rashad A.', role:'Rejissor / Videoqraf', label:'VİZUAL HEKAYƏÇİ', preset:'videographer', rating:'4.8', rəy:24, projects:18, years:'6+', bio:'Güclü ritm, işıq və emosiyaya əsaslanan reklam filmləri, sosial media videoları və kinematoqrafik məhsul hekayələri.', specialties:['Reklam videosu','Reels','Məhsul videosu','Montaj'], available:true, works:[['nova','Nova Tech Film','Reklam videosu','2026','Kinematoqrafik məhsul filmi.'],['pulse','Pulse Motion','Sosial media videosu','2026','Kampaniya montajları və qısa formatlı videolar.'],['lumiere','Lumière Film','Məhsul filmi','2025','Premium gözəllik məhsulu çəkilişi.'],['orbit','Orbit Launch','Brend filmi','2025','Rəqəmsal platforma üçün təqdimat hekayəsi.']]},
  'leyla-q': { name:'Leyla Q.', role:'Brend dizayneri', label:'BREND MÜTƏXƏSSİSİ', preset:'branding-specialist', rating:'4.9', rəy:32, projects:21, years:'5+', bio:'Şirkəti ilk təmasdan etibarən formalaşmış və peşəkar göstərən brend kimlikləri, art-direksiya və vizual sistemlər.', specialties:['Brendinq','Kimlik','Art-direksiya','Qablaşdırma'], available:true, works:[['velora','Velora Identity','Brendinq','2026','Kimlik sistemi və art-direksiya.'],['aurora','Aurora Fashion','Qablaşdırma','2025','Premium qablaşdırma sistemi.'],['lumiere','Lumière','Brendinq','2025','Gözəllik brendi üçün vizual kimlik.'],['eclipse','Eclipse','Redaksiya','2024','Redaksiya vizual kimliyi.']]},
  'tural-s': { name:'Tural S.', role:'Veb proqramçı', label:'RƏQƏMSAL YARADICI', preset:'web-developer', rating:'4.7', rəy:19, projects:14, years:'7+', bio:'Sürət, konversiya, miqyaslana bilən arxitektura və premium qarşılıqlı əlaqə dizaynına fokuslanan müasir veb məhsullar.', specialties:['Next.js','Veb tətbiqlər','E-ticarət','İnteqrasiyalar'], available:true, works:[['orbit','Orbit Platform','Proqramlaşdırma','2026','Yüksək performanslı məhsul platforması.'],['nova','Nova Commerce','E-ticarət','2025','Konversiyaya fokuslanan onlayn mağaza.'],['pulse','Pulse Dashboard','Veb tətbiq','2025','Əməliyyat idarəetmə paneli.'],['solace','Solace Web','Veb dizayn','2024','Premium sağlamlıq və rifah vebsaytı.']]},
  'nigar-r': { name:'Nigar R.', role:'Sosial media strateqi', label:'ARTIM KREATİVİ', preset:'marketing-specialist', rating:'4.9', rəy:21, projects:26, years:'4+', bio:'Kreativ istiqaməti ölçülə bilən artımla birləşdirən sosial media strategiyası, məzmun planlaması və kampaniya sistemləri.', specialties:['Sosial strategiya','Məzmun','Kampaniyalar','Artım'], available:true, works:[['pulse','Pulse Campaign','Sosial media','2026','Kampaniya sistemi və məzmun təqvimi.'],['solace','Solace Wellness','Sosial media','2025','Artıma fokuslanan məzmun istiqaməti.'],['nova','Nova Tech','Kampaniya','2025','Məhsul təqdimat kampaniyası.'],['lumiere','Lumière','Sosial media','2024','Gözəllik brendi üçün sosial media strategiyası.']]},
};

export default async function CreatorProfile({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const creator=creators[slug] ?? creators['aysel-m'];
  return <main className="profilePage">
    <nav className="nav container profileNav"><Link className="brand" href="/"><img src="/new-era-logo-header.png" alt="New Era"/></Link><div className="navLinks"><Link href="/">Ana səhifə</Link><Link href="/services">Xidmətlər</Link><Link className="active" href="/creators">Mütəxəssislər</Link><Link href="/creators">Portfel</Link><Link href="/">Haqqımızda</Link><Link href="/">Necə işləyir</Link><Link href="/">Qiymətlər</Link></div><div className="navActions"><span className="profileLogin">Daxil ol</span><Link href="/start-project" className="pill">Başlayın</Link></div></nav>

    <section className="cleanProfileHero">
      <div className="cleanProfileGlow"/>
      <div className="container cleanProfileInner">
        <Link href="/creators" className="profileBack"><ArrowLeft size={15}/> Mütəxəssislərə qayıt</Link>
        <div className="cleanProfileMain v10ProfileMain">
          <div className="cleanIdentity v10Identity">
            <div className="cleanAvatar"><img src={`/creator-presets/${creator.preset}.jpg`} alt=""/><span><ShieldCheck size={14}/></span></div>
            <div className="cleanIdentityCopy v10IdentityCopy">
              <div className="eyebrow">{creator.label}</div>
              <h1>{creator.name}<b><Check size={12}/></b></h1>
              <div className="cleanRole">{creator.role} <i/> New Era mütəxəssisi</div>
              <p>{creator.bio}</p>
              <div className="cleanTags">{creator.specialties.map((s:string)=><span key={s}>{s}</span>)}</div>
            </div>
          </div>
          <aside className="cleanProfileSide v10ProfileSide">
            <div className="cleanAvailability v10Availability"><i/>{creator.available?'Layihələr üçün əlçatandır':'Hazırda məşğuldur'}</div>
            <div className="cleanStats v10Stats">
              <div><Star/><strong>{creator.rating}</strong><small>{creator.rəy} rəy</small></div>
              <div><FolderOpen/><strong>{creator.projects}</strong><small>Layihə</small></div>
              <div><Clock3/><strong>{creator.years}</strong><small>Təcrübə</small></div>
            </div>
            <Link href={`/start-project?creator=${slug}`} className="primary cleanProjectBtn">Layihəyə başlayın <ArrowRight size={16}/></Link>
            <div className="v10SideTitle">{creator.name.toUpperCase()} İLƏ LAYİHƏ</div><small className="privateNote"><ShieldCheck size={13}/> Ünsiyyət və layihənin təhvil prosesi New Era daxilində qalır.</small>
          </aside>
        </div>
      </div>
    </section>

    <div className="container profileTabs"><span>Ümumi baxış</span><span className="active">Portfel</span><span>Rəylər</span><span>Xidmətlər</span></div>

    <section className="container profilePortfolio cleanPortfolio">
      <div className="portfolioHeading"><div><div className="eyebrow">SEÇİLMİŞ İŞLƏR</div><h2>{creator.name} — <span>Portfel.</span></h2><p>New Era tərəfindən seçilmiş və idarə olunan layihələr.</p></div><div className="portfolioFilters"><span className="active">Hamısı</span><span>Brendinq</span><span>Sosial media</span><span>Çap</span><span>UI/UX</span></div></div>
      <div className="portfolioGrid">{creator.works.map((w:string[],i:number)=><article className="portfolioCard cleanPortfolioCard" key={w[0]}><Link href={`/creators/${slug}?project=${w[0]}`}><div className="portfolioImage"><img src={`/portfolio/${w[0]}.jpg`} alt=""/><span>{w[2]}</span><b><ArrowRight size={16}/></b></div><div className="portfolioCardBody"><strong>{w[1]}</strong><small>{w[3]}</small><p>{w[4]}</p></div></Link></article>)}</div>
    </section>

    <section className="container profileBottom cleanBottom"><div><div className="eyebrow">HAZIRSINIZ?</div><h2>İdeyanız var?<br/><span>Birlikdə reallaşdıraq.</span></h2><p>Bu mütəxəssisi seçin və layihəyə New Era üzərindən başlayın. Birbaşa əlaqə məlumatları paylaşılmır.</p></div><Link href={`/start-project?creator=${slug}`} className="primary">Layihəyə başlayın <ArrowRight size={16}/></Link></section>
    <footer className="footer container"><Link className="brand" href="/"><img src="/new-era-logo-header.png" alt="New Era"/></Link><span>Kreativ istedad, bir platformada.</span><span>© 2026 New Era</span></footer>
  </main>
}
