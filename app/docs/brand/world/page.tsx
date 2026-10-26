import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import World from "./World";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--b-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--b-plex-mono" });

export const metadata: Metadata = {
  title: "World proposals · Henil Gajjar",
  description: "The island redesigned in the Datasheet language: palette, models and a diorama, day and night.",
  robots: { index: false, follow: false },
};

export default function WorldPage() {
  return (
    <div className={`${plex.variable} ${plexMono.variable}`}>
      <World />
    </div>
  );
}
