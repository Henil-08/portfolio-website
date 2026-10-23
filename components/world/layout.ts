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

export const TRACK_POINTS: [number, number][] = [
  [-40, 46], // main straight, heading +X
  [0, 47],
  [40, 46],
  [60, 36], // turn 1
  [66, 12], // sector 1 runs north along the east side
  [62, -18],
  [48, -44], // hairpin into sector 2
  [22, -56],
  [-6, -52], // sector 3
  [-36, -50],
  [-58, -32],
  [-66, -4], // sector 4 down the west side
  [-60, 26],
];

export const trackCurve = new THREE.CatmullRomCurve3(
  TRACK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
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
  { n: 1, id: "ahmedabad", name: "Ahmedabad", place: "Nirma University", year: "2021", from: 0.26, to: 0.46 },
  { n: 2, id: "hyperlab", name: "Hyperlab", place: "Hyperlab", year: "2022–23", from: 0.46, to: 0.62 },
  { n: 3, id: "boston", name: "Boston", place: "Boston", year: "2023–25", from: 0.62, to: 0.8 },
  { n: 4, id: "waters", name: "Waters", place: "Waters", year: "2026 →", from: 0.8, to: 0.98 },
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
export const PIT = { z: 37, from: -34, to: 34, garageZ: 27 };
export const GARAGES: { domain: Domain; x: number }[] = [
  { domain: "agents", x: -24 },
  { domain: "genai", x: -12 },
  { domain: "hardware", x: 0 },
  { domain: "vision", x: 12 },
  { domain: "ml", x: 24 },
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
  { id: "playbook", label: "Tyre wall", hint: "How I work with AI", pos: [22, 8], size: [11, 8], spawn: [14, 14, 0] },
  { id: "podium", label: "Podium", hint: "Papers and patents", pos: [-22, 8], size: [10, 8], spawn: [-14, 14, Math.PI] },
  { id: "cricket", label: "Cricket", hint: "Off the clock", pos: [-22, -22], size: [22, 8], spawn: [-8, -22, Math.PI] },
  { id: "football", label: "Football", hint: "Off the clock", pos: [24, -22], size: [18, 14], spawn: [12, -14, 0] },
  { id: "contact", label: "Mailbox", hint: "Say hi", pos: [44, 30], size: [9, 8], spawn: [38, 36, -Math.PI / 4] },
];

export const zoneById = Object.fromEntries(zones.map((z) => [z.id, z])) as Record<ZoneId, Zone>;

// Spawn on the grid just behind the start line, facing down the straight.
const sp = trackPoint(START_T - 0.012);
export const SPAWN: [number, number, number] = [sp.x, sp.z, headingFromTangent(trackTangent(START_T))];

export const LETTERS = { chars: ["H", "E", "N", "I", "L"] as const, origin: [-6.5, -4] as [number, number], gap: 3 };
export const GRANDSTAND = { pos: [6, -78] as [number, number] };
export const GANTRY_T = START_T;
