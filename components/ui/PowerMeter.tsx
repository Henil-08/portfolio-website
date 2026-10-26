"use client";

import { useEffect, useRef } from "react";
import type { MeterState } from "@/components/world/powers/meter";

/** What the meter shows this frame; `refused` counts presses that couldn't fire (each one flickers it). */
export type MeterReading = { charge: number; state: MeterState; refused: number };

const METER_CSS = `
.pm-key{background:#111;color:#fff}
.pm[data-state=low] .pm-key{background:#5d5d58}
.pm[data-state=low] .pm-label,.pm[data-state=low] .pm-pct{color:#5d5d58}
.pm[data-state=low] .pm-fill{background:#5d5d58}
`;

/**
 * The power meter, a sticker (docs/BRAND.md, 2026-10-26): "SHIFT · SKYLINE", the charge in
 * percent, and a bar with the fill in ink and an orange head while it can fire. Below 10% it
 * greys out; a press that can't fire flickers it. `read` is polled every animation frame and the
 * DOM is written directly, so nothing re-renders per frame.
 */
export default function PowerMeter({ label, read, className = "" }: { label: string; read: () => MeterReading | null; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = "";
    let refused = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const r = read();
      if (!r || !box.current || !fill.current || !head.current || !pct.current) return;
      if (refused >= 0 && r.refused !== refused)
        box.current.animate(
          [{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }].map((k) => ({ ...k, easing: "steps(1, end)" })),
          { duration: 300 },
        );
      refused = r.refused;
      const c = r.charge;
      const key = `${r.state}${c.toFixed(3)}`;
      if (key === last) return;
      last = key;
      box.current.dataset.state = r.state;
      fill.current.style.width = `${c * 100}%`;
      // the orange head: the last 10% of the fill, only while it can fire
      const hw = Math.min(c, 0.12);
      head.current.style.left = `${(c - hw) * 100}%`;
      head.current.style.width = `${hw * 100}%`;
      head.current.style.visibility = r.state === "ready" ? "visible" : "hidden";
      pct.current.textContent = `${Math.floor(c * 100)}%`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [read]);

  return (
    <div ref={box} data-state="busy" className={`pm w-[248px] border-2 border-[#111] bg-white shadow-[3px_3px_0_#111] ${className}`}>
      <style>{METER_CSS}</style>
      <div className="font-mono flex items-center text-[12px]">
        <span className="pm-key px-2 py-1">SHIFT</span>
        <span className="pm-label px-2 py-1 font-semibold tracking-[0.06em] text-[#111]">· {label}</span>
        <span ref={pct} className="pm-pct ml-auto px-2 py-1 font-semibold tabular-nums text-[#111]">
          0%
        </span>
      </div>
      <div className="mx-2 mb-2 mt-1 border-2 border-[#111] bg-[#f3f2ed] p-[2px]">
        <div className="relative h-[8px]">
          <div ref={fill} className="pm-fill absolute inset-y-0 left-0 bg-[#111]" style={{ width: 0 }} />
          <div ref={head} className="absolute inset-y-0 bg-[#ff4f00]" style={{ width: 0, visibility: "hidden" }} />
        </div>
      </div>
    </div>
  );
}
