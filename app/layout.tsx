import type { Metadata } from 'next';
import './globals.css';
import { prisma } from '@/lib/prisma';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSetting.findUnique({ where: { id: 'main' }, include: { faviconMedia: true, socialImageMedia: true } }).catch(() => null);
  return {
    title: settings?.seoTitle || settings?.siteName || 'New Era — Creative Talent Network',
    description: settings?.seoDescription || 'Find the right creative specialist for your next project.',
    icons: settings?.faviconMedia?.url ? { icon: settings.faviconMedia.url } : undefined,
    openGraph: settings?.socialImageMedia?.url ? { images: [settings.socialImageMedia.url], siteName: settings.siteName || 'New Era' } : { siteName: settings?.siteName || 'New Era' },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
