import type { Metadata } from "next";
import ProjectsLab from "./ProjectsLab";

export const metadata: Metadata = {
  title: "Projects lab",
  robots: { index: false },
};

export default async function ProjectsLabPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : "all";
  const cam = typeof sp.cam === "string" ? sp.cam : "front";
  const active = sp.active === "1";
  return <ProjectsLab view={view} cam={cam} active={active} />;
}
