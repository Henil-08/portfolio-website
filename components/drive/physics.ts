import type { DriveInput } from "./input";

/**
 * Arcade car model. The car has a heading and a separate velocity vector:
 * each step we split velocity into forward and sideways parts, push the
 * forward part with engine/brakes/drag, and bleed the sideways part with
 * tyre grip. Turning the heading faster than grip can follow is what makes
 * the car slide a little.
 */

export type Surface = "track" | "kerb" | "grass";

export type CarState = {
  x: number;
  z: number;
  heading: number; // radians, forward = (sin h, cos h)
  vx: number;
  vz: number;
  steer: number; // current front wheel angle, radians (+ = right)
  forward: number; // signed forward speed, m/s
  slip: number; // sideways speed, m/s (for effects)
};

export const WHEELBASE = 3.6;
const ENGINE = 24; // m/s^2 at low speed
const DRAG = 0.002; // quadratic aero drag, top speed about 87 m/s
const ROLLING = 0.1;
const BRAKE = 42;
const REVERSE_ACCEL = 8;
const REVERSE_MAX = 12;
const MAX_STEER = 0.5;
const LATERAL_LIMIT = 38; // m/s^2 of cornering before the car understeers

const SURFACE = {
  track: { grip: 9, engine: 1, drag: 0 },
  kerb: { grip: 7.5, engine: 0.95, drag: 0.02 },
  grass: { grip: 3.5, engine: 0.45, drag: 0.3 }, // tops out near 90 km/h
} as const;

export const TOP_SPEED = 87;

export function createCar(x: number, z: number, heading: number): CarState {
  return { x, z, heading, vx: 0, vz: 0, steer: 0, forward: 0, slip: 0 };
}

export function stepCar(c: CarState, input: DriveInput, dt: number, surface: Surface) {
  const s = SURFACE[surface];
  const fx = Math.sin(c.heading);
  const fz = Math.cos(c.heading);
  // left vector
  const lx = fz;
  const lz = -fx;

  let f = c.vx * fx + c.vz * fz;
  let lat = c.vx * lx + c.vz * lz;

  // Longitudinal: engine, brakes, reverse, drag
  if (input.throttle > 0) {
    f += input.throttle * ENGINE * s.engine * dt;
  }
  if (input.brake > 0) {
    if (f > 0.5) f = Math.max(0, f - BRAKE * dt);
    else if (input.throttle === 0) f = Math.max(-REVERSE_MAX, f - REVERSE_ACCEL * dt);
  }
  if (input.handbrake) {
    f -= Math.sign(f) * Math.min(Math.abs(f), 16 * dt);
  }
  f -= (DRAG * f * Math.abs(f) + ROLLING * f + s.drag * f) * dt;
  if (Math.abs(f) < 0.05 && input.throttle === 0 && input.brake === 0) f = 0;

  // Steering: less lock as speed rises, eased so taps feel smooth
  const speed = Math.abs(f);
  const lock = MAX_STEER / (1 + speed * 0.09);
  const target = input.steer * lock;
  c.steer += (target - c.steer) * Math.min(1, dt * 10);

  // Yaw from a bicycle model, capped by available grip
  let yaw = (f * Math.tan(c.steer)) / WHEELBASE;
  const gripCap = (LATERAL_LIMIT * (input.handbrake ? 1.5 : 1) * (s.grip / 9)) / Math.max(speed, 4);
  yaw = Math.max(-gripCap, Math.min(gripCap, yaw));
  // + steer is right, and turning right decreases heading
  c.heading -= yaw * dt;

  // Sideways grip; the handbrake lets the rear step out
  const grip = input.handbrake ? 2.2 : s.grip;
  lat *= Math.exp(-grip * dt);

  // Velocity stays in the old heading frame. Next step it is measured
  // against the new heading, so a quick turn shows up as a small slide.
  c.vx = fx * f + lx * lat;
  c.vz = fz * f + lz * lat;

  c.x += c.vx * dt;
  c.z += c.vz * dt;
  c.forward = f;
  c.slip = lat;
}

/** Gear shown on the HUD, picked from speed like an 8-speed box. */
export function gearFor(forward: number, throttle: number) {
  if (forward < -0.5) return "R";
  if (forward < 0.5 && throttle === 0) return "N";
  const steps = [14, 24, 34, 44, 54, 64, 75];
  let g = 1;
  for (const v of steps) if (forward > v) g++;
  return String(g);
}
