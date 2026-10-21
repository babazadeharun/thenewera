# NEW ERA — Instagram ilə təklif göndərişi: fayllar

Paket yalnız bu əlavəyə aid 21 fayldır; əvvəlki Onlayn təkliflər paketinin üstünə tətbiq olunur.

Mövcud fayllarda məhdud dəyişikliklər:
- SalesCrm: bağlantı ekranından Onlayn təkliflər tabına təhlükəsiz daxili qayıdış.
- SalesOffers: bağlantı kartı, göndəriş düyməsi və Instagram hadisələrinin tərcümələri.
- Prisma sxemi: 5 əlavə model və virtual əlaqə; əvvəlki modellər saxlanılır.
- Əvvəlki onlayn təklif testi: baza fixture-si yeni əlavə modelləri nəzərə alır.

Digər fayllar yenidir. Mövcud Workspace provider/OAuth/webhook, public navbar, auth, SMTP və poçt kodu, package.json/lock və vercel.json dəyişmir. Quraşdırma, environment, Meta callback/webhook və test məlumatları: INSTAGRAM-OFFERS-INSTALL.md.

## Fayllar və SHA-256

| Fayl | SHA-256 |
| --- | --- |
| `app/admin/SalesCrm.tsx` | `cf68abec950a13f4ad0363d036eeb7ca32d98ca0184e20510284fc1987ebd20f` |
| `app/admin/SalesOffers.tsx` | `c5765a08c321ecaa50eb8e8e2c73111c4358f05e94adf2bb2f91c09b2737f9e3` |
| `app/admin/SalesInstagram.tsx` | `0cc9836a72dafac28c90f6d6a02b896539e73ceac0835a9ee15280b1251a2816` |
| `app/admin/sales-instagram.css` | `15c2dc2be0d603739b4706fd6c312a7f3d003d62a0896fc4ad4e457690046f5b` |
| `app/admin/sales-instagram/page.tsx` | `03e31bec65a7734941a3764876cb33e194202c47dd31bba07d273ef3bfc92d83` |
| `app/admin/sales-instagram/Settings.tsx` | `e3922f1cb19a7441d2d5e13f509c8f3a87bffb0354eb8c373c5011eab7d1b4fa` |
| `app/api/admin/sales/instagram/route.ts` | `ca9509b605a9e2903f1fc34a80059364411de7962064b99ef4e198b9c250f18f` |
| `app/api/sales-instagram/callback/route.ts` | `3281cd113861d0dc0e2fb662931153236815a59728d4c891ef9f35aeb09f961d` |
| `app/api/sales-instagram/webhook/route.ts` | `c2f7af5c14d6e178760c33b22d36f7577605a80ff54d18d848927c5b16c5326f` |
| `app/api/sales-instagram/deauthorize/route.ts` | `713c5c3c77357f8d3e0c9bae291582fe10c3427b28719b07c8de9c229f87cada` |
| `src/lib/sales/instagram-api.ts` | `c1879b60f2e4c02633bcce609137c31e5ac516f998eb1010ff330e5c4b91180f` |
| `src/lib/sales/instagram-connection.ts` | `b09dcebfaba83d763219cec161bdf22f0a05c867e5647375bc984fe10ea6ad83` |
| `src/lib/sales/instagram-http.ts` | `42355872dfa6f41617a7ad3d6e12964f8ab53eed29eda53e21f79ee2a0940dcb` |
| `src/lib/sales/instagram-offers.ts` | `f12e65e79be762a5cf939e6e2ccf59ea79d1f4cb3d408052cd0f25bc5dc0f604` |
| `src/lib/sales/instagram-webhook.ts` | `94d9f899e2fe5ea501203a0152742f8c8ab0332b4f0ef2c0559015f0b4e5a13a` |
| `prisma/schema.prisma` | `74eeb578772cf886c9870c167715de121a5294684e01da9f8fc9be39d5907aa5` |
| `prisma/migrations/20261021160000_sales_instagram/migration.sql` | `794bda39cd85bbcb53737527813e9f1f7d498672d523f4b15e0629f2deaf0be6` |
| `tests/sales-instagram.integration.cjs` | `61d76d80cd6ffa0ec061fdf5b2a58637a8a485e0487aecfef9d641114c1759e8` |
| `tests/sales-offers.integration.cjs` | `a626438981b30c27797dd103d5e6b6269c0f1bde071a5c16a0516504471455af` |
| `INSTAGRAM-OFFERS-INSTALL.md` | `676495d725d9f2f74ac861cdcb14ebe720e8f2ea60a3c15514a6b8e6c5f1fd05` |

Bu manifest özü də ZIP-ə daxildir.

## GitHub-a göndərmə

Əvvəl quraşdırma sənədinə uyğun əlavə migration və build-i tamamlayın. Sonra aşağıdakı PowerShell blokunu bütöv işlədin. Əvvəldən əlaqəsiz stage edilmiş fayllar varsa blok dayanır, heç nəyi avtomatik silmir.

```powershell
& {
    Set-Location 'C:\Users\User\Downloads\new-era-starter\new-era-starter\new-era-starter\new-era'
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Əvvəldən stage edilmiş dəyişiklik var. git status nəticəsini yoxlayın.' }
    $paths = @(
        'app/admin/SalesCrm.tsx'
        'app/admin/SalesOffers.tsx'
        'app/admin/SalesInstagram.tsx'
        'app/admin/sales-instagram.css'
        'app/admin/sales-instagram/page.tsx'
        'app/admin/sales-instagram/Settings.tsx'
        'app/api/admin/sales/instagram/route.ts'
        'app/api/sales-instagram/callback/route.ts'
        'app/api/sales-instagram/webhook/route.ts'
        'app/api/sales-instagram/deauthorize/route.ts'
        'src/lib/sales/instagram-api.ts'
        'src/lib/sales/instagram-connection.ts'
        'src/lib/sales/instagram-http.ts'
        'src/lib/sales/instagram-offers.ts'
        'src/lib/sales/instagram-webhook.ts'
        'prisma/schema.prisma'
        'prisma/migrations/20261021160000_sales_instagram/migration.sql'
        'tests/sales-instagram.integration.cjs'
        'tests/sales-offers.integration.cjs'
        'INSTAGRAM-OFFERS-INSTALL.md'
        'INSTAGRAM-OFFERS-FILES.md'
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
        git commit -m "Add approved Instagram sending for online sales offers"
        if ($LASTEXITCODE -ne 0) { throw 'Commit alınmadı.' }
    } elseif ($diffExit -ne 0) { throw 'Git yoxlaması alınmadı.' }
    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Push alınmadı.' }
    git log -1 --oneline
    git status --short
}
```

Açarlar, .env, node_modules, .next, .crm-test-runtime, müvəqqəti QA və screenshot-lar bu siyahıya daxil deyil. GitHub push Meta hesabını və Vercel dəyişənlərini avtomatik qoşmur.
