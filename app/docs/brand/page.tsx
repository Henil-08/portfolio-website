import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans, Inter_Tight, JetBrains_Mono, Newsreader } from "next/font/google";
import Brand from "./Brand";

// Each direction's typefaces, loaded only on this page (free Google fonts, self-hosted by next/font).
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--b-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--b-plex-mono" });
const archivo = Archivo({ subsets: ["latin"], variable: "--b-archivo", axes: ["wdth"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--b-jetbrains" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--b-newsreader", style: ["normal", "italic"], axes: ["opsz"] });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--b-inter-tight" });

export const metadata: Metadata = {
  title: "Brand directions · Henil Gajjar",
  description: "Three brand identities, each its own system, applied to real projects and the resume.",
  robots: { index: false, follow: false },
};

export default function BrandPage() {
  return (
    <div className={`${plex.variable} ${plexMono.variable} ${archivo.variable} ${jetbrains.variable} ${newsreader.variable} ${interTight.variable}`}>
      <Brand />
    </div>
  );
}
