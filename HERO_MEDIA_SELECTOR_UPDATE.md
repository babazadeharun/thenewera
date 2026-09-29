# Hero Management → Media Library integration

Implemented without a Prisma migration or database reset.

- Added `src/components/admin/MediaSelector.tsx`.
- Hero desktop/mobile/video fields now select existing `Media` records through `/api/admin/media`.
- Image selectors prefer `HERO` category and allow switching to all categories.
- Video selector only displays video MIME types.
- Search, category filter, refresh, selected preview, clear/remove, empty states and upload-navigation are included.
- Existing `/api/admin/hero` and `/api/admin/hero/[id]` continue to persist `desktopMediaId`, `mobileMediaId`, and `videoMediaId`.
- No new database model or migration was added.
- The existing Media Library upload flow remains the only upload path.
- Existing authentication/admin authorization and storage implementation are reused.

Verification note: dependency installation in the isolated build environment timed out, so a fresh `npm run build` could not be executed in this environment. No build success is claimed here.
