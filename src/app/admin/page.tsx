'use client';
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, ChevronLeft, Clock3, Image as ImageIcon, LayoutGrid, Plus, Search, Settings2, ShieldCheck, Sparkles, Trash2, Upload, Users, X, BriefcaseBusiness, Layers3, MessageCircle, ArrowRight, Send, Building2, Mail, Phone, Globe2, MapPin, UserRound, Activity, Filter, UserCheck, CalendarDays, TrendingUp } from 'lucide-react';

const presets = [
  ['graphic-designer','Graphic Designer'],['videographer','Videographer'],['smm-specialist','SMM Specialist'],['web-developer','Web Developer'],['copywriter','Copywriter'],
  ['photographer','Photographer'],['branding-specialist','Branding Specialist'],['uiux-designer','UI/UX Designer'],['music-producer','Music Producer'],['3d-artist','3D Artist'],
  ['motion-designer','Motion Designer'],['marketing-specialist','Marketing Specialist'],['strategy-planner','Strategy Planner'],['video-editor','Video Editor'],['illustrator','Illustrator']
] as const;

type Creator = { id:number; name:string; role:string; preset:string; bio:string; status:'Active'|'Hidden'; projects:number };
type Portfolio = { id:number; creatorId:number; title:string; category:string; year:string; description:string };
type Activity={type:string;text:string;at:string};
type Project = {id:string;name:string;email:string;company:string;service:string;title:string;brief:string;goal?:string;audience?:string;deliverables?:string;references?:string;budget:string;deadline:string;creator:string;status:string;createdAt:string;quote?:string|null;messages?:{from:string;text:string;at:string}[];activity?:Activity[];delivery?:{notes:string;link?:string;submittedAt:string;version:number};revisionRequests?:{text:string;at:string}[];review?:{rating:number;text:string;at:string}};
type Client = {id:string;firstName:string;lastName:string;email:string;phone:string;company:string;website:string;jobTitle:string;industry:string;size:string;country:string;createdAt:string};
const projectStatuses=['Brief Submitted','Reviewing','Approved','In Progress','Review','Completed'];
const creatorCatalog=[
 {name:'Aysel M.',role:'Graphic Designer',services:['Graphic Design','Branding','Social Media']},
 {name:'Rashad A.',role:'Videographer',services:['Video Production']},
 {name:'Leyla Q.',role:'Brand Designer',services:['Branding','Graphic Design']},
 {name:'Tural S.',role:'Web Developer',services:['Web Design & Development']},
 {name:'Nigar R.',role:'Social Media Strategist',services:['Social Media','Marketing & SEO']},
 {name:'Kamran H.',role:'Performance Marketer',services:['Marketing & SEO','Social Media']},
];
const demoProjects:Project[]=[{id:'NE-DEMO1',name:'Nigar H.',email:'client@example.com',company:'Nova Studio',service:'Branding',title:'Nova visual identity',brief:'A premium identity system for a new creative brand, including logo, color direction and launch assets.',budget:'1,500–3,000 AZN',deadline:'2026-10-15',creator:'Aysel M. — Graphic Designer',status:'Reviewing',createdAt:new Date().toISOString(),quote:null}];

const initialCreators: Creator[] = [
  {id:1,name:'Aysel M.',role:'Graphic Designer',preset:'graphic-designer',bio:'Brand identity, social media and campaign design.',status:'Active',projects:12},
  {id:2,name:'Rashad A.',role:'Videographer',preset:'videographer',bio:'Commercial, social and cinematic video production.',status:'Active',projects:18},
  {id:3,name:'Leyla Q.',role:'SMM Specialist',preset:'smm-specialist',bio:'Strategy, content systems and social growth.',status:'Active',projects:21},
];

const initialServices = [
 {id:1,name:'Graphic Design',description:'Social media, print, campaigns and visual systems.',creators:1,sub:['Social Media','Logo Design','Branding','Print']},
 {id:2,name:'Video Production',description:'Commercials, reels, product films and editing.',creators:1,sub:['Commercial','Reels','Product Film','Editing']},
 {id:3,name:'Photography',description:'Product, lifestyle, fashion and campaign photography.',creators:0,sub:['Product','Lifestyle','Fashion','Campaign']},
 {id:4,name:'Social Media',description:'Strategy, content systems and ongoing management.',creators:1,sub:['Strategy','Content','Management','Campaigns']},
 {id:5,name:'Web Design & Development',description:'Modern responsive websites and digital experiences.',creators:0,sub:['UI/UX','Web Design','Development','Landing Pages']},
 {id:6,name:'Branding',description:'Naming, identity systems and launch direction.',creators:1,sub:['Identity','Logo','Guidelines','Launch']},
];

const initialPortfolio: Portfolio[] = [
  {id:1,creatorId:1,title:'Cosmic Brand Launch',category:'Branding',year:'2026',description:'Identity system and launch campaign.'},
  {id:2,creatorId:2,title:'Noir Product Film',category:'Commercial Video',year:'2026',description:'Premium product film for a digital campaign.'},
];

export default function AdminPage(){
 const [tab,setTab]=useState<'overview'|'creators'|'services'|'portfolio'|'projects'|'clients'|'crm'>('overview');
 const [projects,setProjects]=useState<Project[]>([]);
 const [adminMessage,setAdminMessage]=useState('');
 const [deliveryNotes,setDeliveryNotes]=useState('');
 const [deliveryLink,setDeliveryLink]=useState('');
 const [revisionNote,setRevisionNote]=useState('');
 const [selectedProject,setSelectedProject]=useState<Project|null>(null);
 const [clients,setClients]=useState<Client[]>([]);
 const [selectedClient,setSelectedClient]=useState<Client|null>(null);
 const [clientQuery,setClientQuery]=useState('');
 const [crmQuery,setCrmQuery]=useState('');
 const [crmStatus,setCrmStatus]=useState('All');
 const [creators,setCreators]=useState(initialCreators);
 const [portfolio,setPortfolio]=useState(initialPortfolio);
 const [services,setServices]=useState(initialServices);
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
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('new-era-projects')||'[]');setProjects(saved.length?saved:demoProjects);const savedClients=JSON.parse(localStorage.getItem('new-era-clients')||'[]');setClients(savedClients)}catch{setProjects(demoProjects);setClients([])}},[]);
 function updateProjectStatus(id:string,status:string){const now=new Date().toISOString();setProjects(v=>{const next=v.map(p=>p.id===id?{...p,status,activity:[...(p.activity||[]),{type:'status',text:`Status changed to ${status}`,at:now}]}:p);localStorage.setItem('new-era-projects',JSON.stringify(next));return next});setSelectedProject(p=>p&&p.id===id?{...p,status,activity:[...(p.activity||[]),{type:'status',text:`Status changed to ${status}`,at:now}]}:p)}
 function updateProjectCreator(id:string,creator:string){const now=new Date().toISOString();setProjects(v=>{const next=v.map(p=>p.id===id?{...p,creator,activity:[...(p.activity||[]),{type:'assignment',text:`Specialist assigned: ${creator}`,at:now}]}:p);localStorage.setItem('new-era-projects',JSON.stringify(next));return next});setSelectedProject(p=>p&&p.id===id?{...p,creator,activity:[...(p.activity||[]),{type:'assignment',text:`Specialist assigned: ${creator}`,at:now}]}:p)}
 function updateProject(id:string, patch:Partial<Project>, activityText:string){const now=new Date().toISOString();setProjects(v=>{const next=v.map(p=>p.id===id?{...p,...patch,activity:[...(p.activity||[]),{type:'workflow',text:activityText,at:now}]}:p);localStorage.setItem('new-era-projects',JSON.stringify(next));return next});setSelectedProject(p=>p&&p.id===id?{...p,...patch,activity:[...(p.activity||[]),{type:'workflow',text:activityText,at:now}]}:p)}
 function submitDelivery(){if(!selectedProject||!deliveryNotes.trim())return;const version=(selectedProject.delivery?.version||0)+1;updateProject(selectedProject.id,{delivery:{notes:deliveryNotes.trim(),link:deliveryLink.trim()||undefined,submittedAt:new Date().toISOString(),version},status:'Review'},`Delivery v${version} submitted for client review`);setDeliveryNotes('');setDeliveryLink('')}
 function requestRevision(){if(!selectedProject||!revisionNote.trim())return;const now=new Date().toISOString();const nextRequests=[...(selectedProject.revisionRequests||[]),{text:revisionNote.trim(),at:now}];updateProject(selectedProject.id,{revisionRequests:nextRequests,status:'In Progress'},'Revision requested; project returned to production');setRevisionNote('')}
 function approveDelivery(){if(!selectedProject)return;updateProject(selectedProject.id,{status:'Completed'},'Client-approved delivery marked completed by New Era')}
 const filtered=useMemo(()=>presets.filter(([,label])=>label.toLowerCase().includes(query.toLowerCase())),[query]);
 const currentCreator=creators.find(c=>c.id===selectedCreator);
 const filteredClients=clients.filter(c=>`${c.firstName} ${c.lastName} ${c.company} ${c.email} ${c.jobTitle}`.toLowerCase().includes(clientQuery.toLowerCase()));
 const companyMap=useMemo(()=>{const map=new Map<string,Client[]>();clients.forEach(c=>{const key=c.company.trim()||'Independent';map.set(key,[...(map.get(key)||[]),c])});return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]))},[clients]);
 const clientProjects=selectedClient?projects.filter(p=>p.email===selectedClient.email || (p.company&&p.company.toLowerCase()===selectedClient.company.toLowerCase())):[];
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
     <div className="adminHeadingRow"><div><h1>Control the <span>Network.</span></h1><p className="adminLead">Creators do not manage anything here. New Era owns the profiles, visual identities and every portfolio item published to the public website.</p></div><div className="adminTabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><BarChart3 size={15}/> Overview</button><button className={tab==='creators'?'active':''} onClick={()=>setTab('creators')}><Users size={15}/> Creators</button><button className={tab==='services'?'active':''} onClick={()=>setTab('services')}><Layers3 size={15}/> Services</button><button className={tab==='portfolio'?'active':''} onClick={()=>setTab('portfolio')}><LayoutGrid size={15}/> Portfolio</button><button className={tab==='projects'?'active':''} onClick={()=>setTab('projects')}><BriefcaseBusiness size={15}/> Projects</button><button className={tab==='clients'?'active':''} onClick={()=>setTab('clients')}><Building2 size={15}/> Clients</button><button className={tab==='crm'?'active':''} onClick={()=>setTab('crm')}><Activity size={15}/> CRM</button></div></div>


     {tab==='overview' && <>
       <div className="adminOverviewGrid">
         <article className="overviewCard overviewHero"><div><small>NEW ERA OPERATIONS</small><h2>Your creative network, controlled from one place.</h2><p>Creators, services and portfolio content are curated by Admin before anything appears publicly.</p></div><Sparkles size={42}/></article>
         <article className="overviewCard"><Users size={18}/><small>ACTIVE CREATORS</small><strong>{creators.filter(c=>c.status==='Active').length}</strong><span>of {creators.length} profiles</span></article>
         <article className="overviewCard"><Layers3 size={18}/><small>SERVICES</small><strong>{services.length}</strong><span>public categories</span></article>
         <article className="overviewCard"><LayoutGrid size={18}/><small>PORTFOLIO</small><strong>{portfolio.length}</strong><span>published items</span></article><article className="overviewCard"><BriefcaseBusiness size={18}/><small>PROJECTS</small><strong>{projects.length}</strong><span>managed workspaces</span></article><article className="overviewCard"><Building2 size={18}/><small>CLIENTS</small><strong>{clients.length}</strong><span>{companyMap.length} companies</span></article>
       </div>
       <div className="adminOverviewSplit">
         <div className="adminPanel activityPanel"><div className="panelHead"><div><small>QUICK MANAGEMENT</small><h2>Content control</h2></div><Settings2 size={18}/></div>
           <div className="backendFoundationCard"><div><small>BACKEND FOUNDATION</small><strong>API + PostgreSQL schema ready</strong><span>Persistent storage is configured separately; the current demo repository remains isolated behind an API interface.</span></div><a href="/api/health" target="_blank" rel="noreferrer">API health ↗</a></div><div className="quickActions"><button onClick={()=>setTab('creators')}><Users size={18}/><span><b>Manage Creators</b><small>Add specialists and choose their profile visuals.</small></span><ChevronLeft size={16}/></button><button onClick={()=>setTab('services')}><Layers3 size={18}/><span><b>Manage Services</b><small>Create categories and assign creators.</small></span><ChevronLeft size={16}/></button><button onClick={()=>setTab('projects')}><BriefcaseBusiness size={18}/><span><b>Manage Projects</b><small>Review briefs and project status.</small></span><ChevronLeft size={16}/></button><button onClick={()=>setTab('clients')}><Building2 size={18}/><span><b>Manage Clients & Companies</b><small>See registered people, companies and their projects.</small></span><ChevronLeft size={16}/></button><button onClick={()=>setTab('portfolio')}><LayoutGrid size={18}/><span><b>Manage Portfolio</b><small>Publish and remove creator work.</small></span><ChevronLeft size={16}/></button></div>
         </div>
         <div className="adminPanel networkPanel"><div className="panelHead"><div><small>NETWORK SNAPSHOT</small><h2>Live structure</h2></div><BarChart3 size={18}/></div><div className="networkRows"><div><span>Creators with portfolio</span><b>{new Set(portfolio.map(p=>p.creatorId)).size}/{creators.length}</b></div><div><span>Active services</span><b>{services.length}</b></div><div><span>Admin-controlled content</span><b>100%</b></div><div><span>Direct creator contact shown</span><b>No</b></div></div></div>
       </div>
     </>}

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


     {tab==='services' && <>
       <div className="adminToolbar"><div><small>SERVICE MANAGEMENT</small><h2>Services & Categories</h2></div><button className="adminAction" onClick={()=>setServices(v=>[...v,{id:Date.now(),name:'New Service',description:'Add a service description from Admin.',creators:0,sub:['New category']}])}><Plus size={15}/> Add Service</button></div>
       <div className="servicesAdminGrid">{services.map(s=><article className="adminPanel serviceAdminCard" key={s.id}><div className="serviceAdminIcon"><BriefcaseBusiness size={18}/></div><div className="serviceAdminCopy"><div><small>PUBLIC SERVICE</small><h3>{s.name}</h3></div><p>{s.description}</p><div className="serviceSubtags">{s.sub.map(x=><span key={x}>{x}</span>)}</div></div><div className="serviceAdminFoot"><span><Users size={13}/> {s.creators} creator{s.creators===1?'':'s'} assigned</span><button onClick={()=>setServices(v=>v.filter(x=>x.id!==s.id))}><Trash2 size={14}/></button></div></article>)}</div>
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

     {tab==='projects' && <>
       <div className="projectsAdminToolbar"><div><small>NEW ERA PROJECT PIPELINE</small><h2>{projects.length} active workspace{projects.length===1?'':'s'}</h2><p>Every brief stays under New Era control. Creator contact details are never exposed.</p></div><div className="adminPipelineStats">{projectStatuses.slice(0,4).map(s=><div key={s}><small>{s}</small><strong>{projects.filter(p=>p.status===s).length}</strong></div>)}</div></div>
       <div className="projectsAdminGrid"><div className="adminPanel adminProjectList">{projects.map(p=><button key={p.id} className={selectedProject?.id===p.id?'active':''} onClick={()=>setSelectedProject(p)}><div><small>{p.id} · {p.service}</small><h3>{p.title}</h3><span>{p.company||p.name}</span></div><div className="adminProjectStatus">{p.status}<ArrowRight size={14}/></div></button>)}</div><div className="adminPanel adminProjectDetail">{selectedProject?<><div className="projectAdminHead"><div><small>{selectedProject.id} · {selectedProject.service}</small><h2>{selectedProject.title}</h2><span>{selectedProject.name}{selectedProject.company?` · ${selectedProject.company}`:''}</span></div><div className="adminPrivateBadge"><ShieldCheck size={13}/> Managed</div></div><div className="adminStatusFlow">{projectStatuses.map((s,i)=><button key={s} className={projectStatuses.indexOf(selectedProject.status)>=i?'done':''} onClick={()=>updateProjectStatus(selectedProject.id,s)}><i>{projectStatuses.indexOf(selectedProject.status)>=i?'✓':i+1}</i><span>{s}</span></button>)}</div><div className="adminProjectInfoGrid"><section><small>CLIENT BRIEF</small><p>{selectedProject.brief}</p><div className="adminBriefFacts"><div><span>Goal</span><strong>{selectedProject.goal||'Not specified'}</strong></div><div><span>Audience</span><strong>{selectedProject.audience||'Not specified'}</strong></div><div><span>Deliverables</span><strong>{selectedProject.deliverables||'Not specified'}</strong></div><div><span>References</span><strong>{selectedProject.references||'None provided'}</strong></div></div></section><section><small>PROJECT CONTROL</small><label className="adminAssignment"><span>Assigned specialist</span><select value={selectedProject.creator} onChange={e=>updateProjectCreator(selectedProject.id,e.target.value)}><option value="No preference">No preference</option>{creatorCatalog.filter(c=>c.services.includes(selectedProject.service)).map(c=><option key={c.name}>{c.name} — {c.role}</option>)}</select></label><dl><div><dt>Client</dt><dd>{selectedProject.email}</dd></div><div><dt>Budget</dt><dd>{selectedProject.budget}</dd></div><div><dt>Deadline</dt><dd>{selectedProject.deadline||'Not set'}</dd></div></dl></section></div><div className="qualityControlCard"><div className="panelHead"><div><small>DELIVERY & QUALITY CONTROL</small><h3>Review gate</h3></div><ShieldCheck size={17}/></div><p className="qcLead">New Era controls the delivery gate. A specialist submission must be reviewed before the project can be completed.</p>{selectedProject.delivery?<div className="deliverySummary"><div><span>Latest delivery</span><strong>Version {selectedProject.delivery.version}</strong><small>{new Date(selectedProject.delivery.submittedAt).toLocaleString()}</small></div><p>{selectedProject.delivery.notes}</p>{selectedProject.delivery.link&&<a href={selectedProject.delivery.link} target="_blank" rel="noreferrer">Open delivery ↗</a>}</div>:<div className="deliveryEmpty">No delivery has been submitted yet.</div>}<div className="qcActions"><div><label>Delivery notes<textarea value={deliveryNotes} onChange={e=>setDeliveryNotes(e.target.value)} placeholder="Describe what was delivered..." rows={3}/></label><label>Delivery link <input value={deliveryLink} onChange={e=>setDeliveryLink(e.target.value)} placeholder="https://..." /></label><button className="adminSave" onClick={submitDelivery}>Submit delivery for review</button></div><div className="revisionGate"><label>Revision request<textarea value={revisionNote} onChange={e=>setRevisionNote(e.target.value)} placeholder="What needs to change?" rows={3}/></label><button className="secondaryAction" onClick={requestRevision}>Request revision</button>{selectedProject.status==='Review'&&<button className="adminSave" onClick={approveDelivery}>Approve & complete</button>}</div></div>{(selectedProject.revisionRequests||[]).length>0&&<div className="revisionHistory"><small>REVISION HISTORY</small>{(selectedProject.revisionRequests||[]).slice().reverse().map((r,i)=><div key={i}><b>{r.text}</b><span>{new Date(r.at).toLocaleString()}</span></div>)}</div>}</div><div className="adminProjectModules"><div className="adminChat"><MessageCircle size={17}/><b>Project chat</b><span>Message the client directly inside New Era. Personal creator contact details stay private.</span><div className="adminMessageThread">{(selectedProject.messages||[]).map((m:any,i:number)=><p key={i}><strong>{m.from==='client'?'Client':'New Era'}:</strong> {m.text}</p>)}</div><div className="adminComposer"><input value={adminMessage} onChange={e=>setAdminMessage(e.target.value)} placeholder="Write to client..."/><button onClick={()=>{if(!adminMessage.trim()||!selectedProject)return; const now=new Date().toISOString(); const all=JSON.parse(localStorage.getItem('new-era-projects')||'[]'); const next=all.map((p:Project)=>p.id===selectedProject.id?{...p,messages:[...(p.messages||[]),{from:'admin',text:adminMessage.trim(),at:now}],activity:[...(p.activity||[]),{type:'message',text:'New Era sent a message to the client',at:now}]}:p); localStorage.setItem('new-era-projects',JSON.stringify(next)); const updated=next.find((p:Project)=>p.id===selectedProject.id); setProjects(next);setSelectedProject(updated);setAdminMessage('')}}><Send size={14}/></button></div></div><div className="adminActivityCard"><div className="panelHead"><div><small>PROJECT ACTIVITY</small><h3>Latest updates</h3></div><Clock3 size={17}/></div>{(selectedProject.activity||[]).slice().reverse().slice(0,10).map((a,i)=><div className="adminActivityRow" key={i}><i></i><span><strong>{a.text}</strong><small>{new Date(a.at).toLocaleString()}</small></span></div>)}</div></div></>:<div className="selectProject"><BriefcaseBusiness size={28}/><h2>Select a project</h2><p>Choose a client brief to manage its workflow.</p></div>}</div></div>

     </>}

     {tab==='crm' && (()=>{
       const statusOptions=['All',...projectStatuses];
       const crmProjects=projects.filter(p=>(crmStatus==='All'||p.status===crmStatus)&&`${p.title} ${p.company} ${p.name} ${p.email} ${p.service} ${p.creator}`.toLowerCase().includes(crmQuery.toLowerCase()));
       const pipeline=projectStatuses.map(status=>({status,count:projects.filter(p=>p.status===status).length}));
       const recentActivity=projects.flatMap(p=>(p.activity||[]).map(a=>({...a,project:p}))).sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime()).slice(0,10);
       const creatorLoad=creatorCatalog.map(c=>({creator:c,projects:projects.filter(p=>p.creator.startsWith(c.name)).length})).sort((a,b)=>b.projects-a.projects);
       return <>
         <div className="crmHeader"><div><small>NEW ERA CRM</small><h2>Relationship & Project Control</h2><p>One operational view connecting clients, companies, briefs, specialists, project stages and recent communication.</p></div><div className="crmActions"><div className="crmSearch"><Search size={14}/><input value={crmQuery} onChange={e=>setCrmQuery(e.target.value)} placeholder="Search projects, clients, companies..."/></div><select value={crmStatus} onChange={e=>setCrmStatus(e.target.value)}>{statusOptions.map(s=><option key={s}>{s}</option>)}</select></div></div>
         <div className="crmKpis"><div><BriefcaseBusiness/><span>Total projects</span><strong>{projects.length}</strong></div><div><Users/><span>Active clients</span><strong>{new Set(projects.map(p=>p.email).filter(Boolean)).size}</strong></div><div><UserCheck/><span>Assigned specialists</span><strong>{new Set(projects.map(p=>p.creator).filter(c=>c&&c!=='No preference')).size}</strong></div><div><TrendingUp/><span>In progress</span><strong>{projects.filter(p=>p.status==='In Progress').length}</strong></div></div>
         <div className="crmGridTop"><section className="adminPanel crmPipeline"><div className="panelHead"><div><small>PROJECT PIPELINE</small><h3>Operational stages</h3></div><Filter size={17}/></div><div className="crmPipelineRows">{pipeline.map(item=><button key={item.status} onClick={()=>setCrmStatus(item.status)} className={crmStatus===item.status?'active':''}><span><i></i>{item.status}</span><b>{item.count}</b></button>)}</div></section><section className="adminPanel crmCompanies"><div className="panelHead"><div><small>COMPANY RELATIONSHIPS</small><h3>Workspace coverage</h3></div><Building2 size={17}/></div>{companyMap.slice(0,6).map(([name,members])=><div className="crmCompanyRow" key={name}><span><strong>{name}</strong><small>{members.length} client{members.length===1?'':'s'} · {members[0]?.industry||'Industry not set'}</small></span><b>{projects.filter(p=>members.some(m=>m.email===p.email)).length}</b></div>)}{companyMap.length===0&&<div className="emptyClientProjects">No company records yet.</div>}</section></div>
         <div className="crmGridMain"><section className="adminPanel crmProjectTable"><div className="panelHead"><div><small>PROJECT REGISTER</small><h3>{crmProjects.length} matching projects</h3></div><CalendarDays size={17}/></div>{crmProjects.length===0?<div className="emptyClientProjects">No projects match the current filters.</div>:crmProjects.map(p=><button className="crmProjectRow" key={p.id} onClick={()=>{setSelectedProject(p);setTab('projects')}}><div><small>{p.id} · {p.service}</small><strong>{p.title}</strong><span>{p.name} · {p.company||'Independent'}</span></div><em className={p.status.toLowerCase().replaceAll(' ','-')}>{p.status}</em><ArrowRight size={14}/></button>)}</section><section className="adminPanel crmActivity"><div className="panelHead"><div><small>ACTIVITY STREAM</small><h3>Latest operations</h3></div><Activity size={17}/></div>{recentActivity.length===0?<div className="emptyClientProjects">Project activity will appear here.</div>:recentActivity.map((a,i)=><div className="crmActivityRow" key={i}><i></i><span><strong>{a.text}</strong><small>{a.project.title} · {new Date(a.at).toLocaleString()}</small></span></div>)}</section></div>
         <section className="adminPanel crmCreatorLoad"><div className="panelHead"><div><small>SPECIALIST LOAD</small><h3>Assigned project distribution</h3></div><Users size={17}/></div><div className="crmLoadGrid">{creatorLoad.map(({creator,projects:count})=><div key={creator.name}><span><strong>{creator.name}</strong><small>{creator.role}</small></span><b>{count}</b></div>)}</div></section>
       </>;
     })()}

     {tab==='clients' && <>
       <div className="clientsAdminToolbar"><div><small>CLIENT RELATIONSHIP MANAGEMENT</small><h2>Clients & Companies</h2><p>Every registered client belongs to a company workspace. Admin can see their role, contact details and New Era projects without exposing creator contact information.</p></div><div className="clientCountBadge"><Building2 size={16}/><strong>{companyMap.length}</strong><span>companies</span><strong>{clients.length}</strong><span>clients</span></div></div>
       <div className="clientsAdminLayout">
         <div className="adminPanel clientsDirectory">
           <div className="directoryHead"><div><small>CLIENT DIRECTORY</small><h3>{filteredClients.length} people</h3></div><div className="clientSearch"><Search size={14}/><input value={clientQuery} onChange={e=>setClientQuery(e.target.value)} placeholder="Search client, company or role..."/></div></div>
           {filteredClients.length===0 ? <div className="emptyClients"><UserRound size={28}/><h3>No registered clients yet</h3><p>When someone creates a New Era client account, their company and role will appear here automatically.</p></div> : filteredClients.map(c=><button key={c.id} className={'clientDirectoryRow '+(selectedClient?.id===c.id?'active':'')} onClick={()=>setSelectedClient(c)}><div className="clientAvatar">{c.firstName?.[0]}{c.lastName?.[0]}</div><span><strong>{c.firstName} {c.lastName}</strong><small>{c.jobTitle} · {c.company}</small><em>{c.email}</em></span><ArrowRight size={14}/></button>)}
         </div>
         <div className="adminPanel clientDetailPanel">
           {selectedClient ? <>
             <div className="clientDetailHead"><div className="clientAvatar large">{selectedClient.firstName?.[0]}{selectedClient.lastName?.[0]}</div><div><small>CLIENT ACCOUNT · {selectedClient.id}</small><h2>{selectedClient.firstName} {selectedClient.lastName}</h2><p>{selectedClient.jobTitle} · {selectedClient.company}</p></div></div>
             <div className="clientInfoGrid">
               <div><Mail size={14}/><span>Email<strong>{selectedClient.email}</strong></span></div><div><Phone size={14}/><span>Phone<strong>{selectedClient.phone}</strong></span></div><div><Building2 size={14}/><span>Company<strong>{selectedClient.company}</strong></span></div><div><UserRound size={14}/><span>Position<strong>{selectedClient.jobTitle}</strong></span></div><div><Layers3 size={14}/><span>Industry<strong>{selectedClient.industry}</strong></span></div><div><Users size={14}/><span>Company size<strong>{selectedClient.size}</strong></span></div><div><MapPin size={14}/><span>Country<strong>{selectedClient.country}</strong></span></div><div><Globe2 size={14}/><span>Website<strong>{selectedClient.website||'Not provided'}</strong></span></div>
             </div>
             <div className="companyWorkspaceCard"><div><small>COMPANY WORKSPACE</small><h3>{selectedClient.company}</h3><p>{selectedClient.industry} · {selectedClient.size} · {selectedClient.country}</p></div><span>{clients.filter(c=>c.company.toLowerCase()===selectedClient.company.toLowerCase()).length} member(s)</span></div>
             <div className="clientProjectsBlock"><div className="panelHead"><div><small>PROJECT HISTORY</small><h3>{clientProjects.length} project{clientProjects.length===1?'':'s'}</h3></div><BriefcaseBusiness size={17}/></div>{clientProjects.length===0?<div className="emptyClientProjects">No projects linked to this client yet.</div>:clientProjects.map(p=><button key={p.id} className="clientProjectRow" onClick={()=>{setSelectedProject(p);setTab('projects')}}><span><small>{p.id} · {p.service}</small><strong>{p.title}</strong><em>{p.status}</em></span><ArrowRight size={14}/></button>)}</div>
           </> : <div className="selectClient"><Building2 size={32}/><h2>Select a client</h2><p>Choose a registered client to view their company, role, contact information and project history.</p></div>}
         </div>
       </div>
       <div className="companyDirectoryGrid"><div className="adminPanel"><div className="panelHead"><div><small>COMPANY DIRECTORY</small><h3>{companyMap.length} companies</h3></div><Building2 size={17}/></div><div className="companyRows">{companyMap.length===0?<div className="emptyClientProjects">No company records yet.</div>:companyMap.map(([name,members])=><div className="companyRow" key={name}><div className="companyLogo"><Building2 size={16}/></div><div><strong>{name}</strong><span>{members[0].industry} · {members[0].size}</span></div><b>{members.length} member{members.length===1?'':'s'}</b></div>)}</div></div></div>
     </>}
   </section>

   {showCreatorForm && <div className="modalBackdrop"><div className="modal"><button className="modalClose" onClick={()=>setShowCreatorForm(false)}><X size={18}/></button><small>NEW CREATOR</small><h2>Add specialist</h2><label>Full name<input value={creatorName} onChange={e=>setCreatorName(e.target.value)} placeholder="e.g. Aysel M."/></label><label>Role<select value={creatorRole} onChange={e=>{setCreatorRole(e.target.value);setSelected(presets.find(([,x])=>x===e.target.value)?.[0]??selected)}}>{presets.map(([id,label])=><option key={id} value={label}>{label}</option>)}</select></label><label>Short bio<textarea value={creatorBio} onChange={e=>setCreatorBio(e.target.value)} placeholder="Specialization, style and experience..."/></label><div className="modalPreview"><img src={'/creator-presets/'+selected+'.jpg'} alt=""/><span>Profile preset<strong>{presetLabel}</strong></span></div><button className="adminSave" onClick={addCreator}>Create Creator</button></div></div>}
   {showPortfolioForm && <div className="modalBackdrop"><div className="modal"><button className="modalClose" onClick={()=>setShowPortfolioForm(false)}><X size={18}/></button><small>NEW PORTFOLIO ITEM</small><h2>Add project</h2><label>Project title<input value={portfolioTitle} onChange={e=>setPortfolioTitle(e.target.value)} placeholder="e.g. Cosmic Brand Launch"/></label><div className="formSplit"><label>Category<select value={portfolioCategory} onChange={e=>setPortfolioCategory(e.target.value)}><option>Graphic Design</option><option>Branding</option><option>Social Media</option><option>Commercial Video</option><option>Photography</option><option>Web Design</option><option>Marketing</option></select></label><label>Year<input value={portfolioYear} onChange={e=>setPortfolioYear(e.target.value)}/></label></div><label>Description<textarea value={portfolioDescription} onChange={e=>setPortfolioDescription(e.target.value)} placeholder="What was delivered?"/></label><div className="uploadMock"><Upload size={18}/><span>Portfolio media upload<strong>Connect storage when backend is added</strong></span></div><button className="adminSave" onClick={addPortfolio}>Publish Portfolio Item</button></div></div>}
 </main>
}
