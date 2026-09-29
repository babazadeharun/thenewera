'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const services = ['Graphic Design','Branding','Video Production','Photography','Social Media','Web Design & Development','Marketing & SEO'];
const creatorCatalog = [
 {slug:'aysel-m',name:'Aysel M.',role:'Graphic Designer',services:['Graphic Design','Branding','Social Media']},
 {slug:'rashad-a',name:'Rashad A.',role:'Videographer',services:['Video Production']},
 {slug:'leyla-q',name:'Leyla Q.',role:'Brand Designer',services:['Branding','Graphic Design']},
 {slug:'tural-s',name:'Tural S.',role:'Web Developer',services:['Web Design & Development']},
 {slug:'nigar-r',name:'Nigar R.',role:'Social Media Strategist',services:['Social Media','Marketing & SEO']},
 {slug:'kamran-h',name:'Kamran H.',role:'Performance Marketer',services:['Marketing & SEO','Social Media']},
];

export default function StartProjectClient(){
 const params=useSearchParams();
 const [sent,setSent]=useState(false);
 const [projectId,setProjectId]=useState('');
 const [form,setForm]=useState({name:'',email:'',company:'',service:'',title:'',brief:'',goal:'',audience:'',deliverables:'',references:'',budget:'Flexible',deadline:'',creator:'No preference'});
 const matchingCreators=useMemo(()=>form.service ? creatorCatalog.filter(c=>c.services.includes(form.service)) : creatorCatalog,[form.service]);
 useEffect(()=>{ const requestedCreator=params.get('creator'); const requestedService=params.get('service'); if(requestedService) setForm(f=>({...f,service:services.includes(requestedService)?requestedService:f.service})); if(requestedCreator){ const found=creatorCatalog.find(c=>c.slug===requestedCreator); if(found) setForm(f=>({...f,creator:`${found.name} — ${found.role}`})); } const session=localStorage.getItem('new-era-client-session'); if(!session){window.location.href='/login';return;} try{const c=JSON.parse(session);setForm(f=>({...f,name:`${c.firstName} ${c.lastName}`,email:c.email||c.phone||'',company:c.company}))}catch{} },[]);
 function update(k:string,v:string){setForm(f=>({...f,[k]:v}))}
 async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   try{
    const res=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    const data=await res.json();
    if(!res.ok){alert(data.error||'Unable to submit the brief.');return;}
    setProjectId(data.project.id); setSent(true);
   }catch{alert('Unable to connect to New Era right now.');}
 }
 return <main className="innerPage"><div className="container formPage"><Link className="back" href="/">← New Era</Link><div className="eyebrow">START A PROJECT · CLIENT WORKSPACE</div><h1>Tell us what you want<br/><span>to create.</span></h1><p>Submit your brief once. New Era coordinates the specialist, communication and delivery inside the platform.</p>{sent?<div className="successBox"><div className="successIcon">✓</div><h2>Brief received.</h2><p>Your project <strong>{projectId}</strong> is now in <strong>Brief Submitted</strong>. New Era will review the brief and move it through the project workflow.</p><div className="successActions"><Link className="primary" href="/projects">Open my projects</Link><Link className="secondary" href="/creators">Explore creators</Link></div></div>:<form onSubmit={submit} className="projectForm">
  <div className="formSection"><small>CLIENT ACCOUNT</small><h3>Your company workspace</h3><div className="accountBrief"><strong>{form.name}</strong><span>{form.company}</span><small>{form.email}</small><a href="/account">Manage account →</a></div></div>
  <div className="formSection"><small>PROJECT BRIEF</small><h3>What are we creating?</h3><div className="formSplit"><label>Service<select required value={form.service} onChange={e=>{update('service',e.target.value);update('creator','No preference')}}><option value="" disabled>Select a service</option>{services.map(x=><option key={x}>{x}</option>)}</select></label><label>Preferred specialist<select value={form.creator} onChange={e=>update('creator',e.target.value)}><option>No preference</option>{matchingCreators.map(c=><option key={c.slug}>{c.name} — {c.role}</option>)}</select></label></div><div className="creatorPick"><small>{form.service ? 'MATCHED SPECIALISTS' : 'CREATOR SELECTION'}</small><p>{form.service ? `${matchingCreators.length} specialist${matchingCreators.length===1?'':'s'} match this service.` : 'Choose a service first to see the relevant specialists, or let New Era recommend the right fit.'}</p><div className="creatorChoices">{(form.service ? matchingCreators : creatorCatalog.slice(0,3)).map(c=>{const x=`${c.name} — ${c.role}`;return <button type="button" key={c.slug} className={form.creator===x?'selected':''} onClick={()=>update('creator',x)}><strong>{c.name}</strong><span>{c.role} · {form.creator===x?'Selected':'Choose'}</span></button>})}</div></div><label>Project title<input required value={form.title} onChange={e=>update('title',e.target.value)} placeholder="e.g. Instagram campaign for a new product"/></label><label>Brief<textarea required rows={5} value={form.brief} onChange={e=>update('brief',e.target.value)} placeholder="Give New Era the full context, style direction and important references."/></label><div className="formSplit"><label>Project goal<input required value={form.goal} onChange={e=>update('goal',e.target.value)} placeholder="What should this project achieve?"/></label><label>Target audience<input value={form.audience} onChange={e=>update('audience',e.target.value)} placeholder="Who is it for?"/></label></div><label>Expected deliverables<input required value={form.deliverables} onChange={e=>update('deliverables',e.target.value)} placeholder="e.g. logo, 12 posts, 3 story templates"/></label><label>References / links<input value={form.references} onChange={e=>update('references',e.target.value)} placeholder="Paste links to references, folders or inspiration"/></label><div className="formSplit"><label>Budget<select value={form.budget} onChange={e=>update('budget',e.target.value)}><option>Flexible</option><option>300–700 AZN</option><option>700–1,500 AZN</option><option>1,500–3,000 AZN</option><option>3,000+ AZN</option></select></label><label>Deadline<input type="date" value={form.deadline} onChange={e=>update('deadline',e.target.value)}/></label></div></div>
  <button className="primary" type="submit">Send project brief →</button><div className="privateNote">Your brief and future project communication stay inside New Era. Creator personal contact details are not published.</div>
 </form>}</div></main>
}
