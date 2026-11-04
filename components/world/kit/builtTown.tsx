"use client";

// Town blocks and the pit building, rebuilt in code from their approved concepts
// (public/models/concepts/town-low, town-mid, town-tower, pit-building). Each model is a
// `*Parts()` builder (cached, merged per material, safe to instance) and a component.
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { B, Built, Kit, chamferRect, once, revealGeo, type MatKey } from "./builtShared";

type G = ThreeElements["group"];
type V3 = [number, number, number];

/**
 * One facade of coffered windows on the +z face of a block: a concrete grid `depth` proud of
 * the core, each opening tapering back to its glass. `cols` widths and `rows` [y0, y1] spans.
 */
function coffers(k: Kit, z: number, xs: number[], rows: [number, number][], o: { bar: number; depth: number; inset: number; insetY?: number; fill?: (k: Kit, x: number, y: number, w: number, h: number, ci: number, ri: number) => void }) {
  const { bar, depth, inset } = o;
  const x0 = xs[0], x1 = xs[xs.length - 1];
  const y0 = rows[0][0] - bar, y1 = rows[rows.length - 1][1] + bar;
  for (const x of xs) k.box("concrete", [bar, y1 - y0, depth], [x, (y0 + y1) / 2, z - depth / 2]);
  const ys = [rows[0][0] - bar / 2, ...rows.map((r) => r[1] + bar / 2)];
  for (const y of ys) k.box("concrete", [x1 - x0, bar, depth], [(x0 + x1) / 2, y, z - depth / 2]);
  rows.forEach(([ra, rb], ri) => {
    for (let ci = 0; ci < xs.length - 1; ci++) {
      const w = xs[ci + 1] - xs[ci] - bar, h = rb - ra;
      const cx = (xs[ci] + xs[ci + 1]) / 2, cy = (ra + rb) / 2;
      if (o.fill) o.fill(k, cx, cy, w, h, ci, ri);
      else {
        k.add("concrete", revealGeo(w, h, inset, depth, o.insetY ?? inset), [cx, cy, z]);
        k.box("glass", [w - 2 * inset, h - 2 * (o.insetY ?? inset), 0.04], [cx, cy, z - depth]);
      }
    }
  });
}

const spread = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/* ------------------------------------------------------------------ town-low */

export const TOWN_LOW = { w: 14, d: 14, h: 12 };

/** Three storeys: a glass shop floor with an orange door under two floors of deep coffers and an ink roof. */
export const townLowParts = once(() => {
  const k = new Kit();
  const { w: W, d: D } = TOWN_LOW;
  const G0 = 3.8, S0 = 4.5, TOP = 11.2, DEP = 0.55;
  // upper block: core, the sill band under it, the parapet band and the ink roof
  k.box("concrete", [W - 2 * DEP, TOP - S0, D - 2 * DEP], [0, (S0 + TOP) / 2, 0]);
  k.cbox("concrete", [W, S0 - G0, D], [0, (G0 + S0) / 2, 0], 0.08, 0, 0.12);
  k.cbox("concrete", [W, 0.75, D], [0, TOP + 0.375, 0], 0.08, 0.05, 0);
  k.cbox("ink", [W - 1, 0.32, D - 1], [0, TOP + 0.75 + 0.16, 0], 0.05);
  const rows: [number, number][] = [[S0 + 0.12, 7.75], [7.97, TOP - 0.1]];
  for (let s = 0; s < 4; s++)
    k.at([0, 0, 0], (s * Math.PI) / 2, () => coffers(k, D / 2, spread(-W / 2 + 0.15, W / 2 - 0.15, 4), rows, { bar: 0.26, depth: DEP, inset: 0.62, insetY: 0.5 }));
  // shop floor: glass on the front and right, set back under the band; concrete behind
  const g = 0.45; // set back
  const zf = D / 2 - g, xr = W / 2 - g;
  k.box("paper", [W - 0.2, 0.12, D - 0.2], [0, 0.06, 0]);
  k.box("inner", [W - 2 * g, 0.04, D - 2 * g], [0, G0 - 0.02, 0]);
  k.box("concrete", [W - 2 * g, G0, 0.3], [0, G0 / 2, -D / 2 + g + 0.15]);
  k.box("concrete", [0.3, G0, D - 2 * g], [-W / 2 + g + 0.15, G0 / 2, 0]);
  // the back-right pier carries the band down to the ground
  k.cbox("concrete", [0.9, G0, 1.6], [W / 2 - 0.45, G0 / 2, -D / 2 + 0.8], 0.06, 0, 0);
  k.box("clear", [W - 2 * g, G0 - 0.25, 0.03], [0, G0 / 2 + 0.06, zf]);
  k.box("clear", [0.03, G0 - 0.25, D - 2 * g - 1.6], [xr, G0 / 2 + 0.06, 0.8 - 0.2]);
  for (const y of [0.18, G0 - 0.08]) {
    k.box("graphite", [W - 2 * g + 0.1, 0.1, 0.1], [0, y, zf]);
    k.box("graphite", [0.1, 0.1, D - 2 * g - 1.4], [xr, y, 0.7 - 0.2]);
  }
  for (const x of spread(-W / 2 + g, W / 2 - g, 8)) k.box("graphite", [0.09, G0, 0.1], [x, G0 / 2, zf]);
  for (const z of spread(-D / 2 + 1.6, D / 2 - g, 5)) k.box("graphite", [0.1, G0, 0.09], [xr, G0 / 2, z]);
  // the orange door, one cell left of centre
  k.box("orange", [1.25, G0 - 0.3, 0.08], [-2.4, (G0 - 0.3) / 2 + 0.12, zf + 0.04]);
  k.box("ink", [0.05, 1.0, 0.08], [-2.4 - 0.45, 1.2, zf + 0.1]);
  return k.build();
});

export function TownLow(props: G) {
  return (
    <group {...props}>
      <Built parts={townLowParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ town-mid */

export const TOWN_MID = { w: 15, d: 15, h: 22 };

/** Six storeys of a chamfered concrete frame: ink infill and windows on the front, balconies and blind panels on the side, a glass penthouse with a planter. */
export const townMidParts = once(() => {
  const k = new Kit();
  const { w: W, d: D } = TOWN_MID;
  const DEP = 0.4, F = 3.2, G0 = 3.4, N = 4;
  const TOP = G0 + N * F;
  k.box("concreteDark", [W + 1.4, 0.2, D + 1.4], [0, 0.1, 0]);
  k.box("concrete", [W - 2 * DEP, TOP, D - 2 * DEP], [0, TOP / 2 + 0.2, 0]);
  const rows: [number, number][] = [[0.32, G0 + 0.08]];
  for (let i = 0; i < N; i++) rows.push([G0 + 0.32 + i * F, G0 + 0.08 + (i + 1) * F]);
  const lift = (r: [number, number]): [number, number] => [r[0] + 0.2, r[1] + 0.2];
  const R = rows.map(lift);
  const xsF = spread(-W / 2 + 0.2, W / 2 - 0.2, 4);
  const xsS = spread(-D / 2 + 0.2, D / 2 - 0.2, 5);
  // front: ink infill with a two-pane window over a spandrel; ground floor: louvre, door, windows
  const front = (k: Kit, x: number, y: number, w: number, h: number, ci: number, ri: number) => {
    const z = D / 2;
    k.add("concrete", revealGeo(w, h, 0.2, DEP), [x, y, z]);
    const iw = w - 0.4, ih = h - 0.4, zb = z - DEP;
    if (ri === 0 && ci === 0) {
      k.box("concrete", [iw, ih, 0.04], [x, y, zb]);
      k.box("orange", [iw * 0.75, 0.9, 0.08], [x, y + 0.45, zb + 0.04]);
      for (let s = 0; s < 6; s++) k.box("graphite", [iw * 0.75, 0.03, 0.1], [x, y + 0.08 + s * 0.15, zb + 0.06]);
      return;
    }
    if (ri === 0 && ci === 1) {
      k.box("concrete", [iw, ih, 0.04], [x, y, zb]);
      k.box("ink", [1.1, ih - 0.1, 0.06], [x + iw / 2 - 0.75, y - 0.05, zb + 0.03]);
      return;
    }
    k.box("inkMatte", [iw, ih, 0.04], [x, y, zb]);
    const wy = ri === 0 ? y : y + ih * 0.12, wh = ri === 0 ? ih * 0.8 : ih * 0.56;
    k.box("glass", [iw * 0.6, wh, 0.04], [x - iw * 0.1, wy, zb + 0.03]);
    k.box("ink", [0.05, wh, 0.08], [x - iw * 0.1, wy, zb + 0.05]);
  };
  // side: two loggias with glass balustrades, two blind panels, one open corner balcony
  const side = (k: Kit, x: number, y: number, w: number, h: number, ci: number, ri: number) => {
    const z = W / 2;
    if (ci <= 1 || ci === 4) {
      const deep = ci === 4 ? 2.4 : 1.2;
      k.add("concrete", revealGeo(w, h, 0.12, 0.12), [x, y, z]);
      for (const s of [-1, 1]) k.box("concrete", [0.1, h - 0.24, deep], [x + s * (w / 2 - 0.17), y, z - 0.12 - deep / 2]);
      k.box("concrete", [w - 0.24, 0.12, deep], [x, y - h / 2 + 0.18, z - 0.12 - deep / 2]);
      k.box(ci === 4 ? "paper" : "glass", [w - 0.24, h - 0.24, 0.04], [x, y, z - 0.12 - deep]);
      if (ri > 0) k.box("clear", [w - 0.3, 1.0, 0.03], [x, y - h / 2 + 0.75, z - 0.25]);
      if (ri > 0) k.box("ink", [w - 0.3, 0.05, 0.06], [x, y - h / 2 + 1.27, z - 0.25]);
      return;
    }
    k.add("concrete", revealGeo(w, h, 0.3, DEP), [x, y, z]);
    k.box("concrete", [w - 0.6, h - 0.6, 0.04], [x, y, z - DEP]);
  };
  k.at([0, 0, 0], 0, () => coffers(k, D / 2, xsF, R, { bar: 0.3, depth: DEP, inset: 0.2, fill: front }));
  k.at([0, 0, 0], Math.PI, () => coffers(k, D / 2, xsF, R, { bar: 0.3, depth: DEP, inset: 0.2, fill: front }));
  k.at([0, 0, 0], Math.PI / 2, () => coffers(k, W / 2, xsS, R, { bar: 0.3, depth: DEP, inset: 0.2, fill: side }));
  k.at([0, 0, 0], -Math.PI / 2, () => coffers(k, W / 2, xsS, R, { bar: 0.3, depth: DEP, inset: 0.2, fill: side }));
  // the chamfered cornice, the planter, the glass penthouse under an overhanging slab, the plant room
  const y0 = TOP + 0.5;
  const ring = (w: number, d: number, y: number): V3[] => chamferRect(w, d, 0).map(([x, z]) => [x, y, z]);
  k.hull("concrete", [...ring(W, D, y0 - 0.05), ...ring(W, D, y0 + 0.35), ...ring(W - 1.4, D - 1.4, y0 + 0.95)]);
  const yr = y0 + 0.95;
  k.box("inkMatte", [W * 0.42, 0.75, 1.3], [-W / 2 + 0.7 + W * 0.21, yr + 0.37, D / 2 - 1.4]);
  k.hull("leaf", [...ring(W * 0.4, 1.1, yr + 0.74), [-W * 0.08, yr + 1.1, 0], [-W * 0.2, yr + 1.05, 0.2]].map(([x, y, z]) => [x - W / 2 + 0.7 + W * 0.21, y, z + D / 2 - 1.4] as V3));
  const pw = W - 3.6, pd = D - 3.4, ph = 2.7;
  k.box("glass", [pw, ph, pd], [0.4, yr + ph / 2, -0.4]);
  for (const x of spread(-pw / 2, pw / 2, 6)) k.box("ink", [0.08, ph, 0.08], [x + 0.4, yr + ph / 2, pd / 2 - 0.4]);
  for (const z of spread(-pd / 2, pd / 2, 6)) k.box("ink", [0.08, ph, 0.08], [pw / 2 + 0.4, yr + ph / 2, z - 0.4]);
  k.box("clear", [pw * 0.55, 1.0, 0.03], [pw * 0.22 + 0.4, yr + 0.5, D / 2 - 0.9]);
  k.cbox("concrete", [W - 1.2, 0.42, D - 1.8], [0.2, yr + ph + 0.21, -0.3], 0.05);
  k.cbox("ink", [5, 1.3, 3], [-1.5, yr + ph + 0.42 + 0.65, -1.2], 0.04);
  return k.build();
});

export function TownMid(props: G) {
  return (
    <group {...props}>
      <Built parts={townMidParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ town-tower */

export const TOWER = { w: 11.5, d: 11.5, h: 44, floors: 12 };

/** The landmark tower: chamfered slabs and pilasters round a dark glass core, a flared glass crown, an orange beacon. */
export const towerParts = once(() => {
  const k = new Kit();
  const { w: W, floors: N } = TOWER;
  const F = 3.0, Y0 = 0.3, C = 1.1;
  const top = Y0 + N * F;
  k.box("concrete", [W + 4.5, Y0, W + 4.5], [0, Y0 / 2, 0]);
  const oct = (w: number, c: number, y: number): V3[] => chamferRect(w, w, c).map(([x, z]) => [x, y, z]);
  // glass core with ink transoms per floor
  k.hull("glass", [...oct(W - 0.4, C - 0.2, Y0), ...oct(W - 0.4, C - 0.2, top)]);
  // slabs: a chamfered nose all round, proud of the pilasters
  for (let i = 1; i <= N; i++) {
    const y = Y0 + i * F - 0.2;
    k.hull("concrete", [...oct(W + 0.2, C + 0.1, y - 0.22), ...oct(W + 1.5, C + 0.65, y - 0.08), ...oct(W + 1.5, C + 0.65, y + 0.08), ...oct(W + 0.2, C + 0.1, y + 0.2)]);
    k.hull("ink", [...oct(W - 0.3, C - 0.15, y - 1.4), ...oct(W - 0.3, C - 0.15, y - 1.33)]);
  }
  // pilasters: two per face plus one on each chamfered corner, and ink mullions between them
  const ph = top - Y0;
  for (let s = 0; s < 4; s++)
    k.at([0, 0, 0], (s * Math.PI) / 2, () => {
      for (const x of [-1.6, 1.6]) k.box("concrete", [0.6, ph, 1.1], [x, Y0 + ph / 2, W / 2 + 0.05]);
      for (const x of [-3.9, -2.9, -0.5, 0.5, 2.9, 3.9]) k.box("ink", [0.06, ph, 0.12], [x, Y0 + ph / 2, W / 2 - 0.2]);
      k.at([W / 2 - C / 2 + 0.05, 0, W / 2 - C / 2 + 0.05], Math.PI / 4, () => k.box("concrete", [0.7, ph, 1.0], [0, Y0 + ph / 2, 0.25]));
    });
  // the crown: a concrete lip, a glass control room flaring out to an ink roof, the beacon
  k.hull("concrete", [...oct(W + 0.8, C + 0.35, top), ...oct(W + 0.8, C + 0.35, top + 0.4)]);
  const c0 = top + 0.4, c1 = c0 + 3.2;
  k.hull("glass", [...oct(W + 0.6, 0.5, c0), ...oct(W + 2.8, 0.6, c1)]);
  for (let s = 0; s < 4; s++)
    k.at([0, 0, 0], (s * Math.PI) / 2, () => {
      for (const t of spread(-1, 1, 6)) k.bar("ink", [t * (W / 2 + 0.05), c0, W / 2 + 0.32], [t * (W / 2 + 1.1), c1, W / 2 + 1.42], 0.09);
    });
  k.hull("ink", [...oct(W + 3.1, 0.6, c1), ...oct(W + 3.1, 0.6, c1 + 0.45)]);
  k.cyl("ink", 0.25, 0.3, 0.3, [0, c1 + 0.6, 0], 8);
  k.cyl("lit", 0.18, 0.18, 0.4, [0, c1 + 0.95, 0], 10);
  return k.build();
});

export function TownTower(props: G) {
  return (
    <group {...props}>
      <Built parts={towerParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ pit building */

/** A garage bay: centre x, code (Z05...) and its name on the plate. */
export type PitBay = { x: number; code: string; name?: string };
/** `bay` door width (default: bay spacing less a 1.4 m pier), `depth` of the block, `end` solid wall past the outer bays, `apron` concrete in front. */
export type PitOpts = { bay?: number; depth?: number; end?: number; apron?: number };

export const PIT = { H1: 6.2, OPEN: 4.8, HEAD: 5.6, UP: 3.0 };

function pitSpan(bays: PitBay[], o: PitOpts) {
  const pitch = bays.length > 1 ? bays[1].x - bays[0].x : 8;
  const bay = o.bay ?? pitch - 1.4;
  const end = o.end ?? 3.2;
  const x0 = bays[0].x - bay / 2 - end, x1 = bays[bays.length - 1].x + bay / 2 + end;
  return { bay, D: o.depth ?? 9, x0, x1, w: x1 - x0, cx: (x0 + x1) / 2 };
}

/** The solid walls a car can hit (ends, piers, back wall) as [size, centre] boxes, for colliders. */
/** (the apron is flat, so it isn't one) */
export function pitBuildingSolids(bays: PitBay[], o: PitOpts = {}): [V3, V3][] {
  const { bay, D, x0, x1, w, cx } = pitSpan(bays, o);
  const out: [V3, V3][] = [[[w, PIT.H1, 0.4], [cx, PIT.H1 / 2, -D / 2 + 0.2]]];
  const edges = [x0, ...bays.flatMap((b) => [b.x - bay / 2, b.x + bay / 2]), x1];
  for (let i = 0; i < edges.length; i += 2) out.push([[edges[i + 1] - edges[i], PIT.H1, D], [(edges[i] + edges[i + 1]) / 2, PIT.H1 / 2, 0]]);
  return out;
}

const pitCache = new Map<string, ReturnType<Kit["build"]>>();

/**
 * The pit building: a concrete block with a chamfered top edge and corners, a glazed bay
 * per garage in an ink frame with its name plate, a set-back glass floor and a thin ink roof
 * on slim columns. Cached per bay layout.
 */
export function pitBuildingParts(bays: PitBay[], o: PitOpts = {}) {
  const key = JSON.stringify([bays.map((b) => b.x), o]);
  const hit = pitCache.get(key);
  if (hit) return hit;
  const k = new Kit();
  const { bay, D, x0, x1, w, cx } = pitSpan(bays, o);
  const { H1, OPEN, HEAD, UP } = PIT;
  const zf = D / 2, cv = 0.9, ct = 1.0;
  if (o.apron) k.box("concreteDark", [w + 1, 0.04, o.apron], [cx, 0.01, zf + o.apron / 2]);
  // header: the full length over the doors, chamfered on top front and back and at the ends
  const ring = (y: number, iw: number, iz: number, c: number): V3[] => chamferRect(w - 2 * iw, D - 2 * iz, c).map(([x, z]) => [x + cx, y, z]);
  k.hull("concrete", [...ring(OPEN, 0, 0, cv), ...ring(H1 - ct, 0, 0, cv), ...ring(H1, ct * 0.7, ct, cv * 0.6)]);
  // ends: chamfered on their outer corners
  for (const s of [-1, 1]) {
    const xo = s < 0 ? x0 : x1, xi = xo - s * (o.end ?? 3.2);
    const pts: V3[] = [];
    for (const y of [0, OPEN]) pts.push([xo, y, zf - cv], [xo, y, -zf + cv], [xo - s * cv, y, zf], [xo - s * cv, y, -zf], [xi, y, zf], [xi, y, -zf]);
    k.hull("concrete", pts);
  }
  k.box("concrete", [w, OPEN, 0.4], [cx, OPEN / 2, -zf + 0.2]);
  for (let i = 1; i < bays.length; i++) {
    const a = bays[i - 1].x + bay / 2, b = bays[i].x - bay / 2;
    k.box("concrete", [b - a, OPEN, D], [(a + b) / 2, OPEN / 2, 0]);
  }
  for (const b of bays) {
    const x = b.x;
    k.box("inner", [bay, 0.04, D - 0.4], [x, 0.02, 0.2]);
    k.box("inner", [bay, OPEN, 0.02], [x, OPEN / 2, -zf + 0.41]);
    for (const s of [-1, 1]) k.box("inner", [0.02, OPEN, D - 0.4], [x + s * (bay / 2 - 0.01), OPEN / 2, 0.2]);
    k.box("inner", [bay, 0.02, D - 0.4], [x, OPEN - 0.01, 0.2]);
    // ink frame and header band (the plate sits on it), the glass door and its mullions
    k.box("ink", [bay + 0.4, HEAD - OPEN + 0.2, 0.12], [x, (OPEN + HEAD) / 2 - 0.1, zf + 0.06]);
    for (const s of [-1, 1]) k.box("ink", [0.2, OPEN, 0.14], [x + s * (bay / 2 + 0.1), OPEN / 2, zf + 0.06]);
    k.box("ink", [bay, 0.12, 0.14], [x, 0.06, zf - 0.1]);
    k.box("clear", [bay, OPEN - 0.1, 0.03], [x, OPEN / 2, zf - 0.12]);
    for (const t of [-1 / 6, 1 / 6]) k.box("ink", [0.08, OPEN, 0.08], [x + t * bay, OPEN / 2, zf - 0.1]);
    k.box("ink", [bay, 0.08, 0.08], [x, OPEN * 0.74, zf - 0.1]);
  }
  // upper floor: dark glass, set back behind the chamfer, ink mullions, the long ink roof on slim columns
  const uz0 = -zf + 0.6, uz1 = zf - ct - 0.4, ux0 = x0 + 2.2, ux1 = x1 - 0.6;
  k.box("glass", [ux1 - ux0, UP, uz1 - uz0], [(ux0 + ux1) / 2, H1 + UP / 2, (uz0 + uz1) / 2]);
  const n = Math.round((ux1 - ux0) / 2.2);
  for (const x of spread(ux0, ux1, n)) k.box("ink", [0.08, UP, 0.08], [x, H1 + UP / 2, uz1 + 0.02]);
  for (const z of spread(uz0, uz1, 3)) k.box("ink", [0.08, UP, 0.08], [ux0, H1 + UP / 2, z]);
  k.box("ink", [w + 3.4, 0.18, D + 0.4], [cx - 0.6, H1 + UP + 0.12, 0.1]);
  for (const x of [x0 + 0.6, ...bays.slice(0, -1).map((b) => b.x + (bay + 1.4) / 2), x1 - 0.2]) k.box("ink", [0.14, UP, 0.14], [x, H1 + UP / 2, zf - 0.05 - (x === x0 + 0.6 ? 0 : ct * 0.6)]);
  const out = k.build();
  pitCache.set(key, out);
  return out;
}

const plates = new Map<string, THREE.MeshStandardMaterial>();
/** A paper name plate with the orange square at its left and the code and name in ink. */
export function bayPlate(code: string, name = "") {
  const key = `${code}|${name}`;
  let m = plates.get(key);
  if (m) return m;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 160;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const draw = () => {
    const g = c.getContext("2d")!;
    g.fillStyle = B.paper;
    g.fillRect(0, 0, 1024, 160);
    g.fillStyle = B.orange;
    g.fillRect(36, 36, 88, 88);
    g.fillStyle = B.ink;
    const fam = getComputedStyle(document.body).getPropertyValue("--font-plex-mono").trim();
    g.font = `500 64px ${fam ? `${fam}, ` : ""}monospace`;
    g.textBaseline = "middle";
    g.fillText(name ? `${code} · ${name}` : code, 160, 84);
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
  plates.set(key, m);
  return m;
}

export const DEMO_BAYS: PitBay[] = [
  { x: -14.4, code: "Z05", name: "AGENTS" },
  { x: -7.2, code: "Z06", name: "GEN AI" },
  { x: 0, code: "Z07", name: "HARDWARE" },
  { x: 7.2, code: "Z08", name: "VISION" },
  { x: 14.4, code: "Z09", name: "ML" },
];
const NO_OPTS: PitOpts = {};

export function PitBuildingBuilt({ bays = DEMO_BAYS, opts = NO_OPTS, material, ...props }: G & { bays?: PitBay[]; opts?: PitOpts; material?: (k: MatKey) => THREE.Material }) {
  const { bay, D } = pitSpan(bays, opts);
  const parts = pitBuildingParts(bays, opts);
  return (
    <group {...props}>
      <Built parts={parts} material={material} />
      {bays.map((b) => (
        <mesh key={b.code} position={[b.x, (PIT.OPEN + PIT.HEAD) / 2, D / 2 + 0.13]} material={bayPlate(b.code, b.name)}>
          <planeGeometry args={[Math.min(bay * 0.62, 4.2), Math.min(bay * 0.62, 4.2) * 0.156]} />
        </mesh>
      ))}
    </group>
  );
}

export type { MatKey };
