import type { Metadata } from "next";
import "../offer.css";
export const metadata: Metadata = {
  title: "Məxfi təklif — New Era",
  description: "Sizin üçün hazırlanmış fərdi xidmət təklifi.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
  openGraph: {
    title: "Məxfi təklif — New Era",
    description: "New Era fərdi təklif",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Məxfi təklif — New Era",
    description: "Fərdi xidmət təklifi",
    images: [],
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
