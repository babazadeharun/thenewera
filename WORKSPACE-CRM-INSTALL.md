# NEW ERA — Workspace və CRM yeniləməsi

Bu paket yalnız əlavə olunan və dəyişən faylları ehtiva edir. Layihənin kök qovluğuna mövcud yolları qoruyaraq köçürün. Production bazasına migration və deploy bu iş zamanı tətbiq edilməyib.

## İnteqrasiya

- `/workspace`: mövcud sayt hesabı ilə şirkət yaratmaq, şirkət seçmək və dəvətləri qəbul etmək.
- `/workspace/[id]`: ayrıca CRM layout-u; müştərilər, satış Kanban-ı, tapşırıq/təqvim, təklif/PDF, faktiki ödənişlər, hesabatlar, mesaj layihələri, avtomatlaşdırma, komanda və abunəlik.
- `/workspace/invite?token=...`: dəvətin ilkin baxışı; üzvlük yalnız təsdiqlənmiş e-poçtla ayrıca qəbul əməliyyatında yaranır.
- `/admin/company-workspaces`: yalnız mövcud `SUPER_ADMIN` üçün şirkətlər, tariflər, sınaq/abunəlik, istifadə limitləri və səbəbli dəstək baxışı.
- Mövcud navbar-a Workspace keçidi əlavə olunur. CRM öz layout-unu göstərir. Public səhifələrin dizaynı dəyişdirilmir; mobil açılan menyunun hündürlüyü yeni keçidə uyğunlaşdırılır.
- Giriş/qeydiyyat/təsdiq səhifələrinə yalnız təhlükəsiz `/workspace` geri dönüşü əlavə olunur. Mövcud auth API-ləri dəyişdirilmir.
- Mövcud `Workspace`, `WorkspaceMembership`, agentlik layihələri və admin poçtu ayrıca qalır. Yeni modul `Crm*` modellərindən və eyni mövcud `User` hesablarından istifadə edir. Köhnə workspace-lər avtomatik yeni CRM şirkətinə çevrilmir.

## Quraşdırma

Layihənin kök qovluğunda, ayrı-ayrı əmrlər kimi:

```powershell
npm ci
npx prisma migrate deploy
npm run build
```

`DATABASE_URL` işlək PostgreSQL bazasına göstərməlidir. Yeni migration:
`prisma/migrations/20261017110000_company_workspace_crm/migration.sql`.

Migration yalnız yeni enum/cədvəl/indeks/əlaqələri əlavə edir; mövcud cədvəl və məlumatları silmir. `migrate reset`, `db push --force-reset` və ya köhnə migration-ların silinməsi tələb olunmur. Bazanın mövcud migration tarixçəsi əvvəlki layihə ilə uyğun olmalıdır. Paketdəki `schema.prisma` faylını da köçürün.

Yalnız PDF üçün `pdf-lib@1.17.1` və `@pdf-lib/fontkit@1.1.1` əlavə edilib. Mövcud paketlərin versiyaları yenilənməyib.

## Environment dəyişənləri

| Dəyişən | Təyinat |
| --- | --- |
| `DATABASE_URL` | Mövcud Prisma/PostgreSQL bağlantısı. |
| `CRM_APP_URL` | Dəvət linkləri üçün saytın HTTPS kök ünvanı, məsələn `https://thenewera.space`; domeninizin faktiki canonical ünvanını istifadə edin. |
| `CRON_SECRET` | Planlaşdırılmış Vercel sorğularının Bearer sirri; uzun təsadüfi dəyər. |
| `CRM_CRON_SECRET` | İstəyə bağlı ayrıca job sirri. Hər ikisi varsa Vercel üçün dəyərlər eyni olmalıdır; əks halda yalnız `CRON_SECRET` istifadə edin. |
| `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_SMTP_USER`, `MAIL_SMTP_PASSWORD` | Mövcud göndərmə xidməti; Workspace dəvətləri və sınaq xatırlatmaları üçün də istifadə edilir. Mövcud `EVENT_EMAIL_*` fallback-i qorunur. |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_SMTP_SECURE` | Mövcud göndərən/TLS ayarları, artıq qurulubsa dəyişmək lazım deyil. |
| `CRM_PROVIDER_CONFIG` | İstəyə bağlı, yalnız serverdə saxlanan hər şirkətə aid provider konfiqurasiyası. `NEXT_PUBLIC_` prefiksi istifadə etməyin. |

Mövcud auth/session və digər environment dəyişənlərini saxlayın. Bu paket sirr və real provayder açarı daşımır.

### Şirkətə aid xarici kanallar

`CRM_PROVIDER_CONFIG` JSON xəritəsidir; açar şirkətin real `CrmCompany.id` dəyəridir. Yalnız qoşulan provayder hissələrini əlavə edin:

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
      "token": "META_ACCESS_TOKEN",
      "phoneNumberId": "META_PHONE_NUMBER_ID",
      "version": "SUPPORTED_META_GRAPH_VERSION",
      "appSecret": "META_APP_SECRET",
      "verifyToken": "RANDOM_WEBHOOK_VERIFY_TOKEN"
    },
    "ai": {
      "apiKey": "OPENAI_API_KEY",
      "model": "AVAILABLE_RESPONSES_MODEL"
    }
  }
}
```

Meta Graph versiyası `vNN.N` formatında hesabınızın dəstəklədiyi real versiya olmalıdır. Model və açar hesabınıza uyğun seçilir. Bu nümunədəki placeholder-lar işlək konfiqurasiya deyil.

- Şirkət SMTP-si ayrıca outbound göndərişdir. Mövcud admin mailbox-u oxunmur və şirkətlərlə paylaşılmır. Daxil olan e-poçt sinxronizasiyası **qoşulmayıb**.
- WhatsApp callback: `https://YOUR_DOMAIN/api/workspace-webhooks/whatsapp/COMPANY_ID`. Meta verification token-i və HMAC imzası yoxlanılır; `phoneNumberId` həmin şirkətə bağlanır. Hər şirkətə ayrıca provider nömrəsi təyin edin; təkrar `phoneNumberId` aşkar edilərsə WhatsApp konfiqurasiyası deaktiv sayılır. Hazırda məlum CRM müştərisindən gələn text mesajları qəbul edilir və 24 saatlıq cavab pəncərəsində text cavabı mümkündür. Şablon/kampaniya/media göndərişi **qoşulmayıb**. Naməlum nömrə avtomatik müştəri yaratmır.
- AI yalnız icazə verilmiş müştərinin görünən yazışmalarını açıq təsdiqlə provayderə ötürür; xülasə/cavab layihəsi/növbəti addım yaradır. Özü mesaj göndərmir və CRM məlumatını dəyişmir.
- Provayder konfiqurasiyası `CONFIGURED` kimi görünür; bu çatdırılma zəmanəti deyil. Faktiki sorğuların uğur/xəta tarixçəsi ayrıca göstərilir. Canlı SMTP/Meta/AI əlaqələri bu mühitdə sınaqdan keçirilməyib.
- Göndərmə ayrıca təsdiqlənir. Nəticəsi qeyri-müəyyən göndəriş təkrar dublikat yaratmamaq üçün avtomatik təkrarlanmır; əvvəl provayderdə yoxlayın. SMTP qəbul edilməsi müştərinin inbox-una çatma zəmanəti deyil.

## Sınaq, limitlər və planlaşdırılmış işlər

Yeni şirkət və Owner üzvlüyü eyni tranzaksiyada yaranır. İlk tarif ilk şirkət yaradılarkən avtomatik qurulur: 1 təqvim ayı, 11 aktiv istifadəçi yeri, 100 MiB fayl yaddaşı, 10 000 aktiv biznes qeydi. Owner daxil olmaqla 11 yer rəhbər + 10 əməkdaş deməkdir. Gözləyən qüvvədə olan dəvətlər də yerləri rezerv edir.

Müddət UTC ilə növbəti ayın uyğun gününə hesablanır; uyğun gün yoxdursa həmin ayın son günü seçilir. Dəvət və üzvlük müddəti yenidən başlatmır. Tarifin sonradan dəyişdirilən ilkin qaydaları mövcud şirkətlərin tarix və limitlərini dəyişdirmir. Super Admin mövcud şirkətə ayrıca tətbiq edə bilər.

Owner-in qarşılama pəncərəsi serverdə yadda saxlanır. Bağlana bilən sınaq banneri və abunəlik bölməsi dəqiq müddət və limitləri göstərir. Müddət bitdikdə yazma əməliyyatları API-də və fon işlərində dayanır; icazə çərçivəsində baxış və ixrac qalır. Məlumatlar silinmir. Dayandırılmış şirkətdə adi üzvün baxışı da bloklanır.

`vercel.json` mövcud tədbir cron-unu qoruyur və `/api/workspace-jobs` üçün gündəlik 04:00 UTC çağırışı əlavə edir. Vercel uyğun cron icazəsi və `CRON_SECRET` tələb edir. Başqa scheduler Bearer sirri ilə eyni endpoint-i çağıra bilər.

Job hər çağırışda son işlənmə vaxtına görə növbəti 25 şirkəti, şirkət üzrə ən çox 500 açıq tapşırıq/görüşü yoxlayır. 7/3/1 günlük bildirişlər bitmə tarixi + istifadəçi üzrə unikal açarla yadda saxlanır. Göndərilməyən məktublar persistent növbədə qalır; hər çağırışda vaxt büdcəsi daxilində ən çox 20-si cəhd edilir. Nəticəsi qeyri-müəyyən cəhd avtomatik təkrarlanmır. **Şirkət sayı 25-i keçəndə və ya aktiv tapşırıq sayı çoxaldıqda gündəlik default kifayət etmir: uyğun tezlikli xarici scheduler/worker və daha böyük həcm üçün səhifələnən iş emalı qurulmalıdır.** Job-un vaxtında çağırılması e-poçt xatırlatmalarının şərtidir. Abunəlikdən asılı yazma qadağası cron-dan asılı deyil, hər sorğuda hesablanır.

Ödəniş kartı və avtomatik tutulma yoxdur. Onlayn ödəniş provayderi **qoşulmayıb**. Owner plan aktivləşdirmə sorğusu göndərir; Super Admin səbəb/tarix göstərərək əl ilə aktivləşdirir. Yalnız faktiki alınmış abunəlik ödənişi ayrıca məbləğ və unikal istinadla qeydə alınanda platforma gəlirinə daxil olur. CRM satış məbləği faktiki ödəniş hesab olunmur.

## Təhlükəsizlik və məlumat modeli

Hər biznes sorğusunda mövcud sessiya, aktiv şirkət üzvlüyü, modul/əməliyyat icazəsi və OWN/TEAM/ALL əhatəsi yoxlanır. Viewer yalnız baxır; Sales öz qeydlərini, Manager komandasını, Accountant uyğun maliyyə bölmələrini görür. Admin-in ilkin idarəetmə icazələri məhduddur; Owner ayrıca icazə cədvəli təyin edə bilir. Scope hesabat və ixraca da tətbiq edilir.

Dəvət token-i 32 təsadüfi baytdır, bazada SHA-256 hash saxlanır, 7 gün etibarlıdır; resend əvvəlkini ləğv edir. GET üzvlük yaratmır; qəbul e-poçtu təsdiqlənmiş hesabla uyğun olmalıdır. Qəbul təkrar ediləndə ikinci üzvlük yaranmır. Son Owner adi üzv əməliyyatı ilə deaktiv edilmir; sahiblik şirkət adı ilə ayrıca təsdiqlənir.

Yeni qeydlər/assignee/customer/sale/file əlaqələri serverdə və uyğun composite FK-lərlə şirkətə bağlanır. Fayllar private DB baytları kimi saxlanır, imzalı public URL yaradılmır; hər yükləmədə üzvlük və qeyd icazəsi təkrar yoxlanır. Fayl başına 10 MiB; yalnız PNG/JPEG/WEBP/PDF/TXT; loqo üçün şəkil. Storage limiti serverdə yoxlanır. Bu həll böyük fayl arxivi üçün obyekt storage connector-u deyil.

Super Admin hüququ mövcud platforma rolundan yoxlanılır; şirkət Owner-i bu rolu əldə etmir. Dəstək baxışı ayrıca səbəbli, 30 dəqiqəlik və adminin öz hesabına bağlı sessiyadır. İlk rejim READ; WRITE ayrıca təsdiq tələb edir. Baxış və dəyişikliklər PLATFORM müəllifi ilə jurnala yazılır. Sirrlər API-yə çıxarılmır. Hesaba gizli giriş/impersonation yoxdur.

## Yoxlama

Ətraflı nəticələr: `WORKSPACE-CRM-TEST-RESULTS.md`. Paketə təkrar işlədilə bilən 107 yoxlamalı inteqrasiya testi daxildir:

```powershell
npm ci
npm install --prefix .crm-test-runtime --no-save --ignore-scripts @electric-sql/pglite@0.5.10 @electric-sql/pglite-socket@0.2.13
npm run test:company-crm
npm run test:workspace
npx tsc --noEmit
```

Test yalnız RAM-da ayrıca PostgreSQL mühərriki açır, localhost 55439 portundan istifadə edir, production bazasına qoşulmur və real məktub göndərmir. `.crm-test-runtime` qovluğunu Git-ə əlavə etməyin. Test zamanı Next cookies/auth konteksti və SMTP test əvəzediciləri istifadə olunur; mövcud register/verify/login/logout handler-ləri də ayrıca real Prisma ilə çağırılır.

Production tam build işlək real `DATABASE_URL` ilə sizdə yenidən yoxlanmalıdır. Burada Next compilation və TypeScript keçib, lakin dəyişdirilməmiş `/events` səhifəsinin prerender mərhələsi production bazası əlçatan olmadığı üçün tam build-i tamamlamayıb. Canlı deploy, real məlumatlarla migration və canlı provider göndərişləri yoxlanmış kimi təqdim edilmir.
