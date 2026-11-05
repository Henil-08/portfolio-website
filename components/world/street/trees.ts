// The island's scattered trees, bushes and rocks: Places.tsx Nature draws this list, and
// anything softer (bushes, outcrops, birds' perches) reads TREES / nearTree to keep off it. One
// scatter, read by both, so they can never drift apart. It grows after every structure is placed
// and keeps off all of them (./reserved.ts) and off the run-off (./common.ts onRunoff), so a
// stand, floodlight, marshal post or building never loses its spot to a tree.
import { GRANDSTAND, LETTERS, MAX_R, PIT, SECTORS, TIMELINE, TRACK_WIDTH, inLand, shoreDist, trackCurve, zoneById } from "../layout";
import { nearGarden } from "../garden/layout";
import { nearPromenade } from "../waterfront/layout";
import { inTownBelt, onRunoff } from "./common";
import { onStructure } from "./reserved";

export type NatureKind = "round" | "cypress" | "bush" | "rock";
export type NatureItem = { kind: NatureKind; x: number; z: number; s: number; rot: number; seed: number };

/** Clear radius round a tree, and round a bush or a rock (m). */
const TREE_R = 2.4;
const LOW_R = 1.3;

export const NATURE: NatureItem[] = (() => {
  let s = 42;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const samples = trackCurve.getSpacedPoints(160);
  const dTrack = (x: number, z: number) => {
    let b = Infinity;
    for (const p of samples) b = Math.min(b, Math.hypot(p.x - x, p.z - z));
    return b;
  };
  const avoid = Object.values(zoneById).map((zn) => [zn.pos[0], zn.pos[1], Math.max(zn.size[0], zn.size[1]) / 2 + 6]);
  avoid.push([TIMELINE.pos[0], TIMELINE.pos[1], Math.hypot(TIMELINE.hx, TIMELINE.hz) + 2], [LETTERS.center[0], LETTERS.center[1], LETTERS.hx + 1.5], [GRANDSTAND.pos[0], GRANDSTAND.pos[1], 10]);
  for (const sc of SECTORS) avoid.push([sc.scene[0], sc.scene[1], 17]);
  for (let x = PIT.from - 6; x <= PIT.to + 6; x += 6) avoid.push([x, PIT.garageZ, 8], [x, PIT.z, 6]);
  const out: NatureItem[] = [];
  let tries = 0;
  // 90 pieces, as before the structures were reserved first; more tries, since there's less room
  while (out.length < 90 && tries++ < 12000) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * (MAX_R - 3);
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    if (!inLand(x, z, 3)) continue;
    if (dTrack(x, z) < TRACK_WIDTH / 2 + 4) continue;
    if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    if (nearGarden(x, z, 1.5)) continue;
    if (inTownBelt(x, z)) continue;
    if (nearPromenade(x, z, 2)) continue;
    if (onRunoff(x, z, TREE_R) || onStructure(x, z, TREE_R)) continue;
    // the shore gets cypresses where it used to have palms (W10 has two tree forms only)
    const beach = shoreDist(x, z) < 10;
    const roll = r();
    const kind: NatureKind = beach ? (roll < 0.7 ? "cypress" : "rock") : roll < 0.4 ? "round" : roll < 0.7 ? "cypress" : roll < 0.88 ? "bush" : "rock";
    out.push({ kind, x, z, s: 0.85 + r() * 0.5, rot: r() * Math.PI * 2, seed: Math.floor(r() * 1000) });
  }
  return out;
})();

/** [x, z, clear radius] of every scattered tree, bush and rock. */
export const TREES: [number, number, number][] = NATURE.map((it) => [it.x, it.z, it.kind === "round" || it.kind === "cypress" ? TREE_R : LOW_R]);

/** True if something `r` m round at (x, z) would stand on a scattered tree, bush or rock. */
export function nearTree(x: number, z: number, r: number) {
  return TREES.some(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) < r + tr);
}
