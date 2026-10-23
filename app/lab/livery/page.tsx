import type { Metadata } from "next";
import LiveryLab from "./LiveryLab";

export const metadata: Metadata = { title: "Livery lab", robots: { index: false } };

export default function LiveryLabPage() {
  return <LiveryLab />;
}
