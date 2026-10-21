// Actual React component in a DOM fixture. No Instagram network, logins, or sends.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.resolve(__dirname,'..');
const {JSDOM}=require(path.join(root,'.crm-test-runtime/node_modules/jsdom'));
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://www.thenewera.space/admin?section=sales&salesView=outreach',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','Event','KeyboardEvent','MutationObserver'])global[key]=dom.window[key];
let clipboard='';Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{clipboard=text;}}});
global.IS_REACT_ACT_ENVIRONMENT=true;window.confirm=()=>true;
const ts=require('typescript');for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
require.extensions['.css']=()=>{};
const orig=Module._load;Module._load=function(name,parent,main){if(name.startsWith('@/'))name=path.resolve(root,'src',name.slice(2));return orig.call(this,name,parent,main);};
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),Component=require('../app/admin/SalesProspecting.tsx').default;
let prospect=null,history=[],posts=[];
const deal=()=>({id:'one',title:'Klinikaya təklif',contactName:'Nazrin',client:{company:'Harmony Clinic'},instagramProspect:prospect});
global.fetch=async(url,init={})=>{
 assert(String(url).startsWith('/api/admin/sales/prospecting'));
 const u=new URL(url,window.location.origin);
 let data;
 if(init.method==='POST'){
  const b=JSON.parse(init.body);posts.push(b);
  if(b.action==='offer-link')data={link:'https://www.thenewera.space/offer/test#secure-token'};
  else{
   if(b.action==='save')prospect={...prospect,username:b.username.replace('@',''),draft:b.draft,status:prospect?.status||'NEW',version:(prospect?.version||0)+1};
   if(b.action==='status')prospect={...prospect,status:b.status,version:prospect.version+1};
   history.push({id:String(history.length),text:'[Instagram əlaqəsi] Operator qeydi',createdAt:new Date().toISOString()});data={ok:true};
  }
 }else data=u.searchParams.has('id')?{deal:deal(),offers:[{id:'offer-1',title:'Təklif',version:1}],history,suggestedUsername:''}:{items:[deal()],total:1};
 return new Response(JSON.stringify(data),{status:200});
};
const buttons=()=>Array.from(document.querySelectorAll('button'));
const button=text=>{const b=buttons().find(b=>b.textContent.includes(text));assert(b,'Missing button '+text);return b;};
const field=label=>{const l=Array.from(document.querySelectorAll('label')).find(l=>l.textContent.startsWith(label));assert(l,'Missing field '+label);return l.querySelector('input,textarea,select');};
const settle=async(ms=30)=>act(async()=>{await new Promise(r=>setTimeout(r,ms));});
const click=async b=>{await act(async()=>b.click());await settle();};
const change=async(el,value)=>{await act(async()=>{if(el.tagName==='SELECT')el.value=value;else Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});};
(async()=>{
 let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
 const app=createRoot(document.getElementById('root'));await act(async()=>app.render(React.createElement(Component)));await settle(350);
 await click(button('Harmony Clinic'));eq(document.querySelector('[role="dialog"]').getAttribute('aria-modal'),'true');
 await change(field('Instagram istifadəçi adı'), '@doctor.example');
 await click(button('Nümunəni uyğunlaşdır'));assert(field('Fərdi mesaj qaralaması').value.includes('Nazrin'));checks++;
 await click(button('Profil və qaralamanı saxla'));eq(prospect.username,'doctor.example');
 const profile=document.querySelector('a[href*="instagram.com"]');eq(profile.href,'https://www.instagram.com/doctor.example/');eq(profile.rel,'noopener noreferrer');
 await click(button('Mesajı kopyala'));eq(clipboard,prospect.draft);eq(prospect.status,'NEW');eq(posts.filter(p=>p.action==='status').length,0);
 await change(field('Bu satışın aktiv onlayn təklifi'), 'offer-1');await click(button('Təklif linkini mesaja əlavə et'));
 await click(button('Mesajı kopyala'));assert(clipboard.endsWith('/offer/test#secure-token'));checks++;
 await change(field('Əlaqənin nəticəsi'), 'FIRST_SENT');eq(button('Nəticəni qeyd et').disabled,true);
 await click(document.querySelector('input[type="checkbox"]'));eq(button('Nəticəni qeyd et').disabled,false);
 await click(button('Nəticəni qeyd et'));eq(prospect.status,'FIRST_SENT');eq(posts.at(-1).confirm,true);
 await change(field('Əlaqənin nəticəsi'), 'DO_NOT_CONTACT');await click(button('Nəticəni qeyd et'));eq(button('Mesajı kopyala').disabled,true);eq(button('Təklif linkini mesaja əlavə et').disabled,true);
 await change(field('Fərdi mesaj qaralaması'),'Yeni mətn');eq(button('Nəticəni qeyd et').disabled,true);eq(document.querySelector('a[href*="instagram.com"]'),null);
 await act(async()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));eq(document.querySelector('[role="dialog"]'),null);
 await act(async()=>app.unmount());console.log('PASS: '+checks+' React interaction checks.');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close();});
