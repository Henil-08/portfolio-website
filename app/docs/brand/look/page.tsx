import type { Metadata } from "next";
import LookPage from "./LookPage";

export const metadata: Metadata = {
  title: "Look review · Henil Gajjar",
  description: "The rendering polish pass (?look=next) next to the current look, at fixed poses, day, dusk, night and rain.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <LookPage />;
}
