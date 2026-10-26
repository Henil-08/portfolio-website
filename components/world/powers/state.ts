import { chargeOf, meterState, newPower } from "./meter";

// The game's power, live: the meter (on the physics clock, so it fills with the world, not the
// wall clock), which power is running, and the 0..1 looks the vehicle, trail and
// HUD draw from. Written by usePowers in the physics step, read by the HUD every frame.
export const power = {
  /** seconds of game time (real seconds, not the 2x physics time) */
  clock: 0,
  meter: newPower(0),
  /** the vehicle whose power is running, or null */
  active: null as string | null,
  /** SPLIT: some props are passing through the vehicle (its wheel rays skip them too) */
  through: false,
  /** presses that couldn't fire: the HUD flickers the meter on each */
  refused: 0,
  /** looks, 0..1 (squash: 1 is rest) */
  trail: 0,
  drs: 0,
  thrust: 0,
  ghost: 0,
  squash: 1,
};

/** What the HUD meter shows now. */
export function powerReading() {
  const P = power.meter;
  const c = chargeOf(P, power.clock);
  return { charge: c, state: meterState(P, c), refused: power.refused };
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __power: typeof power }).__power = power;
