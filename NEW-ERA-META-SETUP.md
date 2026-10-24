# NEW ERA — Meta üçün texniki hazırlıq

Hazırlanıb: 24 oktyabr 2026. Baza commit: `059736a` (main).

## Bu paket

- Giriş tələb etməyən `/privacy` və `/data-deletion` səhifələri.
- Xidmət sahibi: “NEAGENCY” Məhdud Məsuliyyətli Cəmiyyəti, VÖEN 7002625441.
- Ana səhifədə və Workspace sosial hesablar bölməsində həmin səhifələrə keçidlər.
- Ayrılma ilə silinmənin fərqini və e-poçtla silinmə müraciətini izah edən təlimat.
- Instagram üçün App Review mətnləri və real ekran videosunun çəkiliş planı.

Yeni paket, DB migration, avtomatik silinmə endpoint-i, cron dəyişikliyi yoxdur. Məlumat silinməsi səhifəsi manual müraciət təlimatıdır. Operator hello@thenewera.space poçtunu izləməli, səlahiyyəti yoxlamalı və müraciətləri həqiqətən icra etməlidir. Bağlantını ayırmaq saxlanmış CRM tarixçəsini silmir.

## Quraşdırma

ZIP-i mövcud layihənin kökünə, eyni fayl yollarını saxlayaraq çıxarın. `app/(legal)` qovluğunun adı mötərizələrlə olduğu kimi qalmalıdır; URL-də mötərizələr görünmür.

PowerShell, mövcud new-era qovluğunda:

```powershell
git diff --stat
git add -- 'app/(legal)' app/page.tsx app/workspace/SocialConnections.tsx NEW-ERA-META-SETUP.md NEW-ERA-INSTAGRAM-REVIEW.md
git commit -m "Add Workspace privacy and data deletion pages"
git push origin main
```

Əgər bu fayllarda paketdən sonra ayrıca dəyişiklik etmisinizsə, əvəzləməzdən əvvəl fərqləri birləşdirin. Səhifələrdəki şirkət məlumatlarını və təsvir olunan məlumat emalını yayımlamazdan əvvəl nəzərdən keçirin.

## Deploy-dan sonra

1. Gizli brauzer pəncərəsində `https://thenewera.space/privacy` və `https://thenewera.space/data-deletion` ünvanlarının giriş tələb etmədən açıldığını yoxlayın.
2. Meta → NEW ERA Workspace → App settings → Basic:
   - Privacy policy URL: `https://thenewera.space/privacy`
   - User data deletion növü: **Data deletion instructions URL**
   - User data deletion URL: `https://thenewera.space/data-deletion`
   - App domains: `thenewera.space` (mövcud domenləri silmədən).
3. Save Changes edin. Bu URL-ləri səhifələr production-da açılmadan Meta-da saxlamayın.

## Webhook ayarları

Vercel-də `CRM_META_WEBHOOK_VERIFY_TOKEN` dəyəri ilə eyni token istifadə edilməlidir. Token bu paketə daxil edilməyib; tokeni log, GitHub və ekran videosuna salmayın. Mövcud CRM_ENCRYPTION_KEY dəyişdirilməməlidir.

| Kanal | Callback URL | Hadisə |
| --- | --- | --- |
| Instagram | https://thenewera.space/api/workspace-social/webhook/instagram | messages |
| Messenger / Page | https://thenewera.space/api/workspace-social/webhook/facebook | messages |
| WhatsApp Business Account | https://thenewera.space/api/workspace-social/webhook/whatsapp | messages |

Meta kanal ayarında uyğun callback və verify token ilə **Verify and save** edin, sonra tətbiq səviyyəsində `messages` hadisəsinə abunə olun. Kanalın hesab səviyyəli abunəliyini qoşulma zamanı NEW ERA serveri edir. Kanalın yayımlanma tələbi Meta konsolunda ayrıca yerinə yetirilməlidir.

### OAuth

- Instagram redirect (əvvəl saxlanılıb): `https://thenewera.space/api/workspace-social/callback/instagram`
- Messenger redirect (hələ canlı yoxlanmayıb): `https://thenewera.space/api/workspace-social/callback/messenger`
- WhatsApp Embedded Signup configuration ID: `1668839828475167`.
- Instagram App ID: `2392432864830292`; Meta App ID: `1429610725247525`.
- Kanonik domen, tətbiqə daxil olunan domen və OAuth redirect domeni uyğun gəlməlidir.
- Deauthorize Instagram: `https://thenewera.space/api/workspace-social/deauthorize/instagram`
- Deauthorize Facebook: `https://thenewera.space/api/workspace-social/deauthorize/facebook`
- Deauthorize URL məlumat silinməsi callback-i deyil. Data deletion sahəsində yuxarıdakı təlimat URL-sini seçin.

## Canlı test və video

Şəxsiyyət yoxlaması biznes təsdiqini və App Review-u əvəz etmir. Şəxsiyyət yoxlaması davam edir. Şirkətin rəsmi sənədi hələ təqdim edilməyib. App Review qaralaması `1433020201573244` nömrəsi ilə yaradılıb, göndərilməyib.

1. Öz peşəkar Instagram hesabını Instagram Tester kimi əlavə edib Instagram tərəfində dəvəti qəbul edin. Bu, yalnız test üçündür; gələcək müştərilər belə əlavə edilməyəcək.
2. Workspace → Ayarlar → Instagram → Qoş: rəsmi login, hesab seçimi və təsdiqi tamamlayın.
3. Kənar test hesabından biznesə mətn göndərin, Workspace Mesajlar bölməsində göründüyünü yoxlayın.
4. Lazımdırsa mesajı müştəri qeydinə bağlayın. Cavab göndərilməsini təsdiqləyin, cavabın Instagram-da çatdığını yoxlayın.
5. Bağlantını ayırın; yeni mesaj qəbulu və cavab göndərişinin dayandığını yoxlayın.
6. Eyni hesabın ikinci Workspace-ə bağlana bilmədiyini və digər şirkətin yazışmaları görmədiyini yoxlayın.
7. Bu real axını ekran videosuna çəkin. Saxta UI/video və ya mock test nəticəsini canlı sübut kimi təqdim etməyin.

Bu addımlar, Meta webhook təsdiqi və tələb olunan App Review/Advanced Access tamamlanmadan müştərilərin sərbəst qoşulması hazır sayılmır.

## Yoxlama

TypeScript yoxlaması keçib. Next.js istehsal kodunun compile yoxlaması ayrıca icra edilib; real production bazası ilə tam prerender/deploy sınağı və canlı Meta mesaj sınağı deyil. Mövcud CSS fayllarına aid autoprefixer xəbərdarlıqları bu paketdən əvvəlki koddan gəlir.
