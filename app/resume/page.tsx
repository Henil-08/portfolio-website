import type { Metadata } from "next";
import Resume from "./Resume";

export const metadata: Metadata = {
  title: "Resume · Henil Gajjar",
  description: "The one-page version. No car required.",
};

// The resume as a datasheet (docs/BRAND.md S05). The sheet itself is a client component because
// Stage, Decode and Count animate it in; printing drops to plain ink on white (globals.css .resume).
export default function Page() {
  return <Resume />;
}
