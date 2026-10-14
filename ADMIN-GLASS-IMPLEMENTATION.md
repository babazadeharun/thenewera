# NEW ERA — Glass iş məkanları: tətbiq və yoxlama hesabatı

Bu paket əvvəlki ana səhifə, Services, Start Project və mobil düzəlişlər üzərində hazırlanıb. Həmin səhifələrin mətn, funksiya və CSS faylları dəyişməyib. Heç bir Git commit, push, deploy və ya məlumat bazası reset əməliyyatı edilməyib.

## Tətbiq edilənlər

- Ortaq `WorkspaceShell`: glass sidebar, rol üzrə menyu qrupları, mövcud bölmələrdə axtarış, başlıq/breadcrumb, profil və çıxış menyusu.
- Mobil/tablet drawer: aç/bağla, Escape, fokusun drawer daxilində saxlanması, açıq drawer zamanı fonun inert edilməsi, fokusun geri qaytarılması; reduced-motion dəstəyi.
- `WorkspaceLayout`: autentifikasiya və verilmiş rol siyahısını serverdə yoxlayan layout. Mövcud səhifə və API yoxlamaları da saxlanır.
- Ortaq, yalnız `.workspaceShell` daxilində işləyən glass CSS: formalar, metric kartları, oxunaqlı cədvəllər, mövcud modallar/drawerlər, filtr və statuslar.
- Admin layihə/CRM modulu köhnə demo/localStorage mənbəyindən mövcud server API-lərinə keçirilib. Status, mütəxəssis, təhvil, düzəliş və mesaj dəyişiklikləri serverdə saxlanır; xəta olduqda uğur kimi göstərilmir.
- Köhnə `new-era-projects` və `new-era-müştəri` lokal tarixçəsi silinmir və biznes statistikası sayılmır; Admin onu ayrıca JSON kimi yükləyə bilər. Avtomatik bazaya import edilməyib.
- Admin overview: real layihə/müştəri göstəriciləri, Satış CRM və maliyyə API məlumatları, son 28 günlük UTC həftəlik layihə qrafiki, gözləyən işlər və son fəaliyyət.
- Müştəri overview: aktiv/yoxlama/tamamlanmış/gecikmiş layihə sayları, mövcud son tarixlər və təhvillər; yalnız maliyyə icazəsi olduqda fakturalar və ödəniş xülasəsi.
- Promouter: rol üzrə menyu, təsdiqlənmiş tədbirlərdə axtarış/status filtri, mövcud bilet/satış/borc/müraciət modulları. Mövcud, lakin səhifə girişi olmayan tədbir workspace komponenti üçün qorunan giriş əlavə edilib.
- API xətası olan ilkin Finance, Sales və Events yüklənmələrində demo/defolt sıfır göstəriciləri gizlədilir; xəta və retry göstərilir.
- Admin bildiriş mərkəzi yenidən istifadə olunur; yüklənmə xətası/retry, Escape və klaviatura dəstəyi yaxşılaşdırılıb.

## Yenilənən marşrutlar

| Rol | Marşrut / modul | Məlumat mənbəyi |
|---|---|---|
| ADMIN / SUPER_ADMIN | `/admin`; `?section=overview,projects,müştəri,crm,sales,finance,collaborations,portfolio,services,cms` | `/api/projects`, `/api/admin/clients`, `/api/admin/workspace-meta`; mövcud Sales, Finance, Media/CMS API-ləri |
| ADMIN / SUPER_ADMIN | `/admin/users`, `/admin/mail` | Mövcud hesab və Mail API-ləri |
| ADMIN / SUPER_ADMIN / EVENTS_ADMIN | `/admin/events`, `/admin/events/[id]` | Mövcud Events əməliyyat API-ləri |
| ADMIN / SUPER_ADMIN / EVENTS_FINANCE | `/admin/events/finance` | Mövcud Events maliyyə API-ləri |
| CLIENT | `/account`, `/projects` | `/api/client/me`, `/api/client/workspace`, `/api/client/notifications`, `/api/projects`, icazəli `/api/client/finance` |
| PROMOTER | `/promoter`; `?panel=events,tickets,sales,finance,applications` | Autentifikasiya edilmiş promouter ID-si ilə Prisma sorğuları və mövcud promouter API-ləri |
| PROMOTER | `/promoter/events/[eventId]` | Sahibliyi yoxlanmış `PromoterEvent` əlaqəsi və `/api/promoter/events/[eventId]` |

ADMIN və SUPER_ADMIN mərkəzi modulları görür. EVENTS_ADMIN yalnız Events menyusunu, EVENTS_FINANCE yalnız tədbir maliyyəsi menyusunu görür. Müştəri və promouter menyularında platforma idarəetmə modulları yoxdur. Müştərinin maliyyə məlumatları ayrıca permission yoxlanandan sonra yüklənir.

## Məlumatın mənası və limitlər

- “Şirkətlər” ayrıca Company modeli deyil: qeydə alınmış müştərilərin unikal, boş olmayan şirkət adlarının sayıdır. Eyni yazılışla iki şirkət ayrıca tenant modeli kimi sayılmır.
- “Aktiv şirkətlər”: tamamlanmamış layihəsi olan şirkət adlarının sayı.
- Qrafik mövcud layihələrin `createdAt` tarixlərinə əsaslanır; 28 gün, 4 həftə, UTC. Demo rəqəmlər yoxdur.
- Maliyyə API-si transactions, invoices və payables üçün maksimum 250 qeyd qaytarır. Overview məhz həmin API xülasəsini göstərir; bu, limitsiz ümumi dövriyyə deyil. Bu limit UI-də izah olunur.
- Müştəri maliyyəsi serverdən həmin workspace-in client ID-si ilə seçilir. Payment siyahısının API limiti 100-dür.
- Promouter qiymət, endirim, satış və borc göstəriciləri mövcud real məlumat/snapshot qaydalarından gəlir. Faiz və gəlir uydurulmur.

## Təhlükəsizlik və tenant yoxlamaları

- Admin və digər rol layout-ları serverdə `getCurrentUser` və faktiki rol siyahıları ilə qorunur.
- Layihə siyahısı müştəri üçün serverdə yoxlanmış aktiv workspace membership-in `workspace.clientId` dəyəri ilə Prisma səviyyəsində süzülür. İstifadəçinin göndərdiyi company/client ID-si tenant seçmir.
- Layihə brifi workspace-in serverdə seçilmiş müştərisinə bağlanır; clientEmail spoofing qəbul edilmir.
- Layihə detail/PATCH başqa workspace üçün 403 qaytarır. Eyni workspace-in icazəli üzvü oxuya bilər.
- İnaktiv membership, aktiv olmayan workspace, SUSPENDED/ARCHIVED hesab permission almır.
- VIEWER və SEND_MESSAGE icazəsi olmayan istifadəçi layihə mutasiyası edə bilmir.
- Müştəri özünü admin mesaj müəllifi kimi göstərə bilmir; müəllif serverdə autentifikasiya edilmiş rola bağlanır.
- Müştəri arbitrary status, creator və delivery dəyişə bilmir. Mövcud Review → In Progress düzəliş axını və Completed layihəyə 1–5 arası rəy saxlanır.
- Promouter səhifə/API sorğuları şəxsi promouter ID-si və tədbir əlaqəsi ilə məhdudlaşır; başqa promouterə/tədbirə giriş bloklanır.
- Sxem və migration dəyişməyib. Credentials client bundle-a əlavə edilməyib.

## Yoxlama nəticələri

- `node node_modules/typescript/bin/tsc --noEmit --pretty false`: keçdi.
- `npm run test:workspace`: keçdi. Yeni test faylı autentifikasiya, rol, viewer, tenant, status escalation, mesaj müəllifi, promouter ownership və metadata guard ssenarilərini yoxlayır.
- `npm run build`: Prisma generation, Next compilation və TypeScript mərhələləri keçdi. Tam build əvvəlcədən mövcud `/events` səhifəsinin prerender mərhələsində real Neon bazasına bağlantı olmadığı üçün dayandı. Bu public marşrut dəyişdirilməyib.
- `npm run lint`: layihədə ESLint konfiqurasiyası yoxdur; mövcud `next lint` əmri interaktiv konfiqurasiya soruşur. Yeni dependency və ya lint konfiqurasiyası əlavə edilməyib; lint keçmiş sayılmır.
- Layihədə əvvəlcədən test script-i yox idi; `test:workspace` əlavə edildi.
- Browser QA: Admin, Account, Projects və Promoter 1440/810/390/320 px; üfüqi daşma yoxdur. Mobil drawer, Escape, menyu axtarışı, layihə seçimi, promouter tədbir axtarışı, boş/xəta vəziyyətləri yoxlanıldı; son yoxlamada runtime/hydration xətası olmadı.
- Əlavə browser QA: Finance, Sales CRM, Portfolio, CMS, Events, Users və Mail 1440/390 px; daşma və runtime xətası olmadı.
- Browser QA üçün ayrıca müvəqqəti app/harness və kontrollu test cavabları istifadə edilib; fixture/mock mənbələri istehsal layihəsinə əlavə edilməyib. Canlı bazaya qarşı bütün rolların tam inteqrasiya testi mümkün olmadı. Unit/security testləri kontrollu asılılıqlarla işləyir; real sessiya və DB inteqrasiya testi deyil.
- Public homepage, Services, Start Project, global və əvvəlki mobil CSS faylları əvvəlki qəbul edilmiş paketlə byte-for-byte müqayisə edilib: dəyişməyib.

## Əvvəlcədən mövcud və açıq qalan imkanlar

1. Admin “Xidmətlər” redaktoru lokal UI prototipidir; mövcud Service modeli description/subcategories/specialist relation saxlamır. Köhnə editor silinməyib, amma lokal xarakteri açıq göstərilir. Bu redaktoru persisted production CRUD kimi təqdim etmirik.
2. Team invitation/member-management UI, ayrıca mərhələ/milestone və approval modeli yoxdur. Menyuda saxta səhifələr yaradılmayıb. Mövcud workspace membership-ləri server icazəsində istifadə olunur, tam team idarəetmə axını qurulmayıb.
3. Müştəri layihə Review ekranında mövcud düzəliş və rəy axını saxlanır; ayrıca “approve delivery” mutasiyası yoxdursa əlavə edilməyib.
4. Promouter üçün ayrıca bildiriş backend-i yoxdur; saxta notification/commission məlumatı göstərilmir.
5. Mail-in canlı IMAP/SMTP bağlantısı və real pul əməliyyatları bu mühitdə yoxlanılmayıb. UI/error vəziyyəti və mövcud guard-lar yoxlanıb; heç bir mesaj/ödəniş göndərilməyib.
6. Mövcud repository update bir neçə DB yazısı edir; onların hamısı üçün yeni transaction refaktoru bu dizayn işinə daxil edilməyib.
7. Köhnə localStorage layihələri avtomatik bazaya keçirilməyib; arxiv export-u saxlanır. Lokal layihə və müştəri tarixçəsini import etmək ayrıca məlumat köçürmə işi tələb edir.

## Dəqiq fayl siyahısı

Aşağıdakı siyahı əvvəlki `new-era-start-project-checked.zip` ilə müqayisədən alınıb. Bu hesabat da paketə əlavə edilib.

```text
ADMIN-GLASS-IMPLEMENTATION.md
app/account/AccountClient.tsx
app/account/CustomerOverview.tsx
app/account/layout.tsx
app/admin/AdminClient.tsx
app/admin/FinanceManager.tsx
app/admin/NotificationsCenter.tsx
app/admin/SalesCrm.tsx
app/admin/WorkspaceOverview.tsx
app/admin/events/EventsAdminClient.tsx
app/admin/layout.tsx
app/api/admin/workspace-meta/route.ts
app/api/client/finance/route.ts
app/api/projects/[id]/route.ts
app/api/projects/route.ts
app/components-site-header.tsx
app/components-workspace/WorkspaceLayout.tsx
app/components-workspace/WorkspaceShell.tsx
app/components-workspace/format-date.ts
app/components-workspace/workspace-glass.css
app/projects/layout.tsx
app/promoter/PromoterDashboardClient.tsx
app/promoter/events/[eventId]/PromoterEventWorkspace.tsx
app/promoter/events/[eventId]/page.tsx
app/promoter/layout.tsx
package.json
src/lib/data/repository.ts
src/lib/data/types.ts
src/lib/workspace.ts
tests/workspace-authorization.test.cjs
```

## İşə salma

Mövcud `.env` və `.env.local` fayllarını yeni `new-era` qovluğuna köçürün. Sonra `npm ci`, `npm run test:workspace`, `npm run build` və uyğun mühitdə `npm run start` istifadə edin. ZIP-ə şəxsi environment faylları, node_modules və build cache daxil edilməyib.
