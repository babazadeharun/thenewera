export const roles=['OWNER','ADMIN','MANAGER','SALES','ACCOUNTANT','VIEWER'] as const;
export const modules=['customers','sales','tasks','calendar','quotes','payments','messages','reports','automation','team','settings','billing'] as const;
export const operations=['read','create','update','delete','export'] as const;
export type Role=typeof roles[number];export type Op=typeof operations[number];export type Scope='NONE'|'OWN'|'TEAM'|'ALL';
export class CRMError extends Error{constructor(public status:number,message:string){super(message)}}
export function fail(message:string,status=400):never{throw new CRMError(status,message)}
export const str=(v:unknown,max=2000)=>typeof v==='string'?v.trim().slice(0,max):'';
export const required=(v:unknown,max=200)=>str(v,max)||fail('Tələb olunan sahəni doldurun.');
export function monthEnd(start:Date){const d=new Date(start),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));return d;}
export function state(w:{state:string;trialEnd:Date;paidUntil:Date|null},now=new Date()){if(w.state==='SUSPENDED'||w.state==='EXPIRED')return w.state;return w.state==='ACTIVE'?(w.paidUntil&&w.paidUntil>now?'ACTIVE':'EXPIRED'):(w.trialEnd>now?'TRIAL':'EXPIRED');}
export function grant(role:Role,module:string,op:Op,custom:unknown=null):Scope{
 if(role==='OWNER')return 'ALL';if(custom&&typeof custom==='object')return (custom as Record<string,Record<string,Scope>>)[module]?.[op]||'NONE';
 if(['team','settings','billing','automation'].includes(module))return 'NONE';
 if(role==='VIEWER')return op==='read'?'ALL':'NONE';
 if(role==='ACCOUNTANT')return ['customers','quotes','payments','reports'].includes(module)&&op!=='delete'?'ALL':'NONE';
 if(role==='ADMIN')return op==='delete'?'NONE':'ALL';if(role==='MANAGER')return op==='delete'?'NONE':'TEAM';
 return role==='SALES'&&!['payments'].includes(module)&&op!=='delete'?'OWN':'NONE';
}
export function grants(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))fail('İcazə formatı düzgün deyil.');const out:Record<string,Record<string,Scope>>={};for(const [m,ops]of Object.entries(value)){if(!modules.includes(m as typeof modules[number])||!ops||typeof ops!=='object')fail('Naməlum icazə.');out[m]={};for(const [op,s]of Object.entries(ops)){if(!operations.includes(op as Op)||!['NONE','OWN','TEAM','ALL'].includes(String(s)))fail('Naməlum icazə.');out[m][op]=s as Scope;}}return out;}
export function safeNext(v:unknown){if(typeof v!=='string'||!v.startsWith('/workspace')||/[\\\x00-\x20]/.test(v))return null;try{const u=new URL(v,'https://newera.invalid');return u.origin==='https://newera.invalid'&&/^\/workspace(?:\/|$)/.test(u.pathname)?u.pathname+u.search:null}catch{return null}}
export function num(v:unknown,max=1e12){const n=Number(v);if(!Number.isFinite(n)||n<0||n>max)fail('Ədəd və ya məbləğ düzgün deyil.');return Math.round(n*100)/100;}
export function integer(v:unknown,max=2147483647){const n=num(v,max);if(n<1||!Number.isInteger(n))fail('Müsbət tam ədəd tələb olunur.');return n;}
export function date(v:unknown){if(!v)return null;const d=new Date(String(v));if(!Number.isFinite(d.getTime()))fail('Tarix düzgün deyil.');return d;}
export function quote(lines:unknown,discount:unknown){if(!Array.isArray(lines)||!lines.length||lines.length>100)fail('1–100 təklif sətiri daxil edin.');const clean=lines.map(l=>({name:required(l.name),quantity:num(l.quantity),price:num(l.price)}));const subtotal=num(clean.reduce((s,l)=>s+Math.round(l.quantity*l.price*100)/100,0));const reduction=num(discount||0);if(reduction>subtotal)fail('Endirim məbləğdən böyükdür.');return {lines:clean,discount:reduction,total:num(subtotal-reduction)};}
