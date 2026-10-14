'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, Search, UserRound, X } from 'lucide-react';
import styles from './home.module.css';

type Props = { logo: string; siteName: string; accountHref: string | null; servicesEnabled: boolean; portfolioEnabled: boolean; aboutEnabled: boolean };

export default function HomeNavigation({ logo, siteName, accountHref, servicesEnabled, portfolioEnabled, aboutEnabled }: Props) {
  const [active, setActive] = useState('top');
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<{ title: string; href: string }[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const links = [
    { title: 'Ana səhifə', href: '#top' },
    { title: 'Xidmətlər', href: servicesEnabled ? '#services' : '/services' },
    { title: 'İşlərimiz', href: portfolioEnabled ? '#portfolio' : '/portfolio' },
    ...(aboutEnabled ? [{ title: 'Haqqımızda', href: '#about' }] : []),
    { title: 'Analiz', href: '/analysis' },
    { title: 'Tədbirlər', href: '/events' },
    { title: 'Layihəyə başla', href: '/start-project' },
  ];

  useEffect(() => {
    const root = document.documentElement;
    const sections = [...document.querySelectorAll<HTMLElement>('[data-presentation]')];
    root.classList.add('nePresentation');
    const resize = new ResizeObserver(() => {
      for (const section of sections) {
        // Only short presentation sections snap. Long CMS content always flows.
        section.dataset.snapReady = String(section.offsetHeight <= window.innerHeight + 1);
      }
    });
    for (const section of sections) resize.observe(section);
    const update = () => {
      let nearest = sections[0];
      for (const section of sections) if (section.getBoundingClientRect().top <= window.innerHeight * .4) nearest = section;
      if (nearest) setActive(nearest.id);
    };
    const observer = new IntersectionObserver(update, { threshold: [0, .15, .4, .7, 1] });
    sections.forEach(section => observer.observe(section));
    window.addEventListener('resize', update);
    return () => {
      resize.disconnect(); observer.disconnect(); window.removeEventListener('resize', update);
      root.classList.remove('nePresentation');
      sections.forEach(section => delete section.dataset.snapReady);
    };
  }, []);

  function openSearch() {
    setProjects([...document.querySelectorAll<HTMLAnchorElement>('#portfolio .agencyPortfolioCard')].map(a => ({ title: a.querySelector('strong')?.textContent || '', href: a.getAttribute('href') || '/portfolio' })));
    setQuery(''); setMenuOpen(false); dialog.current?.showModal();
  }
  const results = [...links, ...projects].filter(item => item.title.toLocaleLowerCase('az-AZ').includes(query.trim().toLocaleLowerCase('az-AZ')));

  return <>
    <a className={styles.skipLink} href="#home-content">Məzmuna keç</a>
    <header className={styles.header}>
      <a className={styles.logo} href="#top" aria-label={siteName}><img src={logo} alt={`${siteName} Marketing Agency`} width="196" height="60" /></a>
      <nav id="home-menu" className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`} aria-label="Əsas menyu" onKeyDown={e => { if (e.key === 'Escape') { setMenuOpen(false); document.querySelector<HTMLButtonElement>('[aria-controls="home-menu"]')?.focus(); } }}>
        {links.map(link => <a key={link.title} href={link.href} aria-current={link.href === `#${active}` ? 'location' : undefined} onClick={() => setMenuOpen(false)}>{link.title}</a>)}
        {!accountHref && <a className={styles.mobileRegister} href="/register">Hesab yarat</a>}
      </nav>
      <div className={styles.headerActions}>
        <button ref={searchButton} type="button" onClick={openSearch} aria-label="Saytda axtarış" className={styles.searchButton}><Search size={20} /><span>Axtarış</span></button>
        <a href={accountHref || '/login'} className={styles.account}><UserRound size={18} /><span>{accountHref ? 'Hesabım' : 'Daxil ol'}</span></a>
        {!accountHref && <a className={styles.register} href="/register">Hesab yarat</a>}
        <button className={styles.menuButton} type="button" aria-label={menuOpen ? 'Menyunu bağla' : 'Menyunu aç'} aria-controls="home-menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(false); }}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>
    <dialog ref={dialog} aria-labelledby="home-search-title" className={styles.searchDialog} onClose={() => searchButton.current?.focus()} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); dialog.current?.close(); } }}>
      <div className={styles.searchHeading}><h2 id="home-search-title">New Era-da axtarış</h2><button type="button" aria-label="Axtarışı bağla" onClick={() => dialog.current?.close()}><X /></button></div>
      <label htmlFor="home-search">Səhifə və ya seçilmiş layihə</label>
      <input id="home-search" type="search" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Nə axtarırsınız?" />
      <ul>{results.map((item, i) => <li key={`${item.href}-${i}`}><a href={item.href} onClick={() => dialog.current?.close()}>{item.title}<ArrowUpRight size={18} /></a></li>)}</ul>
      {!results.length && <p role="status">Nəticə tapılmadı. Başqa sözlə axtarın.</p>}
    </dialog>
  </>;
}
