# New Era — Phase 1A implementation status

This ZIP contains the additive Phase 1A database foundation only.

## Included
- `Media` model and `MediaCategory` enum
- `Hero` model with reusable Media relations for desktop/mobile/video
- `HomepageSection` model with optional reusable Media relation
- Additive Prisma migration: `20260929170000_add_cms_media_hero_homepage`
- Existing `SiteSetting.heroImage` retained unchanged for backward compatibility

## Safety
- No existing models were removed.
- No existing fields were removed.
- No destructive migration/reset is included.
- Media relations use `ON DELETE SET NULL`; deleting a media record does not cascade into Heroes/HomepageSections.
- Binary files are not stored in PostgreSQL; `url` and `storageKey` are foundation fields.
- No UI, upload provider, localStorage migration, public redesign, CRM/Finance migration, or unrelated refactor was added.

## Verification status
The previous environment could not complete `npm install` because the package registry request timed out. Therefore Prisma generation, migration execution, and `npm run build` remain unverified in this environment.

Run locally from the project root:

```bash
npm install
npx prisma --version
npx prisma generate
npx prisma migrate dev --name add_cms_media_hero_homepage
npm run build
```

Do not run `prisma migrate reset`.
