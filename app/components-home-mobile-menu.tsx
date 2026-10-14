'use client';

import { useRef } from 'react';
import { Menu, Search } from 'lucide-react';

export default function HomeMobileMenu({ accountHref, signedIn }: { accountHref: string; signedIn: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return <details className="homeMobileMenu" ref={ref} onKeyDown={event => {
    if (event.key === 'Escape' && ref.current?.open) {
      ref.current.open = false;
      ref.current.querySelector('summary')?.focus();
    }
  }}>
    <summary aria-label="Naviqasiya menyusu"><Menu size={24} aria-hidden="true" /></summary>
    <div className="homeMobileMenuLinks" onClick={event => {
      if ((event.target as HTMLElement).closest('a') && ref.current) ref.current.open = false;
    }}>
      <a href="#top">Ana səhifə</a>
      <a href="#services">Xidmətlər</a>
      <a href="#portfolio">Portfolio</a>
      <a href="#about">Haqqımızda</a>
      <a href="#contact">Əlaqə</a>
      <a href="/analysis">Analiz</a>
      <a href="/events">Tədbirlər</a>
      <a href="/start-project">Layihəyə başla</a>
      {!signedIn && <a href="/register">Hesab yarat</a>}
      <a href={accountHref}>{signedIn ? 'Hesabım' : 'CRM paneli'}</a>
      <button className="iconBtn" aria-label="Axtarış"><Search size={19} /></button>
    </div>
  </details>;
}
