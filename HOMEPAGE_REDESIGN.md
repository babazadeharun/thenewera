# Homepage redesign verification

The supplied inline reference guided the composition; the requested
`design-reference/new-era-design-reference.png` path did not exist in this checkout.
The implementation uses real HTML navigation, typography, CTAs and linked glass
cards, with a separate generated sculpture/visor/laptop illustration (1536×1024,
255,524-byte WebP). It does not flatten the reference screenshot into the page.
Existing local NewEraSans fonts, turquoise wordmark and portfolio/preset images
are reused. No dependencies were added.

## Changed files

- `app/page.tsx`: responsive hero and service strip; existing homepage sections,
  authentication destination and portfolio data remain; CMS titles/descriptions
  are rendered for services, portfolio and process sections.
- `app/components/home/HomeNavigation.tsx`: floating navigation, working local
  page/featured-project search, accessible dialog, mobile menu and section state.
- `app/components/home/HeroMedia.tsx`: CMS desktop/mobile/video rendering,
  optimized default image and video pause control/reduced-motion handling.
- `app/components/home/hero-content.ts`: CMS precedence and safe CTA URL handling.
- `app/components/home/home.module.css`: scoped design/responsive styles.
- `app/components/home/presentation.css`: homepage-only native scroll policy.
- `public/homepage/creative-scene.webp`: generated artwork, used only as fallback.
- `scripts/tests/homepage-content.test.mjs`: CMS precedence/unsafe-link regressions.
- `scripts/tests/homepage-browser.mjs`: optional Playwright local-server smoke suite.
- This verification record.

CMS desktop media wins over the legacy SiteSetting image; mobile and video
selections remain connected. A mobile-only or video-only selection never enables
fallback decorative cards. Custom hero title, description, CTA text/URL and logo
are retained. Disabled sections do not leave broken hero/navigation anchors.
The app has no translation system, so no pretend language selector was added.
The existing analysis route/teaser and account routes remain accessible.

## Scroll strategy

No wheel/touch interception or animation library. The homepage activates
`scroll-snap-type: y proximity` on the document and removes it on unmount.
ResizeObserver enables snap alignment only on presentation sections that fit the
viewport: hero, services, process, about and analytics. Portfolio is explicitly
free-scroll regardless of height. Long CMS content releases snapping. A footer
end snap point preserves keyboard End access. Header-aware scroll padding keeps
anchor headings visible. Mobile (≤760px), reduced motion, open search dialogs
and focused fields disable snapping. Tablet/mobile content can expand naturally;
no fixed height clips it. Events and contact remain their original separate
routes, with natural scrolling and no new presentation sections/forms.

## Actual checks

Verified toolchain: Next.js 15.5.26, React 19.1.0, Prisma 5.17.0; installed
TypeScript and existing local fonts/styles reused.

Executed from `/workspace/thenewera`:

```bash
node --test scripts/tests/homepage-content.test.mjs
./node_modules/.bin/tsc --noEmit --incremental false
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_verify_59bacd85_fresh?schema=public' NEXT_TELEMETRY_DISABLED=1 npm run build
# Run against the same reviewed local test target, with no account cookies:
DATABASE_URL='postgresql://thenewera@127.0.0.1:5432/newera_verify_59bacd85_fresh?schema=public' NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next start -H 127.0.0.1 -p 3100
NEWERA_TEST_ORIGIN=http://127.0.0.1:3100 NEWERA_CHROMIUM=/usr/bin/chromium node scripts/tests/homepage-browser.mjs
npm run lint
git diff --check
```

- Content tests: exit 0, 4 passed, no failures/skips.
- TypeScript: exit 0, no errors.
- Production build: exit 0 after correcting the CSS-module/global-selector issue;
  final build compiled without the earlier flex alignment warnings.
- Browser suite: exit 0, **42 checks passed**, zero page runtime errors. Actual
  Chromium viewport sizes: 1536×1024, 834×1112, 390×844 and 320×740.
  Checked layout overflow, unclipped text/hero, free-scroll portfolio, functional
  project search/empty state, Escape/focus return, mobile navigation, active
  section state, oversized content releasing snap, wheel/keyboard footer access,
  raw emulated touch swipes on both mobile sizes, reduced motion, separate-route
  natural scrolling and typing in the project form without submitting it.
- Screenshots inspected at desktop/tablet/mobile. Tablet artwork was changed to
  stack after observed clipping. Desktop art/card proportions were refined.
- Whitespace check: exit 0.
- Lint: **not run successfully**. Existing `next lint` prompts for initial ESLint
  configuration and exits 1 without executing lint rules. No dependency or lint
  configuration was changed to conceal this limitation.

Logs: `/tmp/newera-home-{build,typecheck,content,browser,lint}.log`.
Screenshots: `/tmp/newera-home-screenshots/{desktop,tablet,mobile,small-mobile}.png`.
Playwright is supplied by this environment, not a new application dependency.
The browser download endpoint returned HTTP 403; existing system Chromium was
used successfully instead.

Native scrollbar dragging was explicitly UNRUN because headless Chromium
exposes no draggable gutter. Physical trackpad/device testing and other browser
engines remain unverified. CMS precedence was regression-tested with fixtures;
no CMS/admin or production data was edited to manufacture a visual result.

The local test database was verified before use through the retained endpoint
policy: Docker `thenewera-postgres`, endpoint 127.0.0.1:5432, PostgreSQL system
identifier 7696469598012088349, database `newera_verify_59bacd85_fresh`, OID 45296,
public schema. Requests used unauthenticated sessions and no forms were submitted.
No migrations, reconciliation, shadow replay, reset, DROP or production access
occurred. Prior Prisma working-tree changes were preserved. No merge, push or
deployment occurred; the existing database deployment block remains in force.
