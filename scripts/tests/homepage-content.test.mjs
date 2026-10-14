import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync('app/components/home/hero-content.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { heroPresentation } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
test('new illustration is used only with no CMS selection', () => {
  assert.equal(heroPresentation().desktop, '/homepage/creative-scene.webp');
  assert.equal(heroPresentation().defaultArtwork, true);
});
test('CMS desktop, mobile, video and CTA retain priority', () => {
  const p = heroPresentation({ desktopMedia: {url:'/desktop.jpg'}, mobileMedia:{url:'/mobile.jpg'}, videoMedia:{url:'/video.mp4'}, ctaUrl:'/start-project?service=design' }, '/legacy.jpg');
  assert.deepEqual(p, {desktop:'/desktop.jpg',mobile:'/mobile.jpg',video:'/video.mp4',cta:'/start-project?service=design',defaultArtwork:false});
});
test('legacy image and mobile-only or video-only selection do not enable decorative fallback cards', () => {
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
