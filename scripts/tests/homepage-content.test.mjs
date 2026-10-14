import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync('app/components/home/hero-content.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { heroPresentation } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
test('new illustration is used only with no CMS selection', () => {
  assert.equal(heroPresentation().desktop, '/homepage/creative-scene-reference.webp');
  assert.equal(heroPresentation().defaultArtwork, true);
});
test('CMS desktop, mobile, video and CTA retain priority', () => {
  const p = heroPresentation({ desktopMedia: {url:'/desktop.jpg'}, mobileMedia:{url:'/mobile.jpg'}, videoMedia:{url:'/video.mp4'}, ctaUrl:'/start-project?service=design' }, '/legacy.jpg');
  assert.deepEqual(p, {desktop:'/desktop.jpg',mobile:'/mobile.jpg',video:'/video.mp4',cta:'/start-project?service=design',defaultArtwork:false});
});
test('legacy image and mobile-only or video-only selection retain CMS media mode', () => {
  assert.equal(heroPresentation(undefined,'/legacy.jpg').desktop,'/legacy.jpg');
  assert.equal(heroPresentation(undefined,'/legacy.jpg').defaultArtwork,false);
  assert.equal(heroPresentation({mobileMedia:{url:'/mobile.jpg'}}).mobile,'/mobile.jpg');
  assert.equal(heroPresentation({mobileMedia:{url:'/mobile.jpg'}}).defaultArtwork,false);
  assert.equal(heroPresentation({videoMedia:{url:'/video.mp4'}}).defaultArtwork,false);
});
test('valid external CMS links work and unsafe links fail closed', () => {
  assert.equal(heroPresentation({ctaUrl:'https://example.com/brief'}).cta,'https://example.com/brief');
  for(const ctaUrl of ['javascript:alert(1)','//example.com','/\\example.com','https://user:secret@example.com','https://','/path\nunsafe','data:text/html,x']) assert.equal(heroPresentation({ctaUrl}).cta,'/start-project',ctaUrl);
});

import { spawnSync } from 'node:child_process';
test('CMS fixture refuses startup without an explicit test opt-in', () => {
  const r=spawnSync(process.execPath,['--require','./scripts/tests/homepage-cms-fixture.cjs','-e','process.exit(0)'],{env:{...process.env,NEWERA_CMS_FIXTURE:'0'},encoding:'utf8'});
  assert.notEqual(r.status,0); assert.match(r.stderr,/Explicit local CMS fixture opt-in required/);
});
test('CMS fixture rejects write operations before any database connection', () => {
  const r=spawnSync(process.execPath,['--require','./scripts/tests/homepage-cms-fixture.cjs','-e',"global.prisma.hero.create({data:{title:'fixture'}}).then(()=>process.exit(1),e=>process.exit(e.message.includes('Database writes forbidden')?0:1))"],{env:{...process.env,NEWERA_CMS_FIXTURE:'1',DATABASE_URL:'postgresql://unused@127.0.0.1:1/unreachable?schema=public'},encoding:'utf8'});
  assert.equal(r.status,0);
});

test('hero has no extra floating artwork links and preserves existing controls', () => {
  const page = readFileSync('app/page.tsx', 'utf8');
  assert.doesNotMatch(page, /styles\.(artCards|artCard|creativeCard|brandCard)/);
  assert.match(page, /<HomeNavigation /);
  assert.match(page, /<PresentationSlides \/>/);
  assert.match(page, /href=\{presentation.cta\}/);
  assert.match(page, /styles.servicePanel/);
});
test('light hero palette keeps artwork and logo colors intact', () => {
  const css = readFileSync('app/components/home/home.module.css', 'utf8');
  assert.match(css, /background: #f5f7f7; color: #12383e/);
  assert.doesNotMatch(css, /mix-blend-mode: multiply|filter: brightness/);
  assert.doesNotMatch(css, /\.artCards|\.artCard/);
  assert.match(css, /backdrop-filter: blur\(24px\)/);
});

test('approved supplied artwork overrides old CMS imagery and video but retains CTA', () => {
  const p = heroPresentation({desktopMedia:{url:'/old.jpg'},mobileMedia:{url:'/old-mobile.jpg'},videoMedia:{url:'/old.mp4'},ctaUrl:'/start-project?service=design'},'/legacy.jpg','/homepage/glass-analytics-header.png');
  assert.deepEqual(p,{desktop:'/homepage/glass-analytics-header.png',mobile:'/homepage/glass-analytics-header.png',video:undefined,cta:'/start-project?service=design',defaultArtwork:true});
});
test('all active brand locations use the approved shared logo URL', () => {
  for (const file of ['app/page.tsx','app/components-site-header.tsx','app/login/page.tsx','app/register/page.tsx','app/verify/page.tsx']) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /BRAND_LOGO_URL/);
    assert.doesNotMatch(source, /src="\/new-era-logo.png"|logo=\{cms/);
  }
});
