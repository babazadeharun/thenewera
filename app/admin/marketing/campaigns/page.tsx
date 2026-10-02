import Link from 'next/link';
import { ArrowLeft, Megaphone } from 'lucide-react';
import '../marketing.css';
export default function CampaignsPage(){return <main className="marketingPage"><div className="marketingShell"><header className="marketingHeader"><div><span className="marketingKicker">OUTREACH</span><h1>Campaigns</h1><p>Campaign execution is kept separate from public lead research.</p></div><Link href="/admin/marketing" className="marketingBack"><ArrowLeft size={14}/> Marketing</Link></header><div className="emptyState"><Megaphone size={30}/><strong>Campaign workspace is ready for the next phase.</strong><span>Lead discovery and CRM data are already separated so outreach can be added without changing the research pipeline.</span></div></div></main>}
