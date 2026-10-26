import type { Metadata } from "next";
import PlacesPage from "./PlacesPage";

export const metadata: Metadata = {
  title: "Places · Henil Gajjar",
  description: "Every interactable place in the world, live: what it does and the sheet it opens.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PlacesPage />;
}
