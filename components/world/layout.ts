import * as THREE from "three";

// Where everything lives on the island. Units are meters, Y up.
// The camera looks from +X/+Z, so signs and buildings face +Z.

export const ISLAND_RADIUS = 82;
export const TRACK_WIDTH = 7;

// Closed loop through these points (CatmullRom).
export const TRACK_POINTS: [number, number][] = [
  [-44, 24],
  [-16, 36],
  [18, 35],
  [44, 20],
  [52, -6],
  [36, -28],
  [6, -36],
  [-22, -26],
  [-36, -6],
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

export type ZoneId =
  | "story-1"
  | "story-2"
  | "story-3"
  | "story-4"
  | "work"
  | "garage"
  | "sidequest"
  | "playbook"
  | "podium"
  | "cricket"
  | "football"
  | "contact";

export type Zone = {
  id: ZoneId;
  label: string;
  hint: string;
  pos: [number, number]; // x, z of the zone center
  size: [number, number]; // sensor footprint, x and z
  rotY?: number;
  spawn: [number, number, number]; // where teleport drops the car (x, z, heading)
};

const storyT = [0.06, 0.31, 0.56, 0.8];

function storyZone(i: number): Zone {
  const t = storyT[i];
  const p = trackPoint(t);
  const tan = trackTangent(t);
  const h = headingFromTangent(tan);
  const back = trackPoint(t - 0.03);
  return {
    id: `story-${i + 1}` as ZoneId,
    label: `Lap ${i + 1}`,
    hint: "Story",
    pos: [p.x, p.z],
    size: [12, 12],
    rotY: h,
    spawn: [back.x, back.z, headingFromTangent(trackTangent(t - 0.03))],
  };
}

export const zones: Zone[] = [
  storyZone(0),
  storyZone(1),
  storyZone(2),
  storyZone(3),
  { id: "work", label: "Pit wall", hint: "Where I've worked", pos: [-2, 26], size: [12, 8], spawn: [-2, 18, 0] },
  { id: "garage", label: "Garage", hint: "Things I've built", pos: [-62, 2], size: [12, 12], rotY: Math.PI / 2, spawn: [-50, 2, Math.PI] },
  { id: "sidequest", label: "Side quest", hint: "AI for chips", pos: [66, -12], size: [12, 12], rotY: -Math.PI / 2, spawn: [54, -12, 0] },
  { id: "playbook", label: "Tyre wall", hint: "How I work with AI", pos: [12, 16], size: [11, 8], spawn: [4, 10, 0] },
  { id: "podium", label: "Podium", hint: "Papers and patents", pos: [-18, -10], size: [10, 8], spawn: [-10, -2, Math.PI] },
  { id: "cricket", label: "Cricket", hint: "Off the clock", pos: [-18, 12], size: [22, 8], spawn: [-4, 12, Math.PI] },
  { id: "football", label: "Football", hint: "Off the clock", pos: [26, -10], size: [18, 14], spawn: [14, -2, 0] },
  { id: "contact", label: "Mailbox", hint: "Say hi", pos: [22, -48], size: [10, 8], spawn: [22, -42, Math.PI / 2] },
];

export const zoneById = Object.fromEntries(zones.map((z) => [z.id, z])) as Record<ZoneId, Zone>;

export const SPAWN: [number, number, number] = [0, 6, 0]; // x, z, heading. Faces +X on the plaza.

// Props that the car can knock around.
export const LETTERS = { chars: ["H", "E", "N", "I", "L"] as const, origin: [-5.5, -2] as [number, number], gap: 2.6 };
export const GRANDSTAND = { pos: [-8, -48] as [number, number] };
export const GANTRY_T = 0.98;
