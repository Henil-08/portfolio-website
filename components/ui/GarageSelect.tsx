"use client";

// The garage select (docs/BRAND.md, approved 2026-10-26; the mock is the "Start sequence" on
// /docs/brand/world): the vehicle on its turntable spans the screen under this chrome (the 3D is
// world/bloom/Opening.tsx, framed in `cell`), the spec column with livery swatches and stats on
// the right, the four cards and Enter along the bottom. ← → choose, drag to turn, Enter drives.
// The choice goes straight to the store (and so to localStorage). On Enter the chrome slides off
// while the canvas aligns onto the bloom, then the build log ticks through the bloom.
import { useEffect, useRef, useState } from "react";
import { Count, Decode, d } from "@/components/brand/motion";
import { setState, useWorld } from "@/components/world/store";
import { LIVERY_NAMES, VEHICLES, liveryOf, vehicleByCode } from "@/components/world/vehicles";
import { unlockAudio } from "@/components/world/sound";
import { leaveGarage, opening, setStage, useOpening } from "@/components/world/bloom/state";

const STATS = ["Speed", "Grip", "Handling"];

const CSS = `
.ss-up,.ss-right,.ss-down,.ss-gone{animation:.45s cubic-bezier(.6,0,.2,1) both}
.ss-up{animation-name:ss-up}.ss-right{animation-name:ss-right}.ss-down{animation-name:ss-down}.ss-gone{animation-name:ss-gone;animation-duration:.2s}
@keyframes ss-up{to{transform:translateY(-100%)}}
@keyframes ss-right{to{transform:translateX(100%)}}
@keyframes ss-down{to{transform:translateY(100%)}}
@keyframes ss-gone{to{opacity:0}}
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
  const liveryName = useWorld((s) => s.livery);
  const v = vehicleByCode[code];
  const livery = liveryOf(code, liveryName);
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

  return (
    <div data-anim="" data-run="" className="dsa-frame pointer-events-none fixed inset-0 z-40 grid grid-rows-[auto_1fr_auto] text-ink">
      {/* ink header bar */}
      <div className={`pointer-events-auto relative z-[25] ${out("ss-up")}`}>
        <div className="dsa-x flex items-center gap-3 bg-ink px-3 py-2 text-white" style={d(150)}>
          <span className="font-mono text-[12px]">
            HG-08 / GARAGE · <span className="text-signal">Select vehicle</span>
          </span>
          <span className="ml-auto hidden items-center gap-2 font-mono text-[11.5px] text-white/60 sm:flex">
            {back && (
              <>
                <span className="border border-white/40 px-1.5">Esc</span> Back
              </>
            )}
            <span className="ml-2 border border-white/40 px-1.5">← →</span> Choose
            <span className="ml-2 border border-white/40 px-1.5">Enter</span> Drive
          </span>
        </div>
      </div>

      <div className="grid min-h-0 grid-cols-1 grid-rows-[1fr_auto] md:grid-cols-[1fr_300px] md:grid-rows-1">
        {/* the 3D cell: the turntable is framed in here; drag to turn */}
        <div
          ref={(el) => {
            opening.cell = el;
          }}
          data-cursor="drag"
          className={`pointer-events-auto relative min-h-0 touch-none border-b-2 border-ink transition-colors duration-200 md:border-b-0 md:border-r-2 ${aligning ? "!border-transparent" : ""}`}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
            opening.drag.held = true;
            e.currentTarget.setPointerCapture(e.pointerId);
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
            {v.code} · Drag to turn
          </span>
        </div>

        {/* spec column: decodes and counts on every switch */}
        <div key={v.code} data-anim="" data-run="" className={`pointer-events-auto relative z-[25] flex flex-col gap-4 bg-white p-4 ${out("ss-right")}`}>
          <div>
            <p className="font-mono text-[12px] text-signal">
              <Decode text={`${v.code} · ${v.kind}`} run delay={40} dur={260} />
            </p>
            <h1 className="mt-1 text-[34px] font-semibold leading-none tracking-tight">
              <Decode text={v.name} run delay={80} dur={360} />
            </h1>
            <p className="dsa-rise mt-2.5 hidden text-[14.5px] leading-relaxed text-graphite sm:block" style={d(180)}>
              {v.line}
            </p>
          </div>
          {/* livery: square swatches, the chosen one framed in ink */}
          <div className="dsa-rise" style={d(220)}>
            <div className="flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.06em]">
              <span>Livery</span>
              <span className="font-mono text-[12px] normal-case tracking-normal text-graphite">{livery.name}</span>
            </div>
            <div role="radiogroup" aria-label="Livery" className="mt-1.5 flex gap-2">
              {v.liveries.map((o, i) => {
                const on = o.name === livery.name;
                return (
                  <button
                    key={o.name}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={o.name}
                    title={o.name}
                    onClick={() => setState({ livery: LIVERY_NAMES[i] })}
                    className={`relative h-8 w-8 border-2 border-ink p-[3px] transition-colors ${on ? "bg-ink" : "bg-white hover:bg-rule"}`}
                  >
                    <span className="relative block h-full w-full overflow-hidden ring-1 ring-ink/25" style={{ background: o.body }}>
                      <span className="absolute bottom-0 right-0 h-1/2 w-1/2" style={{ background: o.accent }} />
                      <span className="absolute bottom-0 left-0 h-[3px] w-1/2" style={{ background: o.trim }} />
                    </span>
                    {on && <span className="absolute -bottom-[7px] left-1/2 h-[3px] w-3 -translate-x-1/2 bg-signal" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-auto hidden space-y-3 sm:block">
            {STATS.map((s, i) => (
              <div key={s}>
                <div className="flex items-baseline justify-between text-[12px] font-semibold uppercase tracking-[0.06em]">
                  <span>{s}</span>
                  <span className="font-mono text-[13px]">
                    <Count value={String(v.stats[i])} run delay={140 + i * 70} dur={420} />
                  </span>
                </div>
                <div className="mt-1 h-[10px] border-2 border-ink bg-paper">
                  <div className="h-full origin-left" style={{ width: `${v.stats[i]}%` }}>
                    <div className="dsa-x h-full bg-ink" style={d(140 + i * 70)} />
                  </div>
                </div>
              </div>
            ))}
            <p className="font-mono text-[11px] text-graphite">Game stats, out of 100</p>
          </div>
        </div>
      </div>

      {/* the four cards and the Enter prompt */}
      <div className={`pointer-events-auto relative z-[25] grid grid-cols-2 border-t-2 border-ink bg-white sm:grid-cols-[repeat(4,1fr)_auto] ${out("ss-down")}`}>
        {VEHICLES.map((o, i) => {
          const on = i === sel;
          return (
            <button
              key={o.code}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={on}
              className={`dsa-wipe group flex items-center gap-3 border-r-2 border-ink px-3 py-2.5 text-left transition-colors ${on ? "bg-ink text-white" : "bg-white hover:bg-ink hover:text-white"}`}
              style={d(380 + i * 90)}
            >
              <svg viewBox="0 0 64 28" className="h-7 w-14 shrink-0" fill="currentColor" aria-hidden>
                {o.icon}
              </svg>
              <span className="min-w-0">
                <span className={`block font-mono text-[11px] ${on ? "text-signal" : "text-graphite group-hover:text-white/60"}`}>
                  {o.code} · {o.kind}
                </span>
                <span className="block truncate text-[15px] font-semibold leading-tight">{o.name}</span>
              </span>
            </button>
          );
        })}
        <div className="col-span-2 flex items-center justify-center gap-3 px-4 py-2.5 sm:col-span-1">
          <button type="button" onClick={go} className="x-btn x-primary dsa-flicker" style={d(800)}>
            Press {key("Enter", "Enter")} to drive <span className="x-arrow">→</span>
          </button>
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
