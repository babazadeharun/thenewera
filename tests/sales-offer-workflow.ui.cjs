// Actual admin and public React views in a DOM fixture; no external sends.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),{JSDOM}=require(path.join(root,'.crm-test-runtime/node_modules/jsdom'));
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://www.thenewera.space/admin?section=sales',pretendToBeVisual:true});
for(const k of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','Event','SubmitEvent'])global[k]=dom.window[k];
HTMLElement.prototype.scrollIntoView=function(){};global.IS_REACT_ACT_ENVIRONMENT=true;
let copied='',confirms=0;Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>copied=t}});window.confirm=()=>{confirms++;return true;};
const ts=require('typescript');for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
require.extensions['.css']=()=>{};
const orig=Module._load;Module._load=function(name,parent,main){
 if(name==='./SalesInstagram'&&parent?.filename.endsWith('SalesOffers.tsx'))return {__esModule:true,default:()=>null,InstagramChannelCard:()=>null};
 if(name.startsWith('@/'))name=path.resolve(root,'src',name.slice(2));return orig.call(this,name,parent,main);
};
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),Component=require('../app/admin/SalesOffers.tsx').default,OfferView=require('../app/offer/OfferView.tsx').default;
let offer=null,posts=[],rejectSave=false;
function detail(){return {offer,versions:[{...offer}],review:'review-1',link:offer?.state==='OPEN'?'https://www.thenewera.space/offer/test#token':null};}
global.fetch=async(url,init={})=>{
 assert(String(url).startsWith('/api/admin/sales/offers'));
 let result;
 if(init.method==='POST'){
  const b=JSON.parse(init.body);posts.push(b);
  if(b.action==='save'){
   if(rejectSave)return new Response(JSON.stringify({error:'Test: qaralama dəyişib, yeniləyin.'}),{status:409});
   offer={...b,id:'offer-1',state:'DRAFT',version:1,discountMinor:Math.round(Number(b.discount)*100),services:b.services.map(s=>({...s,unitMinor:Math.round(Number(s.unitPrice)*100)})),totalMinor:b.services.reduce((a,s)=>a+Number(s.unitPrice)*Number(s.quantity)*100,0)-Number(b.discount)*100,mailState:'NONE',updatedAt:new Date().toISOString(),events:[]};
  }
  if(b.action==='publish')offer={...offer,state:'OPEN'};
  result={...detail()};
 }else result=String(url).includes('?id=')?detail():{items:offer?[offer]:[],total:offer?1:0};
 return new Response(JSON.stringify(result),{status:200});
};
const buttons=()=>Array.from(document.querySelectorAll('button'));
const button=text=>{const x=buttons().find(x=>x.textContent.trim()===text);assert(x,'Missing '+text);return x;};
const field=label=>{const x=Array.from(document.querySelectorAll('label')).find(x=>x.textContent.trim().startsWith(label));assert(x,'Missing '+label);return x.querySelector('input,textarea,select');};
const settle=async()=>act(async()=>{await new Promise(r=>setTimeout(r,20));});
const click=async el=>{await act(async()=>el.click());await settle();};
const change=async(el,value)=>{await act(async()=>{if(el.tagName==='SELECT')el.value=value;else Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});};
(async()=>{
 let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
 const app=createRoot(document.getElementById('root'));await act(async()=>app.render(React.createElement(Component,{deals:[{id:'lead-1',title:'Nazrin',contactName:'Nazrin',email:null}],services:[],onChanged:async()=>{}})));await settle();
 await click(button('Yeni təklif'));
 eq(document.querySelector('[aria-current="step"]').textContent,'1Müştəri və xidmətlər');
 await change(field('Satış'),'lead-1');eq(field('Əlaqə şəxsi').value,'Nazrin');eq(field('Müştərinin e-poçtu').required,false);
 await change(field('Xidmətin adı'),'Həkim üçün sosial media');
 await change(field('Görüləcək işlərin ətraflı təsviri'),'Müraciətlərin izlənməsi və kontent');
 await change(field('Müştəri nə əldə edəcək?'),'8 post və 4 video');
 await change(field('Başlama / təhvil müddəti'),'5 iş günü');
 await change(field('Ümumi endirim'),'500');
 eq(button('Təklifə bax').disabled,true);assert(!document.querySelector('.soTotal').textContent.includes('-500'));checks++;
 assert(document.querySelector('[role="alert"]').textContent.includes('Endirim xidmətlərin cəmindən çox'));checks++;
 await change(field('Vahid qiyməti'),'500');eq(button('Təklifə bax').disabled,false);assert(document.querySelector('.soTotal').textContent.includes('0,00'));checks++;
 await change(field('Ümumi endirim'),'0');await change(field('Vahid qiyməti'),'0');
 eq(button('Qaralamanı saxla').className,'salesSecondary');
 await click(button('Qaralamanı saxla'));eq(document.querySelector('[aria-current="step"]').textContent,'1Müştəri və xidmətlər');eq(posts.at(-1).action,'save');eq(posts.filter(b=>b.action==='publish').length,0);
 await click(button('Təklifə bax'));eq(document.querySelector('[aria-current="step"]').textContent,'2Təklifə bax');eq(document.querySelector('.offerPage')!==null,true);eq(document.querySelector('.soPublish'),null);
 eq(buttons().some(b=>b.textContent.includes('Təklifi qəbul et')),false);
 await click(button('Redaktə et'));eq(document.querySelector('[aria-current="step"]').textContent,'1Müştəri və xidmətlər');eq(field('Xidmətin adı').value,'Həkim üçün sosial media');
 await click(button('Təklifə bax'));await click(button('Yayımlamaya keç'));eq(document.querySelector('[aria-current="step"]').textContent,'3Yayımla və linki al');eq(button('Yayımla və linki al').disabled,true);
 await click(button('Önbaxışa qayıt'));eq(document.querySelector('[aria-current="step"]').textContent,'2Təklifə bax');
 await click(button('Yayımlamaya keç'));await click(document.querySelector('.soPublish input[type="checkbox"]'));eq(button('Yayımla və linki al').disabled,false);
 await click(button('Yayımla və linki al'));eq(confirms,1);eq(posts.filter(b=>b.action==='publish').length,1);eq(posts.filter(b=>b.action==='send').length,0);
 eq(field('Xüsusi müştəri linki').value,'https://www.thenewera.space/offer/test#token');eq(buttons().some(b=>b.textContent.trim()==='E-poçtla göndər'),false);
 await click(button('Linki kopyala'));eq(copied,'https://www.thenewera.space/offer/test#token');
 await click(button('Yeni təklif'));await change(field('Satış'),'lead-1');await change(field('Müştərinin e-poçtu'),'client@example.test');
 for(const [label,value] of [['Xidmətin adı','Xidmət'],['Görüləcək işlərin ətraflı təsviri','Təsvir'],['Müştəri nə əldə edəcək?','Həcm'],['Başlama / təhvil müddəti','1 ay']])await change(field(label),value);
 rejectSave=true;await click(button('Təklifə bax'));eq(document.querySelector('.soMessage').getAttribute('role'),'alert');eq(document.querySelectorAll('[role="alert"]').length,2);rejectSave=false;
 await click(button('Təklifə bax'));await click(button('Yayımlamaya keç'));await click(document.querySelector('.soPublish input[type="checkbox"]'));await click(button('Yayımla və linki al'));
 eq(buttons().some(b=>b.textContent.trim()==='E-poçtla göndər'),true);
 await act(async()=>app.render(React.createElement(OfferView,{offer:{...offer,responseEnabled:false}})));eq(buttons().some(b=>b.textContent.includes('Təklifi qəbul et')),false);eq(buttons().some(b=>b.textContent.includes('Görüş istə')),false);assert(document.body.textContent.includes('Baxış üçün yayımlanıb'));checks++;
 await act(async()=>app.render(React.createElement(OfferView,{offer:{...offer,responseEnabled:true},onAction:()=>{}})));eq(buttons().some(b=>b.textContent.includes('Təklifi qəbul et')),true);
 await act(async()=>app.unmount());console.log('PASS: '+checks+' offer workflow React checks.');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close();});
