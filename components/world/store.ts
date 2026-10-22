"use client";

import { useSyncExternalStore } from "react";
import type { ZoneId } from "./layout";

// Tiny external store so the canvas and the DOM overlay share state
// without re-rendering the whole scene.

export type Phase = "boot" | "intro" | "world";

type State = {
  phase: Phase;
  ready: boolean; // physics and scene mounted
  zone: ZoneId | null;
  dismissed: ZoneId | null; // closed by the visitor, stays closed until the car leaves
  found: ZoneId[];
  toast: { id: number; text: string; tone: "red" | "yellow" | "teal" } | null;
  muted: boolean;
  speed: number; // km/h, throttled updates for the HUD
  askOpen: boolean;
  menuOpen: boolean;
  teleport: { id: number; zone: ZoneId } | null;
};

let state: State = {
  phase: "boot",
  ready: false,
  zone: null,
  dismissed: null,
  found: [],
  toast: null,
  muted: false,
  speed: 0,
  askOpen: false,
  menuOpen: false,
  teleport: null,
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

export function enterZone(zone: ZoneId) {
  setState((s) => ({
    zone,
    found: s.found.includes(zone) ? s.found : [...s.found, zone],
  }));
}

export function dismissZone() {
  setState((s) => ({ dismissed: s.zone, zone: null }));
}

export function leaveZone(zone: ZoneId) {
  if (getState().zone === zone) setState({ zone: null });
}

let tpId = 0;
export function teleport(zone: ZoneId) {
  setState({ teleport: { id: ++tpId, zone }, menuOpen: false });
}
