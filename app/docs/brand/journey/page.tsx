import type { Metadata } from "next";
import JourneyPage from "./JourneyPage";

export const metadata: Metadata = {
  title: "Journey review · Henil Gajjar",
  description: "Three redesigns of the career journey in the world, next to the current terrace, each drivable at its real spot.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <JourneyPage />;
}
