import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/admin',
    name: 'NEW ERA',
    short_name: 'NEW ERA',
    description: 'NEW ERA idarəetmə paneli',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    background_color: '#080c10',
    theme_color: '#080c10',
    lang: 'az',
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
