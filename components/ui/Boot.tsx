"use client";

// The boot (docs/BRAND.md S01): on the paper floor the mark builds, the name and the part line
// decode, and a loading bar runs while the world builds and the shaders warm up (world/bloom/
// Opening.tsx drives `boot`). When the world is ready (`boot.out`) the block lifts away onto the
// garage select.
import { useEffect, useRef } from "react";
import { boot } from "@/components/world/bloom/state";
import { FLOOR, drawFloor } from "@/components/world/bloom/view";
import { getState } from "@/components/world/store";
import { profile } from "@/content/profile";
import { Mark } from "@/components/brand/mark";
import { Decode, Stage, d } from "@/components/brand/motion";

const STAGE = { world: "Loading the island", shaders: "Warming up", ready: "Ready" } as const;

export default function Boot() {
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const floor = useRef<HTMLCanvasElement>(null);

  // The dotted floor as the garage camera will see it (bloom/view.ts), drawn once the bar is
  // moving (a few ms) and again on resize, so the boot hands over to the live garage in place.
  useEffect(() => {
    const c = floor.current;
    if (!c) return;
    const draw = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      const g = c.getContext("2d");
      // phones draw the world without the composer, so without its vignette (World.tsx)
      if (g) drawFloor(g, W, H, dpr, getState().vehicle, !window.matchMedia("(pointer: coarse)").matches);
    };
    let id = requestAnimationFrame(() => (id = requestAnimationFrame(() => (id = requestAnimationFrame(draw)))));
    window.addEventListener("resize", draw);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", draw);
    };
  }, []);

  useEffect(() => {
    // The bar is a CSS transition, so it keeps moving on the compositor while the main thread
    // is busy building the world and compiling shaders (a rAF-driven bar froze, then jumped).
    // It follows the real load in legs: towards 60% while the world downloads and builds,
    // towards 88% once it exists and the shaders compile, then full when it is ready.
    const b = bar.current;
    const leg = (to: number, secs: number, ease = "cubic-bezier(0.25, 0.5, 0.45, 1)") => {
      if (!b) return;
      b.style.transition = `transform ${secs}s ${ease}`;
      b.style.transform = `scaleX(${to})`;
    };
    requestAnimationFrame(() => requestAnimationFrame(() => leg(0.6, 4)));
    let stage = "world";
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const full = boot.out || boot.stage === "ready";
      const now = full ? "ready" : boot.stage;
      if (label.current) label.current.textContent = STAGE[now === "ready" ? "ready" : now === "world" ? "world" : "shaders"];
      // the percent reads the bar's live (transitioning) scale, so it always matches what you see
      if (b && pct.current) {
        const m = getComputedStyle(b).transform;
        const k = m.startsWith("matrix(") ? parseFloat(m.slice(7)) : 0;
        pct.current.textContent = `${Math.floor((full && k > 0.995 ? 1 : k) * 100)}%`;
      }
      if (now !== stage) {
        stage = now;
        if (now === "shaders") leg(0.88, 2.5);
        if (now === "ready") leg(1, 0.35, "cubic-bezier(0.6, 0, 0.2, 1)");
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
    <>
    {/* the bloom's dotted paper floor (world/bloom/Opening.tsx) seen from the garage camera: the
        garage and the build stand on the same floor, so the boot fades into one space (owner, 2026-10-26) */}
    <canvas ref={floor} className="pointer-events-none absolute inset-0 h-full w-full" style={{ background: FLOOR.paper }} aria-hidden />
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
            {/* the same sticker as the power meter (Shift): key chip, label, percent, ink fill with an orange head */}
            <div className="dsa-rise mt-10 w-[min(320px,80vw)] border-2 border-ink bg-white shadow-[3px_3px_0_var(--color-ink)]" style={d(1100)}>
              <div className="flex items-center font-mono text-[12px]">
                <span className="bg-ink px-2 py-1 text-white">BOOT</span>
                <span className="px-2 py-1 font-semibold uppercase tracking-[0.06em]">
                  · <span ref={label}>{STAGE.world}</span>
                </span>
                <span ref={pct} className="ml-auto px-2 py-1 font-semibold tabular-nums">
                  0%
                </span>
              </div>
              <div className="mx-2 mb-2 mt-1 border-2 border-ink bg-paper p-[2px]">
                <div className="h-[8px]">
                  <span ref={bar} className="relative block h-full origin-left bg-ink will-change-transform" style={{ transform: "scaleX(0)" }}>
                    <span className="absolute inset-y-0 right-0 w-[12%] bg-signal" />
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </Stage>
      <span className="absolute bottom-4 left-5 font-mono text-[12px] text-graphite">{profile.coords}</span>
      <span className="absolute bottom-4 right-5 font-mono text-[12px] text-graphite">Rev 2026.10</span>
    </div>
    </>
  );
}
