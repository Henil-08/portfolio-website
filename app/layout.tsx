import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Cursor from "@/components/brand/Cursor";
import "./globals.css";

// The brand type (docs/BRAND.md): IBM Plex Sans for everything, Plex Mono for codes and figures.
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Henil Gajjar",
  description:
    "ML engineer at Waters Corporation. I build agents and give AI the context and tools to be useful. Drive around my little world to see what I've built.",
  openGraph: {
    title: "Henil Gajjar",
    description: "Hey Claude, who's Henil? Hop in the car and find out.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f2ed",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${plexMono.variable}`}>
      <body className="min-h-screen">
        {children}
        <Cursor />
      </body>
    </html>
  );
}
