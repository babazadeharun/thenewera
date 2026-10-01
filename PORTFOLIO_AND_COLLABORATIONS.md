# New Era — Portfolio və Əməkdaşlıqlar

Bu dəyişiklik public `/portfolio` səhifəsini New Era agentlik modelinə uyğun CMS-idarə olunan portfolio vitrininə çevirir.

## Public struktur

1. **Portfolio** — `PORTFOLIO` kateqoriyalı işlər
2. **Videolar** — `PORTFOLIO_VIDEO` kateqoriyalı videolar
3. **Dizayn** — `PORTFOLIO_DESIGN` kateqoriyalı poster və kreativ vizuallar
4. **Əməkdaşlıqlar** — `PARTNER_LOGO` kateqoriyalı şirkət loqoları; aşağı hissədə avtomatik hərəkətli lent

Başlıq: **Portfolio və əməkdaşlıqlar**.

## Admin istifadəsi

Admin → Portfolio → **Portfolio məzmununu idarə et** → CMS → Media Library.

Faylı yükləyərkən uyğun kateqoriya seçilir:
- Portfolio işi
- Portfolio video
- Dizayn / poster
- Əməkdaş şirkət loqosu

Fayl Vercel Blob-a yüklənir və Media DB-də saxlanılır. Public portfolio səhifəsi DB-dən dinamik oxuyur; ayrıca public kod dəyişmədən yeni materiallar görünür.

## Database

`MediaCategory`-yə yalnız additive dəyərlər əlavə olunub:
- `PORTFOLIO_VIDEO`
- `PORTFOLIO_DESIGN`
- `PARTNER_LOGO`

Migration: `prisma/migrations/20261001143000_add_portfolio_media_categories/migration.sql`

Production DB üçün deploy zamanı mövcud migration-lar ilə birlikdə `npx prisma migrate deploy` işlədilməlidir.
