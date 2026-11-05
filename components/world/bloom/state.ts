// The opening's own little store, shared by the canvas (bloom/Opening.tsx) and the DOM
// (components/ui/Intro.tsx, Boot.tsx, GarageSelect.tsx):
//
//   boot -> select (garage) -> align (0.9 s, Enter) -> build (the Bloom) -> done (driving)
//
// It runs once, from the boot. The world store's `phase` stays "boot" until the build lands,
// then turns "world". In the world the garage is a quick picker over the running game
// (`toggleGarage`, components/ui/garageParts.tsx) and a change swaps the vehicle in place
// (bloom/swap.tsx).
import { useSyncExternalStore } from "react";
import { getState, setState } from "../store";

export type Stage = "boot" | "select" | "align" | "build" | "done";

/** Enter to build (s): the chrome slides off, the table turns, the camera glides onto the bloom's first frame. */
export const ALIGN = 0.9;

type OpeningState = {
  stage: Stage;
  /** the build log rows [label, ms], once the bloom is planned */
  log: [string, number][];
};

let state: OpeningState = { stage: "boot", log: [] };
const listeners = new Set<() => void>();

export const opening = {
  get: () => state,
  set(patch: Partial<OpeningState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  /** when the current stage began (performance.now() ms) */
  t0: 0,
  /** the 3D cell the select view frames the vehicle in (GarageSelect.tsx) */
  cell: null as HTMLElement | null,
  /** drag to turn: radians of table yaw and camera elevation to add, consumed by the scene */
  drag: { yaw: 0, el: 0, held: false },
};

export function setStage(stage: Stage) {
  opening.t0 = performance.now();
  opening.set({ stage });
}

export function useOpening<T>(select: (s: OpeningState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(state),
    () => select(state),
  );
}

/**
 * The boot screen (components/ui/Boot.tsx) reads this: `stage` what is loading, `out` once the
 * world is built and warmed and the garage can open.
 */
export const boot = { stage: "world" as "world" | "shaders" | "ready", out: false };

/** ?skip (dev and headless checks) goes straight to driving. */
export const skipping = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("skip");

/**
 * The garage is a plain studio (owner, 2026-10-26): fixed light like the proposal's turntable,
 * paper sky and fog, no sun arc, night or weather. `k` is 1 in the boot and the garage and eases
 * to 0 through the align and the bloom's first seconds (Opening.tsx), when the world's own light
 * comes in (Effects.tsx `sceneParams`, `DayNight`; Rig.tsx `Sun`).
 */
export const studio = { k: skipping() ? 0 : 1 };
/** How long the world's light takes to come in, from Enter (s). */
export const STUDIO_OUT = ALIGN + 1.6;

declare global {
  interface Window {
    /** Dev only: freeze the bloom at this many seconds (for stills). */
    __buildT?: number;
    /** Dev only: freeze the garage swap at this many seconds (for stills). */
    __swapT?: number;
    /** Dev only: freeze the Enter alignment at this many seconds (for stills). */
    __alignT?: number;
  }
}

/** Seconds since the stage began, or the dev freeze for it. */
export function stageTime(freeze: number | undefined) {
  if (process.env.NODE_ENV !== "production" && typeof freeze === "number") return freeze;
  return (performance.now() - opening.t0) / 1000;
}

/**
 * The garage in the world (G, the HUD's Garage tab, Settings): a quick picker over the running
 * game, never the boot's garage again (owner, 2026-11-05). Opening it closes the other sheets.
 */
export function toggleGarage(open = !getState().garageOpen) {
  if (state.stage !== "done") return;
  setState(open ? { garageOpen: true, zone: null, menuOpen: false, settingsOpen: false, controlsOpen: false, askOpen: false } : { garageOpen: false });
}
