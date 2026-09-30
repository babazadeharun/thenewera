import Link from 'next/link';

export default function AnalysisPage(){
  return <main className="innerPage analysisPage">
    <div className="container innerHero"><Link className="back" href="/">← New Era</Link><div className="eyebrow">ANALİZ</div><h1>Biznesiniz üçün <span>strateji.</span></h1><p>Analiz bölməsi gələcəkdə biznes məlumatlarının strukturlaşdırılması və New Era ekspertlərinin baxışı üçün istifadə olunacaq.</p></div>
    <section className="container analysisStructure">
      <article><b>01</b><h2>Biznes konteksti</h2><p>Sahə, məqsədlər, auditoriya və mövcud vəziyyət üçün struktur.</p></article>
      <article><b>02</b><h2>Marketinq mənzərəsi</h2><p>Brend, kommunikasiya, rəqəmsal kanallar və əsas inkişaf istiqamətləri.</p></article>
      <article><b>03</b><h2>Ekspert baxışı</h2><p>Gələcək mərhələdə New Era komandası tərəfindən hazırlanacaq analiz və tövsiyələr üçün struktur.</p></article>
    </section>
    <div className="container analysisNotice"><strong>Bu bölmə hazırda aktiv analiz xidməti deyil.</strong><span>Struktur gələcək funksionallıq üçün hazırlanıb.</span></div>
  </main>;
}
