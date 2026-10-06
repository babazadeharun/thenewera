import type { Metadata } from 'next';
import './globals.css';
import { prisma } from '@/lib/prisma';
import SiteHeader from './components-site-header';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSetting.findUnique({ where: { id: 'main' }, include: { faviconMedia: true, socialImageMedia: true } }).catch(() => null);
  return {
    title: settings?.seoTitle || settings?.siteName || 'New Era — B2B Marketinq və Kreativ Agentliyi',
    description: settings?.seoDescription || 'New Era bizneslər üçün strategiya, kreativ, marketinq və rəqəmsal həlləri bir komandada birləşdirən B2B agentlikdir.',
    icons: settings?.faviconMedia?.url ? { icon: settings.faviconMedia.url } : undefined,
    openGraph: settings?.socialImageMedia?.url ? { images: [settings.socialImageMedia.url], siteName: settings.siteName || 'New Era' } : { siteName: settings?.siteName || 'New Era' },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="az"><body><SiteHeader />{children}</body></html>;
}
