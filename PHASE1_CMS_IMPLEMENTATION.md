# New Era — Phase 1 CMS Foundation

Implemented from the Phase 1 specification:

- Database models: Media, Hero, HomepageSection
- Additive SiteSetting fields while retaining `heroImage`
- Persistent Vercel Blob storage abstraction
- Secure admin media/hero/homepage/site-settings APIs
- Admin CMS UI integrated into the existing Admin Control Center
- Media upload, filtering, metadata editing and protected deletion
- Hero create/edit/delete/activate/order and media selection
- Homepage section management and current-section sync
- Site settings + SEO metadata foundation
- Public homepage reads CMS hero, homepage sections and site settings with legacy fallbacks
- Responsive CMS styles

## Environment

Set `BLOB_READ_WRITE_TOKEN` for persistent media uploads. Do not commit its value.

## Safe migration

The migration is additive and uses `ON DELETE SET NULL` for CMS media references. Never use `prisma migrate reset`.

## Verification

After installing dependencies:

```bash
npm install
npx prisma validate
npx prisma format
npx prisma generate
npm run build
```

If the configured `DATABASE_URL` is a shared/production database, inspect it locally and apply the additive migration through the project's approved deployment workflow rather than resetting or recreating the database.
