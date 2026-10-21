# NEW ERA — Onlayn təkliflər: dəyişən fayllar

Paketdə yalnız bu əlavəyə aid 18 fayl var. Mövcud dəyişikliklər: SalesCrm-də yeni tab və komponent bağlantısı, header-də yalnız yeni `/offer/` səhifəsi üçün gizlənmə şərti, Prisma sxemində 3 əlavə model və satışa əlaqə. Digər fayllar yenidir. Public səhifələrin, login/qeydiyyatın və mövcud poçt API-lərinin kodu dəyişmir. Layihədəki mövcud Apollo tədbir şəkli istifadə olunur; yeni şəkil/paket asılılığı əlavə edilmir.

Quraşdırma və iki environment dəyişəni: `ONLINE-OFFERS-INSTALL.md`.

## Fayllar və SHA-256

| Fayl | SHA-256 |
| --- | --- |
| `app/admin/SalesCrm.tsx` | `c0e6f1138d2edf7448143dbcfd9b4cccdcbefd1fcb5f7753b03a61d27b2bdae2` |
| `app/admin/SalesOffers.tsx` | `d8e3cadc1c86a56375a6952939d4a98b2673f9507a045452fbca86d3646a1bfd` |
| `app/admin/sales-offers.css` | `e22a60c7351ce18d0effbad81d43261bcad05b012d0a2672bce905ca3a4e66f9` |
| `app/components-site-header.tsx` | `201005886de714462e36b2bea0b1595774f6715f0939189bceaf9a5fe7b8fa7a` |
| `app/api/admin/sales/offers/route.ts` | `afa6118fef934589a61793db5c02f5b9e66593d941037bea105d07dcdd22899c` |
| `app/api/offers/[id]/route.ts` | `f149bf377e8a8aa05873116f2c5f19f9b319ee4c3129252624e2b821f8de1aab` |
| `app/offer/[id]/page.tsx` | `2df5843b9e998c70170de0dd40b8e912d419464d1a74f94b817134160218ac55` |
| `app/offer/[id]/layout.tsx` | `f36ef389e4fc3a80935535d3dc5010330ac06ecfeb33e63443d36c2ed4684603` |
| `app/offer/OfferClient.tsx` | `b9eedae8f7593dfef22bd4aa4682d1e3f30b67e2d6c0a4364e883d466b3c03b8` |
| `app/offer/OfferView.tsx` | `3a2eb2ebb5a6998fd8665c3c0c5b6beb73d73338d5b51d63a6228d8db623b284` |
| `app/offer/offer.css` | `ff9a750cf0efd98dba8ab369dbf531bc288312843927cfce81601ba3e38a8d96` |
| `src/lib/sales/offer-policy.ts` | `d1d838c3035214650dc4726d8fa9552ce2913815e38c11b12eabb125076e6250` |
| `src/lib/sales/offers.ts` | `20b58a0a81c9cc9213a8a55b63cecccf1b67046b11fd861e7f6b55e1790b695b` |
| `prisma/schema.prisma` | `5fd0e4373974089ac6db49354eb9224755320d7de3628539debff7658b94f293` |
| `prisma/migrations/20261021100000_sales_online_offers/migration.sql` | `9f36e9d8c6a107ae036c7c78f5a690708a339e6845b9d597239f47167e692a65` |
| `tests/sales-offers.integration.cjs` | `b8a31b121d8363cfb47d95b7a8aba05f9280f9007c67e2c4051b0d5166863ec8` |
| `ONLINE-OFFERS-INSTALL.md` | `c55d4f5f1bf380a4b24b3819688b82d27fee9fecbbb8ccd3460a54b44ba9309c` |

Manifest özü də paketə daxildir. Migration yalnız əlavə dəyişiklikdir.

## GitHub — yalnız bu faylları göndərmək

Əvvəl quraşdırma təlimatındakı Vercel environment, migration və build addımlarını tamamlayın. Sonra PowerShell-də bloku bütöv işlədin. Əvvəldən stage edilmiş başqa dəyişiklik varsa blok dayanır; onları avtomatik silmir.

```powershell
& {
    Set-Location 'C:\Users\User\Downloads\new-era-starter\new-era-starter\new-era-starter\new-era'
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Əvvəldən stage edilmiş dəyişikliklər var. git status nəticəsini yoxlayın.' }
    $paths = @(
        'app/admin/SalesCrm.tsx'
        'app/admin/SalesOffers.tsx'
        'app/admin/sales-offers.css'
        'app/components-site-header.tsx'
        'app/api/admin/sales/offers/route.ts'
        'app/api/offers/[id]/route.ts'
        'app/offer/[id]/page.tsx'
        'app/offer/[id]/layout.tsx'
        'app/offer/OfferClient.tsx'
        'app/offer/OfferView.tsx'
        'app/offer/offer.css'
        'src/lib/sales/offer-policy.ts'
        'src/lib/sales/offers.ts'
        'prisma/schema.prisma'
        'prisma/migrations/20261021100000_sales_online_offers/migration.sql'
        'tests/sales-offers.integration.cjs'
        'ONLINE-OFFERS-INSTALL.md'
        'ONLINE-OFFERS-FILES.md'
    )
    foreach ($file in $paths) {
        if (-not (Test-Path -LiteralPath $file)) { throw "Fayl tapılmadı: $file" }
    }
    git add -- $paths
    if ($LASTEXITCODE -ne 0) { throw 'Stage alınmadı.' }
    git diff --cached --check
    if ($LASTEXITCODE -ne 0) { throw 'Format yoxlaması alınmadı.' }
    git diff --cached --stat
    git diff --cached --quiet
    $diffExit = $LASTEXITCODE
    if ($diffExit -eq 1) {
        git commit -m "Add detailed online sales offers with verified customer responses"
        if ($LASTEXITCODE -ne 0) { throw 'Commit alınmadı.' }
    } elseif ($diffExit -ne 0) { throw 'Git yoxlaması alınmadı.' }
    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Push alınmadı.' }
    git log -1 --oneline
    git status --short
}
```

`.env`, açarlar, node_modules, .next, .crm-test-runtime, QA screenshot-ları və ehtiyat nüsxələri paketə və stage siyahısına daxil deyil. GitHub-a göndərmə Vercel açarlarını və baza migration-unu avtomatik əvəz etmir.
