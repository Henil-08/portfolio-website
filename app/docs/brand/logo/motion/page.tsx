import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Motion from "./Motion";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--b-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--b-plex-mono" });

export const metadata: Metadata = {
  title: "Logo motion · Henil Gajjar",
  description: "L10, L9 and L12, still and animated.",
  robots: { index: false, follow: false },
};

export default function LogoMotionPage() {
  return (
    <div className={`${plex.variable} ${plexMono.variable}`}>
      <Motion />
    </div>
  );
}
