import type { Metadata } from "next";
import { IBM_Plex_Sans_Condensed, IBM_Plex_Serif } from "next/font/google";
import BannerPage from "./BannerPage";

// Two extra Plex cuts, only for trying the banner headline in other faces.
const cond = IBM_Plex_Sans_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-plex-cond" });
const serif = IBM_Plex_Serif({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-plex-serif" });

export const metadata: Metadata = {
  title: "LinkedIn banner · Henil Gajjar",
  description: "LinkedIn banner options in the Datasheet language, with headline options.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className={`${cond.variable} ${serif.variable}`}>
      <BannerPage />
    </div>
  );
}
