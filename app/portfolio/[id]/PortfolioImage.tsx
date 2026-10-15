'use client';

import { useRef } from 'react';
import { Expand, X } from 'lucide-react';

export default function PortfolioImage({ src, alt, loading }: { src: string; alt: string; loading?: 'lazy' }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <a className="portfolioImageLink" href={src} target="_blank" rel="noreferrer" aria-label={`Şəkli böyüt: ${alt}`} onClick={event => {
      if (dialog.current && typeof dialog.current.showModal === 'function') {
        event.preventDefault();
        dialog.current.showModal();
      }
    }}>
      <img src={src} alt={alt} loading={loading} />
      <span className="portfolioImageHint" aria-hidden="true"><Expand size={14} /> Böyüt</span>
    </a>
    <dialog className="portfolioImageDialog" ref={dialog} aria-label={`Böyük görünüş: ${alt}`} onClick={event => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    }}>
      <div className="portfolioImageViewer">
        <div className="portfolioImageToolbar">
          <a href={src} target="_blank" rel="noreferrer">Orijinal ölçüdə aç</a>
          <button type="button" aria-label="Şəkli bağla" onClick={() => dialog.current?.close()}><X size={22} /></button>
        </div>
        <img src={src} alt={alt} loading="lazy" />
      </div>
    </dialog>
  </>;
}
