import type { Metadata } from "next";
import BannerPage from "./BannerPage";

export const metadata: Metadata = {
  title: "LinkedIn banner · Henil Gajjar",
  description: "LinkedIn banner options in the Datasheet language, with headline options.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BannerPage />;
}
