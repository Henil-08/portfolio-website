"use client";

import { useCallback, useEffect, useRef } from "react";
import { story } from "@/content/profile";
import { formatLap, formatSplit, telemetry } from "./telemetry";
import { TOP_SPEED } from "./physics";
import { CHECKPOINTS, SAMPLES, SECTOR_SPLITS } from "./circuit";

export type SectorColor = "purple" | "green" | "amber";
export type SectorResult = { time: number; color: SectorColor } | null;

const sectorClass: Record<SectorColor, string> = {
  purple: "bg-purple text-white",
  green: "bg-green text-ink",
  amber: "bg-amber text-ink",
};

type Props = {
  sectors: SectorResult[];
  lastLap: number | null;
  bestLap: number | null;
  lapCount: number;
  collected: number[];
  onChip: (index: number) => void;
};

/** Runs `fn` every animation frame while mounted. */
function useRafLoop(fn: () => void) {
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      fn();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fn]);
}

/** Timing tower: lap times, sector splits, story checkpoints. */
export function TimingTower({ sectors, lastLap, bestLap, lapCount, collected, onChip }: Props) {
  const lapRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Fast-changing numbers are written straight to the DOM, not React state
  const tick = useCallback(() => {
    if (lapRef.current) lapRef.current.textContent = formatLap(telemetry.lapTime);
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${telemetry.progress})`;
  }, []);
  useRafLoop(tick);

  return (
    <div className="pointer-events-auto w-[15.5rem] overflow-hidden rounded-md border border-line bg-ink/85 font-mono text-xs backdrop-blur-sm sm:w-64">
      <div className="flex items-center justify-between bg-red px-3 py-1.5 font-display text-[11px] font-bold tracking-[0.18em] text-white uppercase">
        <span>Lap {lapCount + 1}</span>
        <span className="opacity-80">Timing</span>
      </div>
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-baseline justify-between">
          <span className="text-mute">Current</span>
          <span ref={lapRef} className="text-lg text-chalk tabular-nums">
            0:00.000
          </span>
        </div>
        <div className="flex justify-between text-mute">
          <span>Last</span>
          <span className="text-chalk tabular-nums">{formatLap(lastLap)}</span>
        </div>
        <div className="flex justify-between text-mute">
          <span>Best</span>
          <span className="text-purple tabular-nums">{formatLap(bestLap)}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 px-3 pb-2">
        {[0, 1, 2].map((i) => {
          const s = sectors[i];
          return (
            <div
              key={i}
              className={`rounded-sm px-1.5 py-1 text-center tabular-nums ${s ? sectorClass[s.color] : "bg-panel text-mute"}`}
            >
              <div className="text-[9px] opacity-80">S{i + 1}</div>
              <div className="text-[11px]">{formatSplit(s?.time)}</div>
            </div>
          );
        })}
      </div>
      {/* lap progress with sector ticks and checkpoint dots */}
      <div className="relative mx-3 mb-2 h-1.5 rounded-full bg-panel">
        <div
          ref={progressRef}
          className="absolute inset-0 origin-left rounded-full bg-chalk/70"
          style={{ transform: "scaleX(0)" }}
        />
        {SECTOR_SPLITS.map((s) => (
          <span key={s} className="absolute top-[-2px] h-2.5 w-px bg-mute" style={{ left: `${(s / SAMPLES) * 100}%` }} />
        ))}
        {CHECKPOINTS.map((c, i) => (
          <span
            key={c}
            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink ${
              collected.includes(i) ? "bg-red" : "bg-line"
            }`}
            style={{ left: `${(c / SAMPLES) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-line px-3 py-2">
        <span className="text-mute">
          Story <span className="text-chalk">{collected.length}/4</span>
        </span>
        <div className="flex gap-1">
          {story.map((ch, i) => {
            const got = collected.includes(i);
            return (
              <button
                key={ch.lap}
                type="button"
                disabled={!got}
                onClick={() => onChip(i)}
                title={got ? `Reopen lap ${ch.lap}: ${ch.place}` : `Lap ${ch.lap} not reached yet`}
                className={`h-6 w-6 rounded-sm text-[11px] font-bold transition-colors ${
                  got ? "cursor-pointer bg-red text-white hover:bg-chalk hover:text-ink" : "bg-panel text-mute"
                }`}
              >
                {ch.lap}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Speed, gear and a rev-style bar, bottom centre. */
export function Speedo({ raised = false }: { raised?: boolean }) {
  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const offRef = useRef<HTMLDivElement>(null);

  const tick = useCallback(() => {
    if (speedRef.current) speedRef.current.textContent = String(Math.round(telemetry.speedKmh));
    if (gearRef.current) gearRef.current.textContent = telemetry.gear;
    if (barRef.current)
      barRef.current.style.transform = `scaleX(${Math.min(1, telemetry.speedKmh / (TOP_SPEED * 3.6))})`;
    if (offRef.current) offRef.current.style.opacity = telemetry.offTrack ? "1" : "0";
  }, []);
  useRafLoop(tick);

  return (
    <div
      className={`pointer-events-none absolute left-1/2 -translate-x-1/2 text-center ${raised ? "bottom-36 sm:bottom-6" : "bottom-5"}`}
    >
      <div
        ref={offRef}
        className="mb-2 font-display text-xs font-bold tracking-[0.2em] text-amber uppercase opacity-0 transition-opacity"
      >
        Off track
      </div>
      <div className="flex items-end gap-3 rounded-md border border-line bg-ink/80 px-4 py-2 backdrop-blur-sm">
        <div className="text-right">
          <span ref={speedRef} className="block font-display text-4xl leading-none font-black tabular-nums">
            0
          </span>
          <span className="font-mono text-[10px] tracking-widest text-mute">KM/H</span>
        </div>
        <div className="border-l border-line pl-3">
          <span ref={gearRef} className="block font-display text-4xl leading-none font-black text-red">
            N
          </span>
          <span className="font-mono text-[10px] tracking-widest text-mute">GEAR</span>
        </div>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-panel">
        <div
          ref={barRef}
          className="h-full origin-left bg-linear-to-r from-green via-amber to-red"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}
