"use client";

import { useSyncExternalStore } from "react";
import type { ZoneId } from "./layout";

// Tiny external store so the canvas and the DOM overlay share state
// without re-rendering the whole scene.

export type Phase = "boot" | "intro" | "world";

type State = {
  phase: Phase;
  ready: boolean; // physics and scene mounted
  zone: ZoneId | null; // the card that is open
  near: ZoneId | null; // the place the car is parked at, if any
  found: ZoneId[];
  toast: { id: number; text: string; tone: "red" | "yellow" | "teal" } | null;
  muted: boolean;
  speed: number; // km/h, throttled updates for the HUD
  askOpen: boolean;
  menuOpen: boolean;
  teleport: { id: number; zone: ZoneId } | null;
  scene: { time: "day" | "golden" | "night"; weather: "clear" | "rain" | "snow" };
  shot: { id: number; style: "orbit" | "aerial" | "low" | "chase" } | null;
  spawns: { id: number; thing: "cones" | "footballs" | "tyres" | "confetti"; count: number; at: [number, number] }[];
  picks: { title: string; slugs: string[] } | null;
  autopilot: { on: boolean; gen: number; alive: number; best: number; history: number[] };
  sector: number | null; // 1..4 while on a sector's stretch of track
  sectorFlash: { id: number; n: number; time: number; tone: "purple" | "green" | "yellow" } | null;
};

let state: State = {
  phase: "boot",
  ready: false,
  zone: null,
  near: null,
  found: [],
  toast: null,
  muted: false,
  speed: 0,
  askOpen: false,
  menuOpen: false,
  teleport: null,
  scene: { time: "day", weather: "clear" },
  shot: null,
  spawns: [],
  picks: null,
  autopilot: { on: false, gen: 0, alive: 0, best: 0, history: [] },
  sector: null,
  sectorFlash: null,
};

const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useWorld<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(state)
  );
}

let toastId = 0;
export function toast(text: string, tone: "red" | "yellow" | "teal" = "red") {
  const id = ++toastId;
  setState({ toast: { id, text, tone } });
  setTimeout(() => {
    if (getState().toast?.id === id) setState({ toast: null });
  }, 2600);
}

// The car rolled up to a place. Nothing opens by itself; leaving closes its card.
export function setNear(near: ZoneId | null) {
  setState((s) => ({ near, zone: s.zone && s.zone !== near ? null : s.zone }));
}

export function openZone(zone: ZoneId) {
  setState((s) => ({ zone, found: s.found.includes(zone) ? s.found : [...s.found, zone] }));
}

export function closeZone() {
  setState({ zone: null });
}

let tpId = 0;
export function teleport(zone: ZoneId) {
  setState({ teleport: { id: ++tpId, zone }, menuOpen: false });
}

// Dev and headless-check hook: window.__world.teleport("garage-agents") etc.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __world: object }).__world = { teleport, setState, getState, openZone };
}
