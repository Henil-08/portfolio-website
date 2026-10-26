import type { Metadata } from "next";
import { Barlow_Condensed, Fraunces, IBM_Plex_Mono, Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import Brand from "./Brand";

// The candidate typefaces, loaded only on this page (free Google fonts, self-hosted by next/font).
const inter = Inter({ subsets: ["latin"], variable: "--b-inter" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--b-inter-tight" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--b-jetbrains" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--b-barlow" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--b-plex" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--b-fraunces", axes: ["opsz", "SOFT"] });

export const metadata: Metadata = {
  title: "Brand directions · Henil Gajjar",
  description: "Three brand identities for the site, the world's UI and the resume, side by side.",
  robots: { index: false, follow: false },
};

export default function BrandPage() {
  return (
    <div className={`${inter.variable} ${interTight.variable} ${jetbrains.variable} ${barlow.variable} ${plex.variable} ${fraunces.variable}`}>
      <Brand />
    </div>
  );
}
