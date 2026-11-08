"use client";

// Quality tiers (docs/research/performance.md). High is the approved look, untouched; Balanced
// and Low trade the costliest pieces for frame time on weaker machines. Auto picks a start tier
// from the device and then follows the measured frame time (World.tsx `QualityGovernor`):
// down after ~3 s under 50 fps, up again only after ~10 s at the display's refresh rate, and
// after a second bounce it stays down for the session, so it never flickers between tiers.
// Settings (components/ui/Hud.tsx) can pin a tier; the choice lives in this browser.
import { useSyncExternalStore } from "react";

export type Tier = "high" | "balanced" | "low";
export type QualityMode = "auto" | Tier;
export const TIER_ORDER: Tier[] = ["low", "balanced", "high"];

/**
 * What each tier changes. `dpr` caps the pixel ratio; `ao` keeps the ambient occlusion pass
 * (the costliest post pass); `grass` is the share of blades drawn (Grass.tsx draws a prefix of
 * an evenly spread order, so a lower share thins the lawn evenly, never in stripes).
 */
export const TIERS: Record<Tier, { dpr: number; ao: boolean; grass: number }> = {
  high: { dpr: 1.75, ao: true, grass: 1 },
  balanced: { dpr: 1.5, ao: true, grass: 0.5 },
  low: { dpr: 1.25, ao: false, grass: 0.25 },
};

const KEY = "hg-quality";
const MODES: QualityMode[] = ["auto", "high", "balanced", "low"];

/** Phones and tablets: the light version from the start (no post, a quarter of the grass). */
export const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

function readMode(): QualityMode {
  if (typeof window === "undefined") return "auto";
  const q = new URLSearchParams(window.location.search).get("quality") as QualityMode | null;
  if (q && MODES.includes(q)) return q;
  try {
    const v = window.localStorage.getItem(KEY) as QualityMode | null;
    if (v && MODES.includes(v)) return v;
  } catch {}
  return "auto";
}

type State = { mode: QualityMode; tier: Tier; /** what Auto chose (shown in Settings) */ auto: Tier; /** why Auto last moved */ reason: string };

const start: Tier = COARSE ? "low" : "high";
const mode0 = readMode();
let state: State = { mode: mode0, tier: mode0 === "auto" ? start : mode0, auto: start, reason: "device" };
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  state.tier = state.mode === "auto" ? state.auto : state.mode;
  listeners.forEach((l) => l());
}

export const quality = {
  get: () => state,
  /** Settings: pin a tier, or hand it back to Auto. */
  setMode(mode: QualityMode) {
    try {
      window.localStorage.setItem(KEY, mode);
    } catch {}
    set({ mode });
  },
  /** The governor's move. */
  setAuto(auto: Tier, reason: string) {
    if (auto !== state.auto) set({ auto, reason });
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useQuality<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    quality.subscribe,
    () => select(state),
    () => select(state),
  );
}

/**
 * Auto's bookkeeping, fed one frame time at a time. Windows of 90 frames; the median of each
 * (one hitch never moves a tier). Down: two windows in a row slower than 20.5 ms. Up: six windows
 * in a row at the display's own refresh (it had room to spare), 20 s after the last step down, at
 * most to the tier the device started on, and never again after the second bounce.
 */
export const governor = {
  frames: [] as number[],
  slow: 0,
  fast: 0,
  /** the display's frame interval, the fastest window seen (ms) */
  vsync: 1000 / 60,
  lastDown: -1e9,
  settleUntil: 0,
  bounces: 0,
  wentUp: false,
  ceiling: start,
  /** A software renderer (no GPU): Low at once, and it stays there. */
  software(renderer: string) {
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) {
      this.ceiling = "low";
      quality.setAuto("low", "software renderer");
    }
  },
  /** One frame (ms, real time). `now` is performance.now(). */
  push(dt: number, now: number) {
    if (dt > 250 || now < this.settleUntil) return; // a stall (tab away, a compile), or still settling
    this.frames.push(dt);
    if (this.frames.length < 90) return;
    const sorted = this.frames.sort((a, b) => a - b);
    const median = sorted[45];
    this.vsync = Math.max(4, Math.min(this.vsync, sorted[9]));
    this.frames.length = 0;
    const i = TIER_ORDER.indexOf(state.auto);
    if (median > 20.5) {
      this.fast = 0;
      if (++this.slow >= 2 && i > 0) this.move(TIER_ORDER[i - 1], now, `median ${median.toFixed(1)} ms`);
    } else if (median <= this.vsync * 1.08 + 0.5) {
      this.slow = 0;
      const up = TIER_ORDER[i + 1];
      if (up && TIER_ORDER.indexOf(up) <= TIER_ORDER.indexOf(this.ceiling) && this.bounces < 2 && now - this.lastDown > 20000 && ++this.fast >= 6)
        this.move(up, now, `median ${median.toFixed(1)} ms at ${(1000 / this.vsync).toFixed(0)} Hz`);
    } else {
      this.slow = 0;
      this.fast = 0;
    }
  },
  move(to: Tier, now: number, why: string) {
    const down = TIER_ORDER.indexOf(to) < TIER_ORDER.indexOf(state.auto);
    if (down) {
      if (this.wentUp) this.bounces++;
      this.lastDown = now;
    } else this.wentUp = true;
    this.slow = this.fast = 0;
    this.frames.length = 0;
    this.settleUntil = now + 2500; // the switch itself (a resize, a pass) costs a frame or two
    quality.setAuto(to, why);
  },
};
