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

// A proper street circuit, with elevation: [x, z, height].
// Main straight (low, DRS) -> T1 Mercury hairpin -> Stallion esses climbing ->
// T4 crest at Hyperlab (+9 m) -> The Pitch chicane -> Charles River sweep diving
// downhill like Eau Rouge -> Lab complex -> MCP corner -> back onto the straight.
export const TRACK_POINTS: [number, number, number][] = [
  [-56, 41, 0],
  [-10, 42, 0],
  [34, 41, 0],
  [54, 36, 0.3],
  [64, 25, 0.8],
  [58, 13, 1.5],
  [45, 9, 2.4],
  [36, 0, 3.4],
  [44, -9, 4.6],
  [58, -15, 6],
  [67, -27, 7.6],
  [59, -41, 9],
  [41, -46, 9.2],
  [27, -38, 8.6],
  [16, -42, 7.8],
  [5, -51, 6.6],
  [-11, -55, 4.6],
  [-27, -50, 2.8],
  [-36, -39, 2],
  [-49, -41, 1.8],
  [-63, -35, 1.4],
  [-71, -22, 1],
  [-69, -6, 0.6],
  [-60, 6, 0.2],
  [-66, 22, 0],
  [-63, 35, 0],
];

export const trackCurve = new THREE.CatmullRomCurve3(
  TRACK_POINTS.map(([x, z, y]) => new THREE.Vector3(x, y, z)),
  true,
  "centripetal"
);

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

export const START_T = 0.06;

// Sectors: the stretch of track each one covers. Each place's scenery is placed
// from the track itself: at the stretch's midpoint, on the side away from the
// camera (which sits to the +X/+Z of the car), a few metres past the kerb,
// facing the road. That way it's always in frame and never blocks the view.
const SECTOR_DEFS = [
  { n: 1, id: "ahmedabad", name: "Ahmedabad", place: "Nirma University", year: "2021", from: 0.24, to: 0.42 },
  { n: 2, id: "hyperlab", name: "Hyperlab", place: "Hyperlab", year: "2022–23", from: 0.42, to: 0.56 },
  { n: 3, id: "boston", name: "Boston", place: "Boston", year: "2023–25", from: 0.56, to: 0.74 },
  { n: 4, id: "waters", name: "Waters", place: "Waters", year: "2026 →", from: 0.74, to: 0.97 },
] as const;

const AWAY = new THREE.Vector3(-1, 0, -1).normalize();

export const SECTORS = SECTOR_DEFS.map((d) => {
  const t = (d.from + d.to) / 2;
  const p = trackPoint(t);
  const tan = trackTangent(t);
  const n = new THREE.Vector3(-tan.z, 0, tan.x);
  if (n.dot(AWAY) < 0) n.negate();
  const c = p.clone().addScaledVector(n, TRACK_WIDTH / 2 + 3.5);
  return {
    ...d,
    t,
    scene: [c.x, c.z] as [number, number],
    sceneRot: Math.atan2(-n.x, -n.z), // local +Z faces the track
  };
});

export type SectorId = (typeof SECTORS)[number]["id"];

export function sectorAt(t: number) {
  return SECTORS.find((s) => t >= s.from && t < s.to) ?? null;
}

// Pit lane runs just inside the main straight. One garage per project domain.
export const PIT = { z: 32, from: -34, to: 26, garageZ: 22 };
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
  { id: "cricket", label: "Cricket", hint: "Off the clock", pos: [-30, -20], size: [22, 8], spawn: [-16, -20, Math.PI] },
  { id: "football", label: "Football", hint: "Off the clock", pos: [14, -18], size: [18, 14], spawn: [2, -10, 0] },
  { id: "contact", label: "Mailbox", hint: "Say hi", pos: [42, 26], size: [9, 8], spawn: [36, 30, -Math.PI / 4] },
];

export const zoneById = Object.fromEntries(zones.map((z) => [z.id, z])) as Record<ZoneId, Zone>;

// Spawn on the grid just behind the start line, facing down the straight.
const sp = trackPoint(START_T - 0.012);
export const SPAWN: [number, number, number] = [sp.x, sp.z, headingFromTangent(trackTangent(START_T))];

export const LETTERS = { chars: ["H", "E", "N", "I", "L"] as const, origin: [-6.5, -4] as [number, number], gap: 3 };
export const GRANDSTAND = { pos: [6, -78] as [number, number] };
export const GANTRY_T = START_T;
