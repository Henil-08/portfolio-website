import type { Metadata } from "next";
import World from "./World";

export const metadata: Metadata = {
  title: "World proposals · Henil Gajjar",
  description: "The island redesigned in the Datasheet language: palette, models and a diorama, day and night.",
  robots: { index: false, follow: false },
};

export default function WorldPage() {
  return (
    <World />
  );
}
