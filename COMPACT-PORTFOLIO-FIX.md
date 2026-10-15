# New Era — incə navbar və kompakt portfolio

Əsas: son təqdim edilmiş `new-era-navbar-glass-fixed.zip` layihəsi. Bu ZIP tam layihə mənbəyidir.

## Dəqiq dəyişikliklər
- `app/components-site-header.tsx`: əvvəlki naviqasiya, auth sorğusu, hesab yönləndirməsi, çıxış və əlavə keçidlər saxlanılıb; yalnız CSS sinifləri köhnə səhifə navbar stillərindən ayrılıb.
- `app/public-navbar.css`: tək xarici glass qat; desktop 76px, dar desktop 72px; incə ağ border, zəif kölgə, 14px blur. İç konteynerdə fon, border, kölgə, blur və dekorativ pseudo-qat yoxdur. Bütün əsas açıq səhifələr eyni header komponentindən istifadə edir. Mobil mövcud iki sətirli/üfüqi sürüşən menyu saxlanılıb. Admin/müştəri/promoter workspace naviqasiyası dəyişməyib.
- `app/portfolio/[id]/page.tsx`: yalnız örtük və qalereya img elementləri PortfolioImage təqdimat komponenti ilə əvəz olunub. Prisma sorğuları, published filtri, şirkət/layihə qruplaşdırılması, media seçimi, saylar, notFound, linklər və bölmələr saxlanılıb.
- `app/portfolio/[id]/PortfolioImage.tsx` (yeni): istifadəçinin istədiyi kliklə böyük şəkil baxışı. Native dialog, orijinal URL, bağlama düyməsi, Escape, kənara kliklə bağlanma, fokusun geri qayıtması. Orijinal faylı ayrıca açmaq keçidi var. JS/dialog dəstəyi olmadıqda thumbnail linki birbaşa orijinalı yeni tabda açır.
- `app/portfolio/[id]/project-detail-reference.css`: kompakt örtük və məlumatlar, 3 sütunlu kiçik qalereya, telefonda 2 sütun. Örtük önizləməsi desktopda 280px, telefonda 230px; qalereya 220/170px. Hamısı object-fit:contain; kəsilmir. Video controls saxlanılıb. Monitor çərçivəsi yoxdur. Kartlarda incə glass effekti var.
- `COMPACT-PORTFOLIO-FIX.md` (bu hesabat).

## Yoxlama
- TypeScript yoxlaması keçib.
- Production build kompilyasiya və type yoxlamasından keçib. Bu paket şəxsi .env fayllarını daşımır. Build test DB bağlantısı ilə yoxlanılıb və /events prerender zamanı məlumat bazası əlçatan olmadığı üçün tam tamamlanmayıb. Canlı məlumatlarla tam build ayrıca mühitinizdə edilməlidir.
- Actual Next.js + actual header və şəkil baxış komponentləri ayrıca test tətbiqində yoxlanılıb; yalnız CMS/auth məlumatları fixture ilə təmin olunub. Test kodu və nümunə media bu ZIP-ə daxil deyil.
- /, /services, /portfolio, /portfolio/sunex, /start-project, /login: 320,390,760,810,1024,1440,1920px ölçülərdə üfüqi daşma yoxdur. Hər birində 1 header və əvvəlki 7 əsas link qalır. Daxili fon və kölgə yoxdur; xarici pseudo-qatlar göstərilmir. 1440px ölçüdə header stilləri bütün bu səhifələrdə eynidir.
- Əlavə menyu açılması/Escape bağlanması keçib. Runtime xətası yoxdur.
- Detal səhifəsi fixture yoxlaması: yalnız eyni şirkətin published mediası göstərilir, köhnə itemId qruplaşdırılması işləyir; 5 əlavə media və mövcud video controls qorunur. Xarici layihə URL-i dəyişməyib.
- 390 və 1440px-də şəkli kliklə və klaviaturada Enter ilə böyütmək, Escape/bağlama düyməsi/kənara kliklə bağlamaq və fokusun trigger-ə qayıtması yoxlanılıb. Böyük görünüşdə həmin orijinal URL və object-fit:contain istifadə edilir.
- Son ZIP ilə bayt müqayisəsi: mövcud mənbə fayllarından yalnız yuxarıda sadalanan 4 fayl dəyişib. API, admin, Prisma/schema/migration, services və start-project funksiyaları dəyişməyib. Deploy/commit/push edilməyib.

## Necə köçürməli
1. İşləyən lokal dev serveri dayandırın.
2. ZIP-i çıxarın. `new-era` qovluğunun İÇİNDƏKİ faylları layihənizdə `package.json` olan yerə köçürün, əvəz etməni təsdiqləyin. Yeni qovluğu köhnə new-era qovluğunun içinə ayrıca yerləşdirməyin.
3. Öz `.env` və `.env.local` fayllarınızı saxlayın. Paket onları əvəz etmir.
4. Köhnə build keşinin qalmaması üçün layihə kökündəki `.next` qovluğunu silin, `npm run dev` ilə serveri yenidən başladın. Brauzerdə Ctrl+F5 edin. Production istifadə edirsinizsə dəyişikliklər yeni build/deploy tələb edir; bu işdə deploy edilməyib.

node_modules, .next, .git və .vercel paketə daxil deyil. Asılılıq əlavə edilməyib. Əvvəlki hesabatlardakı navbar/monitor təsvirlərini bu hesabat əvəz edir.
