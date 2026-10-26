"use client";

// The boot (docs/BRAND.md S01): on the paper floor the mark builds, the name and the part line
// decode, and a loading bar runs while the world builds and the shaders warm up (world/
// Reveal.tsx `boot`). When the world is ready (`boot.out`) the block lifts away
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
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // The bar is a CSS transition, so it keeps moving on the compositor while the main thread
    // is busy building the world and compiling shaders (a rAF-driven bar froze there and then
    // jumped to full). It eases towards 90% over a typical load and finishes once ready.
    const b = bar.current;
    if (b) {
      b.style.transition = "transform 9s cubic-bezier(0.25, 0.45, 0.45, 1)";
      requestAnimationFrame(() => requestAnimationFrame(() => (b.style.transform = "scaleX(0.9)")));
    }
    let raf = 0;
    let done = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (label.current) label.current.textContent = boot.out || boot.lit >= 1 ? STAGE.ready : boot.stage === "world" ? STAGE.world : STAGE.shaders;
      if ((boot.out || boot.lit >= 1) && !done && b) {
        done = true;
        b.style.transition = "transform 0.35s cubic-bezier(0.6, 0, 0.2, 1)";
        b.style.transform = "scaleX(1)";
      }
      if (boot.out) {
        root.current?.classList.add("is-out");
        cancelAnimationFrame(raf);
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
              <p className="mb-1.5 font-mono text-[12px]">
                <span ref={label}>{STAGE.world}</span>
              </p>
              <div className="h-[6px] border border-ink">
                <span ref={bar} className="block h-full origin-left bg-ink will-change-transform" style={{ transform: "scaleX(0)" }} />
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
