// The `?cam=next` chase camera (look.ts CAM_NEXT; docs/research/art-direction.md 2.3): lower,
// longer and behind the car. About 15 degrees down from 11.5 m back, on a 26 degree lens (a
// ~55 mm look) that opens 4 degrees with speed; it follows the heading on a critically damped
// spring (no overshoot) and looks a little ahead along the velocity. Rig.tsx runs it; the
// opening (bloom/Opening.tsx) lands on the same pose, so driving starts without a cut.
import * as THREE from "three";

export const CHASE = {
  /** metres from the car to the camera */
  dist: 11.5,
  /** degrees below the horizon */
  pitch: 15,
  /** vertical fov at rest and the extra at full speed */
  fov: 26,
  fovSpeed: 4,
  /** m/s over which the fov opens */
  speedFull: 40,
  /** the look target runs this many seconds ahead along the velocity, up to `aheadMax` m */
  ahead: 0.3,
  aheadMax: 3.5,
  /** how high over the car's centre the camera looks */
  lookUp: 0.6,
};

/** The camera's offset from the car for a car facing `forward` (y ignored). `zoom` scales the distance (portrait screens). */
export function chaseOffset(forward: THREE.Vector3, zoom: number, out: THREE.Vector3) {
  const yaw = Math.atan2(forward.z, forward.x);
  const p = THREE.MathUtils.degToRad(CHASE.pitch);
  const d = CHASE.dist * zoom;
  return out.set(-Math.cos(yaw) * Math.cos(p) * d, Math.sin(p) * d + CHASE.lookUp, -Math.sin(yaw) * Math.cos(p) * d);
}

/**
 * A critically damped spring toward `to` (implicit, stable at any frame time): `x` and its
 * velocity `v` are updated in place. `omega` is the stiffness (rad/s): higher follows tighter.
 */
export function spring(x: THREE.Vector3, v: THREE.Vector3, to: THREE.Vector3, omega: number, dt: number) {
  const f = 1 + 2 * dt * omega;
  const oo = omega * omega;
  const hoo = dt * oo;
  const hhoo = dt * hoo;
  const inv = 1 / (f + hhoo);
  const nx = (f * x.x + dt * v.x + hhoo * to.x) * inv;
  const ny = (f * x.y + dt * v.y + hhoo * to.y) * inv;
  const nz = (f * x.z + dt * v.z + hhoo * to.z) * inv;
  v.set((v.x + hoo * (to.x - x.x)) * inv, (v.y + hoo * (to.y - x.y)) * inv, (v.z + hoo * (to.z - x.z)) * inv);
  x.set(nx, ny, nz);
}

/** `a` moved to within half a turn of `ref`, so a lerp between them takes the short way round. */
export const nearAngle = (a: number, ref: number) => ref + THREE.MathUtils.euclideanModulo(a - ref + Math.PI, Math.PI * 2) - Math.PI;
