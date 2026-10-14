// Optional Playwright smoke checks. Use a reviewed local server and test database;
// no forms are submitted, account cookies installed or database writes performed.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const origin = process.env.NEWERA_TEST_ORIGIN || 'http://127.0.0.1:3100';
const target = new URL(origin);
assert.ok(['127.0.0.1','localhost'].includes(target.hostname) && target.protocol === 'http:', 'Only a reviewed local test server is permitted');
const out = process.env.NEWERA_SCREENSHOT_DIR || '/tmp/newera-home-screenshots';
mkdirSync(out,{recursive:true});
const browser = await chromium.launch({headless:true,...(process.env.NEWERA_CHROMIUM ? {executablePath:process.env.NEWERA_CHROMIUM} : {})});
const errors = [];
let passed=0;
const check=(label,fn)=>{fn();console.log('PASS '+label);passed++};
try {
  for (const [name,width,height] of [['desktop',1536,1024],['compact-desktop',1536,728],['wide-desktop',1920,910],['tablet',834,1112],['mobile',390,844],['small-mobile',320,740]]) {
    const context = await browser.newContext({viewport:{width,height},hasTouch:width<800,isMobile:width<800});
    const page = await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
    const response = await page.goto(origin,{waitUntil:'networkidle'});
    check(name+' response',()=>assert.equal(response.status(),200));
    await page.locator('html.nePresentation').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,hero:document.querySelector('#top').getBoundingClientRect().height,h1:document.querySelector('h1').getBoundingClientRect().toJSON(),snap:getComputedStyle(document.documentElement).scrollSnapType,portfolioSnap:getComputedStyle(document.querySelector('#portfolio')).scrollSnapAlign}));
    check(name+' no horizontal overflow',()=>assert.ok(layout.scrollWidth<=layout.width,JSON.stringify(layout)));
    check(name+' unclipped hero and free-scroll portfolio',()=>{assert.ok(layout.hero>=height);assert.equal(layout.portfolioSnap,'none');assert.ok(layout.h1.x>=0 && layout.h1.right<=width);});
    if(width>=1021) {
      const panel=await page.getByText('NƏ ETDİYİMİZ',{exact:true}).evaluate(el=>el.parentElement.parentElement.getBoundingClientRect().toJSON());
      check(name+' service strip fits first viewport',()=>assert.ok(panel.bottom<=height+1,JSON.stringify(panel)));
    }
    assert.equal(await page.locator('#top a:has(i[style])').count(),4);
    check(name+' real linked artwork cards',()=>assert.ok(true));
    const covered=await page.evaluate(()=>{
      const text=[]; const walker=document.createTreeWalker(document.querySelector('#home-content'),NodeFilter.SHOW_TEXT);
      while(walker.nextNode()) { if(!walker.currentNode.textContent.trim())continue; const range=document.createRange();range.selectNodeContents(walker.currentNode);text.push(...range.getClientRects()); }
      return [...document.querySelectorAll('#top a:has(i[style])')].some(a=>{const b=a.getBoundingClientRect();return text.some(t=>b.left<t.right&&b.right>t.left&&b.top<t.bottom&&b.bottom>t.top)});
    });
    check(name+' artwork cards never cover hero text',()=>assert.equal(covered,false));
    if(width<761)check(name+' natural mobile scrolling',()=>assert.equal(layout.snap,'none'));
    if(process.env.NEWERA_CMS_FIXTURE!=='1') assert.ok((await page.locator('#top img').first().getAttribute('src')).includes('creative-scene-reference.webp'));
    if(process.env.NEWERA_CMS_FIXTURE==='1') {
      const cms=await page.locator('#top picture img').evaluate(el=>({src:el.getAttribute('src'),current:el.currentSrc,fit:getComputedStyle(el).objectFit,blend:getComputedStyle(el).mixBlendMode}));
      assert.ok(cms.src.endsWith('/bright-desktop.svg'));
      assert.ok(cms.current.endsWith(width<=760?'/bright-mobile.svg':'/bright-desktop.svg'));
      assert.equal(cms.fit,'contain'); assert.equal(cms.blend,'multiply');
      assert.ok((await page.locator('header img').getAttribute('src')).endsWith('/dark-logo.svg'));
      assert.notEqual(await page.locator('header img').evaluate(el=>getComputedStyle(el).filter),'none');
      check(name+' CMS media, mobile selection, tint and logo contrast remain connected',()=>assert.ok(true));
    }
    await page.screenshot({path:`${out}/${name}.png`,fullPage:false});
    await page.getByRole('button',{name:'Saytda axtarış'}).click();
    await page.getByRole('searchbox').fill('Lumière');
    assert.equal(await page.locator('dialog li').count(),1);
    assert.equal(await page.locator('dialog li a').getAttribute('href'),'/portfolio');
    check(name+' real portfolio search',()=>assert.ok(true));
    await page.getByRole('searchbox').fill('unmatched-test-query');
    assert.equal(await page.locator('[role=status]').textContent(),'Nəticə tapılmadı. Başqa sözlə axtarın.');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Saytda axtarış');
    assert.equal(await page.getByRole('button',{name:'Saytda axtarış'}).evaluate(el=>el===document.activeElement),true);
    check(name+' search empty state, Escape and focus return',()=>assert.ok(true));
    if(width<1021) {
      await page.getByRole('button',{name:'Menyunu aç'}).click();
      assert.equal(await page.getByRole('button',{name:'Menyunu bağla'}).getAttribute('aria-expanded'),'true');
    }
    await page.locator('#home-menu a[href="#services"]').click();
    await page.waitForTimeout(900);
    assert.equal(await page.locator('#home-menu a[href="#services"]').getAttribute('aria-current'),'location');
    check(name+' section navigation and active state',()=>assert.ok(true));
    // Long CMS sections must stop snapping after ResizeObserver updates.
    await page.evaluate(()=>{document.querySelector('#services').style.minHeight='2000px';});
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#services').getAttribute('data-snap-ready'),'false');
    check(name+' oversized content releases snapping',()=>assert.ok(true));
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.mouse.wheel(0,550); await page.waitForTimeout(500);
    if(width<800) {
      const cdp=await context.newCDPSession(page);
      const before=await page.evaluate(()=>scrollY);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width/2,y:height*.7}]});
      for(let y=height*.7-20;y>=height*.3;y-=20) {
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width/2,y}]});
        await page.waitForTimeout(20);
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForFunction(y=>scrollY>y,before,{timeout:5000});
      assert.ok(await page.evaluate(()=>scrollY)>before);
      await cdp.detach();
      check(name+' emulated touch gesture scrolls naturally',()=>assert.ok(true));
    }
    assert.ok(await page.evaluate(()=>window.scrollY>0));
    if(width===1536) {
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
      const bar=await page.evaluate(()=>({width:innerWidth-document.documentElement.clientWidth,thumb:innerHeight*innerHeight/document.documentElement.scrollHeight}));
      if(bar.width>0) {
        await page.mouse.move(width-bar.width/2,bar.thumb/2); await page.mouse.down();
        await page.mouse.move(width-bar.width/2,height*.7,{steps:12}); await page.mouse.up();
        assert.ok(await page.evaluate(()=>scrollY>0));
        check('desktop native scrollbar drag scrolls',()=>assert.ok(true));
      } else console.log('UNRUN native scrollbar dragging: headless Chromium exposes no draggable scrollbar gutter');
    }
    await page.waitForTimeout(250);
    await page.keyboard.press('End');
    await page.waitForFunction(()=>document.querySelector('footer').getBoundingClientRect().top<innerHeight,{},{timeout:5000});
    assert.ok(await page.locator('footer').evaluate(el=>el.getBoundingClientRect().top<innerHeight));
    check(name+' wheel and keyboard reach content/footer',()=>assert.ok(true));
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:1536,height:1024},reducedMotion:'reduce'});
  const page=await context.newPage(); await page.goto(origin,{waitUntil:'networkidle'});
  assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).scrollSnapType),'none');
  assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).scrollBehavior),'auto');
  check('reduced motion disables snap and smooth scrolling',()=>assert.ok(true));
  // Browser document navigation also proves homepage styles clean up off-route.
  await page.goto(origin+'/start-project',{waitUntil:'networkidle'});
  assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('nePresentation')),false);
  assert.ok(await page.locator('input,textarea').count()>0);
  check('separate project form has natural scrolling',()=>assert.ok(true));
  await page.locator('input').first().fill('Homepage smoke test');
  assert.equal(await page.locator('input').first().inputValue(),'Homepage smoke test');
  check('project form input stays usable without submission',()=>assert.ok(true));
  for(const route of ['/portfolio','/events']) {
    await page.goto(origin+route,{waitUntil:'networkidle'});
    assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('nePresentation')),false);
    assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).scrollSnapType),'none');
    check(route+' retains natural route scrolling',()=>assert.ok(true));
  }
  await context.close();
  check('no browser runtime errors',()=>assert.deepEqual(errors,[]));
  console.log(`Checks passed: ${passed}; screenshots: ${out}`);
} finally { await browser.close(); }
