"use client";

import { DEFAULT_LIVERY, DEFAULT_VEHICLE, LIVERY_NAMES, VEHICLE_CODES, type LiveryName, type VehicleCode } from "./vehicles/liveries";
import { useSyncExternalStore } from "react";
import type { ZoneId } from "./layout";

// Tiny external store so the canvas and the DOM overlay share state
// without re-rendering the whole scene.

export type Phase = "boot" | "world";

type State = {
  phase: Phase;
  ready: boolean; // physics and scene mounted
  revealed: boolean; // the opening has landed on the chase camera (bloom/Opening.tsx)
  zone: ZoneId | null; // the card that is open
  garageSel: number; // the project on show in an open garage (garageShots.ts)
  near: ZoneId | null; // the place the car is parked at, if any
  nearLink: string | null; // the contact medallion the car is next to (social/index.tsx LINKS key)
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
  fitOpen: boolean;
  controlsOpen: boolean;
  settingsOpen: boolean;
  voice: boolean; // race engineer speaks out loud
  vehicle: VehicleCode; // what you drive (vehicles/index.tsx VEHICLES), picked in the garage and remembered
  livery: LiveryName; // its paint, the same five names on every vehicle, remembered
  hallucinating: boolean;
  achievements: string[];
  radioMsg: { id: number; text: string } | null; // transient team-radio transcript
  lap: { role: string; route: ZoneId[]; i: number } | null;
  autopilot: { on: boolean; gen: number; alive: number; best: number; history: number[] };
  sector: number | null; // 1..4 while on a sector's stretch of track
  sectorFlash: { id: number; n: number; time: number; tone: "purple" | "green" | "yellow" } | null;
};

let state: State = {
  phase: "boot",
  ready: false,
  revealed: false,
  zone: null,
  garageSel: 0,
  near: null,
  nearLink: null,
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
  fitOpen: false,
  controlsOpen: false,
  settingsOpen: false,
  voice: true,
  vehicle: DEFAULT_VEHICLE,
  livery: DEFAULT_LIVERY,
  hallucinating: false,
  achievements: [],
  radioMsg: null,
  lap: null,
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
  setState((s) => ({ zone, garageSel: s.zone === zone ? s.garageSel : 0, found: s.found.includes(zone) ? s.found : [...s.found, zone] }));
}

export function closeZone() {
  setState({ zone: null });
}

// Quiet achievements, listed in the map menu.
export function achieve(id: string) {
  if (getState().achievements.includes(id)) return false;
  setState((s) => ({ achievements: [...s.achievements, id] }));
  return true;
}

let tpId = 0;
export function teleport(zone: ZoneId) {
  setState({ teleport: { id: ++tpId, zone }, menuOpen: false });
}

// Dev and headless-check hook: window.__world.teleport("garage-agents") etc.;
// window.__world.setState({ vehicle: "V04", livery: "Orange" }) swaps what you drive.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __world: object }).__world = { teleport, setState, getState, openZone };
}

// The vehicle and livery choice live in this browser only.
const VEHICLE_KEY = "hg-vehicle";
const LIVERY_KEY = "hg-livery";
if (typeof window !== "undefined") {
  try {
    const v = window.localStorage.getItem(VEHICLE_KEY);
    if (v && (VEHICLE_CODES as readonly string[]).includes(v)) state = { ...state, vehicle: v as VehicleCode };
    const l = window.localStorage.getItem(LIVERY_KEY);
    if (l && (LIVERY_NAMES as readonly string[]).includes(l)) state = { ...state, livery: l as LiveryName };
  } catch {}
  let last = { vehicle: state.vehicle, livery: state.livery };
  subscribe(() => {
    if (state.vehicle === last.vehicle && state.livery === last.livery) return;
    last = { vehicle: state.vehicle, livery: state.livery };
    try {
      window.localStorage.setItem(VEHICLE_KEY, last.vehicle);
      window.localStorage.setItem(LIVERY_KEY, last.livery);
    } catch {}
  });
}
