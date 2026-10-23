import type { Metadata } from "next";
import TimelineLab from "./TimelineLab";

export const metadata: Metadata = {
  title: "Timeline lab",
  robots: { index: false },
};

// /lab/timeline?night=1&cam=follow|far|top&t=2024.5&lane=4&rot=30
// rot defaults to 90, the yaw the world mounts the plaza at (time runs west).
// Without t the fake car drives slowly up and down the time axis.
export default async function TimelineLabPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const num = (k: string) => (typeof sp[k] === "string" && Number.isFinite(Number(sp[k])) ? Number(sp[k]) : null);
  return (
    <TimelineLab
      night={sp.night === "1"}
      cam={typeof sp.cam === "string" ? sp.cam : "follow"}
      t={num("t")}
      lane={num("lane") ?? 4}
      rot={num("rot") ?? 90}
    />
  );
}
