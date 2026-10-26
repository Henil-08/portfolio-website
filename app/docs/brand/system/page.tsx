import type { Metadata } from "next";
import System from "./System";

export const metadata: Metadata = {
  title: "Design system · Henil Gajjar",
  description: "The portfolio in the Datasheet language: identity, motion, micro-interactions and every screen.",
  robots: { index: false, follow: false },
};

export default function SystemPage() {
  return (
    <System />
  );
}
