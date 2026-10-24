import Link from 'next/link';
import './legal.css';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="neLegal">
      <div className="neLegalInner">
        <Link className="neLegalBack" href="/">← Ana səhifə</Link>
        <article className="neLegalCard">{children}</article>
        <footer className="neLegalFooter">
          <p>NEW ERA — “NEAGENCY” Məhdud Məsuliyyətli Cəmiyyəti · VÖEN: 7002625441</p>
          <nav aria-label="Məlumatların qorunması">
            <Link href="/privacy">Məxfilik siyasəti</Link>
            <Link href="/data-deletion">Məlumatların silinməsi</Link>
            <a href="mailto:hello@thenewera.space">hello@thenewera.space</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
