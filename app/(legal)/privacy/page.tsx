import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Məxfilik siyasəti | NEW ERA Workspace',
  description: 'NEW ERA Workspace-də hesab, CRM və Meta inteqrasiya məlumatlarının istifadəsi, saxlanması və silinməsi.',
};

export default function PrivacyPage() {
  return (
    <>
      <p className="neLegalEyebrow">NEW ERA Workspace</p>
      <h1>Məxfilik siyasəti</h1>
      <p className="neLegalUpdated">Son yenilənmə: 24 oktyabr 2026</p>
      <p>Bu siyasət thenewera.space üzərindən təqdim olunan NEW ERA Workspace, hesab qeydiyyatı və Workspace-in sosial hesab inteqrasiyalarına aiddir.</p>

      <h2>1. Xidmət sahibi və əlaqə</h2>
      <p>Xidmət sahibi “NEAGENCY” Məhdud Məsuliyyətli Cəmiyyətidir (VÖEN: 7002625441). NEW ERA xidmətin istifadə etdiyi brend adıdır. Hüquqi ünvan: AZ5200, Salyan rayonu, Salyan şəhəri, Ə.Hüseynov, ev 8. Məlumatların qorunması ilə bağlı əlaqə: <a href="mailto:hello@thenewera.space">hello@thenewera.space</a>.</p>

      <h2>2. Hansı məlumatları emal edirik?</h2>
      <ul>
        <li><strong>Hesab və şirkət:</strong> təqdim etdiyiniz ad, e-poçt, telefon, şirkət məlumatları, Workspace üzvlüyü və səlahiyyətlər; hesab təhlükəsizliyi üçün şifrə heşi, sessiya və təsdiq qeydləri.</li>
        <li><strong>CRM məlumatları:</strong> sizin və səlahiyyət verdiyiniz əməkdaşların daxil etdiyi müştəri əlaqələri, satışlar, tapşırıqlar, görüşlər, təkliflər, ödəniş qeydləri, qeydlər və fayllar.</li>
        <li><strong>Qoşulmuş Meta hesabları:</strong> icazə verdiyiniz Instagram peşəkar hesabının, Facebook səhifəsinin və ya WhatsApp Business hesabının identifikatoru, göstərilən adı, əlaqəli biznes/nömrə identifikatorları, giriş tokeni və icazənin etibarlılıq məlumatları.</li>
        <li><strong>Mesajlar:</strong> qoşulmuş hesaba çatdırılan yeni mətn mesajlarının mətni, göndərən və qəbul edən tərəfin platforma identifikatorları, WhatsApp üçün göndərənin telefon nömrəsi, mesaj identifikatoru və vaxtı; Workspace-dən göndərdiyiniz mətn cavabları və göndəriş statusları.</li>
        <li><strong>Texniki məlumatlar:</strong> xidmətin işləməsi və təhlükəsizliyi üçün sessiya məlumatları, əməliyyat/audit qeydləri və xəta məlumatları. Hostinq və əlaqəli xidmətlər texniki sorğu məlumatlarını, o cümlədən IP ünvanını emal edə bilər.</li>
      </ul>
      <p>Bu sosial inteqrasiya versiyası əvvəlki yazışma tarixçəsini və media fayllarını avtomatik idxal etmir. Instagram/Facebook şifrəniz rəsmi platformanın giriş pəncərəsində daxil edilir; NEW ERA həmin sosial hesab şifrəsini almır.</p>

      <h2>3. Məlumatları hansı məqsədlə istifadə edirik?</h2>
      <p>Məlumatlar hesabınızı və şirkətinizi idarə etmək, seçdiyiniz sosial hesabı düzgün Workspace-ə bağlamaq, yeni yazışmaları göstərmək, müştəri və satış qeydlərinə əlaqələndirmək, icazəli cavabları göndərmək, seçdiyiniz iş bölgüsü və xatırlatmaları yerinə yetirmək, giriş səlahiyyətlərini tətbiq etmək və texniki problemləri araşdırmaq üçün istifadə olunur.</p>
      <p>Instagram üçün <code>instagram_business_basic</code> qoşulan hesabı tanımaq və göstərmək, <code>instagram_business_manage_messages</code> isə həmin hesabın mesajlarını qəbul etmək və icazəli cavabları göndərmək üçündür. Mesaj göndərilməsi kanalın cavab müddətlərinə və istifadəçinin səlahiyyətinə tabedir.</p>

      <h2>4. Kimlər məlumatlara çıxış əldə edir?</h2>
      <p>Workspace məlumatlarına həmin şirkətdə səlahiyyəti olan üzvlər rol və görünüş icazələri daxilində çıxır. Xidmətin fəaliyyəti üçün hostinq (Vercel), verilənlər bazası (Neon), qoşduğunuz Meta platformaları və seçilmiş poçt/fayl xidmətləri müvafiq məlumatları emal edir. Bu xidmətlərin infrastrukturu Azərbaycandan kənarda yerləşə bilər. Texniki dəstək və təhlükəsizlik üçün zəruri məlumatlar səlahiyyətli xidmət idarəçiləri tərəfindən emal oluna bilər.</p>
      <p>Workspace-ə yüklədiyiniz üçüncü şəxslərin məlumatlarını daxil etməyə və istifadə etməyə uyğun səlahiyyətiniz olmalıdır. Müştəri məlumatlarının şirkətiniz tərəfindən istifadəsi ilə bağlı müraciətlərdə aidiyyəti Workspace sahibi ilə əlaqə tələb oluna bilər.</p>

      <h2>5. Saxlanma və təhlükəsizlik</h2>
      <p>Məlumatlar xidmətin təqdim olunması, təhlükəsizlik, mübahisələrin həlli və tətbiq olunan saxlanma öhdəlikləri üçün lazım olan müddət ərzində saxlanılır. Sosial giriş tokenləri serverdə şifrələnmiş formada saxlanılır. Hesaba giriş və şirkət səlahiyyətləri serverdə yoxlanılır.</p>
      <p>Bağlantını ayırmaq yeni məlumat qəbulunu və həmin bağlantı ilə göndərişi dayandırır, saxlanmış giriş tokenini silir. Əvvəldən CRM-də saxlanmış mesaj və müştəri qeydləri bununla avtomatik silinmir. Silinmə müraciətində hansı məlumatların silinə biləcəyini, hər hansı saxlanma səbəbini və tamamlanma vəziyyətini sizə bildiririk. Ehtiyat nüsxələrdəki qalıqlar nüsxələrin saxlanma dövrü başa çatdıqca aradan qalxır.</p>

      <h2>6. Sessiyalar və brauzer yaddaşı</h2>
      <p>Hesabınıza girişi saxlamaq üçün sessiya kukiləri, qoşulma prosesini tamamlamaq və interfeys vəziyyətini saxlamaq üçün brauzerin sessiya və lokal yaddaşı istifadə olunur. Meta-nın rəsmi giriş pəncərəsi və WhatsApp qoşulma SDK-si həmin provayderin qaydalarına tabedir.</p>

      <h2>7. Seçimləriniz və silinmə müraciəti</h2>
      <p>Məlumatlarınıza çıxış, düzəliş və silinmə üçün <a href="mailto:hello@thenewera.space">hello@thenewera.space</a> ünvanına müraciət edə bilərsiniz. Sosial hesabı Workspace → Ayarlar bölməsindən ayıra, platforma tərəfində tətbiq icazəsini ləğv edə bilərsiniz. Silinmə qaydası <Link href="/data-deletion">Məlumatların silinməsi</Link> səhifəsində izah olunur. Sorğunu icra etməzdən əvvəl hesab və ya şirkət üzərində səlahiyyətinizi yoxlaya bilərik.</p>

      <h2>8. Siyasətin yenilənməsi</h2>
      <p>Xidmət və məlumat emalı dəyişdikdə bu səhifəni yeniləyirik. Aktual versiyanın tarixi səhifənin əvvəlində göstərilir. Suallarınızı yuxarıdakı əlaqə ünvanına göndərə bilərsiniz.</p>
    </>
  );
}
