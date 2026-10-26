"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The intro floor colour (world/Reveal.tsx FLOOR): painted before the canvas exists, so the page never jumps.
const FLOOR = "#f3f2ed"; // the boot floor, paper (world/Reveal.tsx)

// How long the boot's own animation runs (components/ui/Boot.tsx: the mark, then the name and
// part line decoding). The world waits for it: importing and building the world blocks the main
// thread for seconds, and starting it at once made the whole intro stutter (owner).
const INTRO_MS = 1800;

// Everything here is client only: WebGL, Rapier's WASM, audio and sessionStorage.
const World = dynamic(() => import("@/components/world/World"), { ssr: false });
const Hud = dynamic(() => import("@/components/ui/Hud"), { ssr: false });
const Intro = dynamic(() => import("@/components/ui/Intro"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50" style={{ background: FLOOR }} />,
});

export default function Experience() {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    // ?skip (dev and headless checks) goes straight in
    const wait = new URLSearchParams(window.location.search).has("skip") ? 0 : INTRO_MS;
    // after the intro, and after the browser has painted its last frame
    const t = setTimeout(() => requestAnimationFrame(() => setLoad(true)), wait);
    return () => clearTimeout(t);
  }, []);
  return (
    <main className="fixed inset-0 overflow-hidden" style={{ background: FLOOR }}>
      {load && <World />}
      {load && <Hud />}
      <Intro />
    </main>
  );
}
