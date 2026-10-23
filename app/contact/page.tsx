import Link from 'next/link';
import QuickRequest from './QuickRequest';
import '../product-experience.css';
export const metadata = {title:'Biznes ehtiyacınızı paylaşın | NEW ERA'};
export default async function Contact({searchParams}:{searchParams:Promise<{need?:string}>}) {
 const {need}=await searchParams;
 return <main className="productPage"><div className="productWrap"><Link href="/">← NEW ERA</Link><header className="productIntro"><span className="productKicker">İLK ADDIM</span><h1>Məqsədinizi paylaşın.<br/><em>Uyğun yolu birlikdə seçək.</em></h1><p>Satış, marketinq və işlərin idarə edilməsində əsas ehtiyacınızı bizə bildirin.</p></header><div className="productColumns"><QuickRequest initialNeed={need} responseText={process.env.CONTACT_RESPONSE_TEXT || undefined}/><aside className="productPanel"><h2>Sonra nə olacaq?</h2><ol><li>Müraciətiniz NEW ERA komandasına çatacaq.</li><li>Qeyd etdiyiniz əlaqə vasitəsi ilə ehtiyacınızı dəqiqləşdirəcəyik.</li><li>Uyğun olduqda iş həcmi və qiyməti olan təklif hazırlayacağıq.</li></ol><p>Ətraflı layihə brifinə hazırsınız?</p><Link href="/start-project?brief=1">Müştəri hesabı ilə brif göndər →</Link></aside></div><section id="data-use" className="productPanel"><h2>Əlaqə məlumatlarınız necə istifadə olunur?</h2><p>Adınız, əlaqə məlumatınız və seçdiyiniz ehtiyac müraciəti cavablandırmaq üçün NEW ERA-nın məhdud girişli Satış CRM sistemində saxlanılır. Bu razılıq reklam abunəliyi yaratmır.</p><p>Məlumatınızın düzəldilməsi və ya silinməsi üçün əlaqə saxladığımız kanaldan komandaya müraciət edə bilərsiniz.</p></section></div></main>;
}
