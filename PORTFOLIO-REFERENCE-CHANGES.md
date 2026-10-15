> Cari düzəliş: NAVBAR-GLASS-FIX.md hesabatına baxın. Monitor çıxarılıb və navbar vahidləşdirilib.

# New Era — Portfolio reference adaptation

Əsas mənbə: istifadəçinin `new-era-starter (5).zip` yekun layihəsi. Ləğv edilmiş mobil ZIP istifadə edilmədi.

## Dəyişikliklər
- `app/portfolio/page.tsx`: yalnız `portfolio-reference.css` importu əlavə edildi. Səhifənin qalan kodu təqdim edilən ZIP ilə bayt səviyyəsində eynidir.
- `app/portfolio/portfolio-reference.css` (yeni): `/portfolio` üçün açıq fon, firuzəyi vurğular, glass kartlar, tipoqrafiya, mövcud jump linklərin görünüşü, header rəngləri, boş vəziyyətlərin və CTA-nın üslubu. Planşetdə navbarın mövcud elementlərinin ölçüləri daşmanın qarşısını almaq üçün uyğunlaşdırılıb.
- `public/portfolio-reference/portfolio-hero.png` (yeni)
- `public/portfolio-reference/glass-video.png` (yeni)
- `public/portfolio-reference/glass-design.png` (yeni)
- `public/portfolio-reference/cta-accent.png` (yeni)
- `PORTFOLIO-REFERENCE-CHANGES.md` (bu hesabat)

## Qorunanlar
Bütün mövcud mətnlər, bölmələrin sırası, grid sütunları və responsive breakpoint-lər, düymə və keçid istiqamətləri, video controls, Prisma sorğuları, published filtri, eyni layihənin cover üzrə qruplaşdırılması, fallback layihələr və boş məlumat vəziyyətləri dəyişməyib. Tərəfdaşlar əvvəlki CMS mənbəsindən gəlir və mövcud marquee davranışı saxlanılıb. Referansdakı nümunə loqolar, layihə adları, tarixlər, əlavə carousel düymələri, footer və bölmələri birləşdirən alternativ quruluş tətbiq edilməyib. Yeni dekorlar CSS background-larıdır və interaktiv funksiya təqdim etmir.

Dəyişikliklər `.agencyPortfolioPage` və `body:has(.agencyPortfolioPage)` ilə məhdudlaşdırılıb. Homepage, services, start-project, portfolio detail, hesab və admin kodları dəyişdirilməyib. Mövcud Git dəyişiklikləri saxlanılıb; restore/reset/commit/push/deploy edilməyib.

## Yoxlamalar
- TypeScript `node node_modules/typescript/bin/tsc --noEmit` keçdi.
- `npm run build` kompilyasiya və type yoxlamasını keçdi; `/events` prerender zamanı mövcud Neon PostgreSQL serverinə qoşulmadığı üçün tam build tamamlanmadı.
- Actual portfolio server komponenti ayrıca test mühitində kontrollu CMS fixture məlumatları ilə render edildi. Production bazasına məlumat yazılmadı. Brauzer yoxlamasında 320, 390, 760, 810, 1024, 1440px ölçülərdə həm boş, həm dolu məlumat vəziyyətində üfüqi daşma olmadı, runtime xətası qeydə alınmadı.
- Test fixture: eyni layihənin gallery faylı əlavə kart yaratmadı, DRAFT iş göstərilmədi, detal linki `/portfolio/project-1` qaldı, video controls saxlandı, tərəfdaş məlumatının ikiqat marquee renderi və `#design` keçidi işləyir.
- Göndərilən mənbə ZIP-i ilə müqayisədə dəyişmiş yeganə mövcud mənbə faylı `app/portfolio/page.tsx`-dir (yalnız CSS importu). Qalan yeniliklər yuxarıda sadalanan ayrıca CSS/asset/hesabat fayllarıdır.

## İstifadə
ZIP tam layihə mənbəyidir; node_modules, .next, .git, .vercel və şəxsi .env faylları daxil edilməyib. Mövcud `.env` və `.env.local` fayllarınızı yeni `new-era` qovluğuna köçürün. Əvvəlki quraşdırma qaydası və layihə əmrləri qüvvədədir. Asılılıq dəyişdirilməyib.
