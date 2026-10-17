# Workspace CRM — yoxlama nəticələri

Tarix: 17 oktyabr 2026. Bu hesabat bərpa edilmiş layihə üzərində lokal yoxlamaya aiddir; production deploy təsdiqi deyil.

| Yoxlama | Nəticə |
| --- | --- |
| Prisma schema validate | Keçdi. |
| Additive migration | Dəyişdirilməmiş əvvəlki sxem üzərinə tətbiq edildi; 10 yeni CRM cədvəli yaradıldı. |
| TypeScript `tsc --noEmit` | Keçdi. |
| PostgreSQL/Prisma/API inteqrasiya testi | 107 yoxlama keçdi. Test RAM-da PGlite PostgreSQL + real Prisma və route handler-lərindən istifadə edir. |
| Mövcud `test:workspace` | Keçdi; köhnə layihə/iş sahəsi icazə testləri qorunub. |
| Chromium interfeys yoxlaması | 1440, 1024, 768, 390 və 320 px: sənəd daşması yoxdur; mobil menyu ilkin bağlıdır. |
| CRM browser əməliyyatı | Müştəri yaratma real lokal test bazasına yazıldı; bölmələr, admin şirkət siyahısı/detalları, navbar və qarşılama pəncərəsinin reload-dan sonra təkrarlanmaması yoxlandı. |
| Next production build | Compilation və type mərhələləri keçdi. Dəyişdirilməmiş `/events` prerender mərhələsində real bazaya çıxış olmadığı üçün tam build tamamlanmadı. |
| Canlı SMTP / WhatsApp / AI / ödəniş | Bu mühitdə yoxlanmayıb. Açarlar və provider hesabları tələb olunur; onlayn ödəniş və inbound e-poçt qoşulmayıb. |

## İnteqrasiya testinin əhatəsi

- Yeni şirkət + Owner; rəhbər daxil 11 yer; təqvim ayı/fevral/uzun il hesablamaları.
- Cross-tenant oxuma/yazma, saxta assignee və birbaşa SQL FK ilə başqa şirkətə parent bağlama cəhdinin rədd edilməsi.
- OWN məlumat əhatəsi və maliyyə icazəsi; məhdud hesabatın başqa qeydləri göstərməməsi.
- Token hash, GET linkinə baxışın üzvlük yaratmaması, yanlış e-poçt, təkrar qəbul, ləğv edilmiş dəvət, təsdiqsiz hesab.
- Dəvətin trial tarixini dəyişməməsi; ilkin tarif qaydalarının köhnə şirkətə retroaktiv tətbiq edilməməsi.
- Deaktiv üzvün dərhal rədd edilməsi; digər Workspace üzvlüyünün və əvvəlki qeydlərinin qalması; Owner-in adi üzv əməliyyatında itirilməməsi.
- Trial expiry: yazma qadağası, baxış/Owner ixracı, əl ilə aktivləşdirmədən sonra bərpa, fon mutasiyalarının dayanması.
- Qarşılama vaxtının saxlanması; 7 günlük xatırlatmanın təkrar göndərilməməsi.
- Şirkət Owner-in Super Admin API-yə buraxılmaması; READ dəstək rejimində yazma qadağası; WRITE dəstək əməliyyatının PLATFORM müəllif/jurnalı.
- Satış və faktiki ödənişin ayrılması/qalıq borc; serverdə təklif hesablaması və PDF çıxışı.
- Private fayl yükləmə/oxuma; digər şirkət və səlahiyyətsiz üzvə faylın verilməməsi.
- Avtomatlaşdırmanın təkrar icrada dublikat yaratmaması; qoşulmamış provider-in mesajı SENT göstərməməsi.
- İmzalı WhatsApp webhook-un yoxlanması və təkrar provider ID ilə dublikat yaratmaması.
- CSRF origin və təhlükəsiz daxili return URL yoxlamaları.
- Mövcud register → OTP verify → login → cookie sessiya → logout handler-ləri; yanlış kod və şifrə rəddi.

## Sərhədlər

Bütün köhnə public səhifələr və bütün admin əməliyyatları üçün tam E2E regressiya aparılmayıb. Onların API-ləri dəyişdirilməyib; mövcud authorization testləri və əsas auth handler-ləri yoxlanılıb. Şifrə bərpası API-si dəyişdirilməyib, bu testdə ayrıca işlədilməyib.

107 yoxlama ayrıca in-memory test bazasında aparılıb. SMTP və CRM auth aktoru test əvəzediciləridir; real auth handler testində cookie store əvəzedicisindən istifadə olunur. Xarici provider-lər, production bağlantı/pooling, böyük həcmli iş növbəsi və canlı billing ayrıca staging yoxlaması tələb edir.
