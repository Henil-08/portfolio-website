import * as THREE from "three";
import { CANALS, QUAY_Y, GRANDSTAND, LAKES, canalDist, canalSide, LETTERS, MAX_R, SEA_FLOOR, SEA_Y, TIMELINE, lakeDepthDist, onBridge, PIT, SCENE_FOOT, SECTORS, shoreDist, TRACK_WIDTH, trackCurve, trackPoint, zones } from "./layout";

// Terrain height for the whole island. The land follows the circuit: right next
// to the road it matches the track's height exactly, further away it blends
// smoothly between nearby stretches of track, so the circuit sits in rolling
// hills instead of on stilts. Everything that sits on the ground asks heightAt.

export const GRID = 256; // cells per side
export const EXTENT = (MAX_R + 12) * 2; // metres covered by the grid: the land, its beaches and some sea floor

let heights: Float32Array | null = null;
let texture: THREE.DataTexture | null = null;
let minY = 0;
let maxY = 0;

const SAMPLES = 360;

function build() {
  // Samples on a bridge deck don't shape the land: under a bridge it follows the lower road.
  const pts = trackCurve.getSpacedPoints(SAMPLES).filter((_, k) => !onBridge(k / SAMPLES, 2));
  const S = pts.length;
  const n = GRID + 1;
  const h = new Float32Array(n * n);
  const roadY = new Float32Array(n * n); // nearest road height per cell
  const roadD = new Float32Array(n * n); // distance to the road centreline
  const flat = TRACK_WIDTH / 2 + 2.5; // road plus shoulder is exactly track height
  const blend = 14; // metres over which the land eases away from the road
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i / GRID - 0.5) * EXTENT;
      const z = (j / GRID - 0.5) * EXTENT;
      let best = Infinity;
      let bestY = 0;
      for (let k = 0; k < S; k++) {
        const p = pts[k];
        const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (d2 < best) {
          best = d2;
          bestY = p.y;
        }
      }
      const d = Math.sqrt(best);
      roadY[j * n + i] = bestY;
      roadD[j * n + i] = d;
      // Flat world: away from the road the land is level at 0 (it used to take a
      // weighted average of nearby road heights, which banked the infield up
      // toward the ramps and river decks and left the car sliding at the start).
      const far = 0;
      const k = THREE.MathUtils.smoothstep(d, flat, flat + blend);
      // Under the road the land sits a little lower; the road has its own collider.
      const under = 1 - THREE.MathUtils.smoothstep(d, TRACK_WIDTH / 2 + 0.5, flat);
      const y = THREE.MathUtils.lerp(bestY, far, k) - under * 0.22;
      h[j * n + i] = y;
    }
  }
  // Flat pads: pitches, the pit lane, garages and plazas sit on level terraces.
  const sample = (x: number, z: number) => {
    const fx = THREE.MathUtils.clamp(Math.round((x / EXTENT + 0.5) * GRID), 0, GRID);
    const fz = THREE.MathUtils.clamp(Math.round((z / EXTENT + 0.5) * GRID), 0, GRID);
    return h[fz * n + fx];
  };
  // The infield (timeline, pitches, podium, letters) is one level terrace, so no pad tilts its neighbour.
  // Same level as the pit lane, so the two terraces meet without a bank.
  const infieldY = sample((PIT.from + PIT.to) / 2, (PIT.z + PIT.garageZ) / 2 - 1);
  const fixed = new Uint8Array(n * n); // cells the slope limit must not move
  const pads: { x: number; z: number; hx: number; hz: number; rot?: number; y?: number }[] = [
    // Each place's scenery sits on a level terrace at the height of the road beside it.
    ...SECTORS.map((sc) => {
      const lz = (SCENE_FOOT.front - SCENE_FOOT.back) / 2;
      return {
        x: sc.scene[0] + lz * Math.sin(sc.sceneRot),
        z: sc.scene[1] + lz * Math.cos(sc.sceneRot),
        hx: SCENE_FOOT.hx,
        hz: (SCENE_FOOT.front + SCENE_FOOT.back) / 2,
        rot: sc.sceneRot,
        y: trackPoint(sc.sceneT).y,
      };
    }),
    { x: (PIT.from + PIT.to) / 2, z: (PIT.z + PIT.garageZ) / 2 - 1, hx: (PIT.to - PIT.from) / 2 + 8, hz: 11 },
    { x: LETTERS.center[0], z: LETTERS.center[1], hx: LETTERS.hx + 1.5, hz: 4, y: infieldY },
    { x: GRANDSTAND.pos[0], z: GRANDSTAND.pos[1], hx: 8, hz: 5 },
    ...zones.filter((zz) => !zz.id.startsWith("sector-") && !zz.id.startsWith("garage-")).map((zz) => ({ x: zz.pos[0], z: zz.pos[1], hx: zz.size[0] / 2 + 3, hz: zz.size[1] / 2 + 3, y: infieldY })),
    // Last, so it wins where its edge meets a neighbour's slope.
    { x: TIMELINE.pos[0], z: TIMELINE.pos[1], hx: TIMELINE.hx, hz: TIMELINE.hz, y: infieldY },
  ];
  for (const pad of pads) {
    const y0 = pad.y ?? sample(pad.x, pad.z);
    const c = Math.cos(pad.rot ?? 0);
    const sn = Math.sin(pad.rot ?? 0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = (i / GRID - 0.5) * EXTENT;
        const z = (j / GRID - 0.5) * EXTENT;
        // world -> pad-local (inverse of a Y rotation by `rot`)
        const wx = x - pad.x;
        const wz = z - pad.z;
        const lx = wx * c - wz * sn;
        const lz = wx * sn + wz * c;
        const dx = Math.max(0, Math.abs(lx) - pad.hx);
        const dz = Math.max(0, Math.abs(lz) - pad.hz);
        const d = Math.hypot(dx, dz);
        if (d > 8) continue;
        // a pad's sloping rim never bends an earlier pad's level top
        if (d > 0 && fixed[j * n + i]) continue;
        if (d === 0) fixed[j * n + i] = 1;
        const k = 1 - THREE.MathUtils.smoothstep(d, 0, 8);
        h[j * n + i] = THREE.MathUtils.lerp(h[j * n + i], y0, k);
      }
    }
  }

  // Water: the land eases down to a beach just above sea level, then drops to the
  // sea floor. Lakes are the same, dug into low ground (their water is the sea's).
  const BEACH = SEA_Y + 0.22;
  const SHALLOW = SEA_Y - 0.38; // lakes, the inlet and the sea's first metres: a car sits in it, body above water
  const DEEP = SEA_Y - 1.3; // the harbour channel
  const QUAY = QUAY_Y;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const c = j * n + i;
      const x = (i / GRID - 0.5) * EXTENT;
      const z = (j / GRID - 0.5) * EXTENT;
      const sd = shoreDist(x, z);
      if (sd < 14) {
        if (sd >= 0) h[c] = THREE.MathUtils.lerp(BEACH, h[c], THREE.MathUtils.smoothstep(sd, 0, 14));
        else {
          // a wide shallow shelf you can paddle a car into, then the deep
          h[c] = -sd < 6 ? THREE.MathUtils.lerp(BEACH, SHALLOW, THREE.MathUtils.smoothstep(-sd, 0, 2.5)) : THREE.MathUtils.lerp(SHALLOW, SEA_FLOOR, THREE.MathUtils.smoothstep(-sd, 6, 14));
          fixed[c] = 1;
        }
      }
      // The harbour arm runs under the road (the road crosses on a bridge). A beach on
      // one side, a stone quay on the other, deep water down the middle.
      for (const cn of CANALS) {
        const cd = canalDist(cn, x, z);
        if (cd < -6) continue;
        const quay = cn.quay !== undefined && canalSide(cn, x, z) === cn.quay;
        if (cd < 0) {
          if (quay && -cd < 0.9) {
            // behind the quay wall's face: kept deep so the grid never pokes out in front of it
            h[c] = DEEP;
            fixed[c] = 1;
          } else if (quay && -cd < 2.2) {
            // the quay top: pinned, so the slope limit can't drag it down to the channel
            h[c] = QUAY;
            fixed[c] = 1;
          } else if (quay) h[c] = Math.min(h[c], THREE.MathUtils.lerp(QUAY, h[c], THREE.MathUtils.smoothstep(-cd, 2.2, 5.5)));
          else h[c] = Math.min(h[c], THREE.MathUtils.lerp(BEACH, h[c], THREE.MathUtils.smoothstep(-cd, 0, 6)));
        } else {
          const bed = cn.bed ?? DEEP;
          h[c] = quay ? bed : THREE.MathUtils.lerp(THREE.MathUtils.lerp(BEACH, SHALLOW, THREE.MathUtils.smoothstep(cd, 0, 1.4)), bed, THREE.MathUtils.smoothstep(cd, 1.6, 3.6));
          fixed[c] = 1;
        }
      }
      if (roadD[c] < TRACK_WIDTH / 2 + 3) continue;
      for (const l of LAKES) {
        const ld = lakeDepthDist(l, x, z);
        if (ld < -8) continue;
        if (ld < 0) h[c] = Math.min(h[c], THREE.MathUtils.lerp(BEACH, h[c], THREE.MathUtils.smoothstep(-ld, 0, 8)));
        else {
          // a drivable shelf round the edge, then a real basin in the middle (no flat hole in the sand)
          const shelf = THREE.MathUtils.lerp(BEACH, SHALLOW, THREE.MathUtils.smoothstep(ld, 0, 2));
          h[c] = THREE.MathUtils.lerp(shelf, SEA_Y - 1.5, THREE.MathUtils.smoothstep(ld, 2.2, 4.6));
          fixed[c] = 1;
        }
      }
    }
  }

  // Pads must never push land up through the asphalt or the shoulder.
  for (let i = 0; i < h.length; i++) {
    if (roadD[i] < TRACK_WIDTH / 2 + 0.5) h[i] = Math.min(h[i], roadY[i] - 0.22);
    else if (roadD[i] < TRACK_WIDTH / 2 + 2.5) h[i] = Math.min(h[i], roadY[i]);
  }

  // Slope limit: away from the road and the terraces the land never gets steeper
  // than MAX_SLOPE, so a car that runs wide can always drive back up.
  const MAX_SLOPE = 0.28;
  const cell = EXTENT / GRID;
  for (let i = 0; i < h.length; i++) if (roadD[i] < TRACK_WIDTH / 2 + 2.5) fixed[i] = 1;
  const nb = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];
  for (let pass = 0; pass < 60; pass++) {
    let moved = 0;
    for (let j = 1; j < n - 1; j++) {
      for (let i = 1; i < n - 1; i++) {
        const c = j * n + i;
        if (fixed[c]) continue;
        let lo = -Infinity;
        let hi = Infinity;
        for (const [di, dj, w] of nb) {
          const hn = h[(j + dj) * n + i + di];
          const m = MAX_SLOPE * cell * w;
          lo = Math.max(lo, hn - m);
          hi = Math.min(hi, hn + m);
        }
        const y = lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, h[c]));
        if (Math.abs(y - h[c]) > 1e-4) moved++;
        h[c] = y;
      }
    }
    if (!moved) break;
  }

  heights = h;
  minY = Math.min(...h);
  maxY = Math.max(...h);
}

/** Terrain height at a world position (bilinear on the grid). */
export function heightAt(x: number, z: number): number {
  if (!heights) build();
  const h = heights!;
  const n = GRID + 1;
  const fx = THREE.MathUtils.clamp((x / EXTENT + 0.5) * GRID, 0, GRID - 1e-4);
  const fz = THREE.MathUtils.clamp((z / EXTENT + 0.5) * GRID, 0, GRID - 1e-4);
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const tx = fx - i;
  const tz = fz - j;
  const a = h[j * n + i];
  const b = h[j * n + i + 1];
  const c = h[(j + 1) * n + i];
  const d = h[(j + 1) * n + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

/** The raw grid, row-major by z then x, (GRID+1)² values. */
export function heightGrid() {
  if (!heights) build();
  return heights!;
}

/** Height texture covering the island, for shaders. Red = (y - minY) / (maxY - minY). */
export function heightTexture() {
  if (!heights) build();
  if (!texture) {
    const n = GRID + 1;
    const data = new Float32Array(n * n);
    const span = Math.max(1e-3, maxY - minY);
    for (let i = 0; i < data.length; i++) data[i] = (heights![i] - minY) / span;
    texture = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.FloatType);
    texture.magFilter = texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }
  return { texture, size: EXTENT, minY, maxY };
}
