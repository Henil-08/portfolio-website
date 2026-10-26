import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Logos from "./Logos";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--b-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--b-plex-mono" });

export const metadata: Metadata = {
  title: "Logo options · Henil Gajjar",
  description: "Marks for the Datasheet identity.",
  robots: { index: false, follow: false },
};

export default function LogoPage() {
  return (
    <div className={`${plex.variable} ${plexMono.variable}`}>
      <Logos />
    </div>
  );
}
