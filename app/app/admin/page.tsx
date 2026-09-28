'use client';
import { useMemo, useState } from 'react';
import { Check, ChevronLeft, Image as ImageIcon, LayoutGrid, Plus, Search, ShieldCheck, Sparkles, Trash2, Upload, Users, X } from 'lucide-react';

const presets = [
  ['graphic-designer','Graphic Designer'],['videographer','Videographer'],['smm-specialist','SMM Specialist'],['web-developer','Web Developer'],['copywriter','Copywriter'],
  ['photographer','Photographer'],['branding-specialist','Branding Specialist'],['uiux-designer','UI/UX Designer'],['music-producer','Music Producer'],['3d-artist','3D Artist'],
  ['motion-designer','Motion Designer'],['marketing-specialist','Marketing Specialist'],['strategy-planner','Strategy Planner'],['video-editor','Video Editor'],['illustrator','Illustrator']
] as const;

type Creator = { id:number; name:string; role:string; preset:string; bio:string; status:'Active'|'Hidden'; projects:number };
type Portfolio = { id:number; creatorId:number; title:string; category:string; year:string; description:string };

const initialCreators: Creator[] = [
  {id:1,name:'Aysel M.',role:'Graphic Designer',preset:'graphic-designer',bio:'Brand identity, social media and campaign design.',status:'Active',projects:12},
  {id:2,name:'Rashad A.',role:'Videographer',preset:'videographer',bio:'Commercial, social and cinematic video production.',status:'Active',projects:18},
  {id:3,name:'Leyla Q.',role:'SMM Specialist',preset:'smm-specialist',bio:'Strategy, content systems and social growth.',status:'Active',projects:21},
];
const initialPortfolio: Portfolio[] = [
  {id:1,creatorId:1,title:'Cosmic Brand Launch',category:'Branding',year:'2026',description:'Identity system and launch campaign.'},
  {id:2,creatorId:2,title:'Noir Product Film',category:'Commercial Video',year:'2026',description:'Premium product film for a digital campaign.'},
];

export default function AdminPage(){
 const [tab,setTab]=useState<'creators'|'portfolio'>('creators');
 const [creators,setCreators]=useState(initialCreators);
 const [portfolio,setPortfolio]=useState(initialPortfolio);
 const [selected,setSelected]=useState('photographer');
 const [query,setQuery]=useState('');
 const [selectedCreator,setSelectedCreator]=useState(1);
 const [showCreatorForm,setShowCreatorForm]=useState(false);
 const [showPortfolioForm,setShowPortfolioForm]=useState(false);
 const [creatorName,setCreatorName]=useState('');
 const [creatorRole,setCreatorRole]=useState('Graphic Designer');
 const [creatorBio,setCreatorBio]=useState('');
 const [portfolioTitle,setPortfolioTitle]=useState('');
 const [portfolioCategory,setPortfolioCategory]=useState('Graphic Design');
 const [portfolioYear,setPortfolioYear]=useState('2026');
 const [portfolioDescription,setPortfolioDescription]=useState('');
 const filtered=useMemo(()=>presets.filter(([,label])=>label.toLowerCase().includes(query.toLowerCase())),[query]);
 const currentCreator=creators.find(c=>c.id===selectedCreator);
 const currentPortfolio=portfolio.filter(p=>p.creatorId===selectedCreator);
 const presetLabel=presets.find(([id])=>id===selected)?.[1] ?? '';

 function addCreator(){
   if(!creatorName.trim()) return;
   const rolePreset=presets.find(([,label])=>label===creatorRole)?.[0] ?? selected;
   const next={id:Date.now(),name:creatorName.trim(),role:creatorRole,preset:rolePreset,bio:creatorBio,status:'Active' as const,projects:0};
   setCreators(v=>[...v,next]); setSelectedCreator(next.id); setSelected(rolePreset); setCreatorName(''); setCreatorBio(''); setShowCreatorForm(false);
 }
 function addPortfolio(){
   if(!portfolioTitle.trim()) return;
   setPortfolio(v=>[...v,{id:Date.now(),creatorId:selectedCreator,title:portfolioTitle.trim(),category:portfolioCategory,year:portfolioYear,description:portfolioDescription}]);
   setPortfolioTitle(''); setPortfolioDescription(''); setShowPortfolioForm(false);
 }
 return <main className="adminPage">
   <header className="adminTop container"><a href="/" className="adminBack"><ChevronLeft size={16}/> Back to New Era</a><div className="adminTitle"><ShieldCheck size={17}/> Admin Control Center</div></header>
   <section className="container adminContent">
     <div className="adminEyebrow"><Sparkles size={14}/> NEW ERA CONTENT MANAGEMENT</div>
     <div className="adminHeadingRow"><div><h1>Control the <span>Network.</span></h1><p className="adminLead">Creators do not manage anything here. New Era owns the profiles, visual identities and every portfolio item published to the public website.</p></div><div className="adminTabs"><button className={tab==='creators'?'active':''} onClick={()=>setTab('creators')}><Users size={15}/> Creators</button><button className={tab==='portfolio'?'active':''} onClick={()=>setTab('portfolio')}><LayoutGrid size={15}/> Portfolio</button></div></div>

     {tab==='creators' && <>
       <div className="adminToolbar"><div><small>CREATOR DIRECTORY</small><h2>Specialists</h2></div><button className="adminAction" onClick={()=>setShowCreatorForm(true)}><Plus size={15}/> Add Creator</button></div>
       <div className="creatorAdminLayout">
         <div className="adminPanel creatorListPanel">
           {creators.map(c=><button key={c.id} className={'creatorAdminRow '+(selectedCreator===c.id?'active':'')} onClick={()=>{setSelectedCreator(c.id);setSelected(c.preset)}}>
             <img src={'/creator-presets/'+c.preset+'.jpg'} alt=""/><span><strong>{c.name}</strong><small>{c.role}</small></span><em>{c.status}</em>
           </button>)}
         </div>
         <div className="adminPanel creatorEditor">
           {currentCreator && <>
             <div className="panelHead"><div><small>CREATOR PROFILE</small><h2>{currentCreator.name}</h2></div><span className="verified"><Check size={12}/> {currentCreator.status}</span></div>
             <div className="editorProfile"><img src={'/creator-presets/'+selected+'.jpg'} alt=""/><div><strong>{currentCreator.role}</strong><span>{currentCreator.projects} published projects</span><button onClick={()=>setTab('portfolio')}>Manage Portfolio →</button></div></div>
             <div className="fieldGrid"><div><small>PROFILE VISUAL</small><b>{presetLabel}</b></div><div><small>CONTACT POLICY</small><b>New Era only</b></div><div><small>PUBLIC STATUS</small><b>{currentCreator.status}</b></div></div>
             <label className="wideField">Short bio<textarea value={currentCreator.bio} onChange={e=>setCreators(v=>v.map(x=>x.id===currentCreator.id?{...x,bio:e.target.value}:x))}/></label>
             <div className="presetPanel inlinePreset"><div className="panelHead"><div><small>PROFILE VISUAL IDENTITY</small><h2>Choose profile photo</h2></div><ImageIcon size={18}/></div>
               <div className="presetSearch"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search role..."/></div>
               <div className="presetGrid">{filtered.map(([id,label])=><button type="button" key={id} className={'preset '+(selected===id?'selected':'')} onClick={()=>{setSelected(id);setCreators(v=>v.map(x=>x.id===currentCreator.id?{...x,preset:id,role:label}:x))}}><img src={'/creator-presets/'+id+'.jpg'} alt=""/><span>{label}</span>{selected===id&&<b><Check size={12}/></b>}</button>)}</div>
             </div>
           </>}
         </div>
       </div>
     </>}

     {tab==='portfolio' && <>
       <div className="adminToolbar"><div><small>PORTFOLIO MANAGEMENT</small><h2>{currentCreator?.name ?? 'Creator'} · Portfolio</h2></div><button className="adminAction" onClick={()=>setShowPortfolioForm(true)}><Plus size={15}/> Add Portfolio Item</button></div>
       <div className="portfolioAdminGrid">
         <div className="adminPanel creatorSelector"><small>SELECT CREATOR</small>{creators.map(c=><button key={c.id} className={selectedCreator===c.id?'active':''} onClick={()=>setSelectedCreator(c.id)}><img src={'/creator-presets/'+c.preset+'.jpg'} alt=""/><span>{c.name}<small>{c.role}</small></span></button>)}</div>
         <div className="adminPanel portfolioManager">
           <div className="portfolioManagerHead"><div><small>PUBLIC PORTFOLIO</small><h2>{currentPortfolio.length} items published</h2></div><span className="verified"><Check size={12}/> Admin controlled</span></div>
           {currentPortfolio.length===0 ? <div className="emptyPortfolio"><LayoutGrid size={30}/><h3>No portfolio items yet</h3><p>Add the creator's work here. Nothing is published until you add it from Admin.</p><button className="adminAction" onClick={()=>setShowPortfolioForm(true)}><Plus size={15}/> Add First Project</button></div> : <div className="portfolioAdminItems">{currentPortfolio.map(p=><article key={p.id}><div className="portfolioVisual"><span>{p.category}</span><strong>{p.title}</strong></div><div className="portfolioInfo"><div><strong>{p.title}</strong><small>{p.category} · {p.year}</small><p>{p.description}</p></div><button title="Delete" onClick={()=>setPortfolio(v=>v.filter(x=>x.id!==p.id))}><Trash2 size={15}/></button></div></article>)}</div>}
         </div>
       </div>
     </>}
   </section>

   {showCreatorForm && <div className="modalBackdrop"><div className="modal"><button className="modalClose" onClick={()=>setShowCreatorForm(false)}><X size={18}/></button><small>NEW CREATOR</small><h2>Add specialist</h2><label>Full name<input value={creatorName} onChange={e=>setCreatorName(e.target.value)} placeholder="e.g. Aysel M."/></label><label>Role<select value={creatorRole} onChange={e=>{setCreatorRole(e.target.value);setSelected(presets.find(([,x])=>x===e.target.value)?.[0]??selected)}}>{presets.map(([id,label])=><option key={id} value={label}>{label}</option>)}</select></label><label>Short bio<textarea value={creatorBio} onChange={e=>setCreatorBio(e.target.value)} placeholder="Specialization, style and experience..."/></label><div className="modalPreview"><img src={'/creator-presets/'+selected+'.jpg'} alt=""/><span>Profile preset<strong>{presetLabel}</strong></span></div><button className="adminSave" onClick={addCreator}>Create Creator</button></div></div>}
   {showPortfolioForm && <div className="modalBackdrop"><div className="modal"><button className="modalClose" onClick={()=>setShowPortfolioForm(false)}><X size={18}/></button><small>NEW PORTFOLIO ITEM</small><h2>Add project</h2><label>Project title<input value={portfolioTitle} onChange={e=>setPortfolioTitle(e.target.value)} placeholder="e.g. Cosmic Brand Launch"/></label><div className="formSplit"><label>Category<select value={portfolioCategory} onChange={e=>setPortfolioCategory(e.target.value)}><option>Graphic Design</option><option>Branding</option><option>Social Media</option><option>Commercial Video</option><option>Photography</option><option>Web Design</option><option>Marketing</option></select></label><label>Year<input value={portfolioYear} onChange={e=>setPortfolioYear(e.target.value)}/></label></div><label>Description<textarea value={portfolioDescription} onChange={e=>setPortfolioDescription(e.target.value)} placeholder="What was delivered?"/></label><div className="uploadMock"><Upload size={18}/><span>Portfolio media upload<strong>Connect storage when backend is added</strong></span></div><button className="adminSave" onClick={addPortfolio}>Publish Portfolio Item</button></div></div>}
 </main>
}
