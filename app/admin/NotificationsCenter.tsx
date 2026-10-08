'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Bell, CheckCheck, ChevronDown, Inbox, Trash2, X } from 'lucide-react';
import { NOTIFICATION_CONFIG } from '@/lib/notifications/config';

type NotificationItem = { id:string; type:keyof typeof NOTIFICATION_CONFIG; title:string; message:string; link:string|null; isRead:boolean; readAt:string|null; priority:string; createdAt:string; entityType?:string|null; entityId?:string|null };

function relativeTime(value:string){const d=new Date(value).getTime(),diff=Date.now()-d;if(diff<60_000)return 'İndi';if(diff<3_600_000)return `${Math.floor(diff/60_000)} dəq əvvəl`;if(diff<86_400_000)return `${Math.floor(diff/3_600_000)} saat əvvəl`;if(diff<172_800_000)return 'Dünən';return new Date(value).toLocaleDateString('az-AZ',{day:'2-digit',month:'short',year:'numeric'});}

export default function NotificationsCenter(){
 const [open,setOpen]=useState(false); const [count,setCount]=useState(0); const [filter,setFilter]=useState<'all'|'unread'|'read'>('all'); const [items,setItems]=useState<NotificationItem[]>([]); const [loading,setLoading]=useState(false); const [page,setPage]=useState(1); const [totalPages,setTotalPages]=useState(1); const ref=useRef<HTMLDivElement>(null);
 const loadCount=useCallback(async()=>{try{const r=await fetch('/api/admin/notifications/unread-count',{cache:'no-store'});if(r.ok){const d=await r.json();setCount(Number(d.count)||0)}}catch{}},[]);
 const load=useCallback(async(nextPage=1,replace=true)=>{setLoading(true);try{const r=await fetch(`/api/admin/notifications?page=${nextPage}&limit=20&filter=${filter}`,{cache:'no-store'});if(!r.ok)return;const d=await r.json();setItems(v=>replace?d.notifications:[...v,...d.notifications]);setPage(nextPage);setTotalPages(d.totalPages||1);setCount(d.unreadCount||0)}finally{setLoading(false)}},[filter]);
 useEffect(()=>{loadCount();const id=window.setInterval(loadCount,45_000);return()=>window.clearInterval(id)},[loadCount]);
 useEffect(()=>{if(open)load(1,true)},[open,filter,load]);
 useEffect(()=>{const handler=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',handler);return()=>document.removeEventListener('mousedown',handler)},[]);
 const markRead=async(id:string)=>{await fetch(`/api/admin/notifications/${id}/read`,{method:'POST',headers:{'Content-Type':'application/json'}});setItems(v=>v.map(n=>n.id===id?{...n,isRead:true,readAt:new Date().toISOString()}:n));setCount(v=>Math.max(0,v-1));};
 const markAll=async()=>{await fetch('/api/admin/notifications/read-all',{method:'POST',headers:{'Content-Type':'application/json'}});setItems(v=>v.map(n=>({...n,isRead:true,readAt:new Date().toISOString()})));setCount(0)};
 const remove=async(id:string)=>{await fetch(`/api/admin/notifications/${id}`,{method:'DELETE'});const wasUnread=items.find(n=>n.id===id)?.isRead===false;setItems(v=>v.filter(n=>n.id!==id));if(wasUnread)setCount(v=>Math.max(0,v-1));};
 const go=async(n:NotificationItem)=>{if(!n.isRead)await markRead(n.id);setOpen(false);if(n.link)window.location.href=n.link;};
 const title=useMemo(()=>filter==='unread'?'Oxunmamış':filter==='read'?'Oxunmuş':'Hamısı',[filter]);
 return <div className="notificationsCenter" ref={ref}>
   <button type="button" className="notificationBell" aria-label="Bildirişlər" onClick={()=>setOpen(v=>!v)}><Bell size={18}/>{count>0&&<span className="notificationBadge">{count>99?'99+':count}</span>}</button>
   {open&&<div className="notificationPanel">
     <div className="notificationPanelHead"><div><small>NEW ERA</small><h3>Bildirişlər</h3></div><button type="button" className="notificationClose" onClick={()=>setOpen(false)}><X size={15}/></button></div>
     <div className="notificationFilters"><div>{(['all','unread','read'] as const).map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{f==='all'?'Hamısı':f==='unread'?'Oxunmamış':'Oxunmuş'}</button>)}</div><button type="button" className="notificationReadAll" onClick={markAll} disabled={!count}><CheckCheck size={13}/> Hamısını oxunmuş et</button></div>
     <div className="notificationList">{loading&&items.length===0?<div className="notificationLoading">Bildirişlər yüklənir...</div>:items.length===0?<div className="notificationEmpty"><Inbox size={27}/><strong>Yeni bildiriş yoxdur</strong><span>Hazırda diqqət tələb edən yeni hadisə yoxdur.</span></div>:items.map(n=>{const cfg=NOTIFICATION_CONFIG[n.type]||NOTIFICATION_CONFIG.SYSTEM;const Icon=cfg.icon;return <div key={n.id} className={`notificationItem ${n.isRead?'read':'unread'}`} onClick={()=>go(n)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')go(n)}}>
       <div className="notificationIcon" style={{'--notification-color':cfg.color} as CSSProperties}><Icon size={15}/></div><div className="notificationBody"><div className="notificationTitleRow"><strong>{n.title}</strong>{n.priority==='URGENT'&&<em>TƏCİLİ</em>}</div><p>{n.message}</p><time>{relativeTime(n.createdAt)}</time></div><button type="button" className="notificationDelete" aria-label="Bildirişi sil" onClick={e=>{e.stopPropagation();remove(n.id)}}><Trash2 size={12}/></button></div>})}</div>
     {page<totalPages&&<button type="button" className="notificationMore" onClick={()=>load(page+1,false)} disabled={loading}>{loading?'Yüklənir...':'Daha çox'}</button>}
   </div>}
 </div>
}
