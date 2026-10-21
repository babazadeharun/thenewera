# NEW ERA — Onlayn xidmət təklifləri

## Haradadır və necə işləyir?

Əsas platforma admin paneli → Satışlar → **Onlayn təkliflər**.

Bu modul platforma ADMIN / SUPER_ADMIN üçündür. Şirkət Workspace Owner-i platforma satışlarına və admin poçtuna giriş qazanmır. Mövcud satış idxalı, kampaniyalar, Workspace, qeydiyyat, login və poçt ekranları saxlanılır.

1. Mövcud satış üçün yeni təklif yaradın. Alıcının e-poçtunu və əlaqə şəxsini yoxlayın; kod həmişə bu təklifdəki sabit e-poçta gedir.
2. Hər xidmətə başlıq, ətraflı təsvir, konkret iş həcmi/təhvil verilənlər, müddət və daxil olmayan işləri yazın. Say və vahid qiyməti özünüz müəyyən edin.
3. AZN / USD / EUR, aylıq və ya birdəfəlik xidmət, ümumi endirim, ödəniş şərtləri və etibarlılıq tarixi seçin. Aylıq və birdəfəlik xidmətlər ayrı təkliflərdə hazırlanır; bir dəfə ödənən məbləğ aylıq ödəniş kimi göstərilmir. Qiymətlər qəpik/sentlə tam ədəd kimi hesablanır və serverdə yenidən yoxlanır. Vergilər avtomatik hesablanmır; daxil olub-olmadığını şərtlərdə aydın yazın.
4. Qaralamanı saxlayın, **Müştəri görünüşü** ilə məzmunu yoxlayın. Saxlamaq məktub göndərmir.
5. Yoxlama xanasını işarələyib yayımlanmanı ayrıca təsdiqləyin. Link yaranır. Linki kopyalayıb paylaşın və ya ayrıca təsdiqlə **E-poçtla göndər** düyməsini istifadə edin. WhatsApp-a avtomatik göndəriş əlavə edilmir; linki özünüz paylaşa bilərsiniz.
6. Müştəri xüsusi linklə `/offer/[id]` səhifəsini açır. Qeydiyyat və giriş tələb olunmur. Xidmətlər, şərtlər, valyuta, endirim və yekun qiymət görünür.
7. Müştəri qəbul, dəyişiklik, imtina və ya görüş sorğusu seçir. Hər cavab üçün müştərinin e-poçtuna birdəfəlik kod gedir. Kodu daxil edib təsdiqləməyənədək cavab qeydə alınmır. Sadəcə linki açmaq qəbul sayılmır.
8. Cavab satış statusuna və tarixçəsinə yazılır; dəyişiklik/görüş üçün dərhal FOLLOW_UP qeydi yaranır. Satış mərhələsi, faktiki gəlir və ödənişlər avtomatik dəyişmir. Bu ünvana gözləyən admin kampaniya xatırlatmaları dayanır; SMTP-yə artıq verilmiş məktubu geri çağırmaq olmur.
9. **Yenilə** ilə son cavabı və açılış vaxtlarını görün. Bu versiya real vaxt push/bildiriş xidməti deyil.

**Görüş istə** vaxt rezervasiyası deyil: müştəri uyğun gün/saat və mövzunu yazır, komanda sonra razılaşdırır. Google/Outlook təqvim rezervasiyası bu əlavədə yoxdur.

## Versiyalar və tarixçə

- Yayımlanmış məzmun və qiymət dəyişmir. Eyni satış üçün yeni qaralama yaradın və yeni versiya kimi yayımlayın.
- Yeni qaralama saxlanarkən əvvəlki aktiv link qalır. Yeni versiya yayımlandığı anda əvvəlki link və kodlar bağlanır; köhnə xidmətlər/qiymət tarixçədə saxlanılır.
- Qəbul olunmuş təklif dəyişdirilmir, əvəz edilmir və linki admin tərəfindən geri çağırılmır. Sonrakı iş üçün ayrıca satış hazırlayın.
- Admin **Versiyalar** düymələri ilə həmin satışın əvvəlki qiymət və məzmununa baxa bilir.
- Açılış vaxtları link aktivliyidir; insanın oxuduğunu sübut etmir. İzləmə pikseli və oxunma zəmanəti yoxdur.
- Qəbul e-poçt kodu ilə təklif təsdiqidir. Elektron imza sertifikatı, müqavilə imzalama və real ödəniş provayderi əlavə edilməyib.

## Quraşdırma

Bu paket GitHub `babazadeharun/thenewera` main-dəki satış kampaniyası və sosial qoşulma yeniləmələri üzərində hazırlanıb. Mövcud faylların bazası GitHub-dan yoxlanılıb. Əvvəlki fayl və migration-ları saxlayın.

1. ZIP-i layihənin kökünə çıxarın, eyni yollardakı faylları əvəz edin.
2. Bazanın ehtiyat nüsxəsini saxlayın. Lokal `DATABASE_URL` saytın istifadə etdiyi düzgün bazaya aid olsun.
3. Vercel-in production environment bölməsinə aşağıdakı iki dəyişəni əlavə edin.
4. Yeni production kodundan əvvəl əlavə migration-u tətbiq edib build edin:

```powershell
& {
    Set-Location 'C:\Users\User\Downloads\new-era-starter\new-era-starter\new-era-starter\new-era'
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw 'Migration alınmadı. Nəticəni yoxlayın.' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build alınmadı. Nəticəni yoxlayın.' }
}
```

Yeni migration: `prisma/migrations/20261021100000_sales_online_offers/migration.sql`.
Yalnız `SalesOffer`, `SalesOfferChallenge`, `SalesOfferEvent` cədvəlləri, indekslər və əlaqələr əlavə olunur. Mövcud cədvəl və məlumat silinmir. `migrate reset` işlətməyin. Yeni paket asılılığı yoxdur; `package.json` və lock dəyişməyib.

## Environment

| Dəyişən | Dəyər |
| --- | --- |
| `SALES_OFFER_SECRET` | Ayrı, ən azı 32 simvolluq təsadüfi gizli açar. Təklif linklərini və kod hash-lərini qoruyur. Mövcud auth/CRM/kampaniya açarlarını əvəz etmir. |
| `SALES_OFFER_APP_URL` | Kanonik HTTPS origin: məsələn `https://www.thenewera.space`. Sonunda yol/query/fragment olmasın. Verilməsə `CRM_APP_URL` istifadə edilir. Müştəri linklərini birbaşa bu domenlə paylaşın. |

Öz terminalında açar yaratmaq üçün:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Nəticəni Vercel-də `SALES_OFFER_SECRET` kimi saxlayın. `.env` və açarları GitHub-a daxil etməyin. Açar sonradan dəyişsə, əvvəlki link və kodlar etibarsız olur. Daim sabit və gizli saxlayın.

Mövcud admin `MAIL_SMTP_*`, `MAIL_FROM_ADDRESS/NAME` (və mövcud EVENT_EMAIL fallback) istifadə olunur. Admin poçtunun əvvəlki davranışı dəyişdirilmir. OTP üçün IMAP və əlavə cron tələb olunmur. E-poçt kampaniyalarının əvvəlki scheduler tələbi isə ayrıca qalır.

Yayımlamaq SMTP konfiqurasiyası tələb edir; real poçt bağlantısının işləməsi ayrıca öz test ünvanınızla yoxlanmalıdır. SMTP qəbulunu inbox-a çatdırılma və ya oxunma kimi göstərmirik. Link göndərişi üçün nəticə qeyri-müəyyəndirsə avtomatik təkrar yoxdur; poçtda yoxlayın. `SENDING` vəziyyətində yarımçıq qalmış göndərişi də təkrar basmaq olmaz; linki əl ilə paylaşmaq mümkündür.

## Təhlükəsizlik və limitlər

- Əsas admin icazəsi, aktiv/təsdiqlənmiş hesab və mövcud MFA yoxlanır. Workspace rolu platforma admin rolu deyil.
- Xüsusi linkdə 256-bit HMAC token var; bazada yalnız token hash-i saxlanır. Token URL fragmentində (`#...`) olur, API-yə yalnız POST gövdəsində ötürülür. Linki bütöv paylaşın; `#` hissəsini silməyin. Link sahibinə müddət ərzində baxış verilir, buna görə aidiyyəti şəxslərlə paylaşılmalıdır.
- Public API mövcud hesab sessiyasından asılı deyil; alıcının ünvanını dəyişməyə imkan vermir. Kod hash-i, admin məlumatları və tam e-poçt public cavaba daxil deyil. Mətnlər HTML kimi icra edilmir.
- Hər cavab kodu konkret təklif/versiya, seçim və qeyd mətninə bağlıdır. Kod 10 dəqiqə etibarlı, ən çox 5 cəhdlidir. Yenidən kod istəmə: ən azı 60 saniyə ara, e-poçta saatda 3/gündə 10, ümumi saatda 100. Yeni kod əvvəlkini bağlayır; uğursuz göndərişlər də limitə sayılır.
- Eyni qəbulun paralel və təkrar təsdiqi ikinci tarixçə/status əməliyyatı yaratmır.
- Müddəti bitmiş, bağlanmış və əvəzlənmiş link/codlarla əməliyyat mümkün deyil. Admin tarixçəni saxlayır.
- Admin link məktubları ümumi saatda 30 cəhd ilə məhduddur; bir versiya üçün uğurlu və qeyri-müəyyən göndəriş avtomatik təkrarlanmır.
- Public səhifə və API no-store, noindex/nofollow, no-referrer prinsipi ilə qurulub. Public navbar yalnız yeni `/offer/` səhifəsində gizlənir; digər səhifələrdə menyu dəyişmir.

## Yoxlamalar

- Real Prisma + müvəqqəti PostgreSQL/PGlite: əlavə migration-dan sonra köhnə satış saxlanılır; icazə/MFA/mənbə, məbləğlər, qaralama/yayım, token/müddət, versiyalar, SMTP xətaları, kod/limitlər, dəyişiklik/görüş/imtina, paralel qəbul və kampaniya dayandırılması yoxlanılıb.
- Real React UI + həmin API/baza ilə brauzer: admin redaktoru, qiymət/endirim, önbaxış, ayrıca yayım, qeydiyyatsız desktop/mobil səhifə və kodla qəbul. 1440, 390 və 320 px yoxlanılıb.
- Əvvəlki e-poçt kampaniyası 140 yoxlama, satış idxalı/izləməsi 79 yoxlama keçib.
- TypeScript və Next production compile keçib. Tam `npm run build` real `DATABASE_URL` ilə sizin mühitdə işlədilməlidir.
- SMTP testlərdə imitasiya edilib. Production migration, Vercel environment, GitHub push və real məktub göndərişi bu hazırlanma zamanı icra edilməyib. Login/qeydiyyat kodu dəyişdirilməyib; canlı giriş axını ayrıca yoxlanmayıb.

Müvəqqəti lokal bazada test üçün (real DATABASE_URL istifadə olunmur):

```powershell
npm install --prefix .crm-test-runtime --no-save --ignore-scripts --package-lock=false @electric-sql/pglite@0.5.10 @electric-sql/pglite-socket@0.2.13
node tests/sales-offers.integration.cjs
```

Test localhost 55446 portunu istifadə edir. Test runtime, `.next`, `node_modules`, müvəqqəti QA və ehtiyat faylları GitHub-a əlavə etməyin.

## Canlı qəbul yoxlaması

Öz nəzarətinizdə olan test e-poçtu ilə bir satış/təklif yaradın. Xidmətlər, qiymət və şərtləri yoxlayın. Yayımlayın, çıxış edilmiş brauzerdə tam linki açın, kod göndərilməsini və qəbulu yoxlayın. Sonra ayrı test satışında dəyişiklik/görüş/imtina sorğularını sınayın. Əsas müştəri siyahısına bu sınaq zamanı göndəriş etməyin.
