"use client";

// The garage select (docs/BRAND.md, approved 2026-10-26; the mock is the "Start sequence" on
// /docs/brand/world): the vehicle on its turntable spans the screen under this chrome (the 3D is
// world/bloom/Opening.tsx, framed in `cell`), the spec column with livery swatches and stats on
// the right, the four cards and Enter along the bottom. ← → choose, drag to turn, Enter drives.
// The choice goes straight to the store (and so to localStorage). On Enter the chrome slides off
// while the canvas aligns onto the bloom, then the build log ticks through the bloom.
import { useEffect, useRef, useState } from "react";
import { Decode, d } from "@/components/brand/motion";
import { setState, useWorld } from "@/components/world/store";
import { VEHICLES, vehicleByCode } from "@/components/world/vehicles";
import { LiverySwatches, StatBars, VehicleCard } from "./garageParts";
import { unlockAudio } from "@/components/world/sound";
import { leaveGarage, opening, setStage, useOpening } from "@/components/world/bloom/state";
import { BOX } from "@/components/world/bloom/view";


const CSS = `
.ss-up,.ss-right,.ss-down,.ss-gone{animation:.45s cubic-bezier(.6,0,.2,1) both}
.ss-up{animation-name:ss-up}.ss-right{animation-name:ss-right}.ss-down{animation-name:ss-down}.ss-gone{animation-name:ss-gone;animation-duration:.2s}
@keyframes ss-up{to{transform:translateY(-100%)}}
@keyframes ss-right{to{transform:translateX(100%)}}
@keyframes ss-down{to{transform:translateY(100%)}}
@keyframes ss-gone{to{opacity:0}}
.ss-shadow{animation:ss-shadow .3s ease-out .5s both}
@keyframes ss-shadow{from{box-shadow:4px 4px 0 transparent}to{box-shadow:4px 4px 0 var(--color-ink)}}
.ss-fadeout{animation:ss-fade .6s ease-in var(--d,0ms) both}
@keyframes ss-fade{to{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){.ss-up,.ss-right,.ss-down,.ss-gone,.ss-fadeout{animation-duration:1ms}}
`;

export default function GarageSelect() {
  const stage = useOpening((s) => s.stage);
  const run = useOpening((s) => s.run);
  if (stage === "select" || stage === "align")
    return (
      <>
        <style>{CSS}</style>
        <Select key={run} aligning={stage === "align"} back={run > 1} />
      </>
    );
  if (stage === "build")
    return (
      <>
        <style>{CSS}</style>
        <BuildLog />
      </>
    );
  return null;
}

function Select({ aligning, back }: { aligning: boolean; back: boolean }) {
  const code = useWorld((s) => s.vehicle);
  const v = vehicleByCode[code];
  const sel = VEHICLES.findIndex((o) => o.code === code);
  const [down, setDown] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);

  const pick = (i: number) => setState({ vehicle: VEHICLES[(i + VEHICLES.length) % VEHICLES.length].code });
  const go = () => {
    if (opening.get().stage !== "select") return;
    unlockAudio();
    setStage("align");
  };

  // keys: ← → choose, Enter drives, Esc goes back to driving when the garage was opened from the world
  const live = useRef({ sel, go, pick });
  useEffect(() => {
    live.current = { sel, go, pick };
  });
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (opening.get().stage !== "select") return;
      const k = e.code || e.key;
      const h = live.current;
      if (k === "ArrowRight" || k === "ArrowLeft") {
        e.preventDefault();
        h.pick(h.sel + (k === "ArrowRight" ? 1 : -1));
      } else if (k === "Enter" || k === "NumpadEnter") {
        e.preventDefault();
        h.go();
      } else if (k === "Escape") leaveGarage();
      else return;
      setDown(k === "NumpadEnter" ? "Enter" : k);
    };
    const onUp = () => setDown(null);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);
  useEffect(() => () => void (opening.cell = null), []);

  const key = (k: string, label: string) => <kbd className={`x-key text-ink ${down === k ? "is-down" : ""}`}>{label}</kbd>;
  const out = (c: string) => (aligning ? c : "");

  // the box (bloom/view.ts BOX): at most 1100 x 640 and centred, the floor all round it; stacked
  // inside a 12 px margin below 768 px. The rows are fixed so the boot can draw the cell's floor.
  const W = BOX.wide;
  const N = BOX.narrow;
  const frame = "absolute inset-3 md:inset-auto md:left-1/2 md:top-1/2 md:h-[min(640px,calc(100%-48px))] md:w-[min(1100px,calc(100%-48px))] md:-translate-x-1/2 md:-translate-y-1/2";
  return (
    <div data-anim="" data-run="" className="pointer-events-none fixed inset-0 z-40 text-ink">
      {/* the sticker shadow sits outside the box only (box-shadow), so the cell stays a clear window */}
      <div className={`${frame} transition-shadow duration-300 ${aligning ? "" : "ss-shadow"}`}>
      <div
        className={`dsa-frame relative grid h-full w-full grid-rows-[var(--nrows)] overflow-hidden border-2 bg-transparent transition-colors duration-300 md:grid-cols-[1fr_var(--side)] md:grid-rows-[var(--head)_1fr_var(--foot)] ${aligning ? "border-transparent" : "border-ink"}`}
        style={{ "--side": `${W.side}px`, "--head": `${W.header}px`, "--foot": `${W.foot}px`, "--nrows": `${N.header}px 1fr ${N.spec}px ${N.cards}px ${N.drive}px` } as React.CSSProperties}
      >
        {/* ink header bar */}
        <div className={`pointer-events-auto relative z-[25] min-w-0 md:col-span-2 ${out("ss-up")}`}>
          <div className="dsa-x flex h-full items-center gap-3 bg-ink px-3 text-white" style={d(150)}>
            <span className="truncate font-mono text-[12px]">
              HG-08 / GARAGE · <span className="text-signal">Select vehicle</span>
            </span>
            <span className="ml-auto hidden items-center gap-2 font-mono text-[11.5px] text-white/60 md:flex">
              {back && (
                <>
                  <span className="border border-white/40 px-1.5">Esc</span> Back
                </>
              )}
              <span className="ml-2 border border-white/40 px-1.5">← →</span> Choose
              <span className="ml-2 border border-white/40 px-1.5">Enter</span> Drive
            </span>
            {back && (
              <button type="button" onClick={leaveGarage} className="ml-auto font-mono text-[12px] text-white/70 md:hidden">
                Back ✕
              </button>
            )}
          </div>
        </div>

        {/* the 3D cell: the turntable is framed in here; drag (or swipe) to turn */}
        <div
          ref={(el) => {
            opening.cell = el;
          }}
          data-cursor="drag"
          className={`pointer-events-auto relative min-h-0 touch-none border-b-2 border-ink transition-colors duration-200 md:border-b-0 md:border-r-2 ${aligning ? "!border-transparent" : ""}`}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
            opening.drag.held = true;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
          }}
          onPointerMove={(e) => {
            const g = drag.current;
            if (!g || g.id !== e.pointerId) return;
            opening.drag.yaw += (e.clientX - g.x) * 0.012;
            opening.drag.el += (e.clientY - g.y) * 0.006;
            g.x = e.clientX;
            g.y = e.clientY;
          }}
          onPointerUp={() => {
            drag.current = null;
            opening.drag.held = false;
          }}
          onPointerCancel={() => {
            drag.current = null;
            opening.drag.held = false;
          }}
        >
          <span className={`pointer-events-none absolute left-3 top-3 z-[25] bg-white px-1.5 py-0.5 font-mono text-[11.5px] shadow-[3px_3px_0_var(--color-ink)] ring-2 ring-ink ${out("ss-gone")}`}>
            {v.code} · <span className="pointer-coarse:hidden">Drag</span>
            <span className="hidden pointer-coarse:inline">Swipe</span> to turn
          </span>
        </div>

        {/* spec column: decodes and counts on every switch; a compact row on phones */}
        <div key={v.code} data-anim="" data-run="" className={`pointer-events-auto relative z-[25] flex min-h-0 gap-4 overflow-hidden bg-white p-3 md:flex-col md:p-4 ${out("ss-right")}`}>
          <div className="min-w-0 flex-1 md:flex-none">
            <p className="font-mono text-[12px] text-signal">
              <Decode text={`${v.code} · ${v.kind}`} run delay={40} dur={260} />
            </p>
            <h1 className="mt-1 truncate text-[26px] font-semibold leading-none tracking-tight md:text-[34px]">
              <Decode text={v.name} run delay={80} dur={360} />
            </h1>
            <p className="dsa-rise mt-2.5 hidden text-[14.5px] leading-relaxed text-graphite md:block" style={d(180)}>
              {v.line}
            </p>
          </div>
          {/* livery: square swatches, the chosen one framed in ink */}
          <div className="dsa-rise shrink-0" style={d(220)}>
            <LiverySwatches v={v} />
          </div>
          <div className="mt-auto hidden space-y-3 md:block">
            <StatBars v={v} />
            <p className="font-mono text-[11px] text-graphite">Game stats, out of 100</p>
          </div>
        </div>

        {/* the four cards (two by two on phones), under the cell */}
        <div className={`pointer-events-auto relative z-[25] grid min-h-0 grid-cols-2 grid-rows-2 border-t-2 border-ink bg-white md:grid-cols-4 md:grid-rows-1 ${out("ss-down")}`}>
          {VEHICLES.map((o, i) => (
            <VehicleCard key={o.code} v={o} on={i === sel} onClick={() => pick(i)} className="dsa-wipe max-md:odd:border-r-2 max-md:[&:nth-child(-n+2)]:border-b-2 md:border-r-2" style={d(380 + i * 90)} />
          ))}
        </div>
        {/* the drive prompt: exactly the spec column's width, under it */}
        <div className={`pointer-events-auto relative z-[25] flex min-h-0 items-center justify-center border-t-2 border-ink bg-white px-3 ${out("ss-down")}`}>
          <button type="button" onClick={go} className="x-btn x-primary dsa-flicker max-md:w-full max-md:justify-center" style={d(800)}>
            <span className="pointer-coarse:hidden">Press {key("Enter", "Enter")} to drive</span>
            <span className="hidden pointer-coarse:inline">Drive</span> <span className="x-arrow">→</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

/** Over the bloom: what arrives when, ticking in with it, then gone as the camera lands. */
function BuildLog() {
  const code = useWorld((s) => s.vehicle);
  const rows = useOpening((s) => s.log);
  const done = rows.length ? rows[rows.length - 1][1] : 4500;
  return (
    <div data-anim="" data-run="" className="pointer-events-none fixed inset-0 z-40 text-ink">
      <div className="ss-fadeout absolute left-3 top-3 sm:left-5 sm:top-5" style={d(done + 250)}>
        <div className="dsa-frame w-[210px] border-2 border-ink bg-white">
          <div className="bg-ink px-2 py-1 font-mono text-[11.5px] text-white">
            HG-08 / WORLD · <span className="text-signal">{code}</span>
          </div>
          <ol className="px-2 py-1.5">
            {rows.map(([s, ms], i) => (
              <li key={s} className="dsa-wipe flex justify-between font-mono text-[11.5px] leading-[1.7]" style={d(ms)}>
                <span>
                  <span className="text-signal">{String(i + 1).padStart(2, "0")}</span> {s}
                </span>
                <span className="text-graphite">{(ms / 1000).toFixed(2)}s</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="ss-fadeout absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap font-mono text-[13px]" style={d(done - 600)}>
        Press <kbd className="x-key is-down">Enter</kbd> to drive
      </p>
    </div>
  );
}
