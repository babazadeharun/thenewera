import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Məlumatların silinməsi | NEW ERA Workspace',
  description: 'NEW ERA Workspace və Instagram, Facebook Messenger, WhatsApp inteqrasiyalarına aid məlumatların silinməsini necə tələb etmək olar.',
};

export default function DataDeletionPage() {
  return (
    <>
      <p className="neLegalEyebrow">Hesab və sosial inteqrasiyalar</p>
      <h1>Məlumatların silinməsi</h1>
      <p className="neLegalUpdated">Son yenilənmə: 24 oktyabr 2026</p>
      <p>Bu təlimat NEW ERA Workspace-də saxlanmış hesab və CRM məlumatlarına, o cümlədən Instagram, Facebook Messenger və WhatsApp Business bağlantıları ilə alınan məlumatlara aiddir.</p>

      <h2>1. Sosial bağlantını dayandırmaq</h2>
      <ol>
        <li>NEW ERA hesabınıza daxil olun, Workspace-də müvafiq şirkəti seçin.</li>
        <li>Ayarlar → Sosial hesablarınız bölməsində hesabın yanındakı <strong>Ayır</strong> düyməsini seçib əməliyyatı təsdiqləyin. Şirkətin ayarlarını idarə etmək icazəsi tələb olunur.</li>
        <li>İstəsəniz Instagram/Facebook hesabınızın tətbiq və sayt icazələri bölməsində də NEW ERA Workspace tətbiqinin icazəsini ləğv edin. Bölmənin adı platforma və dilə görə dəyişə bilər.</li>
      </ol>
      <p className="neLegalCallout"><strong>Bağlantını ayırmaq məlumatların silinməsi demək deyil.</strong> Yeni qəbul və göndəriş dayanır, saxlanmış giriş tokeni silinir. Əvvəldən CRM-də olan yazışmalar və müştəri qeydləri ayrıca silinmə müraciəti tələb edir.</p>

      <h2>2. Saxlanmış məlumatların silinməsini tələb etmək</h2>
      <p>Hesabınıza daxil ola bilməsəniz də <a href="mailto:hello@thenewera.space?subject=NEW%20ERA%20-%20M%C9%99lumatlar%C4%B1n%20silinm%C9%99si">hello@thenewera.space</a> ünvanına <strong>“NEW ERA — Məlumatların silinməsi”</strong> mövzusu ilə yazın. Müraciətdə bunları göstərin:</p>
      <ul>
        <li>NEW ERA hesabınızın e-poçtu və əlaqə üçün adınız.</li>
        <li>Aidiyyəti Workspace/şirkətin adı.</li>
        <li>Sosial məlumatlar üçün kanal və hesabın istifadəçi adı, səhifə adı və ya biznes telefon nömrəsi.</li>
        <li>Nəyi silmək istədiyiniz: müəyyən yazışma, sosial hesabla əlaqəli bütün məlumatlar, şəxsi hesab və ya şirkət məlumatları.</li>
      </ul>
      <p>Əgər şirkətlə Instagram/Messenger/WhatsApp üzərindən yazışan şəxs kimi müraciət edirsinizsə, NEW ERA hesabınızın olması tələb olunmur. Yazışdığınız biznesi, kanalı və yazışmanı tapmağa kömək edən məlumatı bildirin. Şifrə, giriş tokeni, birdəfəlik kod və ya bank kartı məlumatı göndərməyin.</p>

      <h2>3. Müraciətin yoxlanması və nəticə</h2>
      <p>Başqasının məlumatlarının silinməsinin qarşısını almaq üçün hesab və ya məlumat üzərində səlahiyyəti yoxlayırıq. Workspace başqa şirkətə aiddirsə, onun səlahiyyətli nümayəndəsi ilə müraciəti əlaqələndirə bilərik. Təsdiqdən sonra uyğun hesab/bağlantı, mesaj mətni, platforma identifikatorları və əlaqəli CRM məlumatları üzrə silinmə və ya şəxsiyyətsizləşdirmə aparılır; nəticə əlaqə e-poçtunuza bildirilir.</p>
      <p>Hüquqi saxlanma öhdəliyi, təhlükəsizlik və ya mübahisə ilə bağlı müəyyən qeydlər saxlanmalı olarsa, səbəb və əhatə barədə məlumat veririk. Ehtiyat nüsxələrdə qalan məlumatlar həmin nüsxələrin saxlanma dövrü ərzində aradan qalxır. Sorğu üzrə gözlənilən tamamlanma vaxtı yoxlamadan sonra sizə bildirilir.</p>
      <p>Bu proses NEW ERA-da saxlanmış məlumatlara aiddir. Instagram, Facebook və WhatsApp-ın özündə saxlanan məlumatların silinməsi ayrıca həmin platformada idarə olunur.</p>

      <h2>4. Xidmət sahibi</h2>
      <p>“NEAGENCY” Məhdud Məsuliyyətli Cəmiyyəti, VÖEN: 7002625441. Hüquqi ünvan: AZ5200, Salyan rayonu, Salyan şəhəri, Ə.Hüseynov, ev 8. NEW ERA xidmətin brend adıdır. Əlaqə: <a href="mailto:hello@thenewera.space">hello@thenewera.space</a>.</p>
      <p>Əlavə məlumat: <Link href="/privacy">Məxfilik siyasəti</Link>.</p>
    </>
  );
}
