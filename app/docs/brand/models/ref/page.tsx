import type { Metadata } from "next";
import RefView from "./RefView";

export const metadata: Metadata = { title: "Model reference", robots: { index: false, follow: false } };

export default function Page() {
  return <RefView />;
}
