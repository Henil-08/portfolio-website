import * as THREE from "three";
import { GRANDSTAND, ISLAND_RADIUS, LETTERS, TIMELINE, PIT, SCENE_FOOT, SECTORS, TRACK_WIDTH, trackCurve, trackPoint, zones } from "./layout";

// Terrain height for the whole island. The land follows the circuit: right next
// to the road it matches the track's height exactly, further away it blends
// smoothly between nearby stretches of track, so the circuit sits in rolling
// hills instead of on stilts. Everything that sits on the ground asks heightAt.

export const GRID = 192; // cells per side
export const EXTENT = (ISLAND_RADIUS + 8) * 2; // metres covered by the grid

let heights: Float32Array | null = null;
let texture: THREE.DataTexture | null = null;
let minY = 0;
let maxY = 0;

const SAMPLES = 360;

function build() {
  const pts = trackCurve.getSpacedPoints(SAMPLES);
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
      let wSum = 0;
      let ySum = 0;
      for (let k = 0; k < SAMPLES; k++) {
        const p = pts[k];
        const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (d2 < best) {
          best = d2;
          bestY = p.y;
        }
        const w = 1 / (d2 * d2 + 1);
        wSum += w;
        ySum += w * p.y;
      }
      const d = Math.sqrt(best);
      roadY[j * n + i] = bestY;
      roadD[j * n + i] = d;
      const far = ySum / wSum;
      const k = THREE.MathUtils.smoothstep(d, flat, flat + blend);
      // Under the road the land sits a little lower; the road has its own collider.
      const under = 1 - THREE.MathUtils.smoothstep(d, TRACK_WIDTH / 2 + 0.5, flat);
      let y = THREE.MathUtils.lerp(bestY, far, k) - under * 0.22;
      // The island edge rolls down to the plinth rim.
      const r = Math.hypot(x, z);
      y *= 1 - THREE.MathUtils.smoothstep(r, ISLAND_RADIUS - 14, ISLAND_RADIUS - 1);
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
  const infieldY = sample(TIMELINE.pos[0], TIMELINE.pos[1]);
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
    { x: LETTERS.origin[0] + 6, z: LETTERS.origin[1], hx: 10, hz: 4, y: infieldY },
    { x: GRANDSTAND.pos[0], z: GRANDSTAND.pos[1], hx: 8, hz: 5 },
    ...zones.filter((zz) => !zz.id.startsWith("sector-") && !zz.id.startsWith("garage-")).map((zz) => ({ x: zz.pos[0], z: zz.pos[1], hx: zz.size[0] / 2 + 3, hz: zz.size[1] / 2 + 3, y: zz.id === "contact" ? undefined : infieldY })),
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
        const k = 1 - THREE.MathUtils.smoothstep(d, 0, 8);
        h[j * n + i] = THREE.MathUtils.lerp(h[j * n + i], y0, k);
      }
    }
  }

  // Pads must never push land up through the asphalt or the shoulder.
  for (let i = 0; i < h.length; i++) {
    if (roadD[i] < TRACK_WIDTH / 2 + 0.5) h[i] = Math.min(h[i], roadY[i] - 0.22);
    else if (roadD[i] < TRACK_WIDTH / 2 + 2.5) h[i] = Math.min(h[i], roadY[i]);
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
