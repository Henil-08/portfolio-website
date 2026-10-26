// The power meter's rules, shared by the game (powers/state.ts) and the /docs/brand/world mock
// (owner, 2026-10-26): hold Shift to use the power. It can start from MIN up; while held it
// drains (a full bar lasts LAST[code] seconds), and it stops on release or when the bar is empty.
// When not in use it refills from empty to full in REFILL seconds. Times are seconds on whatever
// clock the caller keeps; the charge is a pure function of the time since the last change.

/** Seconds to refill from empty. */
export const REFILL = 5;
/** The least charge that starts a power. */
export const MIN = 0.1;
/** Seconds a full bar lasts while held, per vehicle. */
export const LAST: Record<string, number> = { V01: 2.5, V02: 2, V03: 3.5, V04: 3 };
const lastOf = (code: string) => LAST[code] ?? 2.5;

const NAMES: Record<string, string> = { V01: "Overtake", V02: "Send it", V03: "Skyline", V04: "Split" };
/** The vehicle's power, as the HUD sets it: "SKYLINE". */
export const powerName = (code: string) => (NAMES[code] ?? "Power").toUpperCase();

export type PowerState = {
  /** the charge at t0 */
  c0: number;
  t0: number;
  /** seconds a full bar lasts while it drains; 0 while it refills */
  drain: number;
  /** it may start (the world is up, nothing else is running) */
  armed: boolean;
};

const clamp01 = (k: number) => Math.min(1, Math.max(0, k));

/** Starts empty at t (the game) or wherever the caller sets c0. */
export const newPower = (t: number, c0 = 0): PowerState => ({ c0, t0: t, drain: 0, armed: false });

/** The meter, 0..1. */
export const chargeOf = (P: PowerState, t: number) => clamp01(P.drain ? P.c0 - (t - P.t0) / P.drain : P.c0 + (t - P.t0) / REFILL);

/** In use: draining. */
export const using = (P: PowerState) => P.drain > 0;

/** When a draining meter runs dry. */
export const emptyAt = (P: PowerState) => P.t0 + P.c0 * P.drain;

/** Starts draining if armed, not in use and holding at least MIN. Returns the charge it started with, or 0. */
export function startPower(P: PowerState, t: number, code: string) {
  if (!P.armed || using(P)) return 0;
  const c = chargeOf(P, t);
  if (c < MIN) return 0;
  P.c0 = c;
  P.t0 = t;
  P.drain = lastOf(code);
  return c;
}

/** Stops draining (release, or empty) and refills from where it is. */
export function stopPower(P: PowerState, t: number) {
  if (!using(P)) return;
  const at = Math.min(t, emptyAt(P));
  P.c0 = chargeOf(P, at);
  P.t0 = at;
  P.drain = 0;
}

export type MeterState = "low" | "busy" | "ready";
/** What the sticker shows: plain ink while in use (or not armed), grey below MIN, the orange head when it can start. */
export const meterState = (P: PowerState, c: number): MeterState => (using(P) || !P.armed ? "busy" : c < MIN ? "low" : "ready");
