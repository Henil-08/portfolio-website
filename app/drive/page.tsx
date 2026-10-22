import type { Metadata } from "next";
import DriveClient from "@/components/drive/DriveClient";

export const metadata: Metadata = {
  title: "Drive · Henil Gajjar",
  description:
    "Take a low-poly F1 car round a small circuit. Each gantry is a chapter of my story, and the garage has my projects.",
};

export default function DrivePage() {
  return <DriveClient />;
}
