import type { Metadata } from "next";
import SectorsLab from "./SectorsLab";

export const metadata: Metadata = {
  title: "Sectors lab",
  robots: { index: false },
};

export default async function SectorsLabPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : "all";
  const cam = typeof sp.cam === "string" ? sp.cam : "high";
  const track = sp.track !== "0";
  return <SectorsLab view={view} cam={cam} track={track} />;
}
