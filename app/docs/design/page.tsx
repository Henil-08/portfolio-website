import type { Metadata } from "next";
import Specimen from "./Specimen";

export const metadata: Metadata = {
  title: "Design language · Henil Gajjar",
  description: "The two candidate UI languages for the drivable portfolio, side by side.",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <Specimen />;
}
