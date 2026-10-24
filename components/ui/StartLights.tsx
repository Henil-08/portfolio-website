"use client";

// The boot: F1 start lights over the ink floor, in the HUD's pit wall language
// (docs/DESIGN.md). Five pods on a gantry; each pod's pair of red lights comes on as
// the world gets ready (world/Reveal.tsx `boot.lit`, the real loading progress: the
// world, then the shader warm-up), then all five go out together and the world opens
// in its circle. Under the gantry, a timing-screen line says what is loading.
import { useEffect, useRef } from "react";
import { boot } from "@/components/world/Reveal";

const PODS = 5;
const STAGE = { world: "Building the island", shaders: "Warming up", ready: "Lights" } as const;

export default function StartLights() {
  const root = useRef<HTMLDivElement>(null);
  const pods = useRef<(HTMLDivElement | null)[]>([]);
  const label = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let shown = -1;
    let out = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const n = boot.out ? 0 : Math.min(PODS, Math.floor(boot.lit * PODS + 1e-3));
      if (n !== shown) {
        shown = n;
        pods.current.forEach((p, i) => p?.classList.toggle("is-on", i < n));
      }
      if (label.current) label.current.textContent = boot.out ? "Lights out" : STAGE[boot.stage];
      if (pct.current) pct.current.textContent = `${Math.round(boot.lit * 100)}`.padStart(3, " ") + "%";
      if (boot.out && !out) {
        out = true;
        root.current?.classList.add("is-out");
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={root} className="start-lights pointer-events-none absolute inset-x-0 top-[16svh] flex flex-col items-center sm:top-[14svh]" aria-live="polite">
      {/* the gantry: a beam with five pods hanging off it */}
      <div className="hud-panel px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4">
        <div className="mb-2.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-cream/55">
          <span>HG Racing</span>
          <span className="text-red">Start</span>
        </div>
        <div className="flex gap-2 sm:gap-2.5">
          {Array.from({ length: PODS }).map((_, i) => (
            <div key={i} ref={(el) => void (pods.current[i] = el)} className="start-pod flex flex-col gap-2 bg-[#11121c] p-2 sm:p-2.5">
              <span className="start-lamp" />
              <span className="start-lamp" />
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-cream/70">
        <span ref={label}>{STAGE.world}</span>
        <span className="h-px w-8 bg-cream/25" />
        <span ref={pct} className="tabular-nums text-cream">
          {"  0%"}
        </span>
      </p>
    </div>
  );
}
