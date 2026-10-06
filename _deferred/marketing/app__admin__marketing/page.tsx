import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { Search, Users, History, Settings, Megaphone, ArrowRight, Sparkles } from 'lucide-react';
import './marketing.css';

export default async function MarketingOverview() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!['ADMIN','SUPER_ADMIN'].includes(user.role)) redirect('/account');
  return <main className="marketingPage"><div className="marketingShell">
    <header className="marketingHeader"><div><span className="marketingKicker">NEW ERA · MARKETING INTELLIGENCE</span><h1>AI Lead Finder</h1><p>Public business research, AI normalization and lead intelligence — inside the New Era admin workspace.</p></div><Link href="/admin" className="marketingBack">← Admin</Link></header>
    <nav className="marketingNav"><Link className="active" href="/admin/marketing">Overview</Link><Link href="/admin/marketing/search"><Search size={14}/> AI Lead Finder</Link><Link href="/admin/marketing/leads"><Users size={14}/> Leads</Link><Link href="/admin/marketing/searches"><History size={14}/> Searches</Link><Link href="/admin/marketing/campaigns"><Megaphone size={14}/> Campaigns</Link><Link href="/admin/marketing/settings"><Settings size={14}/> Settings</Link></nav>
    <section className="marketingHero"><div><div className="heroIcon"><Sparkles size={20}/></div><h2>Discover companies worth contacting.</h2><p>Define a target, location and business need. The research provider finds public business information; Claude structures and qualifies the evidence without becoming the source of web facts.</p><Link className="marketingPrimary" href="/admin/marketing/search">Start AI research <ArrowRight size={16}/></Link></div><div className="architectureCard"><small>RESEARCH PIPELINE</small><strong>Search → AI → Normalize → Deduplicate → Verify → CRM</strong><span>Only public, outreach-appropriate information. No private accounts, authentication bypasses or CAPTCHA circumvention.</span></div></section>
    <section className="marketingCards"><Link href="/admin/marketing/search" className="marketingCard"><Search/><div><small>RESEARCH</small><h3>New lead search</h3><p>Search 10–250 potential leads with filters and required fields.</p></div><ArrowRight/></Link><Link href="/admin/marketing/leads" className="marketingCard"><Users/><div><small>CRM</small><h3>Lead database</h3><p>Review, verify, qualify and manage discovered businesses.</p></div><ArrowRight/></Link><Link href="/admin/marketing/searches" className="marketingCard"><History/><div><small>JOBS</small><h3>Search history</h3><p>Monitor research runs, sources scanned and deduplication results.</p></div><ArrowRight/></Link></section>
  </div></main>;
}
