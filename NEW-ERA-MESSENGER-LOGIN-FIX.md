# NEW ERA — Messenger biznes giriş düzəlişi

24 oktyabr 2026. Baza commit: cc560ba.

## Dəyişiklik

Messenger qoşulma sorğusu üçün ayrıca `CRM_MESSENGER_CONFIG_ID` dəstəyi əlavə edilir. Bu dəyişən veriləndə OAuth sorğusu `config_id` göndərir və `scope` göndərmir; icazələr Meta konfiqurasiyasından götürülür. Dəyişən boşdursa əvvəlki scope əsaslı davranış saxlanır. Yanlış, rəqəm olmayan ID verilərsə Messenger qoşulması konfiqurasiya tamamlanana qədər söndürülür; digər kanallara təsir etmir.

Instagram və WhatsApp axınları, token dəyişmə, şirkət təcridi və webhook imza yoxlamaları saxlanır. Yeni DB migration və paket yoxdur.

## Meta konfiqurasiyası

Facebook Login for Business → Configurations → Create configuration:

- Name: NEW ERA Messenger Login
- Login variation: General
- Access token: **User access token**. Bu kod user-token mübadiləsi və Page tokenlərinin tapılmasını istifadə edir; System-user token seçməyin.
- İcazələr: `pages_show_list`, `pages_manage_metadata`, `pages_messaging`.
- Yaradıldıqdan sonra verilən yeni Configuration ID-ni Vercel Production üçün `CRM_MESSENGER_CONFIG_ID` kimi saxlayın.
- `CRM_WHATSAPP_CONFIG_ID`-ni dəyişməyin və onun ID-sini Messenger üçün istifadə etməyin.

Bu hazırlanma anında Meta forması hazırdır, **Create basılmayıb**. ID yalnız istifadəçi təsdiqindən sonra yaradılacaq. Mövcud WhatsApp konfiqurasiyası 1668839828475167-dir; bu Messenger ID-si deyil.

## Quraşdırma və deploy

1. Bu ZIP-dəki 4 faylı mövcud layihənin kökünə eyni yollarla çıxarın.
2. Meta-da yaradılan Messenger Configuration ID-ni Vercel-də `CRM_MESSENGER_CONFIG_ID` adı ilə Production mühitinə əlavə edib Save edin.
3. Mövcud new-era qovluğunda PowerShell:

```powershell
git add -- src/lib/crm/social-api.ts src/lib/crm/social.ts tests/workspace-social.integration.cjs NEW-ERA-MESSENGER-LOGIN-FIX.md
git commit -m "Support Messenger Facebook Business Login configuration"
git push origin main
```

4. Yeni deploy Ready olduqdan sonra köhnə Facebook pəncərəsini bağlayın, Workspace-i yeniləyib Qoş düyməsini basın.

## Yoxlama

- `npx tsc --noEmit` keçdi.
- `npm run test:workspace-social`: **152 yoxlama keçdi**. Meta HTTP mock olunur, disposable PostgreSQL/PGlite istifadə edilir; canlı hesab və production məlumatı istifadə edilmir.
- Testlər əvvəlki scope əsaslı Messenger axınını, yeni `config_id` URL-sini, scope-un çıxarılmasını, OAuth state/redirect-in saxlanmasını, user-token və Page seçimini, tenant təcridini, mesaj qəbul/cavabını, Instagram və WhatsApp davranışını əhatə edir.

Bu düzəliş aşkar edilmiş biznes giriş konfiqurasiyası uyğunsuzluğunu aradan qaldırmaq üçündür. Meta-nın göstərdiyi “Feature unavailable” mesajının yalnız bundan qaynaqlandığı canlı sınaqla hələ təsdiqlənməyib. Business Verification, Advanced Access/App Review və provayder məhdudiyyətlərini aradan qaldırmır.

## Canlı qəbul sınağı

Harun Babazade administrator hesabı ilə rəsmi giriş və Page seçimini tamamlayın, Workspace-də hesabı təsdiqləyin. Webhook callback və messages abunəliyi Meta-da ayrıca hazır olmalıdır. Test hesabından yeni mesaj göndərin, Workspace-də açın və təsdiqlə cavab göndərərək Instagram-dan ayrı Messenger kanalında çatmasını yoxlayın. Test bitmədən real müştərilərə açıq qoşulmanın işlədiyini elan etməyin.
