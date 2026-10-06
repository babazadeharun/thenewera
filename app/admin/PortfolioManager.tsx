'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Filter, Image as ImageIcon, Pencil, Plus, Search, Star, Trash2, Upload, Video, X } from 'lucide-react';

type Media = { id:string; filename:string; originalName:string; mimeType:string; size:number; width:number|null; height:number|null; url:string; category:string; alt:string|null; createdAt:string; updatedAt?:string };
type PortfolioItem = { id:string; title:string; client:string; category:string; year:string; shortDescription:string; fullDescription:string; services:string; projectUrl:string; featured:boolean; status:'DRAFT'|'PUBLISHED'; cover:Media|null; gallery:Media[]; video:Media|null; updatedAt:string };

const CATEGORIES = [
  { value:'PORTFOLIO', label:'Portfolio işi' },
  { value:'PORTFOLIO_VIDEO', label:'Portfolio video' },
  { value:'PORTFOLIO_DESIGN', label:'Dizayn / poster' },
];
const META_PREFIX = 'NEPORTFOLIO:';

function parseMeta(media:Media){
  if(!media.alt?.startsWith(META_PREFIX)) return null;
  try { return JSON.parse(media.alt.slice(META_PREFIX.length)); } catch { return null; }
}
function encodeMeta(meta:Record<string,unknown>){ return META_PREFIX + JSON.stringify(meta); }
function displayAlt(media:Media){
  const meta=parseMeta(media);
  return meta?.description || meta?.title || media.originalName;
}
function formatSize(bytes:number){return bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`}

export default function PortfolioManager(){
  const [media,setMedia]=useState<Media[]>([]);
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('');
  const [status,setStatus]=useState('All');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [editor,setEditor]=useState<PortfolioItem|null>(null);
  const [picker,setPicker]=useState<'cover'|'gallery'|'video'|null>(null);
  const [selectedMedia,setSelectedMedia]=useState<Media[]>([]);
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef<HTMLInputElement|null>(null);

  async function load(){
    setBusy(true); setMessage('');
    try{
      const r=await fetch('/api/admin/media',{cache:'no-store'});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||'Media yüklənmədi');
      setMedia(Array.isArray(d.media)?d.media:[]);
    }catch(e){setMessage(e instanceof Error?e.message:'Media yüklənmədi');}
    finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[category]);

  const items=useMemo<PortfolioItem[]>(()=>{
    const groups=new Map<string,PortfolioItem>();
    for(const m of media){
      const meta=parseMeta(m);
      const hasPortfolioMeta=Boolean(m.alt?.startsWith(META_PREFIX));
      const isDraft=meta?.status==='DRAFT' || (hasPortfolioMeta && !meta);
      const isPortfolio=m.category==='PORTFOLIO'||m.category==='PORTFOLIO_VIDEO'||m.category==='PORTFOLIO_DESIGN'||isDraft||hasPortfolioMeta;
      if(!isPortfolio) continue;
      const id=String(meta?.itemId||m.id);
      const recoveredCategory=meta?.category || (m.category==='PORTFOLIO_VIDEO'||m.category==='PORTFOLIO_DESIGN'||m.category==='PORTFOLIO' ? m.category : 'PORTFOLIO');
      if(!groups.has(id)) groups.set(id,{id,title:meta?.title||m.originalName.replace(/\.[^.]+$/,''),client:meta?.client||'',category:recoveredCategory,year:String(meta?.year||''),shortDescription:meta?.description||displayAlt(m),fullDescription:meta?.fullDescription||'',services:meta?.services||'',projectUrl:meta?.projectUrl||'',featured:Boolean(meta?.featured),status:isDraft?'DRAFT':'PUBLISHED',cover:null,gallery:[],video:null,updatedAt:m.updatedAt||m.createdAt});
      const item=groups.get(id)!;
      if(m.category==='PORTFOLIO_VIDEO') item.video=m; else if(!item.cover || meta?.role==='cover') item.cover=m;
      if(meta?.role==='gallery') item.gallery.push(m);
      if(meta?.role==='cover' && !item.cover) item.cover=m;
      if(new Date(m.updatedAt||m.createdAt)>new Date(item.updatedAt)) item.updatedAt=m.updatedAt||m.createdAt;
      item.status=isDraft?'DRAFT':'PUBLISHED'; item.featured=Boolean(meta?.featured); item.title=meta?.title||item.title;
    }
    return [...groups.values()].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime());
  },[media]);

  const visible=items.filter(i=>{
    const q=`${i.title} ${i.client} ${i.category} ${i.shortDescription}`.toLowerCase();
    return (!query||q.includes(query.toLowerCase())) && (status==='All'||i.status===status) && (!category||i.category===category);
  });

  function newItem(){
    setEditor({id:`draft-${Date.now()}`,title:'',client:'',category:'PORTFOLIO',year:String(new Date().getFullYear()),shortDescription:'',fullDescription:'',services:'',projectUrl:'',featured:false,status:'DRAFT',cover:null,gallery:[],video:null,updatedAt:new Date().toISOString()});
  }
  function editItem(item:PortfolioItem){setEditor({...item,gallery:[...item.gallery]});}
  function close(){setEditor(null);setPicker(null);setSelectedMedia([]);}

  async function upload(file:File){
    if(!editor) return;
    setUploading(true); setMessage('');
    try{
      const fd=new FormData(); fd.append('file',file); fd.append('category',editor.category); fd.append('alt',encodeMeta({itemId:editor.id,title:editor.title||file.name,client:editor.client,year:editor.year,description:editor.shortDescription,fullDescription:editor.fullDescription,services:editor.services,projectUrl:editor.projectUrl,featured:editor.featured,status:editor.status,role:'cover'}));
      const r=await fetch('/api/admin/media',{method:'POST',body:fd}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Yükləmə alınmadı');
      const m=d.media as Media; setMedia(v=>[m,...v]); setEditor(e=>e?{...e,cover:m}:e);
    }catch(e){setMessage(e instanceof Error?e.message:'Yükləmə alınmadı');} finally{setUploading(false)}
  }
  async function patchMedia(m:Media,patch:Record<string,unknown>){
    const meta=parseMeta(m)||{}; const alt=encodeMeta({...meta,...patch});
    const r=await fetch('/api/admin/media',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:m.id,alt,category:patch.category || m.category})});
    const d=await r.json(); if(!r.ok) throw new Error(d.error||'Media yenilənmədi'); return d.media as Media;
  }
  async function save(){
    if(!editor?.title.trim()) return setMessage('Layihə adı daxil edin.');
    if(!editor.cover) return setMessage('Cover image seçin və ya yükləyin.');
    setBusy(true); setMessage('');
    try{
      const all=[editor.cover,...editor.gallery,...(editor.video?[editor.video]:[])];
      const seen=new Set<string>();
      for(const m of all){
        if(seen.has(m.id)) continue; seen.add(m.id);
        const role=m.id===editor.cover.id?'cover':m.id===editor.video?.id?'video':'gallery';
        await patchMedia(m,{itemId:editor.id,title:editor.title,client:editor.client,year:editor.year,description:editor.shortDescription,fullDescription:editor.fullDescription,services:editor.services,projectUrl:editor.projectUrl,featured:editor.featured,status:editor.status,category:role==='video'?'PORTFOLIO_VIDEO':editor.category==='PORTFOLIO_VIDEO'?'PORTFOLIO':editor.category,role});
      }
      await load(); close();
    }catch(e){setMessage(e instanceof Error?e.message:'Portfolio saxlanmadı');} finally{setBusy(false)}
  }
  async function publish(item:PortfolioItem){
    try{setBusy(true); const all=[item.cover,...item.gallery,...(item.video?[item.video]:[])].filter(Boolean) as Media[]; for(const m of all) await patchMedia(m,{itemId:item.id,title:item.title,client:item.client,year:item.year,description:item.shortDescription,fullDescription:item.fullDescription,services:item.services,projectUrl:item.projectUrl,featured:item.featured,status:'PUBLISHED',category:m.id===item.video?.id?'PORTFOLIO_VIDEO':item.category==='PORTFOLIO_VIDEO'?'PORTFOLIO':item.category,role:m.id===item.cover?.id?'cover':m.id===item.video?.id?'video':'gallery'}); await load();}catch(e){setMessage(e instanceof Error?e.message:'Yayımlamaq alınmadı');}finally{setBusy(false)}}
  async function unpublish(item:PortfolioItem){
    try{setBusy(true); const all=[item.cover,...item.gallery,...(item.video?[item.video]:[])].filter(Boolean) as Media[]; for(const m of all) await patchMedia(m,{status:'DRAFT',category:item.category}); await load();}catch(e){setMessage(e instanceof Error?e.message:'Qaralamaya keçirmək alınmadı');}finally{setBusy(false)}}
  async function remove(item:PortfolioItem){
    if(!window.confirm(`“${item.title}” portfolio işini silmək istəyirsiniz?`)) return;
    try{setBusy(true); const all=[item.cover,...item.gallery,...(item.video?[item.video]:[])].filter(Boolean) as Media[]; for(const m of all){const r=await fetch(`/api/admin/media?id=${encodeURIComponent(m.id)}`,{method:'DELETE'}); if(!r.ok){const d=await r.json().catch(()=>({})); throw new Error(d.error||'Media silinmədi');}} await load();}catch(e){setMessage(e instanceof Error?e.message:'Silmək alınmadı');}finally{setBusy(false)}}
  async function duplicate(item:PortfolioItem){
    const id=`draft-${Date.now()}`;
    setEditor({...item,id,title:`${item.title} — surət`,status:'DRAFT',featured:false,cover:null,gallery:[],video:null});
    setMessage('Surət qaralama kimi açıldı. Orijinal media dəyişdirilmir; yeni portfolio üçün media ayrıca seçilməlidir.');
  }
  function choose(m:Media){
    if(!picker||!editor) return;
    if(picker==='cover') setEditor({...editor,cover:m});
    if(picker==='video') setEditor({...editor,video:m});
    if(picker==='gallery'&&!editor.gallery.some(x=>x.id===m.id)) setEditor({...editor,gallery:[...editor.gallery,m]});
    setPicker(null);
  }
  function moveGallery(index:number,direction:number){
    if(!editor) return; const next=[...editor.gallery]; const to=index+direction; if(to<0||to>=next.length)return; [next[index],next[to]]=[next[to],next[index]]; setEditor({...editor,gallery:next});
  }
  function openPicker(kind:'cover'|'gallery'|'video'){setPicker(kind);setSelectedMedia([])}

  return <div className="portfolioManager">
    <div className="adminToolbar"><div><small>PORTFOLIO CMS</small><h2>Portfolio idarəetməsi</h2><p>Portfolio işlərini Media Library ilə əlaqəli şəkildə yaradın, redaktə edin, yayımlayın və axtarın.</p></div><button className="adminAction" onClick={newItem}><Plus size={15}/> Yeni portfolio</button></div>
    {message&&<div className="portfolioNotice">{message}</div>}
    <div className="portfolioStats"><div><span>Bütün işlər</span><strong>{items.length}</strong></div><div><span>Yayımlanıb</span><strong>{items.filter(x=>x.status==='PUBLISHED').length}</strong></div><div><span>Qaralama</span><strong>{items.filter(x=>x.status==='DRAFT').length}</strong></div><div><span>Seçilmiş</span><strong>{items.filter(x=>x.featured).length}</strong></div></div>
    <div className="portfolioFilters"><label><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Layihə və ya müştəri axtar..."/></label><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Bütün kateqoriyalar</option>{CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option value="PUBLISHED">Yayımlanıb</option><option value="DRAFT">Qaralama</option></select><button className="secondaryAction" onClick={()=>void load()} disabled={busy}><Filter size={14}/> Yenilə</button></div>
    <div className="portfolioGridAdmin">{visible.map(item=><article className="portfolioAdminCard" key={item.id}>
      <div className="portfolioAdminCover">{item.cover?<img src={item.cover.url} alt={item.title}/>:<div><ImageIcon size={28}/></div>}<span className={item.status==='PUBLISHED'?'published':'draft'}>{item.status==='PUBLISHED'?'Yayımlanıb':'Qaralama'}</span>{item.featured&&<b className="featuredBadge"><Star size={12} fill="currentColor"/> Seçilmiş</b>}</div>
      <div className="portfolioAdminBody"><div className="portfolioAdminTitle"><div><h3>{item.title}</h3><span>{item.client||'Müştəri qeyd edilməyib'} · {item.year||'İl yoxdur'}</span></div><ExternalLink size={15}/></div><p>{item.shortDescription||'Açıqlama əlavə edilməyib.'}</p><div className="portfolioAdminMeta"><span>{CATEGORIES.find(c=>c.value===item.category)?.label||item.category}</span><span>{item.gallery.length+1} media</span></div><div className="portfolioCardActions"><button onClick={()=>editItem(item)}><Pencil size={14}/> Redaktə et</button><button onClick={()=>void duplicate(item)}><Copy size={14}/> Surətini yarat</button><button onClick={()=>item.status==='PUBLISHED'?void unpublish(item):void publish(item)}>{item.status==='PUBLISHED'?'Qaralama et':'Yayımla'}</button><button className="dangerAction" onClick={()=>void remove(item)}><Trash2 size={14}/> Sil</button></div></div>
    </article>)}{!visible.length&&<div className="portfolioEmptyAdmin"><LayoutGridIcon/><h3>Portfolio işi tapılmadı</h3><p>Yeni portfolio yaradın və ya Media Library-də mövcud media fayllarını portfolio kimi qruplaşdırın.</p><button className="adminAction" onClick={newItem}><Plus size={14}/> Yeni portfolio</button></div>}</div>

    {editor&&<div className="modalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><div className="modal wideModal portfolioEditorModal"><button className="modalClose" onClick={close}><X size={18}/></button><div className="portfolioEditorHead"><div><small>{editor.status==='DRAFT'?'PORTFOLIO QARALAMASI':'PORTFOLIO'}</small><h2>{editor.title||'Yeni portfolio'}</h2></div><span className={editor.status==='PUBLISHED'?'published':'draft'}>{editor.status==='PUBLISHED'?'Yayımlanıb':'Qaralama'}</span></div>
      <div className="portfolioFormSections"><section><h3>Əsas məlumatlar</h3><div className="formSplit"><label>Layihənin adı<input value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})} placeholder="Məsələn, Lumière brend layihəsi"/></label><label>Müştəri<input value={editor.client} onChange={e=>setEditor({...editor,client:e.target.value})} placeholder="Müştəri adı"/></label></div><div className="formSplit"><label>Kateqoriya<select value={editor.category} onChange={e=>setEditor({...editor,category:e.target.value})}>{CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label><label>İl<input type="number" value={editor.year} onChange={e=>setEditor({...editor,year:e.target.value})}/></label></div><label>Qısa açıqlama<textarea rows={3} value={editor.shortDescription} onChange={e=>setEditor({...editor,shortDescription:e.target.value})} placeholder="Layihə haqqında qısa məlumat"/></label><label>Ətraflı açıqlama<textarea rows={5} value={editor.fullDescription} onChange={e=>setEditor({...editor,fullDescription:e.target.value})}/></label><label>Xidmətlər<input value={editor.services} onChange={e=>setEditor({...editor,services:e.target.value})} placeholder="Brendinq, Art-direksiya, Kampaniya"/></label><label>Layihə URL-i<input value={editor.projectUrl} onChange={e=>setEditor({...editor,projectUrl:e.target.value})} placeholder="https://..."/></label><label className="portfolioCheck"><input type="checkbox" checked={editor.featured} onChange={e=>setEditor({...editor,featured:e.target.checked})}/><span><b>Seçilmiş portfolio</b><small>Public homepage üçün seçilmiş iş kimi işarələ.</small></span></label></section>
      <section><h3>Media</h3><div className="mediaRelation"><div className="mediaRelationHead"><span>Cover image</span><button onClick={()=>openPicker('cover')}><ImageIcon size={14}/> {editor.cover?'Dəyiş':'Seç'}</button></div>{editor.cover?<div className="mediaRelationItem"><img src={editor.cover.url} alt=""/><span><b>{editor.cover.originalName}</b><small>{formatSize(editor.cover.size)}</small></span><button onClick={()=>setEditor({...editor,cover:null})}><X size={14}/></button></div>:<div className="mediaRelationEmpty">Cover image seçilməyib.</div>}</div>
      <div className="mediaRelation"><div className="mediaRelationHead"><span>Gallery</span><button onClick={()=>openPicker('gallery')}><Plus size={14}/> Media əlavə et</button></div>{editor.gallery.length?<div className="galleryRelationList">{editor.gallery.map((m,i)=><div className="mediaRelationItem" key={m.id}><img src={m.url} alt=""/><span><b>{i+1}. {m.originalName}</b><small>{formatSize(m.size)}</small></span><button title="Yuxarı" onClick={()=>moveGallery(i,-1)}><ArrowUp size={13}/></button><button title="Aşağı" onClick={()=>moveGallery(i,1)}><ArrowDown size={13}/></button><button onClick={()=>setEditor({...editor,gallery:editor.gallery.filter(x=>x.id!==m.id)})}><X size={14}/></button></div>)}</div>:<div className="mediaRelationEmpty">Gallery media əlavə edilməyib.</div>}</div>
      <div className="mediaRelation"><div className="mediaRelationHead"><span>Video</span><button onClick={()=>openPicker('video')}><Video size={14}/> {editor.video?'Dəyiş':'Seç'}</button></div>{editor.video?<div className="mediaRelationItem"><span><b>{editor.video.originalName}</b><small>{formatSize(editor.video.size)}</small></span><button onClick={()=>setEditor({...editor,video:null})}><X size={14}/></button></div>:<div className="mediaRelationEmpty">Video əlavə edilməyib.</div>}</div>
      <div className="portfolioUploadBox"><Upload size={18}/><div><b>Yeni media yüklə</b><small>Yüklənən fayl mövcud Media Library-yə əlavə olunur.</small></div><button onClick={()=>fileRef.current?.click()} disabled={uploading}>{uploading?'Yüklənir…':'Fayl seç'}</button><input ref={fileRef} hidden type="file" accept="image/*,video/*" onChange={e=>{const f=e.target.files?.[0]; if(f) void upload(f); e.currentTarget.value='';}}/></div>
      </section></div>
      <div className="portfolioEditorFooter"><button className="secondaryAction" onClick={close}>Ləğv et</button><button className="adminSave" onClick={()=>void save()} disabled={busy}>{busy?'Yadda saxlanılır…':editor.status==='PUBLISHED'?'Yadda saxla':'Qaralama kimi yadda saxla'}</button></div>
    </div></div>}

    {picker&&<div className="modalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setPicker(null)}}><div className="modal wideModal mediaPickerModal"><button className="modalClose" onClick={()=>setPicker(null)}><X size={18}/></button><div className="panelHead"><div><small>MEDIA LIBRARY</small><h2>{picker==='cover'?'Cover seç':'Media seç'}</h2></div></div><div className="mediaPickerSearch"><Search size={15}/><input placeholder="Media axtar..." value={selectedMedia.length?'':query} onChange={e=>{setQuery(e.target.value);void load()}}/></div><div className="mediaPickerGrid">{media.filter(m=>picker==='video'?m.mimeType.startsWith('video/'):m.mimeType.startsWith('image/')).map(m=><button key={m.id} className="mediaPickerCard" onClick={()=>choose(m)}><div>{m.mimeType.startsWith('video/')?<video src={m.url} muted/>:<img src={m.url} alt={m.alt||m.originalName}/>}</div><strong>{m.originalName}</strong><small>{m.category} · {formatSize(m.size)}</small></button>)}</div></div></div>}
  </div>;
}
function LayoutGridIcon(){return <div className="portfolioEmptyIcon"><ImageIcon size={30}/></div>}
