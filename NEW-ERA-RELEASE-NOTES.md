# NEW ERA — audit düzəlişləri, 22 oktyabr 2026

Bu ZIP yalnız dəyişən və yeni faylları ehtiva edir. Mövcud layihənin əvəzi deyil. `.env`, `.env.local`, real açarlar, şəxsi məlumatlar, `node_modules` və `.next` paketə daxil edilməyib.

## Windows-da tətbiq

1. Mövcud layihənin Git vəziyyətini və bazanın ehtiyat nüsxəsini saxla. ZIP-i ayrıca qovluğa çıxart.
2. Layihənin `package.json` olan əsas qovluğunda PowerShell aç. Aşağıdakı bloku işlət:

```powershell
$releaseInstaller = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "Install-Release.ps1" -Recurse -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($null -eq $releaseInstaller) {
    Write-Host "Install-Release.ps1 tapılmadı. Əvvəl ZIP-i çıxart."
} else {
    powershell -NoProfile -ExecutionPolicy Bypass -File $releaseInstaller.FullName -ProjectPath (Get-Location).Path
}
```

Skript əvvəl faylları auditdəki orijinallarla müqayisə edir. Sonradan edilmiş fərqli dəyişiklik taparsa, heç nə köçürmədən dayanır. Cari faylların ehtiyat nüsxəsinin ünvanını terminalda göstərir. Windows PowerShell bu yoxlama mühitində mövcud olmadığı üçün skriptin Windows icrası ayrıca sınaqdan keçirilməyib; onun köçürdüyü mənbə faylları aşağıdakı testlərdən keçib.

3. Quraşdırma uğurludursa əmrləri bir-bir icra et. Xəta olarsa, növbəti addıma keçmə:

```powershell
npm ci
npm run db:deploy
npm run build
```

`npm run db:deploy` əlavə sahə və cədvəlləri tətbiq edir. `DATABASE_URL` mövcud düzgün bazaya aid olmalıdır. Skript verilənlər bazasını sıfırlamır. Miqrasiya tarixçəsi varsa adi Prisma deploy işləyir. Boş bazada cari sxem qurulur və orijinal miqrasiyaların checksum-ları ilə başlanğıc tarixçə qeyd olunur. Tarixçəsiz mövcud baza yalnız audit ZIP-indəki sxemə və ya yenilənmiş sxemə tam uyğun gəlirsə qəbul edilir. Fərqli sxem və ya yarımçıq miqrasiya varsa dayanır; çıxan xətanı göndər. Köhnə miqrasiya SQL-ləri dəyişdirilməyib.

4. Build uğurlu olduqdan sonra yalnız bu paketdəki faylları GitHub-a göndər:

```powershell
git status --short
git --literal-pathspecs add --pathspec-from-file=NEW-ERA-RELEASE-FILES.txt
git diff --cached --stat
git commit -m "Fix release security, payments, mail archive and event updates"
git push
```

Paket Vercel-dəki real mühit dəyişənlərini quraşdırmır. DB miqrasiyası yeni kod yayımlanmadan əvvəl tamamlanmalıdır. PWA-dan çıxıb yenidən açmaq yeni səhifə kodunun yüklənməsinə kömək edir.

## Avtomatik işlər

`vercel.json` içində mövcud gündəlik işlər qorunub, kampaniya, bildiriş və mail arxivinin yoxlanması əlavə edilib. Vercel Hobby daha tez-tez cron icrasına imkan vermədiyindən standart konfiqurasiya gündəlikdir. Rəsmi qayda: https://vercel.com/docs/cron-jobs/usage-and-pricing

Daha tez-tez icra üçün paketdə GitHub Actions workflow-u var. O, ayrıca aktivləşdirmədən işləmir. Repository → Settings → Secrets and variables → Actions bölməsində:

- **Variable:** `NEW_ERA_SCHEDULER_ENABLED` = `true`.
- **Secret:** `NEW_ERA_SITE_URL` = `https://www.thenewera.space`.
- **Secret:** `NEW_ERA_CRON_SECRET` = Vercel-dəki `CRON_SECRET` ilə eyni dəyər.

`CRON_SECRET` ən azı 32 təsadüfi simvol olmalıdır. Ayrı `CRM_CRON_SECRET` və ya `SALES_CAMPAIGN_CRON_SECRET` qoyulubsa, bu runner üçün onları ümumi açarla uyğunlaşdır. GitHub planı və Actions kvotası daxilində workflow 5 dəqiqəlik cədvəllə çağırır; GitHub-un planlaşdırılması dəqiq vaxt zəmanəti vermir. Bir worker uğursuz olarsa digərləri yenə çağırılır. GitHub Actions → NEW ERA background jobs → Run workflow ilə ilkin sınaq et. Domeni redirectsiz düzgün HTTPS origin kimi yaz.

## Mail

- Məktub serverdə HTML parseri ilə təmizlənir və brauzerdə scriptsiz, ayrıca origin-li sandbox pəncərədə göstərilir.
- SMTP qəbulundan sonra eyni Message-ID ilə IMAP Sent nüsxəsi saxlanır. Məxfi Bcc başlığı yalnız şəxsi Sent nüsxəsində qalır; alıcılara göndərilən MIME-dan çıxarılır.
- Arxiv uğursuz olarsa mail təkrar göndərilmir. Saxlama işi DB-də qalır və cron/“Yenilə” ilə təkrar yoxlanır. Cavab itəndə əvvəl Message-ID axtarılır, sonra ehtiyac varsa APPEND edilir.
- `MAIL_IMAP_SENT` provayderin real qovluğunun adı olmalıdır, məsələn `Sent`. SMTP ilə IMAP eyni poçt hesabına aid olmalıdır. Provayderin avtomatik saxladığı məktub Message-ID ilə tapılarsa ikinci nüsxə yazılmır.
- Əsl poçt provayderi ilə son qəbul sınağı yenə tələb olunur. Çox gecikmiş avtomatik server nüsxəsi kimi provayder davranışı lokal fixture ilə təsdiqlənmir.

## Dəyişikliklər

- Promouter üçün mövcud hesabın sessiyası və email təsdiqi tələb olunur; form həmin istifadəçinin məlumatlarını doldurur. Anonim şəxs başqa promouter adına müraciət edə bilmir.
- Ödəniş invoice sətri kilidləndikdən sonra hesablanır; məbləğlər Decimal ilə işlənir. UI hər əməliyyat üçün təkrar göndəriş açarı yaradır. Eyni açar eyni ödənişi ikinci dəfə yaratmır.
- Giriş cəhdləri DB-də atomik sayılır; instansiya yaddaşından və brauzerin dəyişdirə bildiyi IP başlığından asılı deyil. Limit bitdikdə 429 və Retry-After qaytarılır. Standart limitlər: hesab+IP üçün 10/10 dəqiqə, hesab üçün 50/15 dəqiqə, IP üçün 120/15 dəqiqə.
- Tədbirlər siyahısı dinamikdir; yeni tədbir və status dəyişiklikləri redeploy tələb etmir.
- Biznes Audit mövcud SMTP ilə işləyə bilir; ayrıca Resend açarı məcburi deyil. SMTP yoxdursa əvvəlki Resend yolu qorunur. Daxili alıcı `AUDIT_TO_EMAIL`, sayt parametrlərindəki email və ya göndərən emailindən seçilir.
- Yeni asılılıq versiyaları və uyğunluq override-ları lock faylında sabitlənib. Bu paket üçün `npm audit --omit=dev` nəticəsində 0 bildirilən zəiflik var.

## Yoxlamalar

- Production build və TypeScript.
- Əvvəlki 11 inteqrasiya/interfeys test faylında 1 278 assertion, əlavə workspace giriş icazəsi testləri.
- Yeni release regression testləri: mail XSS nümunələri, iframe sandbox, promouter impersonasiyası, paralel ödəniş/qalıq, təkrar sorğu, persistent login limiti, Bcc məxfiliyi, SMTP qəbulundan sonra APPEND cavabının itməsi və arxiv retry-si, SMTP ilə Biznes Audit.
- Boş baza, tarixçəli mövcud baza və uyğun sxemli tarixçəsiz baza üçün deploy sınaqları. Sintetik müştəri məlumatının saxlanması və deploy-un təkrar icrası yoxlanır.
- HTTP: açıq səhifələr, anonim admin/API məhdudiyyətləri, real sintetik admin girişi, PWA resursları və build-dən sonra əlavə edilən tədbirin siyahıda görünməsi.

Test bazaları və SMTP/IMAP serverləri lokal fixture-lərdir. Canlı DB-yə dəyişiklik və real email/Meta göndərişi edilməyib. Real iPhone, real SMTP/IMAP/Meta və ehtiyatdan bərpa qəbul yoxlamaları ayrıca tamamlanmalıdır.

İstəsən eyni testləri işlətmək üçün əvvəl mövcud testlərin istifadə etdiyi ayrıca runtime-ı qur:

```powershell
npm install --prefix .crm-test-runtime --no-audit --no-fund @electric-sql/pglite @electric-sql/pglite-socket @prisma/adapter-pg@5.17.0 pg jsdom
npm run test:release
npm run test:release-bootstrap
```
