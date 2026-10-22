import type { Metadata } from "next";
import PropsLab from "./PropsLab";

export const metadata: Metadata = {
  title: "Props lab",
  robots: { index: false },
};

export default async function PropsLabPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : "all";
  const cam = typeof sp.cam === "string" ? sp.cam : "front";
  return <PropsLab view={view} cam={cam} />;
}
