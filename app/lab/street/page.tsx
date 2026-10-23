import type { Metadata } from "next";
import StreetLab from "./StreetLab";

export const metadata: Metadata = {
  title: "Street lab",
  robots: { index: false },
};

export default async function StreetLabPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const cam = typeof sp.cam === "string" ? sp.cam : "high";
  const t = typeof sp.t === "string" ? Number(sp.t) : 0.1;
  const night = sp.night === "1" || cam === "night";
  const guides = sp.guides !== "0";
  const full = sp.full === "1";
  return <StreetLab cam={cam === "night" ? "overview" : cam} t={Number.isFinite(t) ? t : 0.1} night={night} guides={guides} full={full} shadows={sp.shadows !== "0"} />;
}
