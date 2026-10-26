import type { Metadata } from "next";
import HeroLab from "./HeroLab";

export const metadata: Metadata = { title: "Hero lab", robots: { index: false } };

export default async function HeroLabPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return <HeroLab view={one("view") ?? "avatar"} angle={one("angle") ?? "front"} wave={one("wave") === "1"} dist={Number(one("dist") ?? 1) || 1} />;
}
