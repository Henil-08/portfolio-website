import { CatmullRomCurve3, Vector3 } from "three";

/**
 * Circuit layout. Everything here is plain data computed once at module load,
 * so components can read it without worrying about render purity.
 * World units are metres, Y is up, the track lies flat on y = 0.
 */

export const HALF_WIDTH = 7; // half the asphalt width
export const KERB_WIDTH = 1.6;
export const SAMPLES = 640; // evenly spaced points along the centre line

// Control points, clockwise when seen from above. Index 0 is the start line.
const CONTROL: [number, number][] = [
  [0, -120],
  [140, -120],
  [215, -102],
  [250, -45],
  [222, 15],
  [150, 38],
  [112, 88],
  [140, 150],
  [100, 204],
  [0, 205],
  [-82, 172],
  [-112, 112],
  [-180, 92],
  [-232, 30],
  [-212, -62],
  [-140, -112],
];

const curve = new CatmullRomCurve3(
  CONTROL.map(([x, z]) => new Vector3(x, 0, z)),
  true,
  "centripetal",
);

export type TrackSample = {
  x: number;
  z: number;
  /** unit tangent (direction of travel) */
  tx: number;
  tz: number;
  /** unit normal pointing to the driver's left */
  nx: number;
  nz: number;
  /** 1 / radius, signed; 0 on straights */
  curvature: number;
};

const raw = curve.getSpacedPoints(SAMPLES).slice(0, SAMPLES);

export const samples: TrackSample[] = raw.map((p, i) => {
  const next = raw[(i + 1) % SAMPLES];
  const prev = raw[(i - 1 + SAMPLES) % SAMPLES];
  const dx = next.x - prev.x;
  const dz = next.z - prev.z;
  const len = Math.hypot(dx, dz) || 1;
  const tx = dx / len;
  const tz = dz / len;
  // Left of travel direction for heading (sin h, cos h) is (cos h, -sin h)
  return { x: p.x, z: p.z, tx, tz, nx: tz, nz: -tx, curvature: 0 };
});

export const TRACK_LENGTH = curve.getLength();
export const SAMPLE_SPACING = TRACK_LENGTH / SAMPLES;

// Signed curvature from tangent change across a few samples
for (let i = 0; i < SAMPLES; i++) {
  const a = samples[(i - 3 + SAMPLES) % SAMPLES];
  const b = samples[(i + 3) % SAMPLES];
  const cross = a.tx * b.tz - a.tz * b.tx;
  const dot = a.tx * b.tx + a.tz * b.tz;
  samples[i].curvature = Math.atan2(cross, dot) / (6 * SAMPLE_SPACING);
}

/** Corners get kerbs: anywhere tighter than ~110 m radius, padded a little. */
export const kerbAt: boolean[] = (() => {
  const tight = samples.map((s) => Math.abs(s.curvature) > 1 / 110);
  return samples.map((_, i) => {
    for (let k = -4; k <= 4; k++) if (tight[(i + k + SAMPLES) % SAMPLES]) return true;
    return false;
  });
})();

export const headingAt = (i: number) => {
  const s = samples[((i % SAMPLES) + SAMPLES) % SAMPLES];
  return Math.atan2(s.tx, s.tz);
};

/**
 * Find the closest centre-line sample. Searches a window around `hint`
 * first (cheap), and falls back to a full scan if that looks wrong.
 */
export function nearestSample(x: number, z: number, hint = -1) {
  let best = 0;
  let bestD = Infinity;
  const scan = (from: number, to: number) => {
    for (let k = from; k <= to; k++) {
      const i = ((k % SAMPLES) + SAMPLES) % SAMPLES;
      const s = samples[i];
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  };
  if (hint >= 0) scan(hint - 40, hint + 40);
  if (hint < 0 || bestD > (HALF_WIDTH * 4) ** 2) scan(0, SAMPLES - 1);
  const s = samples[best];
  // signed lateral offset, positive = left of centre
  const lateral = (x - s.x) * s.nx + (z - s.z) * s.nz;
  return { index: best, lateral, distance: Math.sqrt(bestD) };
}

/** Distance from a point to the centre line, coarse (for placing scenery). */
function clearance(x: number, z: number) {
  let d = Infinity;
  for (let i = 0; i < SAMPLES; i += 2) {
    const s = samples[i];
    d = Math.min(d, Math.hypot(s.x - x, s.z - z));
  }
  return d;
}

// ---------------------------------------------------------------------------
// Race structure

/** Sector boundaries as sample indices. Sector 3 ends at the line (index 0). */
export const SECTOR_SPLITS = [Math.round(SAMPLES / 3), Math.round((2 * SAMPLES) / 3)];

/** One checkpoint gantry per story chapter, as fractions of a lap. */
export const CHECKPOINTS = [0.14, 0.38, 0.6, 0.84].map((f) => Math.round(f * SAMPLES));

// ---------------------------------------------------------------------------
// Off-track places

/** Pit apron beside the start straight (outside of the circuit). */
export const APRON = { minX: -55, maxX: 55, minZ: -164, maxZ: -118 };
/** Box you stop in to open the garage panel. */
export const PIT_BOX = { x: 0, z: -146, w: 9, l: 13 };
export const GARAGE = { x: 0, z: -172, w: 46, d: 14, h: 9 };

export const CRICKET = { x: -40, z: 40, radius: 34 };
export const FOOTBALL = { x: 55, z: -40, w: 44, l: 28 };

export const ZONE_RADIUS = { cricket: 40, football: 34 };

export function onApron(x: number, z: number) {
  return x > APRON.minX && x < APRON.maxX && z > APRON.minZ && z < APRON.maxZ;
}

export function inPitBox(x: number, z: number) {
  return Math.abs(x - PIT_BOX.x) < PIT_BOX.w / 2 && Math.abs(z - PIT_BOX.z) < PIT_BOX.l / 2;
}

// ---------------------------------------------------------------------------
// Scenery placement

/**
 * Grandstands: front-centre position, yaw (local +Z points away from the
 * track, the crowd looks down -Z) and width.
 */
export const GRANDSTANDS = [
  { x: 0, z: -98, yaw: 0, width: 60 },
  { x: 272, z: -45, yaw: Math.PI / 2, width: 46 },
  { x: 40, z: 228, yaw: 0, width: 54 },
  { x: -254, z: 20, yaw: -Math.PI / 2, width: 46 },
];

// Small deterministic PRNG so scenery is identical every load
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = mulberry32(8);

function blocked(x: number, z: number) {
  if (x > APRON.minX - 10 && x < APRON.maxX + 10 && z > GARAGE.z - 14 && z < APRON.maxZ) return true;
  if (Math.hypot(x - CRICKET.x, z - CRICKET.z) < CRICKET.radius + 8) return true;
  if (Math.abs(x - FOOTBALL.x) < FOOTBALL.w / 2 + 8 && Math.abs(z - FOOTBALL.z) < FOOTBALL.l / 2 + 8)
    return true;
  for (const g of GRANDSTANDS) {
    if (Math.hypot(x - g.x, z - g.z) < g.width / 2 + 10) return true;
  }
  return false;
}

export const TREES: { x: number; z: number; s: number }[] = [];
for (let tries = 0; TREES.length < 170 && tries < 6000; tries++) {
  const x = (rand() - 0.5) * 760;
  const z = (rand() - 0.5) * 700 + 40;
  if (blocked(x, z)) continue;
  if (clearance(x, z) < HALF_WIDTH + 16) continue;
  TREES.push({ x, z, s: 0.8 + rand() * 0.8 });
}
