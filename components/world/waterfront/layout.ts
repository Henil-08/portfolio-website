// Where the waterfront goes: the promenade's centreline along the south bay and
// the pier. Pure data, shared by the renderer (./index.tsx), the grass mask and
// the tree scatter (which keeps off the walk).
import { SEA_Y, TRACK_WIDTH, coastR, nearestT } from "../layout";

const FROM = 32; // bearings (degrees) the promenade runs between, along the bay
const TO = 158;
const INSET = 4.5; // centreline, metres in from the shore
export const PROM_W = 3;

/** The promenade's centreline, west to east along the bay. */
export const PROMENADE: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let d = TO; d >= FROM; d -= 0.4) {
    const a = (d * Math.PI) / 180;
    let r = coastR(a) - INSET;
    // never closer than 9.5 m to the track: give way by sliding toward the beach
    for (let k = 0; k < 6 && nearestT(Math.cos(a) * r, Math.sin(a) * r).dist < TRACK_WIDTH / 2 + 5.5; k++) r += 0.5;
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
})();

/** True if (x, z) is on the promenade (plus `pad`). */
export function nearPromenade(x: number, z: number, pad = 0) {
  for (let i = 0; i < PROMENADE.length; i += 2) if (Math.hypot(PROMENADE[i][0] - x, PROMENADE[i][1] - z) < PROM_W / 2 + pad) return true;
  return false;
}

// The pier leaves the promenade due south, in the middle of the bay.
export const PIER_I = Math.round(PROMENADE.length * 0.5);
export const PIER = (() => {
  const [x, z] = PROMENADE[PIER_I];
  const a = Math.atan2(z, x);
  return { x, z, dx: Math.cos(a), dz: Math.sin(a), len: 18, w: 2.6, y: SEA_Y + 0.62 };
})();

/** Side vector (toward the sea) and tangent at a promenade index. */
export function frame(i: number) {
  const [x0, z0] = PROMENADE[Math.max(0, i - 1)];
  const [x1, z1] = PROMENADE[Math.min(PROMENADE.length - 1, i + 1)];
  const l = Math.hypot(x1 - x0, z1 - z0) || 1;
  const tx = (x1 - x0) / l;
  const tz = (z1 - z0) / l;
  // outward (away from the island centre)
  let nx = -tz;
  let nz = tx;
  if (nx * PROMENADE[i][0] + nz * PROMENADE[i][1] < 0) {
    nx = -nx;
    nz = -nz;
  }
  return { tx, tz, nx, nz };
}

/** Paint the promenade and the pier on a world-space canvas (the grass mask). */
export function paintWaterfront(g: CanvasRenderingContext2D, tx: (v: number) => number, s: number) {
  g.save();
  g.lineCap = g.lineJoin = "round";
  g.lineWidth = (PROM_W + 1) * s;
  g.beginPath();
  PROMENADE.forEach(([x, z], i) => (i ? g.lineTo(tx(x), tx(z)) : g.moveTo(tx(x), tx(z))));
  g.stroke();
  g.restore();
}

/** Promenade lamps: every 32 samples along the sea edge (none by the pier's foot), and one at the pier's end. */
export const PROM_LAMPS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 12; i < PROMENADE.length; i += 32) {
    if (Math.abs(i - PIER_I) < 6) continue;
    const f = frame(i);
    out.push([PROMENADE[i][0] + f.nx * (PROM_W / 2 - 0.2), PROMENADE[i][1] + f.nz * (PROM_W / 2 - 0.2)]);
  }
  return out;
})();
export const PIER_LAMP: [number, number] = [PIER.x + PIER.dx * (PIER.len - 0.6), PIER.z + PIER.dz * (PIER.len - 0.6)];
