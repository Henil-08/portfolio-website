import * as THREE from "three";
import type { Domain } from "@/content/projects";

// Where everything lives on the island. Units are meters, Y up.
// The camera looks from +X/+Z, so signs and buildings face +Z.
//
// The circuit tells the story in order. Start on the main straight (front, +Z),
// then Sector 1 Ahmedabad (east), Sector 2 Hyperlab (north-east), Sector 3
// Boston (north-west), Sector 4 Waters (west), and back to the pit lane where
// each project domain has a garage.

export const ISLAND_RADIUS = 98;
export const TRACK_WIDTH = 8;

// A street circuit with a crossover, [x, z, height].
// Main straight (low, DRS) -> T1 sweeper east -> the east esses -> NE hairpin ->
// the north tunnel straight, which runs UNDER the bridge -> the climbing loop
// behind the town -> over the bridge, 7 m up -> a long descent through the
// infield's edge -> the west sweepers -> back onto the straight.
// Heights are spread by distance so no grade passes ~9%.
export const TRACK_POINTS: [number, number, number][] = [
  [-56, 41, 0],
  [-10, 42, 0],
  [34, 41, 0],
  [54, 36, 0.28],
  [64, 24, 0.52],
  [62, 6, 0.82],
  [52, -6, 1.08],
  [60, -22, 1.36],
  [62, -40, 1.6],
  [50, -55, 1.19],
  [30, -54, 0.7],
  [12, -50, 0.3],
  [-12, -50, 0.4],
  [-26, -58, 1.57],
  [-28, -70, 2.58],
  [-14, -77, 3.95],
  [2, -72, 5.41],
  [4, -62, 6.22],
  [1, -50, 7.1],
  [-1, -38, 6.53],
  [-10, -28, 5.83],
  [-26, -25, 4.92],
  [-42, -30, 3.93],
  [-60, -36, 2.79],
  [-72, -22, 1.71],
  [-70, -4, 0.74],
  [-60, 8, 0],
  [-66, 22, 0],
  [-63, 35, 0],
];

export const trackCurve = new THREE.CatmullRomCurve3(
  TRACK_POINTS.map(([x, z, y]) => new THREE.Vector3(x, y, z)),
  true,
  "centripetal"
);

// ------------------------------------------------------------ land and water

/** Sea level, and the sea floor past the beach. */
export const SEA_Y = -0.3;
export const SEA_FLOOR = -2.4;

// The coast: a hand-drawn radius by bearing (0 = +x east, 90 = +z south, toward the
// camera), never closer than 12 m to the track. A bay in the south makes the main
// straight a waterfront in front of the chase camera; headlands in the north and
// north-west give the far-side town room.
const COAST_KEYS: [number, number][] = [
  [0, 100], [30, 96], [50, 84], [70, 62], [90, 58], [110, 62], [130, 82], [150, 90],
  [180, 92], [200, 96], [225, 106], [255, 112], [280, 108], [310, 100], [340, 104], [360, 100],
];
const COAST_N = 720;
const COAST: Float32Array = (() => {
  const reach = new Float32Array(COAST_N);
  for (const p of trackCurve.getSpacedPoints(3000)) {
    const a = (Math.atan2(p.z, p.x) + Math.PI * 2) % (Math.PI * 2);
    const k = Math.floor((a / (Math.PI * 2)) * COAST_N) % COAST_N;
    reach[k] = Math.max(reach[k], Math.hypot(p.x, p.z));
  }
  const out = new Float32Array(COAST_N);
  for (let k = 0; k < COAST_N; k++) {
    const deg = (k / COAST_N) * 360;
    let j = 0;
    while (COAST_KEYS[j + 1][0] < deg) j++;
    const [d0, r0] = COAST_KEYS[j];
    const [d1, r1] = COAST_KEYS[j + 1];
    const t = (deg - d0) / (d1 - d0);
    const base = r0 + (r1 - r0) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    // a little irregular, so it reads as a coast and not a curve
    const wobble = 2.2 * Math.sin(k * 0.061 + 1.3) + 1.4 * Math.sin(k * 0.17 + 0.4);
    // keep 12 m of land beyond the track (spread over neighbouring bearings)
    let need = 0;
    for (let q = -10; q <= 10; q++) need = Math.max(need, reach[(k + q + COAST_N) % COAST_N] + 12 - Math.abs(q) * 0.3);
    out[k] = Math.max(base + wobble, need);
  }
  return out;
})();
/** Furthest the coast reaches from the centre. */
export const MAX_R = COAST.reduce((m, v) => Math.max(m, v), 0);

/** Coast radius at a bearing (radians, atan2(z, x)). */
export function coastR(angle: number) {
  const f = ((((angle / (Math.PI * 2)) % 1) + 1) % 1) * COAST_N;
  const i = Math.floor(f);
  const t = f - i;
  return COAST[i % COAST_N] * (1 - t) + COAST[(i + 1) % COAST_N] * t;
}

/** Lakes: basins dug into low ground; their water is the sea's, at SEA_Y. */
export type Lake = { x: number; z: number; rx: number; rz: number; yaw: number };
export const LAKES: Lake[] = [
  // West infield, between the cricket ground and the west sweepers.
  { x: -51, z: 4.6, rx: 6.6, rz: 4.2, yaw: 0.3 },
];

/**
 * Channels: the harbour inlet joins the west lake to the sea, passing under the
 * west sweepers, which cross it on a low stone bridge (Harbour.tsx).
 */
export type Canal = { pts: [number, number][]; w: number };
export const CANALS: Canal[] = [
  { pts: [[-55, 4.4], [-63, 3.8], [-72, 3], [-84, 2], [-98, 1.2]], w: 5.4 },
];

/** Signed distance into a canal (positive inside, metres). */
export function canalDist(c: Canal, x: number, z: number) {
  let best = Infinity;
  for (let i = 0; i < c.pts.length - 1; i++) {
    const [ax, az] = c.pts[i];
    const [bx, bz] = c.pts[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return c.w / 2 - best;
}

/** Approximate signed distance into a lake (positive inside, metres). */
export function lakeDepthDist(l: Lake, x: number, z: number) {
  const dx = x - l.x;
  const dz = z - l.z;
  const c = Math.cos(l.yaw);
  const sn = Math.sin(l.yaw);
  const u = (dx * c - dz * sn) / l.rx;
  const v = (dx * sn + dz * c) / l.rz;
  return (1 - Math.hypot(u, v)) * Math.min(l.rx, l.rz);
}

/** Signed distance to the sea's shore: positive on land, negative in the sea. */
export function shoreDist(x: number, z: number) {
  return coastR(Math.atan2(z, x)) - Math.hypot(x, z);
}

/** True on dry land at least `margin` metres from the sea and every lake. */
export function inLand(x: number, z: number, margin = 0) {
  if (shoreDist(x, z) < margin) return false;
  return LAKES.every((l) => lakeDepthDist(l, x, z) < -margin) && CANALS.every((c) => canalDist(c, x, z) < -margin);
}

export function trackPoint(t: number) {
  return trackCurve.getPointAt(((t % 1) + 1) % 1);
}

export function trackTangent(t: number) {
  return trackCurve.getTangentAt(((t % 1) + 1) % 1);
}

// Heading (rotation about Y) for something travelling along +X in local space.
export function headingFromTangent(t: THREE.Vector3) {
  return Math.atan2(-t.z, t.x);
}

// Nearest curve parameter for a point, used for lap progress and sector detection.
const SAMPLES = 400;
const samplePts = trackCurve.getSpacedPoints(SAMPLES);
export function nearestT(x: number, z: number) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < SAMPLES; i++) {
    const p = samplePts[i];
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return { t: best / SAMPLES, dist: Math.sqrt(bd) };
}

// Where the circuit crosses itself: the upper road runs over the lower one on a
// bridge. The land follows the lower road; the bridge spans BRIDGE_HALF metres
// either side of the crossing along the upper road.
export const BRIDGE_HALF = 15;
export type Crossing = { x: number; z: number; upperT: number; lowerT: number; yUpper: number; yLower: number };
export const CROSSINGS: Crossing[] = (() => {
  const N = 900;
  const pts = trackCurve.getSpacedPoints(N);
  const out: Crossing[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 60; j < N; j++) {
      if (N - (j - i) < 60) continue;
      const a = pts[i];
      const b = pts[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) > 1.2 || Math.abs(a.y - b.y) < 3) continue;
      const [u, l] = a.y > b.y ? [i, j] : [j, i];
      if (out.some((c) => Math.abs(c.upperT - u / N) < 0.03)) continue;
      out.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, upperT: u / N, lowerT: l / N, yUpper: pts[u].y, yLower: pts[l].y });
    }
  }
  return out;
})();

/** True if this stretch of track (by t) is on a bridge deck. */
export function onBridge(t: number, extra = 0) {
  const L = trackCurve.getLength();
  return CROSSINGS.some((c) => {
    const dt = Math.abs(((t - c.upperT + 1.5) % 1) - 0.5);
    return dt * L < BRIDGE_HALF + extra;
  });
}

/** True within r metres (plan) of a crossing: nothing tall may stand under or through the bridge. */
export function nearCrossing(x: number, z: number, r = BRIDGE_HALF + 3) {
  return CROSSINGS.some((c) => Math.hypot(x - c.x, z - c.z) < r);
}

/** Nearest track parameter in 3D: tells the bridge from the road under it. */
export function nearestT3(x: number, y: number, z: number) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < SAMPLES; i++) {
    const p = samplePts[i];
    const d = (p.x - x) ** 2 + 4 * (p.y - y) ** 2 + (p.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best / SAMPLES;
}

export const START_T = 0.06;

// Sectors: the stretch of track each one covers. Each place's scenery is placed
// from the track itself: at the stretch's midpoint, on the side away from the
// camera (which sits to the +X/+Z of the car), a few metres past the kerb,
// facing the road. That way it's always in frame and never blocks the view.
const SECTOR_DEFS = [
  { n: 1, id: "ahmedabad", name: "Ahmedabad", place: "Nirma University", year: "2021", from: 0.18, to: 0.36 },
  { n: 2, id: "hyperlab", name: "Hyperlab", place: "Hyperlab", year: "2022–23", from: 0.36, to: 0.49 },
  { n: 3, id: "boston", name: "Boston", place: "Boston", year: "2023–25", from: 0.49, to: 0.7 },
  { n: 4, id: "waters", name: "Waters", place: "Waters", year: "2026 →", from: 0.7, to: 0.97 },
] as const;

export const PIT = { z: 32, from: -34, to: 26, garageZ: 22 };

// Pit entry and exit lanes: from the straight's inner lane into each end of the pit lane.
export const PIT_LANE_WIDTH = 5.6;
const LANE = PIT_LANE_WIDTH;
/** From a point on the track's inner lane to one end of the pit lane. */
function laneCurve(tTrack: number, pitX: number, dir: 1 | -1) {
  const p = trackPoint(tTrack);
  const tan = trackTangent(tTrack);
  const inner = new THREE.Vector3(-tan.z, 0, tan.x);
  if (inner.z > 0) inner.negate(); // the pit lane is on the -z side of the straight
  const a = p.clone().addScaledVector(inner, TRACK_WIDTH / 2 - LANE / 2 + 0.4);
  const end = new THREE.Vector3(pitX, 0, PIT.z);
  const pts = [a, a.clone().addScaledVector(tan, 10 * dir), end.clone().add(new THREE.Vector3(-10 * dir, 0, 0)), end];
  return new THREE.CubicBezierCurve3(pts[0], pts[1], pts[2], pts[3]);
}

let curves: THREE.CubicBezierCurve3[] | null = null;
/** The entry and exit lane centrelines (the grass mask clears them too). */
export function pitRoadCurves() {
  curves ??= [laneCurve(nearestT(PIT.from - 22, 41).t, PIT.from - 4, 1), laneCurve(nearestT(PIT.to + 20, 40).t, PIT.to + 4, -1)];
  return curves;
}


const AWAY = new THREE.Vector3(-1, 0, -1).normalize();

// Each scene is about 28 x 10 m (local x across, -z away from the road). Find
// a spot along the sector's stretch where that whole footprint stays clear of
// every part of the track, inside the island, away from the infield zones.
export const SCENE_FOOT = { hx: 14.5, back: 10.5, front: 1 };
const INFIELD: [number, number][] = [[20, 8], [-28, 8], [-30, -20], [14, -18], [42, 26], [0, 3], [6, -78]];

function footprintClear(cx: number, cz: number, rot: number) {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 4; j++) {
      const lx = -SCENE_FOOT.hx + (i / 8) * SCENE_FOOT.hx * 2;
      const lz = SCENE_FOOT.front - (j / 4) * (SCENE_FOOT.back + SCENE_FOOT.front);
      // local -> world for a group rotated by `rot` about Y
      const x = cx + lx * c + lz * sn;
      const z = cz - lx * sn + lz * c;
      if (nearestT(x, z).dist < TRACK_WIDTH / 2 + 2.2) return false;
      if (!inLand(x, z, 6)) return false;
      if (x > PIT.from - 10 && x < PIT.to + 10 && z > PIT.garageZ - 8 && z < PIT.z + 6) return false;
      for (const [ix, iz] of INFIELD) if (Math.hypot(x - ix, z - iz) < 12) return false;
    }
  }
  return true;
}

function placeScene(from: number, to: number) {
  const mid = (from + to) / 2;
  let best: { c: THREE.Vector3; rot: number; t: number; score: number } | null = null;
  for (let k = 0; k <= 24; k++) {
    const t = from + 0.02 + ((to - from - 0.04) * k) / 24;
    const p = trackPoint(t);
    const tan = trackTangent(t);
    for (const side of [1, -1]) {
      const n = new THREE.Vector3(-tan.z, 0, tan.x).multiplyScalar(side);
      for (let off = 3.5; off <= 12; off += 1.5) {
        const c = p.clone().addScaledVector(n, TRACK_WIDTH / 2 + off);
        const rot = Math.atan2(-n.x, -n.z); // local +Z faces the track
        if (!footprintClear(c.x, c.z, rot)) continue;
        const score = Math.abs(t - mid) * 40 + off + (n.dot(AWAY) < 0 ? 6 : 0);
        if (!best || score < best.score) best = { c, rot, t, score };
      }
    }
  }
  if (best) return best;
  const p = trackPoint(mid);
  const tan = trackTangent(mid);
  const n = new THREE.Vector3(-tan.z, 0, tan.x);
  if (n.dot(AWAY) < 0) n.negate();
  return { c: p.clone().addScaledVector(n, TRACK_WIDTH / 2 + 3.5), rot: Math.atan2(-n.x, -n.z), t: mid, score: 0 };
}

export const SECTORS = SECTOR_DEFS.map((d) => {
  const t = (d.from + d.to) / 2;
  const at = placeScene(d.from, d.to);
  return {
    ...d,
    t,
    /** Where along the track the scene sits (its ground level is the road height there). */
    sceneT: at.t,
    scene: [at.c.x, at.c.z] as [number, number],
    sceneRot: at.rot,
  };
});

export type SectorId = (typeof SECTORS)[number]["id"];

export function sectorAt(t: number) {
  return SECTORS.find((s) => t >= s.from && t < s.to) ?? null;
}

// Pit lane runs just inside the main straight. One garage per project domain.
export const GARAGES: { domain: Domain; x: number }[] = [
  { domain: "agents", x: -28 },
  { domain: "genai", x: -16 },
  { domain: "hardware", x: -4 },
  { domain: "vision", x: 8 },
  { domain: "ml", x: 20 },
];

export type ZoneId =
  | `sector-${1 | 2 | 3 | 4}`
  | `garage-${Domain}`
  | "playbook"
  | "podium"
  | "cricket"
  | "football"
  | "contact";

export type Zone = {
  id: ZoneId;
  label: string;
  hint: string;
  pos: [number, number];
  size: [number, number];
  rotY?: number;
  spawn: [number, number, number]; // x, z, heading
};

// A place's hotspot sits on the track right beside its scenery.
export function sectorT(i: number) {
  return SECTORS[i].t;
}

function sectorZone(i: number): Zone {
  const s = SECTORS[i];
  const t = sectorT(i);
  const p = trackPoint(t);
  const back = trackPoint(t - 0.02);
  return {
    id: `sector-${s.n}` as ZoneId,
    label: s.place,
    hint: s.name,
    pos: [p.x, p.z],
    size: [16, 16],
    rotY: headingFromTangent(trackTangent(t)),
    spawn: [back.x, back.z, headingFromTangent(trackTangent(t - 0.02))],
  };
}

export const garageLabel: Record<Domain, string> = {
  agents: "Agents",
  genai: "Gen AI",
  hardware: "AI × Hardware",
  vision: "Vision",
  ml: "ML & Data",
};

export const zones: Zone[] = [
  sectorZone(0),
  sectorZone(1),
  sectorZone(2),
  sectorZone(3),
  ...GARAGES.map<Zone>((g) => ({
    id: `garage-${g.domain}` as ZoneId,
    label: garageLabel[g.domain],
    hint: "Garage",
    pos: [g.x, PIT.garageZ],
    size: [9, 8],
    spawn: [g.x, PIT.z, Math.PI / 2],
  })),
  { id: "playbook", label: "Tyre wall", hint: "How I work with AI", pos: [20, 8], size: [11, 8], spawn: [12, 12, 0] },
  { id: "podium", label: "Podium", hint: "Papers and patents", pos: [-28, 8], size: [10, 8], spawn: [-20, 12, Math.PI] },
  { id: "cricket", label: "Cricket", hint: "Off the clock", pos: [-46, -8], size: [22, 8], spawn: [-32, -8, Math.PI] },
  { id: "football", label: "Football", hint: "Off the clock", pos: [14, -18], size: [18, 14], spawn: [2, -10, 0] },
  { id: "contact", label: "Mailbox", hint: "Say hi", pos: [42, 26], size: [9, 8], spawn: [36, 30, -Math.PI / 4] },
];

export const zoneById = Object.fromEntries(zones.map((z) => [z.id, z])) as Record<ZoneId, Zone>;


/**
 * The name in the middle of the infield, where the drive starts (like Bruno's
 * landing). Knockable letters; Places lays them out from the glyph widths.
 * `hx` is the half width of the whole word pair, for pads and clearances.
 */
export const LETTERS = { text: "HENIL GAJJAR", center: [19, -3.2] as [number, number], scale: 1.2, hx: 10 };
// Spawn in front of the name, on the garden path, facing east: the chase
// camera opens on the car with HENIL GAJJAR behind it.
export const SPAWN: [number, number, number] = [LETTERS.center[0] - 3, LETTERS.center[1] + 6.2, 0];
/** Career timeline plaza (components/world/Timeline.tsx): centre, world-axis half size, yaw. */
export const TIMELINE = { pos: [-6, 3] as [number, number], hx: 15.5, hz: 9.5, rot: Math.PI / 2 }; // time runs west
/** Infield grandstand looking north over the tunnel straight and the bridge. */
export const GRANDSTAND = { pos: [26, -37] as [number, number], rot: Math.PI };
export const GANTRY_T = START_T;
