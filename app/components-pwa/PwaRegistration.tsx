'use client';

import { useEffect } from 'react';

export default function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let disposed = false;
    const register = () => {
      if (disposed) return;
      void navigator.serviceWorker.register('/new-era-sw.js', {
        scope: '/', updateViaCache: 'none',
      }).catch((error: unknown) => console.warn('NEW ERA PWA qeydiyyatı alınmadı:', error));
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => {
      disposed = true;
      window.removeEventListener('load', register);
    };
  }, []);
  return null;
}
