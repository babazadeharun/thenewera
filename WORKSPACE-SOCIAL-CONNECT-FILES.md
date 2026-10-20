# NEW ERA — Sosial bağlantı yeniləməsinin faylları

Bu ZIP yalnız bu tapşırığa aid yeni/dəyişən faylları ehtiva edir. Əvvəlki Workspace V2 və satış idxalı yenilikləri layihədə olmalıdır. Mövcud fayllar eyni yollarla əvəz edilir. `package.json` daxilində yalnız sosial test skripti əlavə olunub; yeni production dependency yoxdur.

## Fayllar və SHA-256

| Fayl | SHA-256 |
| --- | --- |
| `app/api/workspace/[[...path]]/route.ts` | `f9ea3403753e39161877cb8e0496e770f1d33923fca2938a6dba939f68c9ecc7` |
| `app/api/workspace-social/callback/[channel]/route.ts` | `10669f109ce6182a9c15e7c9ae6f5732c1ccd9124a31d5145d3b58b87d9f3ece` |
| `app/api/workspace-social/webhook/[provider]/route.ts` | `da0ff19f3b07d1fbb3e55bb87b1fc628e22e36bd53fea5d1360bc685017b7998` |
| `app/api/workspace-social/deauthorize/[provider]/route.ts` | `6dafe1b675c87b4183ff5fd98633870ff54a59065843a6b9bbe4914c8744617c` |
| `app/api/workspace-webhooks/instagram/[id]/route.ts` | `59c1cbb3db9383139868a10c84a336ac62044cb1b04e52f317aa09efada567b8` |
| `app/api/workspace-webhooks/whatsapp/[id]/route.ts` | `2b00b882790ae4fa80c6eaad8a34d3ccbbe52aff15aaa8d346db048d3abfd8cf` |
| `app/workspace/Advanced.tsx` | `b8034c1b65a3728aab48115de41048b7049c83d5e1f18de9565976fb4b3dc7de` |
| `app/workspace/Editor.tsx` | `15c9d4711297a3bfdef59ac7ccb1d8447f5ecd2c04c3da4924fb7fd538d337db` |
| `app/workspace/Sections.tsx` | `fff78dd7ead6e3c8222edfefc6be16c6e930123cfab48d762893b12d33a2bd73` |
| `app/workspace/SocialConnections.tsx` | `15380e0269ac402d4e0fbb5494c1c7c27243f9133b161034017574ab180e8bc2` |
| `src/lib/crm/social-api.ts` | `2f7296ab56d8794371d9271314099ef672b6b876242f686573281c81518f2dd7` |
| `src/lib/crm/social.ts` | `7c9efb3013740464ca6049f32fad8e1afef104f341e0f4e756bd6c7d584f6f92` |
| `src/lib/crm/social-webhook.ts` | `d7594851a84eafcba70f7488af993be8e793f47e663e4a3bcdc288a3a457fd03` |
| `src/lib/crm/providers.ts` | `c69b0b53c98036292a3ea601502ead941281bc489be39e15ef7b82143e9b71a2` |
| `src/lib/crm/records.ts` | `89f0a3c67db46774158329b3c7c174e5209d3e25c56299484131faaa28a7bb8d` |
| `src/lib/crm/inbox.ts` | `33321727516d53dd200052c935c83f154efdbf5652e0ac6aaa686dcc76c6dd05` |
| `src/lib/crm/queue.ts` | `676e307f86a84113d67269de18d9d15ab3e90a6ed6d56d459cb4d8056379e54b` |
| `prisma/schema.prisma` | `11a72720a27bfec121ba1b2ec792a411471c095a7ae94b16394e8a7a617255b3` |
| `prisma/migrations/20261020103000_workspace_social_connect/migration.sql` | `69da225a5d83de1a373f5ae8083d8dc098940556bdad2861282759e3a33b7b41` |
| `package.json` | `f1237845573a9013467dbbcace20a239a8c68e7175e6db7357a9b8582498f95a` |
| `tests/workspace-social.integration.cjs` | `1127c9b0d987ce9fe10e4a88efd87ca9b22b46375a0664e9c01f6bbcbd968d3a` |
| `WORKSPACE-SOCIAL-CONNECT-INSTALL.md` | `1cb7f4d4d04b2ecb0e3a35bcdca7bc1264fb8668c3c15ab5d5ac45043bc4bba7` |

Bu manifest də paketə daxildir. Migration: `20261020103000_workspace_social_connect`. Environment və quraşdırma: `WORKSPACE-SOCIAL-CONNECT-INSTALL.md`.

## GitHub üçün yalnız bu faylları stage edin

PowerShell-də layihə qovluğunda:

```powershell
$paths = @(
  'app/api/workspace/[[...path]]/route.ts'
  'app/api/workspace-social/callback/[channel]/route.ts'
  'app/api/workspace-social/webhook/[provider]/route.ts'
  'app/api/workspace-social/deauthorize/[provider]/route.ts'
  'app/api/workspace-webhooks/instagram/[id]/route.ts'
  'app/api/workspace-webhooks/whatsapp/[id]/route.ts'
  'app/workspace/Advanced.tsx'
  'app/workspace/Editor.tsx'
  'app/workspace/Sections.tsx'
  'app/workspace/SocialConnections.tsx'
  'src/lib/crm/social-api.ts'
  'src/lib/crm/social.ts'
  'src/lib/crm/social-webhook.ts'
  'src/lib/crm/providers.ts'
  'src/lib/crm/records.ts'
  'src/lib/crm/inbox.ts'
  'src/lib/crm/queue.ts'
  'prisma/schema.prisma'
  'prisma/migrations/20261020103000_workspace_social_connect/migration.sql'
  'package.json'
  'tests/workspace-social.integration.cjs'
  'WORKSPACE-SOCIAL-CONNECT-INSTALL.md'
  'WORKSPACE-SOCIAL-CONNECT-FILES.md'
)
git add -- $paths
if ($LASTEXITCODE -ne 0) { throw 'Git add alınmadı.' }
git diff --cached --stat
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Stage edilmiş fərqləri yoxlayın.' }
git commit -m "Add self-service Workspace Meta social connections"
if ($LASTEXITCODE -ne 0) { throw 'Commit nəticəsini yoxlayın.' }
git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Push alınmadı.' }
```

Əvvəldən əlaqəsiz stage edilmiş fayllar varsa commit-dən əvvəl onları nəzərdən keçirin. Production migration və environment addımlarını buraxmayın; tam build əmrləri quraşdırma təlimatındadır. Heç bir `.env`, ehtiyat nüsxə, müvəqqəti QA faylı və ya `.crm-test-runtime` bu siyahıya daxil deyil.
