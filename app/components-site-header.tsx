'use client';

import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function SiteHeader() {
  const pathname = usePathname();
  if (pathname === '/' || pathname.startsWith('/admin') || pathname.startsWith('/app/admin') || pathname.startsWith('/promoter')) return null;

  return (
    <header className="neSiteHeader">
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
          <button type="button" className="neSiteSearch" aria-label="Axtarış"><Search size={18} /></button>
          <Link href="/login" className="neSiteLogin">Daxil ol</Link>
          <Link href="/register" className="neSiteSignup">Hesab yarat</Link>
          <button type="button" className="neSiteMenu" aria-label="Menyu"><Menu size={20} /></button>
        </div>
      </div>
    </header>
  );
}
