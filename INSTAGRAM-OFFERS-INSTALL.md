# NEW ERA — Admin təkliflərini Instagram ilə göndərmək

## Haradadır?

**Super Admin → Satışlar → Onlayn təkliflər**:

- Yuxarıda **Admin Instagram hesabı → Instagram bağlantısı** kartı.
- Yayımlanmış, aktiv təklifin içində **Instagram ilə göndər** düyməsi.
- Ayrıca qoşulma ekranı: `/admin/sales-instagram`.

Bu, NEW ERA platformasının öz satış hesabıdır. Müştəri Workspace-lərinin Instagram hesablarından token və mesaj oxunmur, adminə avtomatik paylaşılmır. Mövcud Workspace OAuth, webhook, poçt, giriş və qeydiyyat kodu dəyişmir.

## Vacib məhdudiyyət

Instagram API vasitəsilə istifadəçi adını daxil edib istənilən profilə ilk reklam mesajı göndərmək mümkün olan bir sistem hazırlanmır. Bu modul **hesabınıza əvvəlcə mesaj yazmış** şəxslərə **son daxil olan mesajından 24 saat ərzində** bir təklif linkini operator təsdiqi ilə göndərir. HUMAN_AGENT və digər pəncərə uzatma teqləri istifadə olunmur. Kütləvi Instagram kampaniyası və avtomatik xatırlatma bu paketə daxil deyil.

Instagram bağlantısı, Meta icazələri və imzalı yeni mesaj webhook-u yoxdursa göndəriş açılmır. Şifrə NEW ERA-ya daxil edilmir; rəsmi Instagram giriş pəncərəsi istifadə olunur.

## İstifadə axını

1. Super Admin **Instagram bağlantısı** ekranını açır və **Instagram hesabını qoş** seçir.
2. Rəsmi Instagram pəncərəsində öz Professional hesabına daxil olub icazələri verir.
3. NEW ERA-ya qayıdanda hesabın adı/ID-si göstərilir. Təsdiq xanasını işarələyib **Bu hesabı qoş** seçir. Sadəcə callback-ə qayıtmaq hesabı avtomatik dəyişmir.
4. Müştəri bu hesaba DM yazır. İmzalı webhook gəldikdə həmin şəxs yazışma seçimində görünür. Əvvəlki inbox avtomatik idxal edilmir.
5. Onlayn təklifi hazırlayıb yayımlayın. **Instagram ilə göndər** düyməsi ilə həmin yazışmanı seçin.
6. Mesajın girişini redaktə edə bilərsiniz. Təklifin tam təhlükəsiz linkini server özü əlavə edir. Mətnə/alıcıya baxış göstərilir: göndərən hesab, alıcı ID-si, mümkün olduqda provayderdən gələn ad, son daxil olan mesaj, təklifin müştərisi və e-poçtu.
7. Yazışmanın məhz bu müştəriyə aid olduğunu və göndərişi ayrıca təsdiqləyin. Instagram adından e-poçt avtomatik təxmin edilmir; düzgün əlaqələndirmə operator tərəfindən yoxlanır.
8. Göndərişin nəticəsi təklif tarixçəsinə və satış fəaliyyətinə yazılır. Müştəri təklif linkindən qeydiyyatsız baxır, qəbul üçün yenə təklifdəki e-poçtuna kod alır.

Profil adı ilk önbaxışda provayderdən alınmağa çalışılır. Alınmasa, ad uydurulmur: Instagram Scoped ID və imzalı daxil olan mesaj göstərilir. Alıcının kimliyinə əmin deyilsinizsə göndərməyin.

**API qəbul etdi** yalnız Instagram API-nin `message_id` ilə mesajı qəbul etdiyini bildirir; oxunma və çatdırılma statusu deyil. Bu paket delivery/read tracking implementasiya etmir.

## Meta tətbiqinin bir dəfəlik hazırlanması

Mövcud şirkət Workspace-lərinin callback/webhook ünvanlarını dəyişməmək üçün bu modul **ayrıca platforma Instagram tətbiqi** ilə işləyir. CRM_INSTAGRAM_APP_ID ilə eyni tətbiq ID-si serverdə qəbul edilmir. Mövcud müştəri inteqrasiyasını bu ünvanlarla əvəz etməyin.

Platforma tətbiqində Instagram API with Instagram Login / Business Login üçün:

- Instagram Professional hesabından istifadə edin.
- `instagram_business_basic` və `instagram_business_manage_messages` icazələri lazımdır.
- Valid OAuth redirect URI:
  `https://www.thenewera.space/api/sales-instagram/callback`
- Instagram webhook callback:
  `https://www.thenewera.space/api/sales-instagram/webhook`
- Webhook verify token: Vercel-dəki `SALES_INSTAGRAM_WEBHOOK_VERIFY_TOKEN` ilə eyni dəyər.
- `messages` webhook sahəsini aktivləşdirin. Hesabın tətbiqə abunəliyi ayrıca **Bu hesabı qoş** təsdiqində API ilə edilir.
- Deauthorize callback:
  `https://www.thenewera.space/api/sales-instagram/deauthorize`
- Tətbiqin rejimi, real istifadəçilər üçün icazələr/App Review, tələb olunan biznes yoxlaması və Meta tərəfində yayımlanması tamamlanmalıdır. Test rejimində yalnız Meta-nın icazə verdiyi test rolları ilə yoxlayın; kod bu məhdudiyyətləri aradan qaldırmır.

Ünvanlar kanonik `SALES_OFFER_APP_URL` ilə tam uyğun olmalıdır. Başqa domen istifadə edirsinizsə Meta-da həmin HTTPS origin-i qeyd edin. Callback və webhook-da müştərinin Workspace ID-si yoxdur: kanal yalnız platformaya aiddir.

## Vercel environment

| Dəyişən | Dəyər |
| --- | --- |
| `SALES_INSTAGRAM_APP_ID` | Platformanın ayrıca Instagram tətbiqinin ID-si. |
| `SALES_INSTAGRAM_APP_SECRET` | Həmin Instagram tətbiqinin gizli açarı. |
| `SALES_INSTAGRAM_GRAPH_VERSION` | Meta tətbiqinizdə dəstəklənən konkret `vNN.N` versiyası. Verilməsə mövcud `CRM_META_GRAPH_VERSION` istifadə edilir. Versiya təxmin edilmir. |
| `SALES_INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | Ən azı 32 simvolluq ayrıca təsadüfi dəyər. Meta webhook verify token sahəsində də eyni dəyəri yazın. App Secret ilə eyniləşdirməyin. |
| `CRM_ENCRYPTION_KEY` | Mövcud 32-byte açar (hex/base64). **Mövcud açarı dəyişməyin**: başqa bağlantıların şifrəsi də onunla qorunur. |
| `SALES_OFFER_APP_URL` | Əvvəlki təklif modulundan kanonik HTTPS origin, məsələn `https://www.thenewera.space`. Alternativ əvvəlki `CRM_APP_URL` fallback-i saxlanır. |
| `SALES_OFFER_SECRET` | Əvvəlki təklif modulunun mövcud imza açarı, ən azı 32 simvol. Dəyişməyin. |

Webhook verify token-i öz terminalınızda yaradın:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Açarları `.env`/Vercel server dəyişənlərində saxlayın, GitHub-a və yazışmaya əlavə etməyin. Hesabın tokeni OAuth vasitəsilə alınır və bazada mövcud AES-256-GCM mexanizmi ilə şifrələnir. Adminə, URL-ə və public API-yə token qaytarılmır. Token bitəndə yenidən qoşulmaq lazımdır; avtomatik token refresh işi bu əlavəyə daxil deyil.

## Faylların tətbiqi və migration

Əvvəlki **Onlayn təkliflər** paketi layihədə olmalıdır. Bu paket yalnız Instagram əlavəsinə aid dəyişən fayllardır. Əvvəlki migration-ları saxlayın.

1. ZIP-i layihənin kökünə çıxarın və eyni faylları əvəz edin.
2. Bazanın ehtiyat nüsxəsini saxlayın. Lokal `DATABASE_URL` düzgün sayta/bazaya aid olsun.
3. Environment dəyişənlərini Vercel-də hazırlayın.
4. Yeni production kodundan əvvəl əlavə migration-u və build-i işlədin:

```powershell
& {
    Set-Location 'C:\Users\User\Downloads\new-era-starter\new-era-starter\new-era-starter\new-era'
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw 'Migration alınmadı. Nəticəni yoxlayın.' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build alınmadı. Nəticəni yoxlayın.' }
}
```

Migration: `prisma/migrations/20261021160000_sales_instagram/migration.sql`.

Yalnız 5 yeni cədvəl, əlaqə və indeks əlavə olunur:
`SalesInstagramAccount`, `SalesInstagramAuth`, `SalesInstagramThread`, `SalesInstagramInbound`, `SalesInstagramDelivery`.
Mövcud cədvəl/məlumat silinmir, baza sıfırlanmır. `migrate reset` işlətməyin. Yeni npm paketi yoxdur, package.json/lock dəyişmir. Cron tələb olunmur.

## Təhlükəsizlik və göndəriş nəticələri

- Aktiv və təsdiqlənmiş ADMIN / SUPER_ADMIN, mövcud MFA, POST üçün eyni origin yoxlanır. Hesabı qoşmaq/ayırmaq yalnız SUPER_ADMIN üçündür. Şirkət Owner-i bu səlahiyyəti qazanmır.
- OAuth state təsadüfi, hash-lənmiş, 10 dəqiqəlik, istifadəçi və konkret aktiv sessiyaya bağlıdır. Callback birdəfəlikdir. Hesab seçimi ayrıca POST ilə təsdiqlənir. Qoşulmaya 10 dəqiqədə 5 cəhd limiti var.
- App ID/secret, API versiyası və kanonik domen dəyişərsə mövcud bağlantı/önbaxış yenidən yoxlanmalıdır.
- Webhook x-hub-signature-256 App Secret ilə xam gövdə üzərində yoxlanır. Recipient/account/sender ID-ləri, echo və timestamp yoxlanır. Çatdırılma, oxunma, silmə, edit və naməlum hadisələr 24 saatlıq pəncərəni açmır.
- Eyni message ID təkrar gələndə pəncərə yenilənmir. Gecikmiş köhnə hadisə son mesaj tarixini geriyə/irəli saxta dəyişmir. Əsassız/future timestamp hazırkı vaxtla əvəz edilmir.
- Alıcı yalnız hazırkı hesabın imzalı daxil olan mesajlarından seçilir. İstifadəçi adı/IGSID daxil etməklə alıcı yaratmaq mümkün deyil. Hesab dəyişəndə əvvəlki hesabın yazışmaları yeni siyahıda görünmür.
- Önbaxış 5 dəqiqəlik HMAC təsdiqi ilə istifadəçiyə, təklif versiyasına, alıcıya, mətnə, göndərən hesabın revision-una və son mesaj tarixinə bağlıdır. Saxtalaşdırma və dəyişmiş önbaxış rədd olunur.
- Göndərişdən dərhal əvvəl aktiv təklif, müddət, token, hesab və 24 saat pəncərəsi yenidən yoxlanır.
- Paralel/təkrar sorğu ikinci göndəriş yaratmır. Saatda ümumi 30 cəhd, bir təklif versiyası üçün maksimum 3 cəhd var. Birinci cəhddən sonra başqa alıcı/hesaba dəyişmək mümkün deyil.
- `API_ACCEPTED`: provayder message_id verdi. Eyni versiya yenidən göndərilmir.
- `REJECTED`: provayder müəyyən HTTP 4xx xətası ilə rədd etdi. Problem düzəldildikdən sonra operator yeni önbaxış hazırlayıb ayrıca təsdiqlə yenidən cəhd edə bilər; avtomatik retry yoxdur.
- `UNCERTAIN`: timeout, səhv/cavabsız provider nəticəsi və ya göndərişdən sonra bazaya yazma alınmadı. Instagram-da yoxlayın; bu versiya təkrar göndərilmir.
- `SENDING`: cəhd bazada rezervasiya olunub. Funksiya yarımçıq qalarsa da avtomatik təkrar edilmir. Bu vəziyyət təkbaşına çatdırılmanı sübut etmir.
- `CANCELLED`: son yoxlamada bağlantı/təklif dəyişdiyinə görə şəbəkə göndərişinə başlanmadı.
- Bağlantını ayırmaq gələcək göndərişləri dayandırır və lokal tokeni silir. Artıq Meta-ya verilmiş mesajı geri çağırmaq olmur. Meta hesabındakı tətbiq icazəsini ayrıca silmək mümkündür; deauthorize callback də lokal bağlantını bağlayır.
- Satışın faktiki gəliri, satış mərhələsi və ödənişi avtomatik dəyişmir. Müştəri artıq cavab veribsə göndəriş yekun statusu geri çevirmir.

## Yoxlamalar və qalan xarici işlər

Real Prisma + müvəqqəti PostgreSQL/PGlite ilə migration sonrası köhnə satışın saxlanması, admin/Owner/MFA, OAuth/session/replay, şifrəli token, imzalı webhook, təkrar/gecikmiş mesajlar, bağlı pəncərə, önbaxış saxtalaşdırması, ayrıca təsdiq, paralel sorğular, provayder xətaları, hesab dəyişməsi, token vaxtı və deauthorize yoxlanılıb.

Brauzerdə real UI/API/baza ilə 1440/390/320 px: təklifdən yazışma seçimi, bitmiş pəncərənin deaktiv olması, mətn/alıcı önbaxışı, təsdiq xanası, yalnız bir mock göndəriş və bağlantı ekranı yoxlanılıb. TypeScript və Next production compile nəticələri yoxlanılıb. Əvvəlki onlayn təklif, e-poçt kampaniyası və satış idxalı testləri keçib. Tam `npm run build` real baza ilə sizin mühitdə işlədilməlidir.

Meta və SMTP testlərdə imitasiya edilib. Canlı Meta hesabı, tətbiq təsdiqi, webhook verifikasiyası, production migration, Vercel dəyişənləri və GitHub push bu hazırlanma zamanı edilməyib; real mesaj göndərilməyib.

Əlavə test (Node 20+, boş localhost 55447):

```powershell
npm install --prefix .crm-test-runtime --no-save --ignore-scripts --package-lock=false @electric-sql/pglite@0.5.10 @electric-sql/pglite-socket@0.2.13
node tests/sales-instagram.integration.cjs
```

Öz nəzarətinizdə olan test Instagram hesabından NEW ERA hesabına DM yazın. Webhook vaxtı və düzgün alıcı siyahısını yoxlayın. Öz test e-poçtunuza hazırlanmış bir təklifi seçib ayrıca təsdiqlə göndərin, linkin Instagram tətbiqindən tam açıldığını və qəbul kodunun işlədiyini yoxlayın. Sonra real müştərilər üçün istifadəyə keçin.

Rəsmi texniki mənbələr:
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api/user-profile
- https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/send-message
