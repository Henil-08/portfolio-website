// What's under a point on the island, and where the car's wheels touch it.
// Shared by dust, skid marks, ground tracks and leaves.
import * as THREE from "three";
import { carState } from "../carState";
import { CAR_SCALE } from "../models/Car";
import { heightAt } from "../terrain";
import { TRACK_WIDTH, inLand, nearestT, trackPoint } from "../layout";

export { heightAt };

/** True on grass or gravel: off the asphalt (kerbs included) and on the island. */
export function offTrack(x: number, z: number) {
  if (!inLand(x, z)) return false;
  return nearestT(x, z).dist > TRACK_WIDTH / 2 + 0.4;
}

// Wheel contact points relative to the chassis (see models/Car.tsx WHEEL_POSITIONS,
// times CAR_SCALE): x along the car's forward, z to its side.
export const WHEEL_LOCAL: { x: number; z: number; rear: boolean }[] = [
  { x: 0.86 * CAR_SCALE, z: 0.5 * CAR_SCALE, rear: false },
  { x: 0.86 * CAR_SCALE, z: -0.5 * CAR_SCALE, rear: false },
  { x: -0.94 * CAR_SCALE, z: 0.5 * CAR_SCALE, rear: true },
  { x: -0.94 * CAR_SCALE, z: -0.5 * CAR_SCALE, rear: true },
];

/**
 * Height of the visible surface: the road ribbon on the track (it sits ~0.22 m
 * above the land under it), the terrain everywhere else.
 */
export function surfaceY(x: number, z: number) {
  const n = nearestT(x, z);
  if (n.dist < TRACK_WIDTH / 2 + 0.3) return trackPoint(n.t).y;
  return heightAt(x, z);
}

const side = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

/** World contact point of wheel `i` of the player's car (on the terrain). */
export function wheelContact(i: number, out: THREE.Vector3) {
  const f = carState.forward;
  side.crossVectors(f, up).normalize(); // car's right
  const w = WHEEL_LOCAL[i];
  out.copy(carState.pos).addScaledVector(f, w.x).addScaledVector(side, w.z);
  out.y = surfaceY(out.x, out.z);
  return out;
}

const fwdFlat = new THREE.Vector3();

/** Sideways (slip) and forward speed of the car in m/s, from carState. */
export function carSlip() {
  const v = carState.vel;
  fwdFlat.set(carState.forward.x, 0, carState.forward.z);
  if (fwdFlat.lengthSq() < 1e-6) return { lateral: 0, along: 0, speed: 0 };
  fwdFlat.normalize();
  const along = v.x * fwdFlat.x + v.z * fwdFlat.z;
  const lx = v.x - fwdFlat.x * along;
  const lz = v.z - fwdFlat.z * along;
  return { lateral: Math.hypot(lx, lz), along, speed: Math.hypot(v.x, v.z) };
}
