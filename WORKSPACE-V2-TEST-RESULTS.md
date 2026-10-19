# Workspace Collaboration V2 — yoxlama nəticələri

Tarix: 19 oktyabr 2026. Mənbə: istifadəçinin göndərdiyi son `new-era-latest.zip`. Production deploy və canlı provayder bağlantısı bu yoxlamaya daxil deyil.

| Yoxlama | Nəticə |
| --- | --- |
| Yeni inteqrasiya suite | **248 yoxlama keçdi.** In-memory PostgreSQL (PGlite), real Prisma və route handler-ləri. |
| Mövcud authorization suite | `npm run test:workspace` keçdi; agentlik layihəsi, promoter və mövcud Workspace icazə testləri. |
| TypeScript | `tsc --noEmit` keçdi. |
| Prisma schema | `prisma validate` keçdi. |
| Migration | Əvvəlki sxem və saxlanılmış User/CRM qeydi/fayl üzərində tətbiq edildi. Köhnə məlumatlar qaldı, `pipelineId=main`, yeni custom/preferences default-ları və köhnə faylın private vəziyyəti yoxlandı. |
| Next build compile rejimi | `next build --experimental-build-mode compile` uğurla tamamlandı. |
| Standart tam production build | Compilation/type mərhələləri keçdi; dəyişdirilməmiş `/events` prerender mərhələsində bu mühitdə lokal test DB xidmətinə çıxış `P1001` ilə alınmadı. Real deployment bazası ilə standart build yenidən tamamlanmalıdır. |
| Brauzer | **35 yoxlama keçdi**, 1440/390/320 px; 10 bölmənin hər üç ölçüdə sənəd daşması yoxlaması və real forma əməliyyatları. |
| Xarici provayderlər | Real SMTP/OAuth/Meta/AI hesabları verilmədiyi üçün canlı bağlantı yoxlanmayıb. Webhook və AI cavabı üçün nəzarətli test payload/cavabları istifadə olunub. |

## İnteqrasiya yoxlamalarının əhatəsi

- Mövcud qeydiyyat, OTP təsdiqi, login, cookie sessiyası və logout handler-ləri; səhv şifrə/kod.
- Bir şirkətin digərinə girişinin və əlaqəli FK-lərlə başqa şirkətin qeydinə bağlanmasının rəddi.
- Owner-in platforma Super Admin hüququ əldə etməməsi, səbəbli READ/WRITE support rejimi və PLATFORM müəllifliyi.
- Trial tarixləri, dəvətin trial-ı yenidən başlatmaması, expiry-də yazma/fon əməliyyatlarının dayanması, manual aktivləşdirmə, workspace üzrə deaktivlik.
- Fərdi sahələrin tələb/tip/seçim yoxlaması; əlavə satış prosesi, mərhələ şərti, istifadə olunan prosesin silinməsinin rəddi.
- Təklifin məbləğinə görə təsdiq, səlahiyyətsiz qərarın rəddi, şərtlər dəyişəndə əvvəlki təsdiqin keçərsiz olması.
- Silinmiş qeydin bərpası, icazəsiz bərpanın rəddi, şəxsi görünüşün başqa əməkdaşa çıxmaması.
- Müştəri tarixçəsində yalnız icazəli əlaqəli qeydlər; rəhbər ekranında scoped cavabsız yazışmalar və həqiqi saylar.
- Dublikat birləşdirmədə bağlı işlərin target-a ötürülməsi, source tarixçəsinin saxlanması və adi restore ilə merge-in açılmaması.
- Yazışma kilidində ikinci əməkdaşın rəddi, daxili qeydlər və başqa şirkətdən conversation girişinin rəddi.
- CSV quoted/newline hüceyrələri, real XLSX parser, dublikat import sətrinin xətası, eyni batch-in təkrar qeydlər yaratmaması, icazəsiz importun rəddi.
- Rezervasiya vaxtları, eyni vaxtın alınmaması, real paralel sorğuda yalnız bir rezervasiya, təkrar requestKey, başqa istifadəçinin ləğvinin rəddi və trial expiry.
- Aktiv rezervasiyanın təqvim qeydi vasitəsilə silinməsinin rəddi; əməkdaş təqvimdən ləğv edəndə booking vəziyyətinin uyğunlaşması.
- Kabinet token hash-i/e-poçt uyğunluğu, təkrar qəbula davamlılıq, CRM üzvlüyünün yaranmaması, paylaşılmayan təklif və daxili qeydlərin görünməməsi.
- Köhnə versiya ilə təklif qəbulunun rəddi; doğru versiyanın qəbul edilməsi.
- Faylların ayrıca private/share vəziyyəti, icazəsiz yükləmə linki, müştəri faylının düzgün qeydə bağlanması, kabinet dəvəti ləğvindən sonra rədd.
- Kabinet müraciəti, staff cavabı, cross-tenant cavab cəhdinin rəddi.
- AES-GCM roundtrip, RFC əsaslı TOTP vektoru, factor aktivləşdirmə, OTP replay, birdəfəlik recovery kodu, MFA olmadan CRM sorğusunun rəddi və yanlış şifrə cəhd limiti.
- OAuth state-in hesaba bağlanması, hash saxlanması, vaxtı bitmiş/başqa hesabın callback-inin rəddi, secret-in status API-sinə çıxmaması.
- İş növbəsinin təkrar məktub yaratmaması; SMTP diaqnostikasında həssas mətnin çıxmaması və yanlış URL formatının rəddi.
- İmzalı WhatsApp/Instagram test payload-larında HMAC, tenant binding və mesaj ID-si üzrə dublikat qoruması.
- AI-yə göndərilən kontekstdə icazəsiz müştəri/maliyyə məlumatının olmaması, biznes qeydinin dəyişməməsi və AI sorğusu zamanı deaktiv edilən əməkdaşa cavabın verilməməsi.

## Brauzer yoxlamaları

Hər üç viewport-da Yazışma mərkəzi, Import, Təsdiqlər, Rezervasiya ayarları, Ayarlar, Silinmiş qeydlər, Kabinet müraciətləri, Müştərilər, Satışlar və Təqvim açılıb. Sənəd səviyyəsində horizontal daşma və browser page error qeydə alınmayıb. Geniş cədvəllər öz konteynerində sürüşdürülür.

Əlavə olaraq:

- CSV upload → önbaxış → təsdiq → real test DB-yə import.
- Müştəri kabinetində private təklif/qeydin gizli qalması və browser-dən private endpoint-ə fayl upload-u.
- Rezervasiya səhifəsində vaxt seçib real test DB-yə təsdiqlənmiş booking yaratmaq.
- 390/320 px-də mobil menyunun ilkin bağlı olması, menyudan bölmə seçmək və Escape ilə bağlamaq.

## Sərhədlər

Auth aktoru, cookie store və SMTP inteqrasiya testinin müəyyən hissələrində test əvəzedicisidir; auth handler-ləri ayrıca real Prisma ilə də çağırılır. Bu, real production browser sessiyası, provayder hesabı, deliverability və ya yük testi deyil.

Tam public/admin regressiyası, real OAuth consent/refresh, Meta app approval/kanal siyasətləri, real AI cavab keyfiyyəti, uzunmüddətli scheduler davranışı, böyük inbox/rezervasiya həcmi və hosting backup/recovery ayrıca staging əməliyyatları tələb edir. Kompilyasiya rejiminin keçməsi standart production build-in tamamlanması kimi təqdim edilmir.
