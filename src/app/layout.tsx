import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'New Era — Creative Talent Network',
  description: 'Find the right creative specialist for your next project.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
