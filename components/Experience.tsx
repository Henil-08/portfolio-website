"use client";

import dynamic from "next/dynamic";

// Everything here is client only: WebGL, Rapier's WASM, audio and sessionStorage.
const World = dynamic(() => import("@/components/world/World"), { ssr: false });
const Hud = dynamic(() => import("@/components/ui/Hud"), { ssr: false });
const Intro = dynamic(() => import("@/components/ui/Intro"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50 bg-night" />,
});

export default function Experience() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-night">
      <World />
      <Hud />
      <Intro />
    </main>
  );
}
