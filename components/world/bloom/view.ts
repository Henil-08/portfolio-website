// The garage select's box and camera, shared by the canvas (bloom/Opening.tsx), the chrome
// (components/ui/GarageSelect.tsx) and the boot's still of the dotted floor (components/ui/Boot.tsx),
// so the boot hands over to the garage in place: same floor, same vanishing point.
// No three.js here: the boot draws its floor before the world (and three) has loaded.
import { VEHICLE_SCALE } from "../vehicles/scale";
import type { VehicleCode } from "../vehicles/liveries";
import { START_SPOT } from "../startSpot";

/**
 * Turntable size: each vehicle is scaled so its swept radius lands at a set radius. TH-18 is the
 * biggest at 1.42, just inside the dial ring's inner edge; the others sit between true proportion
 * and all the same size (owner, 2026-10-26).
 */
export const TABLE_SCALE: Record<VehicleCode, number> = { V01: 1.42 / 3.02, V02: 1.0 / 1.33, V03: 1.25 / 2.55, V04: 0.95 / 1.03 };
/** table units to world metres, per vehicle */
export const kOf = (code: VehicleCode) => VEHICLE_SCALE / TABLE_SCALE[code];

/** The select camera, in table units round the vehicle's spot: where it sits, what it looks at, its fov over the cell. */
export const SELECT_CAM: [number, number, number] = [4.3, 2.15, 4.9];
export const SELECT_TARGET_Y = 0.42;
export const SELECT_FOV = 30;
/** The game's chase camera offset (Rig.tsx), and the select view's azimuth: 0.9 rad round from it. */
export const GAME_OFFSET: [number, number, number] = [10.5, 12.5, 14];
export const SELECT_AZ = Math.atan2(GAME_OFFSET[2], GAME_OFFSET[0]) + 0.9;
export const SELECT_EL = Math.asin(SELECT_CAM[1] / Math.hypot(...SELECT_CAM));
/** The dot floor's height under the table top in the garage (table units). */
export const FLOOR_SELECT = -0.15;

/** The paper dot floor: paper with one square dot per 3 m cell, faded into the paper by the fog. */
export const FLOOR = { paper: "#ebe9e3", dot: "#b9b6ab", cell: 3, dotSize: 3 * (6 / 64), half: 450, fogNear: 160, fogFar: 440 } as const;

/**
 * The garage box (owner, 2026-10-26: "the normal small size and the box in the background"):
 * at most 1100 x 640, centred, with the dotted floor all round it. Below 768 px wide it fills the
 * screen inside a 12 px margin and stacks. Heights are fixed so the cell is known before the
 * chrome mounts (the boot draws the floor for it).
 */
export const BOX = {
  wide: { maxW: 1100, maxH: 640, gutter: 24, header: 34, foot: 56, side: 300 },
  narrow: { gutter: 12, header: 34, spec: 96, cards: 102, drive: 58 },
  border: 2,
} as const;
export const isWide = (vw: number) => vw >= 768;

export type Rect = { left: number; top: number; width: number; height: number };

export function boxRect(vw: number, vh: number): Rect {
  if (isWide(vw)) {
    const b = BOX.wide;
    const width = Math.min(b.maxW, vw - 2 * b.gutter);
    const height = Math.min(b.maxH, vh - 2 * b.gutter);
    return { left: (vw - width) / 2, top: (vh - height) / 2, width, height };
  }
  const g = BOX.narrow.gutter;
  return { left: g, top: g, width: vw - 2 * g, height: vh - 2 * g };
}

/** The 3D cell inside the box, where the turntable is framed. */
export function cellRect(vw: number, vh: number): Rect {
  const b = boxRect(vw, vh);
  const e = BOX.border;
  if (isWide(vw)) {
    const w = BOX.wide;
    return { left: b.left + e, top: b.top + e + w.header, width: b.width - 2 * e - w.side, height: Math.max(1, b.height - 2 * e - w.header - w.foot) };
  }
  const n = BOX.narrow;
  return { left: b.left + e, top: b.top + e + n.header, width: b.width - 2 * e, height: Math.max(1, b.height - 2 * e - n.header - n.spec - n.cards - n.drive) };
}

/** height / width of the desktop cell (1100 x 640 box): narrower cells frame by their width */
const CELL_ASPECT = 0.7;

/** The select camera over a frame F with the cell C: its vertical fov (deg) and view offset (px). */
export function selectLens(F: { width: number; height: number }, C: Rect | null) {
  if (!C || !F.height || !C.height) return { fov: SELECT_FOV, ox: 0, oy: 0 };
  // a tall, narrow cell (phones) frames by its width, as if it were a desktop cell's shape
  const ch = Math.min(C.height, C.width * CELL_ASPECT);
  const fov = (2 * Math.atan((Math.tan(((SELECT_FOV / 2) * Math.PI) / 180) * F.height) / ch) * 180) / Math.PI;
  return { fov, ox: F.width / 2 - (C.left + C.width / 2), oy: F.height / 2 - (C.top + C.height / 2) };
}

/**
 * Draws the dotted floor as the select camera sees it (before any drag) into a 2D canvas of
 * W x H css px at `dpr`, for the vehicle `code`: the boot's background, the same picture the
 * canvas shows once the garage opens.
 */
export function drawFloor(g: CanvasRenderingContext2D, W: number, H: number, dpr: number, code: VehicleCode, vignette: boolean) {
  const k = kOf(code);
  const C = cellRect(W, H);
  const { fov, ox, oy } = selectLens({ width: W, height: H }, C);
  const r = Math.hypot(...SELECT_CAM);
  // the camera and its target round the spot (y from the table top), in metres
  const cx = Math.cos(SELECT_EL) * Math.cos(SELECT_AZ) * r * k;
  const cy = (SELECT_TARGET_Y + Math.sin(SELECT_EL) * r) * k;
  const cz = Math.cos(SELECT_EL) * Math.sin(SELECT_AZ) * r * k;
  let fx = -cx;
  let fy = SELECT_TARGET_Y * k - cy;
  let fz = -cz;
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = f x up, up' = right x f
  let rx = -fz;
  let rz = fx;
  const rl = Math.hypot(rx, rz);
  rx /= rl;
  rz /= rl;
  const ux = -rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy;
  const fpx = H / 2 / Math.tan(((fov / 2) * Math.PI) / 180);
  const y = FLOOR_SELECT * k;

  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = FLOOR.paper;
  g.fillRect(0, 0, W, H);
  // dots in fog bands, one path per band
  const BANDS = 12;
  const paths = Array.from({ length: BANDS }, () => new Path2D());
  const used = new Array<boolean>(BANDS).fill(false);
  const [sx0, sz0] = [START_SPOT[0], START_SPOT[1]];
  const reach = FLOOR.fogFar + 10;
  const h = FLOOR.dotSize / 2;
  const i0 = Math.ceil((sx0 - reach - 1.5) / FLOOR.cell);
  const i1 = Math.floor((sx0 + reach - 1.5) / FLOOR.cell);
  const j0 = Math.ceil((sz0 - reach - 1.5) / FLOOR.cell);
  const j1 = Math.floor((sz0 + reach - 1.5) / FLOOR.cell);
  const pt = [0, 0];
  const project = (x: number, z: number) => {
    const dx = x - cx;
    const dy = y - cy;
    const dz = z - cz;
    const zc = dx * fx + dy * fy + dz * fz;
    if (zc < 0.3) return -1;
    pt[0] = W / 2 + (fpx * (dx * rx + dz * rz)) / zc - ox;
    pt[1] = H / 2 - (fpx * (dx * ux + dy * uy + dz * uz)) / zc - oy;
    return zc;
  };
  for (let i = i0; i <= i1; i++) {
    const wx = 1.5 + i * FLOOR.cell;
    if (Math.abs(wx) > FLOOR.half) continue;
    for (let j = j0; j <= j1; j++) {
      const wz = 1.5 + j * FLOOR.cell;
      if (Math.abs(wz) > FLOOR.half) continue;
      const x = wx - sx0;
      const z = wz - sz0;
      const zc = project(x, z);
      if (zc < 0 || zc > FLOOR.fogFar) continue;
      if (pt[0] < -20 || pt[0] > W + 20 || pt[1] < -20 || pt[1] > H + 20) continue;
      // three's linear fog: smoothstep over the view depth
      const t = Math.min(1, Math.max(0, (zc - FLOOR.fogNear) / (FLOOR.fogFar - FLOOR.fogNear)));
      const fog = t * t * (3 - 2 * t);
      const q: number[] = [];
      for (const [ax, az] of [
        [-h, -h],
        [h, -h],
        [h, h],
        [-h, h],
      ])
        if (project(x + ax, z + az) > 0) q.push(pt[0], pt[1]);
      if (q.length < 8) continue;
      // the texture's mipmaps melt a dot into the paper once it is a pixel or two tall
      const tall = Math.max(q[1], q[3], q[5], q[7]) - Math.min(q[1], q[3], q[5], q[7]);
      const a = (1 - fog) * Math.min(1, Math.max(0, (tall - 0.8) / 3));
      if (a <= 0.02) continue;
      const band = Math.min(BANDS - 1, Math.floor((1 - a) * BANDS));
      const p = paths[band];
      used[band] = true;
      p.moveTo(q[0], q[1]);
      p.lineTo(q[2], q[3]);
      p.lineTo(q[4], q[5]);
      p.lineTo(q[6], q[7]);
      p.closePath();
    }
  }
  g.fillStyle = FLOOR.dot;
  for (let b = 0; b < BANDS; b++) {
    if (!used[b]) continue;
    g.globalAlpha = 1 - (b + 0.5) / BANDS;
    g.fill(paths[b]);
  }
  g.globalAlpha = 1;
  if (vignette) {
    // the composer's vignette (World.tsx, offset 0.3, darkness 0.28): colour x smoothstep(0.8, 0.24, d * 0.58), d in uv
    g.save();
    g.translate(W / 2, H / 2);
    g.scale(W, H);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, Math.SQRT1_2);
    for (let s = 0; s <= 10; s++) {
      const d = (s / 10) * Math.SQRT1_2;
      const u = Math.min(1, Math.max(0, (d * 0.58 - 0.8) / (0.3 * 0.799 - 0.8)));
      const v = u * u * (3 - 2 * u);
      grad.addColorStop(s / 10, `rgba(0,0,0,${(1 - v).toFixed(4)})`);
    }
    g.fillStyle = grad;
    g.fillRect(-0.5, -0.5, 1, 1);
    g.restore();
  }
}
