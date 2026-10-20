# NEW ERA — E-poçt təklif kampaniyaları

## Nə əlavə edildi?

Əsas admin panelinin **Satışlar → Təklif kampaniyaları** tabı. Bu modul platforma admininin satış siyahısı və admin SMTP/IMAP poçtu üçündür. Şirkət Workspace-lərinə adminin poçtu və satışları paylaşılmır. Workspace üzvlərinin və şirkət Owner-in platforma kampaniyalarına girişi yoxdur.

İş axını:

1. Əvvəlki Excel/CSV/DOCX idxalı və ya manual əlavə vasitəsilə satış siyahısını hazırlayın.
2. Kampaniyada 1–300 satış seçin. Ad, e-poçt, xidmət və qeydlər üzrə axtarış, mənbə filtri və “Təklif göndərilməlidir” filtri var. Sahə üzrə qruplaşdırma mövcud qeydlər üzərində axtarışla edilir; ayrıca avtomatik AI təsnifatı yoxdur.
3. Ad, göndəriş tarixi, gündəlik limit və Bakı vaxtı üzrə göndəriş saatlarını seçin. Standart: gündə 20, 09:00–18:00, bazar ertəsi–cümə.
4. Əsas məktub və istəyə görə 1–2 xatırlatma yazın. `{{name}}`, `{{company}}`, `{{service}}` dəyişənləri hər alıcıya uyğun doldurulur. Şablonları təkrar kampaniya üçün dəyişmək mümkündür; ayrıca şablon kitabxanası/AI generasiyası yoxdur.
5. “Qaralamanı hazırla” məktub göndərmir. Bütün addımların fərdiləşmiş mətnləri və alıcılar 50-lik səhifələrlə görünür. E-poçtsuz, təkrar, imtina etmiş, əvvəl əlaqə saxlanmış və ya bağlanmış satışlar izahlı şəkildə kənarda qalır.
6. Alıcıları və mətnləri yoxlayıb ayrıca təsdiqləyin. Sonra növbə aktivləşir. Təsdiqdən əvvəl heç bir SMTP göndərişi edilmir. SMTP/IMAP/kanonik ünvan dəyişərsə, əvvəlki təsdiqlə yeni poçtdan göndərilməz.
7. Scheduler növbəni işlədərkən hər çağırışda ən çox bir məktub SMTP-yə verilir. Bütün kampaniyalar üçün ən azı 60 saniyə ara və serverdə gündəlik limit var.
8. Xatırlatma intervalı **əvvəlki məktubun SMTP tərəfindən qəbul edildiyi vaxtdan** hesablanır. Standart 3 gün + daha 4 gündür. Göndəriş saatından kənara düşərsə, növbəti uyğun scheduler çağırışında işləyir.

## Göndəriş və satış izləməsi

- SMTP qəbulundan sonra satışın `proposalStatus` sahəsi `SENT`, `proposalSentAt` göndəriş vaxtı olur; satışın mövcud mərhələsi və dəyəri dəyişmir. Məktubun Message-ID-si fəaliyyət tarixçəsində və ayrıca göndəriş cədvəlində saxlanır.
- “SMTP qəbul etdi” məktubun inbox-a çatdığını və ya oxunduğunu bildirmir. Bu versiya açılma pikseli, klik analitikası, provider delivery webhook-u və ya tam bounce emalı implementasiya etmir.
- IMAP-də yalnız INBOX başlıqları, göndərən və `In-Reply-To` / `References` yoxlanılır. Məktub oxunmuş işarələnmir, daşınmır və silinmir.
- Uyğun göndərəndən həmin göndərişə bağlı cavab varsa, ardıcıllıq dayanır, satış `RESPONDED` olur və dərhal izləmə üçün `FOLLOW_UP` fəaliyyəti yaranır. Məsul əməkdaş mövcud satışdakı əməkdaş olaraq qalır.
- Gələn məktubun mövzu əlaqəsi təsdiqlənmirsə və ya avtomatik cavabdırsa, satışa müsbət nəticə yazılmır; alıcı “Əl ilə yoxlayın” vəziyyətinə keçir və xatırlatmalar dayanır.
- Son xatırlatmadan sonra və kampaniya fasilədə olarkən də 90 gün ərzində cavab yoxlaması aparılır. Hər çağırışda bir əlavə alıcının cavabı yoxlanır; bu real vaxt push xidməti deyil.
- İlk məktubdan əvvəl də INBOX bağlantısı yoxlanır. Mövcud yeni məktub varsa, əvvəl onu nəzərdən keçirmək üçün həmin alıcı dayandırılır. IMAP yoxlaması alınmasa avtomatik göndəriş davam etmir.
- Manual “Cavab alındı”, “Görüş təyin edildi”, “İmtina etdi”, “Dayandır” əməliyyatları var. Eyni ünvana aid davam edən ardıcıllıqlar da dayanır. Manual satış API-si vasitəsilə görüş/cavab/imtina və ya WON/LOST/NEGOTIATION qeydə alınarsa, növbəti göndərişdən əvvəl nəzərə alınır.
- Hər məktubda imtina keçidi var. Keçidə GET ilə baxmaq heç nəyi dəyişmir; istifadəçi ayrıca düyməni basır. İmzalı POST təsdiqindən sonra həmin e-poçta gələcək admin təklif kampaniyaları bloklanır. RFC 8058 List-Unsubscribe POST-u da eyni imza ilə işləyir. Qeydiyyat/təsdiq məktubları bundan təsirlənmir.
- Göndəriş timeout/yarımçıq proses səbəbindən qeyri-müəyyəndirsə, `UNCERTAIN` yazılır. **Avtomatik retry yoxdur:** nəticəni yoxlamadan yenidən göndərmək olmaz. Belə alıcı başqa kampaniyada da təsdiqi bloklayır. Yoxlamadan sonra admin “Dayandır” ilə əvvəlki qeydi bağlayıb ayrıca yeni qaralamanı təsdiqləyə bilər. Köhnə cəhd və Message-ID saxlanır; dayandırmaq çatdırılma nəticəsi demək deyil.
- Fasilə/ləğv gələcək cəhdləri dayandırır. SMTP-yə artıq verilmiş məktubu geri çağırmaq mümkün deyil.

## Quraşdırma

Paket hazırkı Workspace V2, satış idxalı və sosial qoşulma yeniləmələri olan layihə üçündür. GitHub-dakı satış/poçt faylları yoxlanılıb. Prisma sxemində əvvəlki sosial qoşulma modelləri saxlanılıb. Bütün əvvəlki migration-ları qoruyun.

1. ZIP-i layihənin kökünə çıxarın və eyni yollardakı faylları əvəz edin.
2. İstifadə olunan production bazanın ehtiyat nüsxəsini saxlayın.
3. Aşağıdakı environment dəyişənlərini Vercel-də hazırlayın. İlkin mərhələdə `SALES_CAMPAIGNS_ENABLED=false` saxlayın.
4. Yeni kod production-da işləməzdən əvvəl əlavə migration-u tətbiq edin:

```powershell
Set-Location 'C:\Users\User\Downloads\new-era-starter\new-era-starter\new-era-starter\new-era'
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw 'Migration alınmadı. Deploy-u davam etdirməyin.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build alınmadı. Nəticəni yoxlayın.' }
```

`DATABASE_URL` saytın istifadə etdiyi bazaya aid olmalıdır. Yeni production paketi yoxdur; mövcud asılılıqlar yoxdursa əvvəl `npm ci` edin. `package.json` və lock faylı bu paketdə dəyişmir.

Yeni migration: `prisma/migrations/20261020133000_sales_email_campaigns/migration.sql`

Yalnız 5 yeni cədvəl yaradılır: `SalesCampaign`, `SalesCampaignRecipient`, `SalesCampaignDelivery`, `SalesEmailSuppression`, `SalesCampaignWorker`. Mövcud cədvəl/data silinmir və bazanı sıfırlama əmri yoxdur. Satış silinsə belə kampaniya tarixçəsi qalır (`dealId` null olur). İstehsal bazasında `migrate reset` və data loss əmrləri işlətməyin.

## Vercel environment

| Dəyişən | Dəyər |
| --- | --- |
| `SALES_CAMPAIGNS_ENABLED` | İlkin `false`. Quraşdırma yoxlanandan və öz test ünvanın üçün kampaniya hazır olandan sonra `true`. Bu, qlobal göndəriş açarıdır; hər kampaniya yenə ayrıca təsdiq tələb edir. |
| `SALES_CAMPAIGN_SECRET` | Ən az 32 simvolluq təsadüfi gizli açar. Yalnız kampaniya imtina keçidlərini imzalayır. Mövcud CRM şifrələmə açarını əvəz etmir. Sonradan dəyişməsi köhnə imtina keçidlərini və təsdiqləri etibarsız edir. |
| `SALES_CAMPAIGN_APP_URL` | Saytın HTTPS kanonik origin-i, məsələn `https://www.thenewera.space`. Yol, query və fragment olmamalıdır. Verilməzsə `CRM_APP_URL` istifadə edilir. |
| `SALES_CAMPAIGN_DAILY_LIMIT` | Bütün kampaniyalara birlikdə limit, standart `50`, server maksimumu `200`. Kampaniyanın öz limiti 1–100 və bu ümumi limitdən çox ola bilməz. Bütün cəhdlər (uğursuz da daxil) gündəlik limitə sayılır. Gündəlik sıfırlanma Bakı gecəyarısıdır. |
| `SALES_CAMPAIGN_CRON_SECRET` | Xarici scheduler üçün ən az 32 simvolluq təsadüfi token. Verilməzsə mövcud `CRON_SECRET` istifadə edilir. Vercel-in daxili cron-u istifadə olunarsa aşağıdakı qeydə baxın. |

Mövcud `MAIL_SMTP_HOST/PORT/USER/PASSWORD/SECURE`, `MAIL_FROM_ADDRESS/NAME`, `MAIL_IMAP_HOST/PORT/USER/PASSWORD/SECURE` və istəyə görə `MAIL_IMAP_INBOX` istifadə edilir. SMTP üçün mövcud EVENT_EMAIL fallback-ləri saxlanır. Cavab ünvanı `MAIL_IMAP_USER` olur; onun daxil olan məktubları qəbul edən real poçt ünvanı olması lazımdır. Gmail OAuth/Workspace poçtu bu admin kampaniyasına avtomatik köçürülmür.

Yeni açar yaratmaq üçün öz terminalında iki dəfə işlədib nəticələri ayrı dəyişənlərdə saxla:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Açarları Vercel-də server dəyişənlərinə əlavə edin. `.env` faylları və tokenlər GitHub-a göndərilmir. Mövcud `CRM_ENCRYPTION_KEY`, admin auth və poçt parollarını dəyişmək lazım deyil.

## Avtomatik scheduler — mütləq xarici quraşdırma addımı

ZIP-i çıxarmaq scheduler yaratmır. Mövcud `vercel.json` və köhnə cron işləri dəyişdirilməyib. UI açıq olmasa da işləmək üçün aşağıdakı endpoint-ə 1–5 dəqiqədən bir GET çağırışı qurun:

```text
https://www.thenewera.space/api/cron/sales-campaigns
Authorization: Bearer <serverdəki cron tokeni>
```

Endpoint tətbiqinizin doğru kanonik domenində olmalıdır. Tokeni query parametrinə yazmayın. Scheduler normal authentication header göndərməlidir. Production deployment protection istifadə edirsinizsə, scheduler-in həmin qaydaya uyğun girişini ayrıca konfiqurasiya edin; tətbiq endpoint-inin Bearer yoxlamasını çıxarmayın.

Vercel planınız tez-tez cron işlətməyə imkan verirsə, mövcud `crons` massivinə əlavə edilə bilən ayrıca element:

```json
{ "path": "/api/cron/sales-campaigns", "schedule": "*/5 * * * *" }
```

Mövcud cron elementlərini əvəz etməyin. Vercel daxili cron `CRON_SECRET` dəyərini avtomatik Bearer header kimi göndərir. Buna görə `SALES_CAMPAIGN_CRON_SECRET` ya verilməməli, ya da eyni dəyərdə olmalıdır. Mövcud cron açarını dəyişirsinizsə digər işlərin də eyni qaydada konfiqurasiya edildiyini yoxlayın. Hobby planında gündəlik cron məhdudiyyəti var; tez-tez iş üçün uyğun plan və ya ayrıca scheduler lazımdır. Özbaşına plan yüksəltməsi və ödəniş edilmir.

5 dəqiqəlik scheduler ilə hər çağırışda ən çox 1 məktub, yəni saatda ən çox 12 cəhd işləyir; gündəlik/saat limitləri əlavə yoxlanır. Gələn cavablar növbəti yoxlamada görünür. Daha böyük həcmdə queue throughput və reply sync ayrıca genişləndirilməlidir.

“Növbəni indi emal et” düyməsi eyni server qaydaları ilə bir çağırış edir. Scheduler olmayanda bu düymə sınaq və manual emal üçündür; onu avtomatik işləmə kimi təqdim etməyin.

Rəsmi scheduler mənbələri:

- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/cron-jobs/manage-cron-jobs

## Canlı qəbul sınağı

1. Əvvəl öz nəzarətində olan test e-poçt ünvanı üçün satış əlavə edin. Real müştəri siyahısını sınaq üçün seçməyin.
2. Yeni kampaniyanı 1 alıcı və xatırlatmasız hazırlayın. Preview-də göndərən, cavab ünvanı, fərdiləşmə və imtina keçidini yoxlayın.
3. Server açarlarını aktivləşdirin, redeploy edin və həmin kampaniyanı açıq şəkildə təsdiqləyin.
4. Növbəni emal edin. Məktubun test ünvanına çatmasını öz poçtunda yoxlayın. SMTP nəticəsi ilə inbox çatdırılmasını qarışdırmayın.
5. Məktuba cavab verin. Növbəti emaldan sonra “Cavab alındı”, satışda `RESPONDED` və `FOLLOW_UP` fəaliyyətini yoxlayın.
6. İmtina keçidinə yalnız baxışın statusu dəyişmədiyini, düymə təsdiqindən sonra isə həmin ünvanın gələcək kampaniyalara düşmədiyini yoxlayın.
7. Scheduler-i qoşun, səhifə bağlı ikən son emal vaxtının dəyişdiyini təsdiqləyin.

Bu canlı sınaq, Vercel environment və scheduler bu hazırlanma zamanı edilməyib. Heç bir real müştəriyə məktub göndərilməyib, GitHub-a push və production migration icra olunmayıb.

## Testlər və məhdudiyyətlər

- Müvəqqəti PostgreSQL/PGlite + real Prisma ilə kampaniya suite-si: migration ilə mövcud satışın saxlanması, icazə/MFA/CSRF, alıcı/şablon yoxlaması, təsdiq, göndəriş, tam 3 addımlı interval, reply-thread, imtina, paralel worker, timeout, quota, deaktivasiyalar və əvvəlki satış API-si.
- Brauzerdə real UI/API/DB ilə 100 alıcı: qaralama, 50-lik preview, təsdiq, mock SMTP, manual cavab, fasilə; 1440, 390 və 320 px yoxlanılıb.
- Əvvəlki satış idxalı/tracking suite-si: 79 yoxlama keçib.
- TypeScript yoxlaması və Next.js production compile keçib. Tam `npm run build` sizin real baza bağlantınızla deploy-dan əvvəl işlədilməlidir; bu mühitdə yalnız compile rejimi yoxlanılıb.
- SMTP və IMAP testlərdə imitasiya edilib; real çatdırılma/inbox sınağı deyil. AI, WhatsApp şablon kampaniyası, PDF/əlavələr, open/click tracking, provayderdən bounce/delivery hadisələri daxil deyil.
- İnteqrasiya admin satışlarında işləyir. Eyni imkanın şirkət Workspace-lərinə ayrıca poçt bağlantısı və şirkət icazələri ilə əlavə edilməsi bu paketə daxil deyil.

Testi öz mühitində işlətmək üçün Node 20+ və ayrıca test runtime:

```powershell
npm install --prefix .crm-test-runtime --no-save --ignore-scripts --package-lock=false @electric-sql/pglite@0.5.10 @electric-sql/pglite-socket@0.2.13
node tests/sales-campaigns.integration.cjs
```

Test real `DATABASE_URL` istifadə etmir, localhost 55445 portunda müvəqqəti baza açır. Port boş olmalıdır. `.crm-test-runtime`, müvəqqəti QA faylları və screenshot-lar paketə daxil deyil və GitHub-a stage edilməməlidir. Dəyişən yollar `SALES-CAMPAIGNS-FILES.md` daxilində verilib.
