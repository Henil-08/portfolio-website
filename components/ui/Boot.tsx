"use client";

// The boot (docs/BRAND.md S01): on the paper floor the mark builds, the name and the part line
// decode, and a loading bar follows the real load: the steps and the work counted inside them
// (world/bloom/load.ts; Experience.tsx and world/bloom/Opening.tsx report them). When the world
// is ready (`boot.out`) the block lifts away onto the garage select.
import { useEffect, useRef } from "react";
import { boot } from "@/components/world/bloom/state";
import { heading, loadDone, loadLabel, setBarTick, worldDrawing } from "@/components/world/bloom/load";
import { FLOOR, drawFloor } from "@/components/world/bloom/view";
import { getState } from "@/components/world/store";
import { profile } from "@/content/profile";
import { Mark } from "@/components/brand/mark";
import { Decode, Stage, d } from "@/components/brand/motion";

/** A segment's length at rate 1 (ms); its rate sets the bar's speed. */
const SEG = 10_000;
/** It never moves slower than this while loading (per ms): 0.4% a second. */
const CREEP = 0.004 / 1000;
/**
 * Each segment eases out toward its step's end like an exponential (95% of the way at two thirds
 * of it, the rest ever slower), so with the script busy the bar slows on its own and can't pass a
 * step that hasn't finished. `ease` is the same curve in JS, so the script knows where the bar is.
 */
const CURVE = [0.2, 0.631, 0.45, 0.9135] as const;
const EASE = `cubic-bezier(${CURVE.join(", ")})`;
const ease = (() => {
  const [x1, y1, x2, y2] = CURVE;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - x;
      const dx = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(e) < 1e-6 || Math.abs(dx) < 1e-6) break;
      t = Math.min(1, Math.max(0, t - e / dx));
    }
    return ((ay * t + by) * t + cy) * t;
  };
})();
const slope = (x: number) => {
  const a = Math.max(0, x - 0.002);
  const b = Math.min(1, x + 0.002);
  return (ease(b) - ease(a)) / (b - a);
};

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
    // The bar is an animation of transform, so it keeps moving on the compositor while the main
    // thread is busy building the world (a rAF-driven bar froze, then jumped). Each step of the
    // load (bloom/load.ts) gets one segment that eases from where the bar is to that step's end,
    // so it slows on its own and never passes a step still running, however long the page is
    // busy. Within a segment the script only steers the speed: every frame it gets, it asks where
    // the load is heading (`heading`: the real fraction plus a lead into the step) and sets the
    // rate that eases the bar toward it, never to a stop while work remains. Rate changes are
    // seamless on the compositor, so it never jumps or goes back (retargeting its position did,
    // by 14%). Measured on the compositor's own frames: in the first frame after a long task
    // Chrome's page still holds the time from before it, and touching the animation then pulls
    // the bar back and throws it forward, so after a long gap it is left alone for two frames;
    // and once the world draws, this runs at the end of its frames (`setBarTick`), since a change
    // made before a heavy frame reaches the screen only after it, and slips back by as much.
    const b = bar.current;
    if (!b) return;
    let seg: { a: Animation; k0: number; k1: number } | null = null;
    const at = () => (seg ? seg.k0 + (seg.k1 - seg.k0) * ease(Math.min(1, Number(seg.a.currentTime ?? 0) / SEG)) : 0);
    // the rate that moves the bar at speed v (per ms) from where the segment is now: rate times
    // the curve's slope there, over the segment's length
    const rateFor = (v: number, k0: number, k1: number, x: number) => Math.min(400, (v * SEG) / (Math.max(1e-4, k1 - k0) * Math.max(0.05, slope(x))));
    // a new segment from where the bar is to `k1`, already at its speed: a rate set before the
    // animation has started only takes effect at the page's next frame, so behind a long task it
    // stood still. One animation at a time, and until it starts the bar's own style holds it.
    const segment = (k1: number, v: number) => {
      const k0 = at();
      b.style.transform = `scaleX(${k0.toFixed(4)})`;
      seg?.a.cancel();
      const a = b.animate([{ transform: `scaleX(${k0.toFixed(4)})` }, { transform: `scaleX(${Math.max(k0, k1).toFixed(4)})` }], { duration: SEG, easing: EASE, fill: "forwards" });
      rate = rateFor(v, k0, Math.max(k0, k1), 0);
      a.playbackRate = rate;
      seg = { a, k0, k1: Math.max(k0, k1) };
    };
    let rate = 0;
    let frames = 0;
    let raf = 0;
    let last = performance.now();
    let calm = 0;
    let slow = false;
    let shown = 0;
    let gone = false;
    const log = (...e: unknown[]) => process.env.NODE_ENV !== "production" && ((window as unknown as { __barLog?: unknown[] }).__barLog ??= []).push(e);
    const own = () => {
      raf = requestAnimationFrame(own);
      if (!worldDrawing()) tick();
    };
    const tick = () => {
      if (gone) return;
      const now = performance.now();
      // a long frame after normal ones: left alone for two frames; when every frame is long (a
      // slow machine compiling), it is touched anyway from the third, or it would never change
      const long = now - last > 100;
      if (long && !slow) calm = 2;
      slow = long;
      last = now;
      if (calm > 0) {
        calm--;
        log(Math.round(now), "calm", calm);
        return;
      }
      // the first frames paint the empty bar
      if (++frames > 2) {
        const h = heading();
        const k = at();
        const v = loadDone() ? Math.max((1 - k) / 240, CREEP * 4) : Math.max((h.goal - k) / h.tau, CREEP);
        if (!seg || Math.abs(h.cap - seg.k1) > 1e-4) {
          segment(h.cap, v);
          log(Math.round(now), "segment", +k.toFixed(3), +h.cap.toFixed(3), +rate.toFixed(2));
        } else {
          const want = rateFor(v, seg.k0, seg.k1, Math.min(1, Number(seg.a.currentTime ?? 0) / SEG));
          if (Math.abs(want - rate) > 0.04 * Math.max(want, rate) + 1e-3) {
            rate = want;
            seg.a.updatePlaybackRate(rate);
            log(Math.round(now), "rate", +k.toFixed(3), +rate.toFixed(2));
          }
        }
      }
      const k = at();
      if (label.current) label.current.textContent = loadLabel();
      // the percent is the bar's own position, so it always matches what you see
      shown = Math.max(shown, Math.floor((loadDone() && k > 0.99 ? 1 : k) * 100));
      if (pct.current) pct.current.textContent = `${shown}%`;
      if (boot.out) {
        root.current?.classList.add("is-out");
        gone = true;
        cancelAnimationFrame(raf);
        setBarTick(null);
      }
    };
    setBarTick(tick);
    own();
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      setBarTick(null);
      seg?.a.cancel();
    };
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
                  · <span ref={label} data-boot-label="">{loadLabel()}</span>
                </span>
                <span ref={pct} data-boot-pct="" className="ml-auto px-2 py-1 font-semibold tabular-nums">
                  0%
                </span>
              </div>
              <div className="mx-2 mb-2 mt-1 border-2 border-ink bg-paper p-[2px]">
                <div className="h-[8px]">
                  <span ref={bar} data-boot-bar="" className="relative block h-full origin-left bg-ink will-change-transform" style={{ transform: "scaleX(0)" }}>
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
