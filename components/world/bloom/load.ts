// The boot's progress (components/ui/Boot.tsx draws it). The load runs in real steps, each
// reported by the code that does the work:
//
//   intro    the mark and the name play; the world waits (Experience.tsx INTRO_MS)
//   code     the world's code downloads and runs (Experience.tsx)
//   build    the canvas, physics and fonts, then React builds the island; counted in geometries
//   compile  every program the world needs compiles, ours and the bloom's (bloom/Opening.tsx);
//            counted in materials ready
//   frames   the first frames draw it all once (uploads, the shadow pass)
//
// Each step has a share of the bar and an expected duration. Within a step the bar eases toward
// the real fraction and, ahead of it, creeps on toward the step's end, so it keeps moving when
// the main thread is busy and never passes a step that hasn't finished. Steps that run slower
// than expected stretch the later ones (`speed`).
//
// No three.js here: the boot reads this before the world (and three) has loaded.

export type LoadStep = "intro" | "code" | "build" | "compile" | "frames";

type Def = { id: LoadStep; label: string; share: number; ms: number };

/** How long the intro holds the world back (ms); Experience.tsx waits this long. */
export const INTRO_MS = 1800;

/**
 * The steps, in order. `ms` is what each took on a reference machine (M4 Pro, Chrome, dev server,
 * 2026-11-05; a production build is faster), `share` its part of the bar. After the intro the
 * shares follow the times, so the bar keeps one pace when the load runs as expected; the intro
 * holds no work, so it moves slower.
 */
const STEPS: Def[] = [
  { id: "intro", label: "Loading the island", share: 0.2, ms: INTRO_MS },
  { id: "code", label: "Loading the island", share: 0.18, ms: 600 },
  { id: "build", label: "Building the island", share: 0.34, ms: 1000 },
  { id: "compile", label: "Warming up", share: 0.2, ms: 560 },
  { id: "frames", label: "Warming up", share: 0.08, ms: 200 },
];

type Live = { i: number; t0: number; sub: number; done: boolean; doneAt: number; spent: number; planned: number };
const live: Live = { i: -1, t0: 0, sub: 0, done: false, doneAt: 0, spent: 0, planned: 0 };

/** The boot's timeline: [what, ms since navigation]. Dev: window.__bootLog, and a console table at the end. */
export const bootLog: [string, number][] = [];

export function mark(what: string) {
  bootLog.push([what, Math.round(performance.now())]);
}

const index = (id: LoadStep) => STEPS.findIndex((s) => s.id === id);

/** Steps run slower or faster than expected on this machine: the ones still to come stretch by this. */
function speed() {
  return live.planned > 0 ? Math.min(5, Math.max(0.5, live.spent / live.planned)) : 1;
}

/** A step begins (and every step before it is over). Out-of-order calls are ignored. */
export function begin(id: LoadStep) {
  const i = index(id);
  if (i <= live.i || live.done) return;
  const now = performance.now();
  if (live.i > 0) {
    // the intro is a fixed wait, so it says nothing about this machine
    live.spent += now - live.t0;
    live.planned += STEPS[live.i].ms;
  }
  live.i = i;
  live.t0 = now;
  live.sub = 0;
  mark(id);
}

/** How far through the current step the real work is (0..1); it only ever grows. */
export function sub(id: LoadStep, k: number) {
  if (index(id) !== live.i) return;
  live.sub = Math.max(live.sub, Math.min(1, Math.max(0, k)));
}

/** Everything is loaded: the bar fills. */
export function finish() {
  if (live.done) return;
  live.done = true;
  live.doneAt = performance.now();
  mark("ready");
}

export const loadStep = () => (live.i >= 0 ? STEPS[live.i].id : null);
export const loadDone = () => live.done;

/**
 * Where the bar should head now: it eases toward `goal` (0..1) with time constant `tau` (ms), so
 * it slows as it nears the goal, and it never passes `cap`, the current step's end, before that
 * step is over. The goal is the real fraction plus a lead into the rest of the step that grows
 * with time.
 */
export function heading(now = performance.now()) {
  if (live.done) return { goal: 1, tau: 90, cap: 1 };
  if (live.i < 0) return { goal: 0, tau: 400, cap: 0 };
  const s = STEPS[live.i];
  let a = 0;
  for (let j = 0; j < live.i; j++) a += STEPS[j].share;
  const cap = a + s.share - 0.004;
  const e = now - live.t0;
  // the intro is a timer: its real fraction is the time gone
  const exp = s.id === "intro" ? s.ms : s.ms * speed();
  const real = s.id === "intro" ? Math.min(1, e / s.ms) : live.sub;
  const r = Math.min(cap, a + s.share * real);
  // the lead: half the way to the step's end at once, all but all of it as the expected time passes
  const lead = 1 - 0.55 * Math.exp(-e / exp);
  return { goal: r + (cap - r) * lead * 0.94, tau: Math.min(2600, Math.max(160, exp * 0.42)), cap };
}

/**
 * The bar's tick, run at the end of every frame the world draws once it draws (Opening.tsx, an
 * R3F after-effect), and by the boot's own frame loop before that. At the end of a frame nothing
 * heavy can follow a change to the bar before the browser takes it, and a heavy frame has
 * already shown itself.
 */
let barTick: (() => void) | null = null;
let worldFrameAt = -1e9;
export function setBarTick(f: (() => void) | null) {
  barTick = f;
}
export function afterWorldFrame() {
  worldFrameAt = performance.now();
  barTick?.();
}
/** The world is drawing frames, so the bar ticks with them. */
export const worldDrawing = () => performance.now() - worldFrameAt < 250;

/** The label for the current step. */
export const loadLabel = () => (live.done ? "Ready" : live.i >= 0 ? STEPS[live.i].label : STEPS[0].label);

/** Dev: the timeline as a table, once, when the garage opens. */
export function report(extra: Record<string, number> = {}) {
  if (process.env.NODE_ENV === "production") return;
  const rows = bootLog.map(([w, t], i) => ({ step: w, at: t, took: i + 1 < bootLog.length ? bootLog[i + 1][1] - t : 0 }));
  (window as unknown as { __bootLog: unknown }).__bootLog = { rows, ...extra };
  console.info("boot timeline (ms)", JSON.stringify(rows), JSON.stringify(extra));
}
