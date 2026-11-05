"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { INTRO_MS, begin } from "@/components/world/bloom/load";

// The boot's dotted floor colour (components/ui/Boot.tsx): painted before the canvas exists, so the page never jumps.
const FLOOR = "#ebe9e3";

// The world waits for the boot's own animation (components/ui/Boot.tsx: the mark, then the name
// and part line decoding), INTRO_MS: importing and building the world blocks the main thread for
// seconds, and starting it at once made the whole intro stutter (owner). The boot's bar counts
// the steps from here on (world/bloom/load.ts): the intro, the world's code, its build.

// Everything here is client only: WebGL, Rapier's WASM, audio and sessionStorage.
const World = dynamic(
  () =>
    import("@/components/world/World").then((m) => {
      begin("build");
      return m;
    }),
  { ssr: false },
);
const Hud = dynamic(() => import("@/components/ui/Hud"), { ssr: false });
const Intro = dynamic(() => import("@/components/ui/Intro"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50" style={{ background: FLOOR }} />,
});

export default function Experience() {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    // ?skip (dev and headless checks) goes straight in
    const skip = new URLSearchParams(window.location.search).has("skip");
    if (!skip) begin("intro");
    // after the intro, and after the browser has painted its last frame
    const t = setTimeout(
      () =>
        requestAnimationFrame(() => {
          begin("code");
          setLoad(true);
        }),
      skip ? 0 : INTRO_MS,
    );
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
