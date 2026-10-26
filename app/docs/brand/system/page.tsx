import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import System from "./System";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--b-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--b-plex-mono" });

export const metadata: Metadata = {
  title: "Design system · Henil Gajjar",
  description: "The portfolio in the Datasheet language: identity, motion, micro-interactions and every screen.",
  robots: { index: false, follow: false },
};

export default function SystemPage() {
  return (
    <div className={`${plex.variable} ${plexMono.variable}`}>
      <System />
    </div>
  );
}
