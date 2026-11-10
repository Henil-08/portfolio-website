// Journey B's road as plain geometry (no React): a leg east along the garden's spine, a hairpin
// north, and a leg back west. Shared by ./JourneyB.tsx, the grass mask (./footprint.ts) and the
// review page. Distances along it are `s` (metres from the west end of the first leg).
import type { Sample } from "./gl";

export const ROAD = {
  /** first leg, eastbound along this z */
  z1: 3.2,
  /** the hairpin's radius (centreline): wide enough for every vehicle at full lock */
  r: 4.6,
  /** where the first leg starts and the hairpin begins (x) */
  x0: -17,
  xTurn: -4.5,
  /** where the back leg ends (x) */
  x2: -13.5,
  half: 1.6,
  verge: 1.3,
};
/** The back leg's z. */
export const Z2 = ROAD.z1 - ROAD.r * 2;
const CX = ROAD.xTurn;
const CZ = ROAD.z1 - ROAD.r;
const L1 = ROAD.xTurn - ROAD.x0;
const LH = Math.PI * ROAD.r;
const L2 = ROAD.xTurn - ROAD.x2;
/** Where the hairpin starts and ends (s). */
export const S_TURN0 = L1;
export const S_TURN1 = L1 + LH;
export const ROAD_LEN = L1 + LH + L2;

/** A point on the centreline at distance s, with its unit tangent. */
export function roadAt(s: number): Sample {
  if (s <= L1) return { x: ROAD.x0 + s, z: ROAD.z1, tx: 1, tz: 0, s };
  if (s <= L1 + LH) {
    // a left turn from heading east to heading west, through north (-z)
    const a = (s - L1) / ROAD.r; // 0..PI
    return { x: CX + Math.sin(a) * ROAD.r, z: CZ + Math.cos(a) * ROAD.r, tx: Math.cos(a), tz: -Math.sin(a), s };
  }
  const d = s - L1 - LH;
  return { x: ROAD.xTurn - d, z: Z2, tx: -1, tz: 0, s };
}

/** The centreline every `step` metres. */
export function roadSamples(step = 0.25): Sample[] {
  const n = Math.ceil(ROAD_LEN / step);
  return Array.from({ length: n + 1 }, (_, i) => roadAt(Math.min(ROAD_LEN, i * step)));
}

/** Nearest point on the road to (x, z): its s and the signed lateral offset (+ left of travel). */
export function nearestOnRoad(x: number, z: number) {
  // straight legs
  const c1 = Math.max(0, Math.min(L1, x - ROAD.x0));
  const d1 = Math.hypot(x - (ROAD.x0 + c1), z - ROAD.z1);
  const c2 = Math.max(0, Math.min(L2, ROAD.xTurn - x));
  const d2 = Math.hypot(x - (ROAD.xTurn - c2), z - Z2);
  // the hairpin's half circle (east of its centre)
  const a = Math.atan2(x - CX, z - CZ); // 0 at the start (south), PI/2 east, PI at the end
  const ac = Math.max(0, Math.min(Math.PI, a < -Math.PI / 2 ? Math.PI : a));
  const hx = CX + Math.sin(ac) * ROAD.r;
  const hz = CZ + Math.cos(ac) * ROAD.r;
  const dh = Math.hypot(x - hx, z - hz);
  let s: number;
  let d: number;
  if (d1 <= d2 && d1 <= dh) {
    s = c1;
    d = d1;
  } else if (dh <= d2) {
    s = L1 + ac * ROAD.r;
    d = dh;
  } else {
    s = L1 + LH + c2;
    d = d2;
  }
  const p = roadAt(s);
  // left of travel is (tz, -tx)
  const off = (x - p.x) * p.tz + (z - p.z) * -p.tx;
  return { s, d, off };
}
