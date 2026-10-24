"use client";

import dynamic from "next/dynamic";

// The intro floor colour (world/Reveal.tsx FLOOR): painted before the canvas exists, so the page never jumps.
const FLOOR = "#171928";

// Everything here is client only: WebGL, Rapier's WASM, audio and sessionStorage.
const World = dynamic(() => import("@/components/world/World"), { ssr: false });
const Hud = dynamic(() => import("@/components/ui/Hud"), { ssr: false });
const Intro = dynamic(() => import("@/components/ui/Intro"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50" style={{ background: FLOOR }} />,
});

export default function Experience() {
  return (
    <main className="fixed inset-0 overflow-hidden" style={{ background: FLOOR }}>
      <World />
      <Hud />
      <Intro />
    </main>
  );
}
