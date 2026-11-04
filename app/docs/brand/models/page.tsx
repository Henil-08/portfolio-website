import type { Metadata } from "next";
import ModelsPage from "./ModelsPage";

export const metadata: Metadata = {
  title: "Models · Henil Gajjar",
  description: "Meshy-made models for the world, in the brand materials, for review.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ModelsPage />;
}
