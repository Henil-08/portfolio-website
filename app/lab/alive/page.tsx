import type { Metadata } from "next";
import AliveLab from "./AliveLab";

export const metadata: Metadata = {
  title: "Alive lab",
  robots: { index: false },
};

export default async function AliveLabPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const night = sp.night === "1";
  const wind = typeof sp.wind === "string" ? Number(sp.wind) : 0.75;
  const cam = typeof sp.cam === "string" ? sp.cam : "near";
  return <AliveLab night={night} wind={Number.isFinite(wind) ? wind : 0.75} cam={cam} debug={sp.debug === "1"} />;
}
