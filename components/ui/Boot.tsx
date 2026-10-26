"use client";

// The boot (docs/BRAND.md S01): on the paper floor the mark builds, the name and the part line
// decode, and a loading line counts the real progress (world/Reveal.tsx `boot.lit`: the
// world, then the shader warm-up). When the world is ready (`boot.out`) the block lifts away
// and the world opens in its circle round the car.
import { useEffect, useRef } from "react";
import { boot } from "@/components/world/Reveal";
import { profile } from "@/content/profile";
import { Mark } from "@/components/brand/mark";
import { Decode, Stage, d } from "@/components/brand/motion";

const STAGE = { world: "Loading the island", shaders: "Warming up", ready: "Ready" } as const;

export default function Boot() {
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let out = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // "Ready" only once the bar is full; the stage can finish before the bar catches up
      if (label.current) label.current.textContent = boot.out || boot.lit >= 1 ? STAGE.ready : boot.stage === "world" ? STAGE.world : STAGE.shaders;
      if (pct.current) pct.current.textContent = `${Math.round(boot.lit * 100)}%`;
      if (bar.current) bar.current.style.transform = `scaleX(${boot.lit})`;
      if (boot.out && !out) {
        out = true;
        root.current?.classList.add("is-out");
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={root} className="boot pointer-events-none absolute inset-0" aria-live="polite">
      <Stage motion className="absolute inset-0 flex flex-col items-center justify-center px-6 text-ink">
        {(run) => (
          <>
            <Mark size={112} motion />
            <p className="mt-7 text-[32px] font-semibold leading-none tracking-tight sm:text-[40px]">
              <Decode text={profile.name} run={run} delay={750} dur={500} />
            </p>
            <p className="mt-3 text-center font-mono text-[12px] text-graphite sm:text-[13px]">
              <Decode text={`HG-08 · ${profile.role} · ${profile.location}`} run={run} delay={1000} dur={600} />
            </p>
            <div className="dsa-rise mt-10 w-[min(320px,80vw)]" style={d(1100)}>
              <div className="mb-1.5 flex justify-between font-mono text-[12px]">
                <span ref={label}>{STAGE.world}</span>
                <span ref={pct} className="tabular-nums">
                  0%
                </span>
              </div>
              <div className="h-[6px] border border-ink">
                <span ref={bar} className="block h-full origin-left bg-ink transition-transform duration-200" style={{ transform: "scaleX(0)" }} />
              </div>
            </div>
          </>
        )}
      </Stage>
      <span className="absolute bottom-4 left-5 font-mono text-[12px] text-graphite">{profile.coords}</span>
      <span className="absolute bottom-4 right-5 font-mono text-[12px] text-graphite">Rev 2026.10</span>
    </div>
  );
}
