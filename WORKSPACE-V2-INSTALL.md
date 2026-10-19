# NEW ERA Workspace — Collaboration V2

Bu paket son göndərdiyiniz `new-era-latest.zip` üzərində hazırlanıb. Yalnız yeni/dəyişən faylları ehtiva edir. Production bazası, Vercel environment və canlı provayder hesabları bu iş zamanı dəyişdirilməyib.

## Əlavə olunan imkanlar

| İstiqamət | İmplementasiya |
| --- | --- |
| Yazışma mərkəzi | Kanal və əlaqə üzrə yazışmalar, məsul əməkdaş, 2 dəqiqəlik cavab hazırlama kilidi, daxili qeydlər, cavab müddəti, hazır cavablar, müştəri kartına bağlama. |
| Müştəri profili | İcazəli satış/tapşırıq/görüş/təklif/ödəniş/mesaj tarixçəsi, əlaqəli fəaliyyətlər və Owner üçün təsdiqli dublikat birləşdirmə. |
| Rəhbər ekranı | Cavab gözləyən yazışmalar, gecikmiş işlər, 7 gündür hərəkətsiz satışlar, mənbə üzrə faktiki ödənişlər, açıq satış potensialı. Potensial proqnoz zəmanəti və daxil olmuş pul deyil. |
| Fərdiləşdirmə | 40-a qədər fərdi sahə, 10 əlavə satış prosesi, proses başına 20 mərhələ, mərhələ şərtləri, şəxsi yadda saxlanılan filtr/görünüşlər, təklif/endirim təsdiqi və PDF brend ayarları. |
| Rezervasiya | Saat qurşağı, müddət, fasilə, iş günləri/saatları, əvvəlcədən qeydiyyat müddəti, vaxt seçimi, tranzaksiya daxilində toqquşma yoxlaması, ləğv və vaxt dəyişmə, e-poçt iş növbəsi. |
| Müştəri kabineti | Mövcud təsdiqlənmiş hesabla ayrıca dəvət qəbulu; yalnız paylaşılmış qeydlər, təklif/PDF/qərar, ayrıca paylaşılmış fayllar, fayl göndərmə və dəstək müraciətləri/cavabları. CRM üzvlüyü avtomatik yaranmır. |
| AI | Görünən qeydlərin məhdud nümunəsindən mənbə siyahılı xülasə və növbəti addım; açıq məlumat ötürmə təsdiqi. Heç bir biznes əməliyyatı və mesajı özü icra etmir. |
| İstifadə və təhlükəsizlik | Başlanğıc bələdçisi, CSV/XLSX import önbaxışı/sütun uyğunlaşdırma, sətir nəticələri, təkrar icra qoruması, silinmiş qeydlərin bərpası, Workspace MFA, bərpa kodları və aktiv sessiyaların idarəsi. |
| Dəvət poçtu | CRM URL/SMTP xətaları ayrılır; təhlükəsiz xəta kodları və göndərən ünvanı görünür; məktub göndərmədən SMTP bağlantısı yoxlana bilir. |

Mövcud saytın auth API-ləri, public səhifələri, navbar-ı, agentlik layihələri və əsas admin poçt modulu dəyişdirilməyib. Yeni OAuth bağlantıları saytın giriş sistemi deyil, şirkətə aid poçt/təqvim inteqrasiyasıdır. Onlayn ödəniş provayderi əlavə edilməyib; mövcud manual abunəlik aktivləşdirməsi qorunur.

## Quraşdırma

Paketdəki yolları saxlayaraq faylları layihənin kökünə köçürün. Sonra ayrı-ayrı əmrlər kimi:

```powershell
npm ci
npx prisma migrate deploy
npm run build
```

Yeni migration: `prisma/migrations/20261019110000_workspace_collaboration/migration.sql`.

Yalnız yeni cədvəllər, mövcud CRM cədvəllərinə əlavə sütunlar, indeks və FK-lər yaradır. Köhnə User/Session və biznes məlumatları silinmir. `migrate reset` və bazanın sıfırlanması tələb olunmur. Yeni runtime istifadəyə verilməzdən əvvəl eyni deployment-in istifadə etdiyi bazaya migration tətbiq olunmalıdır.

XLSX oxuma üçün yalnız `exceljs@4.4.0` əlavə edilib. Mövcud dependency versiyaları yenilənməyib.

## Minimum environment

| Key | Value / məqsəd |
| --- | --- |
| `DATABASE_URL` | Mövcud işlək PostgreSQL bağlantısı. |
| `CRM_APP_URL` | `https://www.thenewera.space` — faktiki canonical domeninizi seçin. Vercel Value sahəsinə `CRM_APP_URL=` hissəsini yazmayın. |
| Mövcud `MAIL_SMTP_*`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | Dəvətlər, kabinet dəvətləri və rezervasiya məktubları üçün mövcud göndərmə xidməti. Mövcud `EVENT_EMAIL_*` fallback-i qorunur. |
| `CRON_SECRET` | Mövcud fon işinin Bearer sirri. `CRM_CRON_SECRET` də varsa Vercel üçün eyni dəyər olmalıdır. |
| `CRM_ENCRYPTION_KEY` | MFA sirrləri və OAuth tokenləri üçün sabit 32 baytlıq Base64 və ya 64 simvolluq hex açar. MFA/OAuth istifadə etmək üçün lazımdır. |

Şifrələmə açarı bir dəfə yaradılır:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Nəticəni server environment-də saxlayın. Açıq repozitoriyaya daxil etməyin. Bu açarı hər deploy-da yenidən yaratmaq olmaz; dəyişdirilməsi saxlanılan token/sirrlərin ayrıca yenidən şifrələnməsini və ya hesabların yenidən qoşulmasını tələb edir. Environment dəyişəndən sonra yeni deployment yaradın.

`CRM_APP_URL` olmadıqda `NEXT_PUBLIC_SITE_URL` və `SITE_URL` fallback-i var. Heç biri etibarlı HTTPS ünvanı deyilsə dəvət göndərişi konkret xəta göstərir.

### Dəvət göndərişinin yoxlanması

Workspace → Komanda → **Dəvət poçtunun vəziyyəti**. Burada link ayarı, SMTP konfiqurasiyası və göndərən ünvanı görünür. **Poçt bağlantısını yoxla** şifrə/server bağlantısını yoxlayır, real test məktubu göndərmir. Sonra dəvəti yenidən göndərin.

`EAUTH`, `ESOCKET`, `ETIMEDOUT`, URL və konfiqurasiya xətaları ayrıca göstərilir. Sirr, şifrə və dəvət tokeni loga yazılmır. `SMTP_ACCEPTED` alıcının inbox-una çatma zəmanəti deyil. Production göndərişinin dəqiq səbəbi yeni yoxlama/log nəticəsindən müəyyən edilməlidir; bu mühitdən real SMTP-yə qoşulma aparılmayıb.

## Google və Microsoft poçt/təqvim bağlantıları

İstifadəçi Workspace → Ayarlar bölməsində öz şirkətinə aid hesab üçün açıq OAuth razılığı verir. Hesab şifrəsi tətbiqə daxil edilmir. Tokenlər DB-də AES-256-GCM ilə şifrələnir; API cavablarına çıxarılmır.

| Provider | Server environment | Callback URL |
| --- | --- | --- |
| Google | `CRM_GOOGLE_CLIENT_ID`, `CRM_GOOGLE_CLIENT_SECRET` | `https://www.thenewera.space/api/workspace-connect/google/callback` |
| Microsoft | `CRM_MICROSOFT_CLIENT_ID`, `CRM_MICROSOFT_CLIENT_SECRET` | `https://www.thenewera.space/api/workspace-connect/microsoft/callback` |

Canonical domen fərqlidirsə callback-də də həmin domeni istifadə edin. Provayder tətbiqində callback tam uyğun qeydiyyatdan keçirilməlidir. Google Gmail API/Calendar API və Microsoft Graph icazələri, hesab tipinə uyğun razılıq və lazım olan tətbiq yoxlamaları operator tərəfindən qurulmalıdır.

- Google poçt: `openid`, `email`, `gmail.readonly`, `gmail.send`.
- Google təqvim: `openid`, `email`, `calendar.events`.
- Microsoft: `openid`, `email`, `offline_access`, `User.Read`; poçt üçün `Mail.Read`, `Mail.Send`, təqvim üçün `Calendars.ReadWrite`.
- OAuth state 10 dəqiqə etibarlıdır, birdəfəlikdir və cari hesaba/şirkət üzvlüyünə bağlanır. DB-də xam state tokeni saxlanmır.
- Eyni provider hesabının poçt/təqvim kanalı başqa şirkətə paralel bağlanmır. Şirkətin məlumat sərhədini qorumaq üçün ayrıca biznes hesabından istifadə edin.
- Mövcud admin mailbox-u avtomatik oxunmur və paylaşılmır. `hello@thenewera.space` ilə dəvət göndərmək üçün bu yeni OAuth bağlantıları tələb olunmur.
- Poçt sinxronizasiyası yalnız qoşulmuş hesabın Inbox-unu oxuyur. İlkin pəncərə son 7 gündür; davamı səhifələnir və provider mesaj ID-si ilə təkrarlar bloklanır. Gmail-də plain-text məzmun, Outlook-da `bodyPreview` gətirilir. E-poçt əlavələri və bütün tarixi arxiv bu versiyada import olunmur.
- **İndi sinxronizasiya et** əl ilə bir paket işləyir. Davamlı sinxronizasiya üçün scheduler lazımdır.
- Təqvimdə primary/default calendar istifadə olunur. Məşğul vaxtlar rezervasiya seçimlərini bloklayır. CRM rezervasiyaları provayderə ötürülür; bağlı rezervasiyanın xarici vaxt/ləğv dəyişiklikləri CRM-ə alınır. İstənilən ayrıca şəxsi calendar hadisəsi CRM qeydinə çevrilmir. Adi əl ilə yaradılmış bütün CRM calendar qeydlərinin avtomatik export-u bu axına daxil deyil.
- Xarici təqvim və CRM ayrı sistemlərdir: provider sinxronizasiyası asinxrondur. CRM daxilində lokal toqquşma tranzaksiya ilə bloklanır; başqa tətbiqdən eyni anda edilən xarici rezervasiyalar üçün paylanmış atomik tranzaksiya zəmanəti verilmir.

## WhatsApp, Instagram və AI

Mövcud server-only `CRM_PROVIDER_CONFIG` xəritəsi saxlanılır. Hər şirkətin öz ID-si açardır. Aşağıdakı placeholder-ları real hesab məlumatları ilə operator doldurur:

```json
{
  "COMPANY_ID": {
    "smtp": {
      "host": "smtp.company.example",
      "port": 465,
      "user": "crm@company.example",
      "password": "SERVER_SECRET",
      "from": "Company <crm@company.example>"
    },
    "whatsapp": {
      "token": "META_TOKEN",
      "phoneNumberId": "META_PHONE_NUMBER_ID",
      "version": "SUPPORTED_GRAPH_VERSION",
      "appSecret": "META_APP_SECRET",
      "verifyToken": "RANDOM_VERIFY_TOKEN"
    },
    "instagram": {
      "token": "INSTAGRAM_PROFESSIONAL_ACCOUNT_TOKEN",
      "accountId": "INSTAGRAM_ACCOUNT_ID",
      "version": "SUPPORTED_GRAPH_VERSION",
      "appSecret": "META_APP_SECRET",
      "verifyToken": "RANDOM_VERIFY_TOKEN"
    },
    "ai": {
      "apiKey": "OPENAI_API_KEY",
      "model": "AVAILABLE_RESPONSES_MODEL"
    }
  }
}
```

Graph versiyası hesabınızda dəstəklənən `vNN.N` formatlı real versiya olmalıdır. Kod placeholder versiya/modeli işlək hesab etmir.

Callback-lər:

- `/api/workspace-webhooks/whatsapp/COMPANY_ID`
- `/api/workspace-webhooks/instagram/COMPANY_ID`

Meta professional/business hesabı, uyğun mesajlaşma icazələri, webhook subscriptions və lazım olan tətbiq təsdiqi tələb olunur. Instagram professional hesab üçün Instagram Login messaging axını nəzərdə tutulur. İmzalar HMAC ilə yoxlanır, account/phone ID şirkətə bağlanır və provider mesaj ID-ləri dublikat yaratmır. Təkrar account/phone ID konfiqurasiyası bağlanmamış sayılır.

Bu versiya daxil olan **text** mesajlarına və istifadəçinin başlatdığı cavab pəncərəsində ayrıca təsdiqlənmiş text cavablarına fokuslanır. Kampaniya, şablon, media, zəng, şərh moderasiyası və Instagram publishing əlavə edilməyib. Naməlum alıcı əvvəlcə icazəli müştəri kartına bağlanmalıdır. Canlı Meta kontraktı və hesab icazələri deployment-də ayrıca yoxlanmalıdır.

AI provayder açarı/modeli olmadan qoşulmamış görünür. İş köməkçisi hər icazəli bölmədən ən çox 30 son qeyddən məhdud kontekst alır; bütöv bazanı analiz etdiyini iddia etmir. Mənbələr göstərilir və cavabdan əvvəl icazə/versiyalar təkrar yoxlanır. Mətnlər prompt üçün etibarsız məlumat sayılır. AI mesaj göndərmir, qiymət/status dəyişmir və tibbi qərar vermir. Xarici provayder sorğusu istifadəçinin açıq təsdiqini tələb edir.

## Scheduler və iş növbəsi

`/api/workspace-jobs` Bearer secret ilə çağırılır. Mövcud `vercel.json` gündəlik cədvəli saxlanılıb. **Production-da xatırlatma və sinxronizasiya üçün gündəlik rejim kifayət etmir: 5 dəqiqəlik və ya biznes tələbinə uyğun müntəzəm çağırış qurun.** Scheduler qurulmadan dəqiqəyə həssas avtomatik xatırlatmalar işlək sayılmamalıdır.

Hər çağırış vaxt büdcəsi ilə məhdudlaşır. Şirkətlər son emala görə növbələnir; açıq tapşırıqlar şirkət üzrə persistent cursor ilə 100-lük səhifələrlə davam edir. Mail sync-də işlənməmiş Gmail ID-ləri və provider səhifələri saxlanılır. Limitlər daha böyük həcmdə ayrıca worker/queue infrastrukturu və yük sınağı ilə böyüdülməlidir.

Job-lar QUEUED/RUNNING/DONE/ERROR/UNCERTAIN/PAUSED vəziyyətləri ilə görünür. Provayder nəticəsi qeyri-müəyyən olduqda avtomatik təkrar məktub göndərilmir. Owner nəticəni provayderdə yoxlayıb ayrıca təsdiqlə manual retry edə bilir. Müddəti bitmiş/dayandırılmış Workspace-də məlumat dəyişdirən işlər işləmir. Köhnə trial xatırlatmaları qorunur.

## İstifadə qaydaları və sərhədlər

- Rezervasiya e-poçtu təsdiqlənmiş mövcud sayt hesabı ilə tamamlanır. Anonim vaxtlara baxış üzvlük yaratmır. Vaxtlar 15 dəqiqəlik seçim addımı ilə göstərilir; IANA saat qurşağı istifadə olunur.
- Kabinet dəvəti şirkət, müştəri və təsdiqlənmiş e-poçta bağlıdır. Dəvət linkinə baxmaq giriş yaratmır. Təklif qəbulunda versiya yoxlanır; yenilənmiş şərtlər köhnə ekran üzərindən qəbul edilmir.
- Qeydlər və fayllar ayrı paylaşılır. Qeyd paylaşılması onun bütün private fayllarını avtomatik açmır. Yeni sütunun default-u köhnə faylları private saxlayır. Müştərinin öz yüklədiyi fayl yalnız ona açıq paylaşılmış qeydə bağlanır.
- Müştəri kabineti yalnız paylaşılmış məbləğ/status/təklif sətirlərini göstərir; əməkdaşın daxili qeydləri və fəaliyyəti çıxarılmır. Qeyd üzərində staff faylı ayrıca “Kabinetdə paylaş” seçilməlidir.
- Import: CSV/XLSX, 2 MiB, 1000 məlumat sətri, 100 sütun. Açılmış XLSX məzmunu 20 MiB ilə məhdudlaşdırılır; formulalar icra edilmir və formula olan hüceyrələr rədd edilir. Sütunlar uyğunlaşdırılır; import 25-lik paketlərlə gedir, sətir xətaları ayrıca qalır. Uğurlu sətrlər eyni import açarı ilə təkrar yaranmır. Yeni fayl seçmək yeni importdur.
- Sahə tələbini aktiv etmək gələcək yaratma/dəyişmələrdə tətbiq olunur. Silinmiş fərdi sahənin köhnə dəyərləri mövcud qeyddə saxlanır. Proses/mərhələ istifadə edilirsə silinməsi bloklanır.
- Təklif/endirim hədləri boş olduqda əvvəlki davranış qalır. Hədd keçilərsə əvvəl DRAFT saxlanır, sorğu verilir və icazəli rəhbər qərar verir. Şərtlər dəyişərsə əvvəlki təsdiq qüvvədən düşür.
- PDF başlıq/son qeyd və PNG/JPEG loqo dəstəkləyir. WebP loqo Workspace-də göstərilə bilər, PDF-də embed edilmir.
- Silinmiş qeydlər rol/əhatə və əlaqə yoxlamaları ilə bərpa olunur. Dublikat birləşdirmə yalnız Owner/təsdiqli support üçündür; source kart tarixçə ilə saxlanır, onun kabinet girişi dayandırılır. Merge-in tam avtomatik geri qaytarılması yoxdur. Faylların silinməsi ayrıca əməliyyatdır; tam DB backup/point-in-time recovery hosting infrastrukturunda qurulmalıdır.
- MFA hazırkı login hesabını və cookie sessiyasını istifadə edir; Workspace girişi üçün əlavə təsdiqdir. Mövcud public saytın login API-si dəyişdirilmir. 8 birdəfəlik bərpa kodu, OTP replay qoruması və uğursuz cəhd limiti var. Sessiya ləğvi açıq şəkildə istifadəçinin ümumi sayt sessiyasını bağlayır; əməkdaşın Workspace-də deaktiv edilməsi başqa Workspace və şəxsi hesabı bağlamır.

## Yoxlamalar

`WORKSPACE-V2-TEST-RESULTS.md` nəticələri və məhdudiyyətləri göstərir. 248 inteqrasiya və 35 brauzer yoxlaması keçib. TypeScript və Next compile rejimi keçib; standart tam build bu mühitdə dəyişdirilməmiş `/events` prerender mərhələsində test bazasına çıxış alınmadığı üçün tamamlanmayıb. Production-da real `DATABASE_URL` ilə standart `npm run build` yoxlanmalıdır. Təkrar test:

```powershell
npm install --prefix .crm-test-runtime --no-save --ignore-scripts @electric-sql/pglite@0.5.10 @electric-sql/pglite-socket@0.2.13
npm run test:company-crm-v2
npm run test:workspace
npx tsc --noEmit
```

Test RAM-da ayrıca PostgreSQL açır, real production bazasına qoşulmur. SMTP, auth aktoru və cookie store bəzi yoxlamalarda test əvəzedicisidir. Canlı OAuth/Meta/SMTP/AI hesabları və production yükü ayrıca staging yoxlaması tələb edir.

## GitHub-a yalnız bu paketi göndərmək

```powershell
$changedFiles = @(
    Get-Content -LiteralPath "WORKSPACE-V2-FILES.md" -Encoding UTF8 |
    Where-Object { $_ -match '^- `(.+)`$' } |
    ForEach-Object { $Matches[1] }
)
git --literal-pathspecs add -- @changedFiles
git diff --cached --stat
git commit -m "Extend Workspace collaboration, booking, portal and security"
git push
```

İstinadlar: [Google Gmail API](https://developers.google.com/workspace/gmail/api/reference/rest), [Google Calendar events](https://developers.google.com/workspace/calendar/api/v3/reference/events), [Microsoft Graph mail](https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0), [Microsoft calendarView](https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0), [Meta Instagram messaging](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/).
