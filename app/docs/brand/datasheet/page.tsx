import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Demo from "./Demo";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--b-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--b-plex-mono" });

export const metadata: Metadata = {
  title: "Datasheet · Henil Gajjar",
  description: "The Datasheet direction, with and without motion.",
  robots: { index: false, follow: false },
};

export default function DatasheetPage() {
  return (
    <div className={`${plex.variable} ${plexMono.variable}`}>
      <Demo />
    </div>
  );
}
