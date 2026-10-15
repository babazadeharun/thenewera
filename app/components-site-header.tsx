'use client';

import Link from 'next/link';
import './public-navbar.css';
import { Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAccountHomePath } from '@/lib/account-routing';

type Me = { id: string; email: string; role: string; client?: { firstName?: string; lastName?: string } | null };

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => { if (active) { setUser(data?.user || null); setReady(true); } })
      .catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [pathname]);

  if (pathname === '/account' || pathname === '/projects' || pathname.startsWith('/admin') || pathname.startsWith('/app/admin') || pathname.startsWith('/promoter')) return null;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="neSiteHeader neUnifiedHeader">
      <div className="neSiteHeaderInner">
        <Link className="neSiteBrand" href="/" aria-label="New Era">
          <img src="/new-era-logo.png" alt="New Era Marketing Agency" />
        </Link>
        <nav className="neSiteNav" aria-label="Əsas menyu">
          <Link href="/">Ana səhifə</Link>
          <Link href="/#services">Xidmətlər</Link>
          <Link href="/#portfolio">İşlərimiz</Link>
          <Link href="/#about">Haqqımızda</Link>
          <Link href="/analysis">Analiz</Link>
          <Link href="/events">Tədbirlər</Link>
          <Link href="/start-project">Layihəyə başla</Link>
        </nav>
        <div className="neSiteActions">
          {ready && <Link href={user ? getAccountHomePath(user.role) : '/login'} className="neSiteLogin">{user ? 'Hesabım' : 'Daxil ol'}</Link>}
          <details className="neSiteMore" onKeyDown={(event) => {
            if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
          }}>
            <summary aria-label="Əlavə hesab və əlaqə keçidləri">•••</summary>
            <div className="neSiteMorePanel">
              <Link href="/#contact">Əlaqə</Link>
              <button type="button" className="neSiteSearch" aria-label="Axtarış"><Search size={18} /> Axtarış</button>
              {ready && user ? <button type="button" className="neSiteSignup" onClick={logout}>Çıxış</button> : ready ? <Link href="/register" className="neSiteSignup">Hesab yarat</Link> : null}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
