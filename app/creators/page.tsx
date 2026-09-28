import Link from 'next/link';

const creators = [
  {slug:'aysel-m',name:'Aysel M.',role:'Visual Designer',meta:'4.9 · 28 reviews · 32 projects',style:'violet',initials:'AM',preset:'graphic-designer',skills:['Social Design','Campaigns','Packaging']},
  {slug:'rashad-a',name:'Rashad A.',role:'Filmmaker / Videographer',meta:'4.8 · 24 reviews · 18 projects',style:'blue',initials:'RA',preset:'videographer',skills:['Commercial','Reels','Editing']},
  {slug:'leyla-q',name:'Leyla Q.',role:'Brand Designer',meta:'4.9 · 32 reviews · 21 projects',style:'pink',initials:'LQ',preset:'branding-specialist',skills:['Branding','Identity','Art Direction']},
  {slug:'tural-s',name:'Tural S.',role:'Web Developer',meta:'4.7 · 19 reviews · 14 projects',style:'cyan',initials:'TS',preset:'web-developer',skills:['Next.js','E-commerce','Web Apps']},
  {slug:'nigar-r',name:'Nigar R.',role:'Social Media Strategist',meta:'4.9 · 21 reviews · 26 projects',style:'gold',initials:'NR',preset:'marketing-specialist',skills:['Strategy','Content','Campaigns']},
  {slug:'kamran-h',name:'Kamran H.',role:'Performance Marketer',meta:'4.8 · 17 reviews · 22 projects',style:'green',initials:'KH',preset:'marketing-specialist',skills:['Meta Ads','Google Ads','Analytics']},
];

export default function CreatorsPage(){
 return <main className="innerPage"><div className="container innerHero"><Link className="back" href="/">← New Era</Link><div className="eyebrow">CURATED CREATOR NETWORK</div><h1>Find your<br/><span>creative match.</span></h1><p>Every specialist is presented through their work. Personal contact details stay private; projects start inside New Era.</p><div className="filterBar"><span>All</span><span>Design</span><span>Video</span><span>Marketing</span><span>Development</span></div></div><div className="container creatorGrid large">{creators.map(c=><article className="creatorCard" key={c.slug}><div className={`portrait ${c.style}`}><img src={`/creator-presets/${c.preset}.jpg`} alt=""/><span className="available">Available</span></div><div className="creatorBody"><h3>{c.name}</h3><p>{c.role}</p><div className="rating">★ {c.meta}</div><div className="creatorTags">{c.skills.map(s=><span key={s}>{s}</span>)}</div><Link className="profileBtn" href={`/creators/${c.slug}`}>View Portfolio <span>→</span></Link></div></article>)}</div></main>
}
