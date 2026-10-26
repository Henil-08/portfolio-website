// What's under a point on the island, and where the car's wheels touch it.
// Shared by dust, skid marks, ground tracks and leaves.
import * as THREE from "three";
import { carState } from "../carState";
import { heightAt } from "../terrain";
import { PIT, PIT_LANE_WIDTH, TRACK_WIDTH, inLand, nearestT, pitRoadCurves, trackPoint } from "../layout";

export { heightAt };

let lanePts: THREE.Vector3[] | null = null;
/** On the pit lane (6 m of asphalt along the straight) or the roads that peel off and rejoin the lap. */
export function onPitRoad(x: number, z: number, margin = 0) {
  const half = PIT_LANE_WIDTH / 2 + 0.2 + margin;
  if (Math.abs(z - PIT.z) < half && x > PIT.from - 4 && x < PIT.to + 4) return true;
  lanePts ??= pitRoadCurves().flatMap((c) => c.getSpacedPoints(80));
  return lanePts.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < half * half);
}

/** On asphalt: the track (kerbs included) or a pit road. */
export function onAsphalt(x: number, z: number, margin = 0) {
  return nearestT(x, z).dist <= TRACK_WIDTH / 2 + 0.4 + margin || onPitRoad(x, z, margin);
}

/** True on grass or gravel: off the asphalt (kerbs and pit roads included) and on the island. */
export function offTrack(x: number, z: number) {
  if (!inLand(x, z)) return false;
  return !onAsphalt(x, z);
}

// Wheel contact points relative to the chassis: x along the car's forward, z to its side.
// Always four; Vehicle.tsx sets them for the vehicle you drive (a bike's pairs sit together).
export const WHEEL_LOCAL: { x: number; z: number; rear: boolean }[] = [
  { x: 1.78, z: 0.8, rear: false },
  { x: 1.78, z: -0.8, rear: false },
  { x: -1.82, z: 0.78, rear: true },
  { x: -1.82, z: -0.78, rear: true },
];

export function setWheelLocal(list: { x: number; z: number; rear: boolean }[]) {
  list.slice(0, WHEEL_LOCAL.length).forEach((w, i) => Object.assign(WHEEL_LOCAL[i], w));
}

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
