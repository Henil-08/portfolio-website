// Street kit (concepts lamp, bench, bollard, kiosk, busstop, cafe). Builders return cached
// Models (see ./shared). Fronts face +Z.
import { bar, box, cbox, hull, model, prism, vbox, type Kit, type V3 } from "./shared";

/** Lamp post height and the lantern centre (for a night light). */
export const LAMP_H = 3.68;
export const LAMP_LIGHT_Y = 3.36;

/** Lamp: ink square post on a concrete foot, a glowing paper lantern cube with an ink cap; an orange tag low on the post. 3.7 m. */
export function lampModel() {
  return model("kit-lamp", (k) => {
    k.add("concrete", cbox(0.72, 0.14, 0.72, 0.025), { p: [0, 0.07, 0] });
    k.add("ink", vbox(0.2, 2.98, 0.2, 0.02), { p: [0, 0.14 + 1.49, 0] });
    k.add("orange", box(0.085, 0.1, 0.012), { p: [0, 0.6, 0.104] });
    k.add("ink", box(0.6, 0.03, 0.6), { p: [0, 3.115, 0] });
    k.add("glow", box(0.55, 0.52, 0.55), { p: [0, LAMP_LIGHT_Y, 0] });
    k.add("ink", cbox(0.62, 0.07, 0.62, 0.012), { p: [0, 3.645, 0] });
  });
}

/** Bench: a long chamfered concrete block with ink seat slats set between its end caps and an ink slatted back on three posts; an orange tag on one end. 2.1 m. */
export function benchModel() {
  return model("kit-bench", (k) => {
    const L = 2.1;
    const D = 0.62;
    k.add("concrete", cbox(L, 0.44, D, 0.06), { p: [0, 0.22, 0] });
    for (const sx of [-1, 1]) k.add("concrete", cbox(0.12, 0.1, D, 0.03), { p: [sx * (L / 2 - 0.06), 0.46, 0] });
    const n = 17;
    const span = L - 0.26;
    const w = 0.08;
    for (let i = 0; i < n; i++) {
      const x = -span / 2 + w / 2 + (i * (span - w)) / (n - 1);
      k.add("ink", cbox(w, 0.06, D - 0.06, 0.008), { p: [x, 0.47, 0.02] });
    }
    // back: three posts, a rail and sixteen upright slats, leaning back a little
    const zb = -D / 2 + 0.06;
    for (const x of [-0.62, 0, 0.62]) k.add("ink", box(0.05, 0.22, 0.04), { p: [x, 0.58, zb], r: [-0.06, 0, 0] });
    k.add("ink", box(L - 0.2, 0.05, 0.03), { p: [0, 0.72, zb - 0.04] });
    for (let i = 0; i < 16; i++) {
      const x = -0.93 + (i * 1.86) / 15;
      k.add("ink", cbox(0.095, 0.46, 0.04, 0.006), { p: [x, 0.84, zb - 0.02], r: [-0.08, 0, 0] });
    }
    k.add("orange", box(0.012, 0.15, 0.075), { p: [L / 2 + 0.002, 0.3, 0.16] });
    k.add("ink", box(0.016, 0.03, 0.02), { p: [L / 2 + 0.004, 0.385, 0.16] });
  });
}

/** Points of a horizontal section of hull(A at ya, B at yb) at fraction t, scaled by s. */
function section(a: [number, number][], b: [number, number][], y: number, t: number, s: number): V3[] {
  const out: V3[] = [];
  for (const p of a) for (const q of b) out.push([((1 - t) * p[0] + t * q[0]) * s, y, ((1 - t) * p[1] + t * q[1]) * s]);
  return out;
}

/** One bollard: a faceted concrete post pinched at the waist under a chamfered ink cap; `band` adds the orange collar. 1.0 m. */
export function addBollard(k: Kit, x: number, z: number, band: boolean) {
  const hw = 0.11;
  const sq: [number, number][] = [
    [hw, hw],
    [-hw, hw],
    [-hw, -hw],
    [hw, -hw],
  ];
  const oct: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? 0.125 : 0.098;
    oct.push([Math.cos((i * Math.PI) / 4) * rr, Math.sin((i * Math.PI) / 4) * rr]);
  }
  const yw = 0.5;
  const yt = 0.92;
  const at = (pts: [number, number][], y: number): V3[] => pts.map(([px, pz]) => [px + x, y, pz + z]);
  k.add("concrete", hull([...at(sq, 0), ...at(oct, yw)]));
  k.add("concrete", hull([...at(oct, yw), ...at(sq, yt)]));
  if (band) {
    const t0 = (0.7 - yw) / (yt - yw);
    const t1 = (0.8 - yw) / (yt - yw);
    const pts = [...section(oct, sq, 0.7, t0, 1.03), ...section(oct, sq, 0.8, t1, 1.03)].map(([px, py, pz]): V3 => [px + x, py, pz + z]);
    k.add("orange", hull(pts));
  }
  k.add("ink", cbox(0.25, 0.13, 0.25, 0.02), { p: [x, yt + 0.065, z] });
}

/** One bollard, origin at its foot. */
export function bollardModel(band: boolean) {
  return model(`kit-bollard-${band}`, (k) => addBollard(k, 0, 0, band));
}

/** A row of three bollards, the middle one with the orange collar. */
export function bollardsModel() {
  return model("kit-bollards", (k) => {
    addBollard(k, -0.5, 0, false);
    addBollard(k, 0, 0, true);
    addBollard(k, 0.5, 0, false);
  });
}

/** Kiosk: a chamfered ink box with a glazed serving window, a concrete counter, a paper awning and a paper side panel; orange tab and handle. 2.2 m square, 2.5 m. */
export function kioskModel() {
  return model("kit-kiosk", (k) => {
    const W = 2.2;
    const H = 2.3;
    const z0 = W / 2;
    k.add("ink", box(W - 0.2, 0.16, W - 0.2), { p: [0, 0.08, 0] });
    k.add("ink", vbox(W, H, W, 0.14), { p: [0, 0.16 + H / 2, 0] });
    // window: two panes and an ink mullion
    k.add("glass", box(1.36, 1.0, 0.02), { p: [-0.3, 1.6, z0 + 0.006] });
    k.add("ink", box(0.04, 1.0, 0.03), { p: [-0.3, 1.6, z0 + 0.012] });
    k.add("graphite", box(1.44, 0.05, 0.04), { p: [-0.3, 1.08, z0 + 0.01] });
    k.add("orange", box(0.12, 0.02, 0.02), { p: [0.68, 1.12, z0 + 0.012] });
    // counter
    k.add("concrete", cbox(1.62, 0.72, 0.36, 0.02), { p: [-0.28, 0.72, z0 + 0.17] });
    k.add("orange", box(0.18, 0.03, 0.09), { p: [0.3, 1.09, z0 + 0.15] });
    // awning: a paper slab sloping down to the front
    const pts: V3[] = [];
    for (const x of [-1.4, 0.82])
      for (const [y, z] of [
        [2.36, z0],
        [2.28, z0],
        [2.04, z0 + 0.72],
        [1.98, z0 + 0.72],
        [2.06, z0 + 0.66],
      ] as [number, number][])
        pts.push([x, y, z]);
    k.add("paper", hull(pts));
    // paper panel on the right side
    k.add("paper", box(0.012, 1.4, 1.16), { p: [W / 2 + 0.006, 1.35, 0.05] });
  });
}

/** Bus stop: a chamfered paper roof on ink posts, glass back and side, an ink advert panel on one end, a concrete bench; an orange sign. 3.3 m long, 2.6 m. */
export function busStopModel() {
  return model("kit-busstop", (k) => {
    const L = 3.1;
    const zb = -0.55;
    const zf = 0.6;
    k.add("paper", cbox(3.4, 0.2, 1.62, 0.07), { p: [0.05, 2.5, 0.02] });
    const xr = L / 2;
    const xl = -L / 2 + 0.25;
    // posts
    for (const [x, z] of [
      [xr, zb],
      [xr, zf],
      [xl, zb],
      [xl - 0.12, zf - 0.1],
    ] as [number, number][])
      k.add("ink", box(0.07, 2.4, 0.07), { p: [x, 1.2, z] });
    // back glass with ink rails
    k.add("glass", box(xr - xl, 2.05, 0.02), { p: [(xr + xl) / 2, 1.27, zb] });
    k.add("ink", box(xr - xl, 0.05, 0.05), { p: [(xr + xl) / 2, 0.22, zb] });
    k.add("ink", box(xr - xl, 0.05, 0.05), { p: [(xr + xl) / 2, 2.32, zb] });
    // right side glass, framed
    k.add("glass", box(0.02, 2.05, zf - zb), { p: [xr, 1.27, (zb + zf) / 2] });
    k.add("ink", box(0.05, 0.05, zf - zb), { p: [xr, 0.22, (zb + zf) / 2] });
    k.add("ink", box(0.05, 0.05, zf - zb), { p: [xr, 2.06, (zb + zf) / 2] });
    k.add("ink", cbox(0.16, 0.24, 0.5, 0.02), { p: [xr, 0.12, zf - 0.25] });
    // left end: the advert panel on two ink feet
    k.add("ink", cbox(0.16, 1.75, 1.28, 0.05), { p: [xl - 0.16, 1.37, 0.02] });
    k.add("glass", box(0.02, 1.6, 1.12), { p: [xl - 0.25, 1.37, 0.02] });
    k.add("ink", box(0.2, 0.5, 0.36), { p: [xl - 0.16, 0.25, zf - 0.3] });
    k.add("ink", box(0.2, 0.5, 0.36), { p: [xl - 0.16, 0.25, zb + 0.25] });
    // bench
    k.add("concrete", cbox(1.6, 0.08, 0.42, 0.015), { p: [0.35, 0.46, zb + 0.26] });
    for (const x of [-0.35, 1.05]) k.add("concrete", cbox(0.1, 0.42, 0.38, 0.015), { p: [x, 0.21, zb + 0.26] });
    k.add("orange", box(0.42, 0.18, 0.04), { p: [xr - 0.25, 1.95, zf] });
  });
}

/** A café chair in paper: four tapered legs, a seat and a panel back. Faces +Z at the origin. */
function chair(k: Kit, x: number, z: number, yaw: number, y0: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const at = (px: number, py: number, pz: number): V3 => [x + px * c + pz * s, y0 + py, z - px * s + pz * c];
  const w = 0.44;
  const d = 0.42;
  for (const lx of [-1, 1])
    for (const lz of [-1, 1]) {
      const top = lz < 0 ? 0.86 : 0.45;
      k.add("paper", bar(at(lx * (w / 2 - 0.03), 0, lz * (d / 2 - 0.03)), at(lx * (w / 2 - 0.025), top, lz * (d / 2 - 0.025)), 0.055));
    }
  k.add("paper", cbox(w, 0.07, d, 0.015), { p: at(0, 0.47, 0), r: [0, yaw, 0] });
  k.add("paper", cbox(w, 0.3, 0.045, 0.012), { p: at(0, 0.71, -d / 2 + 0.03), r: [0, yaw, 0] });
}

/** Café table: an ink square top on four legs with an orange cup, origin at its foot. */
export function cafeTableModel() {
  return model("kit-cafe-table", (k) => addTable(k, 0));
}

function addTable(k: Kit, y0: number) {
  k.add("ink", cbox(0.92, 0.05, 0.92, 0.025), { p: [0, y0 + 0.725, 0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add("ink", box(0.065, 0.7, 0.065), { p: [sx * 0.41, y0 + 0.35, sz * 0.41] });
  k.add("orange", prism(0.042, 0.042, 0.09, 10), { p: [0.05, y0 + 0.75, -0.08] });
  k.add("orange", box(0.035, 0.05, 0.012), { p: [0.1, y0 + 0.8, -0.08] });
}

/** Café chair in paper, origin at its foot, facing +Z (back toward -Z). */
export function cafeChairModel() {
  return model("kit-cafe-chair", (k) => chair(k, 0, 0, 0, 0));
}

/** Café set: an ink table with an orange cup and four paper chairs on a concrete slab. 2.8 m square. */
export function cafeModel() {
  return model("kit-cafe", (k) => {
    const y0 = 0.12;
    k.add("concreteDark", cbox(2.8, y0, 2.8, 0.03), { p: [0, y0 / 2, 0] });
    addTable(k, y0);
    chair(k, 0, 0.72, Math.PI, y0);
    chair(k, 0, -0.72, 0, y0);
    chair(k, 0.72, 0, -Math.PI / 2, y0);
    chair(k, -0.72, 0, Math.PI / 2, y0);
  });
}
