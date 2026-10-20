# NEW ERA — Sosial hesabların müştəri tərəfindən qoşulması

## Bu paket nə əlavə edir?

Workspace → Ayarlar daxilində Instagram, Facebook Messenger və WhatsApp Business hesablarının rəsmi Meta pəncərəsi ilə qoşulması. Müştəri API açarı daxil etmir; sosial hesabın şifrəsi NEW ERA-ya ötürülmür. Şirkətin ayarlarını dəyişmək səlahiyyəti olan aktiv üzv hesabı seçib ayrıca təsdiqləyir. Platformanın Meta tətbiqləri və icazələri əvvəlcədən aşağıdakı qaydada hazırlanmalıdır.

- Instagram: Instagram Login, peşəkar Business/Creator hesabı.
- Facebook Messenger: Facebook Login və idarə edilən səhifənin seçilməsi.
- WhatsApp Business: Meta Embedded Signup, biznes və nömrə seçimi, lazım olduqda 6 rəqəmli biznes PIN-i ilə qeydiyyat.
- Hər şirkət üçün hər kanaldan bir hesab. Eyni hesab eyni vaxtda başqa şirkətə bağlana bilməz.
- Yeni mətn mesajları Workspace mesajlarına daxil olur. Mövcud müştəri ilə əlaqələndirmə və ayrıca təsdiqlə cavab göndərmə işləyir. İcazə pəncərəsi mövcud hesabdan gələn mesaja görə yoxlanılır.
- Bağlantının yoxlanması, icazənin yenilənməsi, ayrılması və provayderdən icazənin ləğvi emal olunur. Tokenlər serverdə şifrələnir.

Bu paket əvvəlki Workspace V2 və satış idxalı yeniliklərinin üzərinə tətbiq edilir. Public səhifələr, əsas hesab rolları və admin poçt funksiyası yenidən qurulmur. İstehsal bazası və Vercel ayarları bu hazırlanma zamanı dəyişdirilməyib.

## Quraşdırma

1. ZIP-dəki faylları layihənin kök qovluğuna, eyni yolları saxlayaraq çıxarın. Mövcud layihə faylları əvəz olunmalıdır; əlavə iç-içə qovluq yaratmayın.
2. Hazırkı bazanın ehtiyat nüsxəsini və əvvəlki deploy-u saxlayın.
3. Aşağıdakı server dəyişənlərini Vercel-də düzgün environment üçün hazırlayın. `.env` faylını GitHub-a əlavə etməyin.
4. Yeni tətbiq kodu işləməyə başlamazdan əvvəl əlavə migration-u tətbiq edin. Öz bazanıza qoşulan mövcud `DATABASE_URL` istifadə edilir:

```powershell
Set-Location 'C:\Users\User\Downloads\new-era-starter\new-era-starter\new-era-starter\new-era'
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw 'Migration alınmadı. Deploy-u davam etdirməyin.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build alınmadı. Nəticəni yoxlayın.' }
```

Yeni production paketi əlavə olunmayıb. Mövcud asılılıqlar quraşdırılmayıbsa əvvəl `npm ci` işlədin. `migrate reset`, `db push --accept-data-loss` və ya bazanı sıfırlama əmri işlətməyin. Migration yalnız iki cədvəl, onların indekslərini və xarici açarlarını əlavə edir:

`prisma/migrations/20261020103000_workspace_social_connect/migration.sql`

Yeni runtime üçün bu migration mütləq lazımdır. Ayarlar və göndəriş yoxlamaları yeni cədvəllərə müraciət edir. Əvvəlki migration-ları silməyin. Geri deploy zamanı yeni cədvəlləri saxlamaq olar; məlumat silən əks migration yoxdur.

## Server environment dəyişənləri

| Dəyişən | Dəyər / istifadə |
| --- | --- |
| `CRM_APP_URL` | Kanonik HTTPS origin: `https://thenewera.space`. Müştərinin istifadə etdiyi domen və OAuth redirect domeni eyni olmalıdır. |
| `CRM_ENCRYPTION_KEY` | Mövcud 32 baytlıq Base64 və ya 64 simvolluq hex açar. **Mövcud açarı dəyişməyin:** əvvəlki mail və digər şifrəli bağlantılar onu istifadə edir. |
| `CRM_META_APP_ID` | Messenger və WhatsApp üçün platformaya məxsus Meta App ID. |
| `CRM_META_APP_SECRET` | Həmin tətbiqin gizli açarı; yalnız serverdə. |
| `CRM_INSTAGRAM_APP_ID` | Instagram Login konfiqurasiyasındakı Instagram App ID. |
| `CRM_INSTAGRAM_APP_SECRET` | Həmin Instagram tətbiqinin gizli açarı; yalnız serverdə. |
| `CRM_META_GRAPH_VERSION` | Tətbiqdə aktiv və sınaqdan keçirilmiş Graph API versiyası, `vNN.N` formatında. Avtomatik "latest" seçilmir. Mock testlər `v25.0` istifadə edir; bu, production versiyası barədə tövsiyə deyil. |
| `CRM_META_WEBHOOK_VERIFY_TOKEN` | Ən azı 24 simvolluq təsadüfi gizli verification token. Meta webhook ayarlarında eyni dəyəri yazın. |
| `CRM_WHATSAPP_CONFIG_ID` | Facebook Login for Business → WhatsApp Embedded Signup configuration ID. |
| `CRM_WHATSAPP_SESSION_INFO_VERSION` | İstəyə bağlı; standart `4`, uyğun konfiqurasiya üçün `3` seçilə bilər. |
| `CRM_WHATSAPP_COEXISTENCE` | Standart söndürülüb. Yalnız tətbiqinizdə Meta tərəfindən dəstəklənən Business App coexistence onboarding qurulubsa `true`. |

`NEXT_PUBLIC_` prefiksli gizli açar yaratmayın. Müştərinin brauzerinə yalnız açıq App ID, konfiqurasiya ID-si və müvəqqəti OAuth state məlumatı verilir. Mövcud `CRM_PROVIDER_CONFIG`, SMTP, Gmail/Outlook və cron dəyişənlərini saxlayın.

İlk dəfə açar yaratmaq yalnız layihədə heç vaxt `CRM_ENCRYPTION_KEY` olmayıbsa mümkündür. Mövcud açarı yenidən yaratmaq əvvəlki tokenləri oxunmaz edir.

## Meta tətbiqlərinin hazırlanması

Bu addımlar platforma sahibi tərəfindən bir dəfə edilir. Müştərilər bunları etməyəcək.

### Instagram

Instagram API with Instagram Login məhsulunu qurun. Müştəri üçün peşəkar Business/Creator hesabı və mesaj icazəsi tələb edilir. İstənilən OAuth scopes:

- `instagram_business_basic`
- `instagram_business_manage_messages`

Redirect URI:

`https://thenewera.space/api/workspace-social/callback/instagram`

Instagram webhook callback:

`https://thenewera.space/api/workspace-social/webhook/instagram`

Tətbiq səviyyəsində `messages` hadisələrini aktivləşdirin. Deauthorize callback dəstəklənən tətbiq ayarında:

`https://thenewera.space/api/workspace-social/deauthorize/instagram`

### Facebook Messenger

Facebook Login, Messenger/Page webhook və uyğun business tətbiqini qurun. OAuth scopes:

- `pages_show_list`
- `pages_manage_metadata`
- `pages_messaging`

Redirect URI:

`https://thenewera.space/api/workspace-social/callback/messenger`

Page webhook callback (`provider` burada **facebook** adlanır):

`https://thenewera.space/api/workspace-social/webhook/facebook`

Tətbiq səviyyəsində Page `messages` hadisələrini aktivləşdirin. Facebook tətbiqinin deauthorize callback-i:

`https://thenewera.space/api/workspace-social/deauthorize/facebook`

### WhatsApp Business

Eyni Meta biznes tətbiqində WhatsApp və Facebook Login for Business Embedded Signup konfiqurasiyasını hazırlayın. Aşağıdakı icazələri əhatə edən configuration yaradın:

- `whatsapp_business_management`
- `whatsapp_business_messaging`

Kanonik saytı App Domains / SDK üçün icazəli domen və mövcud Meta konsolunun tələb etdiyi HTTPS origin ayarlarına əlavə edin. `CRM_WHATSAPP_CONFIG_ID` həmin tətbiqin konfiqurasiyası olmalıdır. WhatsApp axını SDK-dən qaytarılan code ilə işləyir; Instagram/Messenger kimi ayrıca OAuth redirect route istifadə etmir.

WhatsApp webhook callback:

`https://thenewera.space/api/workspace-social/webhook/whatsapp`

Tətbiq səviyyəsində WhatsApp Business Account `messages` hadisələrini aktivləşdirin. Facebook app deauthorize callback-i WhatsApp grant-lərini də nəzərə alır.

Adi nömrə onboarding-ində tələb olunarsa müştəri WhatsApp biznes 2FA PIN-i daxil edir; bu, sosial hesabın şifrəsi deyil və bazada saxlanmır. Adi Cloud API onboarding və mövcud WhatsApp Business tətbiqi ilə coexistence eyni axın deyil. Mövcud nömrənin keçid tələblərini Meta pəncərəsində yoxlayın. Coexistence rejimini yalnız tətbiq/hesab uyğunluğu Meta tərəfindən təsdiqlənəndə aktivləşdirin; bu paketdə canlı coexistence sınağı aparılmayıb.

### Bütün kanallar üçün

- Webhook verify token bütün callback-lərdə yuxarıdakı server dəyəri ilə eyni olmalıdır. POST payload imzası müvafiq app secret ilə yoxlanır.
- Kodun seçilmiş hesabı `subscribed_apps` vasitəsilə qoşması Meta Developer konsolunda tətbiq səviyyəli webhook konfiqurasiyasını əvəz etmir. Hər ikisi lazımdır.
- Development rejimində əvvəlcə tətbiqin icazəli test hesabları ilə yoxlayın. Real müştərilər üçün tələb olunan App Review/Advanced Access, biznes yoxlanması, tətbiqin Live rejimi və WhatsApp Tech Provider/onboarding uyğunluğu Meta tərəfindən tamamlanmalıdır. Hansı icazələrin lazım olduğu tətbiqin məhsulundan və Meta konsolundan asılıdır.
- Meta tətbiqinə düzgün privacy policy və məlumat silinməsi təlimatı/prosesi üçün real URL-lər əlavə edin. Bu paket məlumat silinməsi hüquqi prosesini və ayrıca Meta data-deletion callback-ini implementasiya etmir. Deauthorize endpoint hesab bağlantısını dayandırır, CRM məlumatlarını avtomatik silmir.
- Əgər təhlükəsizlik siyasətiniz xarici script/popup-ları bloklayırsa, rəsmi Meta SDK və login domenlərinin işləməsinə uyğun icazələr lazımdır. Popup bloklandıqda Instagram/Messenger üçün ayrıca açma keçidi göstərilir.

Rəsmi mənbələr:

- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation
- https://github.com/fbsamples/business-messaging-sample-tech-provider-app
- https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login
- https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api

## Müştərinin istifadə axını

1. Mövcud NEW ERA hesabı ilə Workspace-ə daxil olur və şirkətini seçir.
2. Ayarlar → Sosial hesablarınız bölməsində kanalı qoşur.
3. Rəsmi platforma pəncərəsində login/2FA və icazə əməliyyatını tamamlayır.
4. Sistemə qayıtdıqda serverin Meta-dan aldığı hesabı seçib qoşulmanı təsdiqləyir. WhatsApp üçün əvvəl hazırlıq, sonra ayrıca "Meta pəncərəsini aç" düyməsi var.
5. Uğurlu hesab subscription-u təsdiqlənəndən sonra "Qoşulub" görünür. Yeni mətn mesajları Mesajlar bölməsində görünür; müştəri qeydinə bağlanıb uyğun kanaldan cavablandırıla bilər.

İcazə verən üzv deaktiv edilərsə əlaqə vasitəsilə giriş dayandırılır; aktiv səlahiyyətli üzv yenidən qoşmalıdır. Sınağı bitmiş/dayandırılmış şirkətdə sosial yazma, qəbul və fon yeniləmələri işlədilmir; təhlükəsizlik üçün bağlantını ayırmaq yenə mümkündür.

## Mövcud funksiyalar və məhdudiyyətlər

- Gmail/Outlook və adminin şəxsi poçtu olduğu kimi qalır. Admin məktubları Workspace-lərə paylaşılmır.
- Əvvəlki manual Instagram/WhatsApp konfiqurasiyası idarə olunan bağlantısı olmayan şirkətlərdə işləməyə davam edir. Həmin kanalda yeni idarə olunan bağlantı sətri olduqda o üstünlük qazanır; ayırma köhnə tokeni avtomatik yenidən aktivləşdirmir. Köhnə fərdi webhook həmin halda nəzərə alınmır ki, mesajlar təkrarlanmasın.
- Bu versiyada hesab başına yeni **mətn** mesajları və istifadəçinin təsdiqlədiyi mətn cavabları var. Tarixi yazışmaların idxalı, media/əlavələr, WhatsApp template göndərişi, kütləvi kampaniya, paylaşım/story/reels planlaşdırması və reklam statistikası yoxdur.
- WhatsApp/Messenger/Instagram cavabları kanalın tətbiq etdiyi cavab müddəti daxilində yoxlanılır. Bu, WhatsApp-da istənilən nömrəyə soyuq kommersiya təklifi göndərmək funksiyası deyil. Bunun üçün ayrıca template/razılıq axını lazımdır.
- Hesab dəyişmək üçün əvvəl mövcud bağlantını ayırmaq lazımdır. Yeni hesab seçimi açıq təsdiq tələb edir.
- Webhook-lar real vaxt HTTP qəbuludur. Token sağlamlığı/Instagram refresh mövcud `/api/workspace-jobs` fon işinə əlavə olunub. Hər icrada ən çox 3 köhnəlmiş bağlantı yoxlanılır. Mövcud gündəlik cədvəl çox şirkət üçün kifayət etməyə bilər; uyğun platforma planında daha tez işləyən scheduler qurun və `CRM_CRON_SECRET`/`CRON_SECRET` ilə mövcud Bearer yoxlamasını qoruyun. Cron olmadan vaxtı bitmiş token avtomatik bərpa olunmur; UI-dən yenidən icazə vermək mümkündür.

## Yoxlamalar

- 144 sosial inteqrasiya yoxlaması: real Prisma + ayrıca müvəqqəti PostgreSQL/PGlite; əlavə migration, mövcud data, token şifrələnməsi, session/state replay, hesab seçimi, şirkət təcridi, imzalı webhook, təkrarlanma, deaktivasiyalar, ayrılma, cavab pəncərəsi və köhnə davranışlar.
- Əvvəlki Workspace V2 suite: 248 yoxlama keçdi.
- Brauzer suite: popup callback, Instagram/Messenger seçimi, WhatsApp Embedded Signup imitasiya edilmiş SDK + PIN, saxta origin-in rəddi, ayrılma; birlikdə 161 assertion. 1440, 390 və 320 px görünüşlərdə üfüqi daşma və JS xətası müşahidə edilmədi.
- `npx tsc --noEmit` keçdi.
- Next.js `build --experimental-build-mode compile` keçdi. Bu, public səhifələrin real baza ilə tam prerender/build sınağını əvəz etmir. Tam `npm run build` sizin baza bağlantınızla deploy-dan əvvəl işlədilməlidir.
- Bütün Meta HTTP/SDK çağırışları testdə imitasiya edilib. Canlı Meta hesabı qoşulmayıb, real sosial mesaj/e-poçt göndərilməyib, production bazaya dəyişiklik edilməyib. App Review/Advanced Access və real hesab sınağı hələ xarici quraşdırma addımıdır.

Sosial suite-ni yenidən işlətmək üçün Node 20+, mövcud layihə paketləri və yalnız testə aid runtime lazımdır:

```powershell
npm install --prefix .crm-test-runtime --no-save --ignore-scripts --package-lock=false @electric-sql/pglite@0.5.10 @electric-sql/pglite-socket@0.2.13
npm run test:workspace-social
```

Test production `DATABASE_URL` istifadə etmir, ayrıca localhost 55443 bazasını açır və Meta HTTP-ni mock edir. Port boş olmalıdır. `.crm-test-runtime`, `node_modules`, `.env` və müvəqqəti test fayllarını GitHub-a göndərməyin; yalnız paketdəki manifest yollarını stage edin.

## Canlı quraşdırmadan sonra qəbul sınağı

İki fərqli test şirkəti yaradın. Birində hər kanalı qoşun; digəri həmin hesabı qoşa və mesajlarını görə bilməməlidir. Xarici test hesabından hər kanala mətn göndərin, Workspace-də görünməsini və uyğun müştəriyə bağlandıqdan sonra təsdiqlə cavabın çatmasını yoxlayın. Sonra bağlantını ayırın və yeni qəbul/göndərişin dayanmasını təsdiqləyin. İcazəni Meta tərəfində ləğv edib yenidən qoşulma vəziyyətini yoxlayın. Bu real sınaq tamamlanmadan müştərilərə bütün kanalları canlı və hazır elan etməyin.
