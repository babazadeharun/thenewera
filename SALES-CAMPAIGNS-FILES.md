# NEW ERA — Təklif kampaniyaları: dəyişən fayllar

Bu paket yalnız yeni admin e-poçt kampaniyası moduluna aid 18 faylı ehtiva edir. Əvvəlki satış idxalı və Workspace/sosial yeniliklərinin üstündən tətbiq edilir. ZIP-i layihə kökünə çıxarın; eyni yollardakı fayllar əvəz edilir.

Mövcud dəyişən fayllar: `app/admin/SalesCrm.tsx`, `src/lib/mail/smtp.ts`, `src/lib/mail/imap.ts`, `prisma/schema.prisma`. Digər yollar yenidir. `package.json`, lock, public/navbar və `vercel.json` dəyişmir. Avtomatik scheduler ayrıca qoşulmalıdır. Quraşdırma: `SALES-CAMPAIGNS-INSTALL.md`.

## Fayllar və SHA-256

| Fayl | SHA-256 |
| --- | --- |
| `app/admin/SalesCrm.tsx` | `67a2968280801de880f396cf3a4fc5e8bceef2c7ddd8e63a0ab29b929ae93644` |
| `app/admin/SalesCampaigns.tsx` | `d53b5049ff58645d8c8120ab6d040ae7cf2af35d049586329b8db8ce334d1636` |
| `app/admin/sales-campaigns.css` | `d506c7e01abe6d63643d1a86e68cf003b45259521402f6bd09aaafc30856e387` |
| `app/api/admin/sales/campaigns/route.ts` | `fccdc92be4a8269ec0e2f1b098acc01ba1b38b29f5198422c9d877aaa30092b4` |
| `app/api/cron/sales-campaigns/route.ts` | `f69fbbc01807b8bd09758110333fb61529fc7783d1c72a7fc3757ff7c5cfa6bc` |
| `app/api/sales/email-preferences/route.ts` | `048790046b0b3cd354c4c22bfd6181bb6a9aa2a0615e49be2722ca85ebf17889` |
| `app/sales/email-preferences/page.tsx` | `ab589470e66ba92cd63d748a3e0b2b7a475a2db31ee0d75b7c443a4b09ca0b06` |
| `app/sales/email-preferences/layout.tsx` | `a2c92abe6c58f17d9f4937a962231f2448687c1646fe75add6c4e4ccab38af12` |
| `src/lib/sales/campaign-policy.ts` | `d6576deaec3bfbeb68d64e5924edcc53c3d947d505439b5502e2d39fb77bdd28` |
| `src/lib/sales/campaign-mail.ts` | `6cec6d1fe77ae841cbbe010c631cb337e276d9a4e8fbefcfd359e03960a90554` |
| `src/lib/sales/campaigns.ts` | `196a34e491315c9fcab9c4f2d98768a966bdb1c6360c4b07612ebbdd0e6ed7af` |
| `src/lib/mail/smtp.ts` | `7b9935a601938f9fdbeb62c8ae1a2ae228e6682fb7436e2c70df78ebee9ac982` |
| `src/lib/mail/imap.ts` | `33cd216419a4f1e69ff50f022c292a529b97663c61ac2a92fa5d62c9e9a31a35` |
| `prisma/schema.prisma` | `d212d6e9fe57d598b5e81f68ac59c0702769a425d82e60c91559df42e401bb87` |
| `prisma/migrations/20261020133000_sales_email_campaigns/migration.sql` | `2cb6b91b0a7cae54cb480ba6477f1f7f21768e3b930b7639a789d2efd6cf4c55` |
| `tests/sales-campaigns.integration.cjs` | `505f64741cd1f5c38317b00eb85ad62cac4d736225840cf8f0f62343513f9209` |
| `SALES-CAMPAIGNS-INSTALL.md` | `358f18d1cc00e4ca671bc7479ac3195e62afde4d7bb002f8c0e98dbd560d90eb` |

Bu manifest özü də ZIP-ə daxildir. Migration `20261020133000_sales_email_campaigns` yalnız əlavə dəyişiklikdir.

## GitHub-a göndərmə

Əvvəl environment/migration/build addımlarını quraşdırma təlimatına uyğun tamamlayın. Sonra PowerShell-də yalnız aşağıdakı yolları stage edin.

```powershell
& {
    Set-Location 'C:\Users\User\Downloads\new-era-starter\new-era-starter\new-era-starter\new-era'
    $paths = @(
        'app/admin/SalesCrm.tsx'
        'app/admin/SalesCampaigns.tsx'
        'app/admin/sales-campaigns.css'
        'app/api/admin/sales/campaigns/route.ts'
        'app/api/cron/sales-campaigns/route.ts'
        'app/api/sales/email-preferences/route.ts'
        'app/sales/email-preferences/page.tsx'
        'app/sales/email-preferences/layout.tsx'
        'src/lib/sales/campaign-policy.ts'
        'src/lib/sales/campaign-mail.ts'
        'src/lib/sales/campaigns.ts'
        'src/lib/mail/smtp.ts'
        'src/lib/mail/imap.ts'
        'prisma/schema.prisma'
        'prisma/migrations/20261020133000_sales_email_campaigns/migration.sql'
        'tests/sales-campaigns.integration.cjs'
        'SALES-CAMPAIGNS-INSTALL.md'
        'SALES-CAMPAIGNS-FILES.md'
    )
    git add -- $paths
    if ($LASTEXITCODE -ne 0) { throw 'Stage alınmadı.' }
    git diff --cached --check
    if ($LASTEXITCODE -ne 0) { throw 'Format yoxlamasını nəzərdən keçirin.' }
    git diff --cached --stat
    git diff --cached --quiet
    $diffExit = $LASTEXITCODE
    if ($diffExit -eq 1) {
        git commit -m "Add approved email proposal campaigns and reply-aware follow-ups"
        if ($LASTEXITCODE -ne 0) { throw 'Commit alınmadı.' }
    } elseif ($diffExit -ne 0) { throw 'Git fərqlərini yoxlamaq alınmadı.' }
    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Push alınmadı.' }
    git log -1 --oneline
    git status --short
}
```

Əvvəldən əlaqəsiz stage edilmiş fayllar varsa commit-dən əvvəl onları nəzərdən keçirin. `.env`, `.crm-test-runtime`, `node_modules`, `.next`, ehtiyat nüsxələr və müvəqqəti test faylları stage edilməməlidir. GitHub push canlı e-poçt/scheduler konfiqurasiyasını avtomatik tamamlamır.
