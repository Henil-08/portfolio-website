"use client";

// The four sector buildings rebuilt in code from their approved concepts
// (public/models/concepts/boston, ahmedabad, hyperlab, waters). Each is a cached
// `*Parts()` builder, merged per material, and a component. Front faces +z.
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { Built, Kit, chamferRect, extrudeGeo, once, type MatKey } from "./builtShared";

type G = ThreeElements["group"];
type V3 = [number, number, number];
const spread = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/** A window: glass in a frame of `frame` bars `t` wide, on the +z face at z. */
function windowAt(k: Kit, x: number, y: number, z: number, w: number, h: number, frame: MatKey = "paper", t = 0.12, sill = true) {
  k.box("glassPale", [w, h, 0.05], [x, y, z]);
  k.box(frame, [w + 2 * t, t, 0.12], [x, y + h / 2 + t / 2, z + 0.03]);
  k.box(frame, [w + 2 * t, t, sill ? 0.22 : 0.12], [x, y - h / 2 - t / 2, z + 0.06]);
  for (const s of [-1, 1]) k.box(frame, [t, h, 0.12], [x + s * (w / 2 + t / 2), y, z + 0.03]);
  k.box(frame, [w, 0.05, 0.08], [x, y + h * 0.12, z + 0.03]);
}

/* ------------------------------------------------------------------ Boston */

export const BOSTON = { w: 32, d: 16, h: 27 };

/** A row of three stone townhouses (bay windows, stoops, an ink cornice) beside a paper domed state house. */
export const bostonParts = once(() => {
  const k = new Kit();
  // the row: x -15 .. 0, front at z = 3, raised basement to 1.2
  const R0 = -17.5, R1 = 0, ZF = 3, ZB = -6.5, TOP = 10.8;
  const ry = 0.05;
  k.box("concrete", [R1 - R0, TOP, ZF - ZB], [(R0 + R1) / 2, ry + TOP / 2, (ZF + ZB) / 2]);
  k.box("concreteDark", [R1 - R0 + 0.1, 1.3, ZF - ZB + 0.1], [(R0 + R1) / 2, ry + 0.65, (ZF + ZB) / 2]);
  // panel joints on the blank end wall
  for (const y of [4.4, 7.6]) k.box("concreteDark", [0.04, 0.04, ZF - ZB], [R0 - 0.01, ry + y, (ZF + ZB) / 2]);
  for (const z of spread(ZB, ZF, 3).slice(1, -1)) k.box("concreteDark", [0.04, TOP - 1.3, 0.04], [R0 - 0.01, ry + 1.3 + (TOP - 1.3) / 2, z]);
  // cornice: an ink band with a stepped crown
  k.box("ink", [R1 - R0 + 0.3, 0.6, 0.5], [(R0 + R1) / 2, ry + TOP + 0.3, ZF + 0.1]);
  k.box("ink", [0.5, 0.6, ZF - ZB + 0.3], [R0 - 0.1, ry + TOP + 0.3, (ZF + ZB) / 2]);
  k.box("ink", [R1 - R0 + 0.6, 0.3, 0.6], [(R0 + R1) / 2, ry + TOP + 0.6, ZF + 0.2]);
  k.box("concrete", [R1 - R0 - 0.4, 0.3, ZF - ZB - 0.6], [(R0 + R1) / 2, ry + TOP + 0.5, (ZF + ZB) / 2]);
  const houses = 3, hw = (R1 - R0) / houses;
  const floors = [1.3, 4.5, 7.6];
  for (let i = 0; i < houses; i++) {
    const x0 = R0 + i * hw;
    // bay window: a three-sided oriel up the right half, floors 1 to 3
    const bx = x0 + hw * 0.68, bw = 2.0, bd = 0.75;
    const pts: V3[] = [];
    for (const y of [ry + 1.3, ry + TOP]) pts.push([bx - bw / 2 - bd, y, ZF], [bx + bw / 2 + bd, y, ZF], [bx - bw / 2, y, ZF + bd], [bx + bw / 2, y, ZF + bd]);
    k.hull("concrete", pts);
    k.box("ink", [bw + 0.5, 0.55, bd + 0.35], [bx, ry + TOP + 0.3, ZF + bd / 2 + 0.1]);
    for (const [fi, fy] of floors.entries()) {
      const y = ry + fy + 1.55;
      windowAt(k, bx, y, ZF + bd + 0.03, 1.1, 1.9);
      for (const s of [-1, 1]) k.at([bx + s * (bw / 2 + bd / 2), 0, ZF + bd / 2], s * Math.atan2(bd, bd) + 0, () => windowAt(k, 0, y, 0.04, 0.5, 1.9, "paper", 0.09));
      // the flat half: a door with a stoop on the ground floor, a window above
      const fx = x0 + hw * 0.22;
      if (fi === 0) {
        k.box("ink", [1.1, 2.4, 0.08], [fx, ry + 1.3 + 1.2, ZF + 0.04]);
        k.box("paper", [1.5, 0.25, 0.3], [fx, ry + 1.3 + 2.55, ZF + 0.1]);
        for (const s of [-1, 1]) k.box("paper", [0.2, 2.6, 0.2], [fx + s * 0.7, ry + 1.3 + 1.3, ZF + 0.08]);
      } else windowAt(k, fx, y, ZF + 0.03, 1.0, 1.9);
      // the lintel course between floors
      k.box("concrete", [hw, 0.18, 0.18], [x0 + hw / 2, ry + fy - 0.05, ZF + 0.08]);
    }
    // stoop: steps down to the pavement, ink railings each side
    const fx = x0 + hw * 0.22;
    for (let s = 0; s < 6; s++) k.box("concrete", [1.4, 0.22 * (6 - s), 0.36], [fx, ry + 0.11 * (6 - s), ZF + 0.18 + s * 0.36]);
    for (const s of [-1, 1]) {
      const xr = fx + s * 0.68;
      k.bar("ink", [xr, ry + 1.3 + 0.9, ZF + 0.1], [xr, ry + 0.9, ZF + 2.2], 0.05);
      for (let j = 0; j <= 5; j++) {
        const t = j / 5;
        k.box("ink", [0.03, 0.9, 0.03], [xr, ry + 1.3 * (1 - t) + 0.45, ZF + 0.1 + t * 2.1]);
      }
    }
    // a railing along the area well
    k.box("ink", [hw * 0.5, 0.05, 0.05], [x0 + hw * 0.66, ry + 0.9, ZF + 1.2]);
    for (const x of spread(x0 + hw * 0.42, x0 + hw * 0.9, 8)) k.box("ink", [0.03, 0.9, 0.03], [x, ry + 0.45, ZF + 1.2]);
  }
  // the state house: portico of six columns, pediment, drum, dome, lantern and spire
  const T0 = 0.5, T1 = 12.5, TC = (T0 + T1) / 2, TZB = -5.5, TZF = 1.5;
  k.box("paper", [T1 - T0, 9.2, TZF - TZB], [TC, ry + 4.6, (TZF + TZB) / 2]);
  for (let s = 0; s < 3; s++) k.box("paper", [T1 - T0 + 1.2 - s * 0.4, 0.3, 5.6 - s * 0.45], [TC, ry + 0.15 + s * 0.3, TZF + 2.6 - s * 0.2]);
  const cy0 = ry + 0.9, cy1 = ry + 7.6;
  for (const x of spread(T0 + 0.9, T1 - 0.9, 5)) {
    k.cyl("paper", 0.36, 0.42, cy1 - cy0, [x, (cy0 + cy1) / 2, TZF + 3.6], 16);
    k.box("paper", [1.0, 0.25, 1.0], [x, cy1 + 0.12, TZF + 3.6]);
    k.box("paper", [1.0, 0.2, 1.0], [x, cy0 + 0.1, TZF + 3.6]);
  }
  for (const x of [T0 + 0.5, T1 - 0.5]) k.box("paper", [0.7, cy1 - cy0, 0.7], [x, (cy0 + cy1) / 2, TZF + 0.2]);
  k.box("paper", [T1 - T0 + 0.4, 1.0, 4.6], [TC, cy1 + 0.75, TZF + 2.0]);
  k.box("paper", [T1 - T0 + 0.7, 0.2, 4.9], [TC, cy1 + 1.3, TZF + 2.0]);
  const py = cy1 + 1.4, pw = (T1 - T0 + 0.7) / 2;
  k.hull("paper", [[TC - pw, py, TZF + 4.45], [TC + pw, py, TZF + 4.45], [TC, py + 2.2, TZF + 4.45], [TC - pw, py, TZF - 0.5], [TC + pw, py, TZF - 0.5], [TC, py + 2.2, TZF - 0.5]]);
  k.box("glass", [1.3, 3.2, 0.05], [TC, ry + 2.5, TZF + 0.03]);
  // the dome group sits lower than first drawn: the concept's spire tip is about twice the row's height
  k.at([0, -2.2, 0], 0, () => {
    const dz = (TZF + TZB) / 2 - 0.5;
    k.box("paper", [7, 2.6, 7], [TC, ry + 10.5, dz]);
    k.cyl("paper", 3.7, 3.7, 1.6, [TC, ry + 12.6, dz], 32);
    k.cyl("paper", 3.9, 3.9, 0.3, [TC, ry + 13.5, dz], 32);
    k.add("paper", new THREE.SphereGeometry(3.6, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), [TC, ry + 13.6, dz]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      k.add("paper", new THREE.TorusGeometry(3.62, 0.06, 4, 16, Math.PI / 2), [TC, ry + 13.6, dz], [0, a, Math.PI / 2]);
    }
    k.cyl("paper", 0.9, 0.9, 0.4, [TC, ry + 17.3, dz], 16);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.cyl("paper", 0.09, 0.09, 1.6, [TC + Math.cos(a) * 0.7, ry + 18.3, dz + Math.sin(a) * 0.7], 6);
    }
    k.cyl("glass", 0.55, 0.55, 1.6, [TC, ry + 18.3, dz], 12);
    k.cyl("paper", 0.95, 0.95, 0.3, [TC, ry + 19.25, dz], 16);
    k.cyl("paper", 0.05, 0.75, 2.6, [TC, ry + 20.7, dz], 8);
    k.cyl("orange", 0.05, 0.05, 1.0, [TC, ry + 22.4, dz], 6);
    k.add("orange", new THREE.ConeGeometry(0.12, 0.35, 6), [TC, ry + 23.0, dz]);
  });
  // a low railing along the pavement in front of the state house
  k.box("ink", [4.5, 0.05, 0.05], [T0 - 2.4, ry + 0.9, ZF + 2.4]);
  for (const x of spread(T0 - 4.6, T0 - 0.2, 10)) k.box("ink", [0.03, 0.9, 0.03], [x, ry + 0.45, ZF + 2.4]);
  return k.build();
});

export function BostonBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={bostonParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ Ahmedabad */

export const AHMEDABAD = { w: 22, d: 22, h: 16 };

/** A pointed arch outline w wide, springing at hs, its apex at ht. */
function archPath<P extends THREE.Path>(p: P, x: number, y: number, w: number, hs: number, ht: number) {
  const r = w / 2;
  p.moveTo(x - r, y);
  p.lineTo(x - r, y + hs);
  p.quadraticCurveTo(x - r, y + hs + (ht - hs) * 0.7, x, y + ht);
  p.quadraticCurveTo(x + r, y + hs + (ht - hs) * 0.7, x + r, y + hs);
  p.lineTo(x + r, y);
  p.lineTo(x - r, y);
  return p;
}

/** A wall panel (w x h, from y = 0) with a pointed arch cut through it, `t` thick, front at z = 0. */
function archPanel(k: Kit, mat: MatKey, w: number, h: number, aw: number, hs: number, ht: number, t: number, at: V3) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.lineTo(-w / 2, 0);
  const hole = new THREE.Path();
  archPath(hole, 0, 0.002, aw, hs, ht);
  s.holes.push(hole);
  k.add(mat, extrudeGeo(s, t), [at[0], at[1], at[2] - t]);
  // a concrete arch rim proud of the panel
  const rim = archPath(new THREE.Shape(), 0, 0, aw + 0.3, hs, ht + 0.25);
  rim.holes.push(archPath(new THREE.Path(), 0, 0.002, aw, hs, ht - 0.002));
  k.add("concreteDark", extrudeGeo(rim, t + 0.12), [at[0], at[1], at[2] - t]);
}

/** A jali: a grid of paper bars over a dark backing, w x h centred at p on the +z face. */
function jali(k: Kit, p: V3, w: number, h: number, n = 5, m = 5) {
  k.box("graphite", [w, h, 0.04], [p[0], p[1], p[2] - 0.06]);
  for (const x of spread(-w / 2, w / 2, n)) k.box("paper", [0.06, h, 0.08], [p[0] + x, p[1], p[2]]);
  for (const y of spread(-h / 2, h / 2, m)) k.box("paper", [w, 0.06, 0.08], [p[0], p[1] + y, p[2]]);
}

/** A square pavilion: a concrete-framed colonnade of paper pointed arches (one orange) round a taller core with jali screens, under an ink dome. */
const ahdCache = new Map<string, ReturnType<Kit["build"]>>();
/** Height of the ground arcade and the top of the upper tier (the dome stands on it). */
export const AHD = { bay: 2.75, ring: 2.2, arcade: 7.2, tier: 10.4 };

/**
 * `nx` x `nz` arcade bays of 2.75 m (8 x 8 is the concept's square; the game's sector set is
 * wider than deep). A tall ground arcade of paper pointed arches (one orange) round a core
 * with jali screens; the upper tier sits right on the arcade, set back a metre, with a tall
 * block rising at the front left beside a low two-bay wing; the ink dome on top.
 */
export function ahmedabadParts(nx = 8, nz = 8) {
  const key = `${nx}x${nz}`;
  const hit = ahdCache.get(key);
  if (hit) return hit;
  const k = new Kit();
  const { bay: bw, ring: RING, arcade: H, tier: CH } = AHD;
  const W = nx * bw, D = nz * bw;
  k.box("concreteDark", [W + 0.4, 0.2, D + 0.4], [0, 0.1, 0]);
  // the arcade: a face of the plan is its length, how far out, how many bays, the turn to it
  const faces: [number, number, number, number][] = [[W, D / 2, nx, 0], [D, W / 2, nz, Math.PI / 2], [W, D / 2, nx, Math.PI], [D, W / 2, nz, -Math.PI / 2]];
  faces.forEach(([len, z, n, rot], s) =>
    k.at([0, 0, 0], rot, () => {
      const inner = (len - 2 * RING) / len;
      for (let i = 0; i < n; i++) {
        const x = -len / 2 + bw * (i + 0.5);
        const orange = s === 0 && i === n - 3;
        archPanel(k, orange ? "orange" : "paper", bw - 0.5, H - 0.7, bw - 1.15, H * 0.56, H - 1.15, 0.2, [x, 0.2, z - 0.25]);
      }
      for (const x of spread(-len / 2, len / 2, n)) {
        k.box("concrete", [0.5, H - 0.5, 0.55], [x, 0.2 + (H - 0.5) / 2, z - 0.28]);
        k.box("concrete", [0.4, H - 0.5, 0.4], [x * inner, 0.2 + (H - 0.5) / 2, z - RING + 0.1]);
      }
      k.box("concrete", [len + 0.1, 0.55, 0.6], [0, H - 0.05, z - 0.3]);
    }),
  );
  const ringRoof = new THREE.Shape(chamferRect(W - 0.4, D - 0.4, 0).map(([x, z]) => new THREE.Vector2(x, z)));
  ringRoof.holes.push(new THREE.Path(chamferRect(W - 2 * RING, D - 2 * RING, 0).map(([x, z]) => new THREE.Vector2(x, z))));
  k.add("concrete", extrudeGeo(ringRoof, 0.3), [0, H - 0.05, 0], [Math.PI / 2, 0, 0]);
  // the core behind the arches: jali screens and dark doorways
  const CX = W - 2 * RING - 0.6, CZ = D - 2 * RING - 0.6;
  k.box("concreteDark", [CX - 0.4, H, CZ - 0.4], [0, 0.2 + H / 2, 0]);
  const core: [number, number, number][] = [[CX, CZ / 2, 0], [CZ, CX / 2, Math.PI / 2], [CX, CZ / 2, Math.PI], [CZ, CX / 2, -Math.PI / 2]];
  for (const [len, z, rot] of core)
    k.at([0, 0, 0], rot, () => {
      const n = Math.max(1, Math.round(len / bw)), cb = len / n;
      for (let i = 0; i < n; i++) {
        const x = -len / 2 + cb * (i + 0.5);
        if (i % 2 === 0) {
          jali(k, [x, 0.2 + 2.0, z - 0.1], cb - 1.3, 1.6);
          jali(k, [x, 0.2 + 4.3, z - 0.1], cb - 1.3, 1.6);
        } else k.box("graphite", [cb - 1.1, H * 0.75, 0.05], [x, 0.2 + H * 0.375, z - 0.12]);
      }
    });
  // the upper tier, right on the arcade: from the tall block to a metre in from the arcade's edge
  const ux0 = -W / 2 + 2 * bw, ux1 = W / 2 - 1.0, uz0 = -D / 2 + 1.0, uz1 = D / 2 - 1.0;
  const uw = ux1 - ux0, ud = uz1 - uz0, ucx = (ux0 + ux1) / 2, ucz = (uz0 + uz1) / 2, th = CH - H;
  k.box("paper", [uw - 0.3, th, ud - 0.3], [ucx, H + th / 2 + 0.2, ucz]);
  const tier: [number, number, number][] = [[uw, ud / 2, 0], [ud, uw / 2, Math.PI / 2], [uw, ud / 2, Math.PI], [ud, uw / 2, -Math.PI / 2]];
  for (const [len, z, rot] of tier)
    k.at([ucx, 0, ucz], rot, () => {
      const n = Math.max(1, Math.round(len / 3.2)), cb = len / n;
      for (let i = 0; i < n; i++) {
        const x = -len / 2 + cb * (i + 0.5);
        jali(k, [x, H + 0.2 + th * 0.42, z - 0.06], cb - 1.5, th * 0.4, 4, 3);
        archPanel(k, "paper", cb - 0.3, th - 0.5, cb - 1.2, th * 0.4, th - 1.1, 0.15, [x, H + 0.25, z + 0.05]);
      }
      for (const x of spread(-len / 2, len / 2, n)) k.box("concrete", [0.45, th, 0.4], [x, H + th / 2 + 0.2, z + 0.05]);
      k.box("concrete", [len + 0.5, 0.5, 0.55], [0, CH + 0.2, z + 0.05]);
    });
  // the tall block at the front left: one great arch over a jali, a jali grid at the top
  const tx0 = -W / 2 + 2 * bw, tx1 = tx0 + 1.6 * bw, tz0 = uz0, tz1 = D / 2 + 0.05, TH = CH + 0.9;
  const tcx = (tx0 + tx1) / 2, tw = tx1 - tx0;
  k.box("paper", [tw, TH, tz1 - tz0], [tcx, TH / 2 + 0.2, (tz0 + tz1) / 2]);
  for (const x of [tx0, tx1]) k.box("concrete", [0.55, TH, 0.6], [x, TH / 2 + 0.2, tz1 - 0.2]);
  k.box("concrete", [tw + 0.6, 0.55, 0.65], [tcx, TH + 0.2, tz1 - 0.2]);
  k.box("graphite", [tw - 1.6, H * 0.7, 0.05], [tcx, 0.2 + H * 0.36, tz1 + 0.02]);
  jali(k, [tcx, 0.2 + H * 0.36, tz1 + 0.1], tw - 1.9, H * 0.5, 5, 6);
  archPanel(k, "paper", tw - 0.4, H + 0.2, tw - 1.5, H * 0.62, H - 0.4, 0.15, [tcx, 0.2, tz1 + 0.17]);
  jali(k, [tcx, H + (TH - H) / 2 + 0.3, tz1 + 0.1], tw - 1.8, (TH - H) * 0.55, 6, 4);
  // the ink dome on its square base, centred on the upper tier
  const base = Math.min(11, uw - 3, ud - 2), r = base * 0.42;
  const dy = CH + 0.45;
  k.cbox("ink", [base, 0.8, base], [ucx, dy + 0.4, ucz], 0.05);
  k.cyl("ink", r, r, 0.4, [ucx, dy + 1.0, ucz], 32);
  k.add("ink", new THREE.SphereGeometry(r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), [ucx, dy + 1.15, ucz], undefined, [1, 0.95, 1]);
  k.cyl("ink", r * 0.13, r * 0.24, 0.5, [ucx, dy + 1.15 + r * 0.95, ucz], 16);
  k.cyl("ink", r * 0.07, r * 0.13, 0.35, [ucx, dy + 1.55 + r * 0.95, ucz], 12);
  const out = k.build();
  ahdCache.set(key, out);
  return out;
}

export function AhmedabadBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={ahmedabadParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ Hyperlab */

export const HYPERLAB = { w: 12, d: 17, h: 8 };

/** Three chamfered concrete halls side by side under ink and glass roofs, a big glazed side wall and the orange sign. */
export const hyperlabParts = once(() => {
  const k = new Kit();
  const L = 13.5, HW = 2.85, C = 0.7;
  // hall section (z, y) about its centre line: a flared foot, walls, a chamfered eave, the ridge
  const sec: [number, number][] = [[-HW + 0.35, 0], [HW - 0.35, 0], [HW, 0.7], [HW, 4.6], [HW - 0.55, 5.3], [0, 7.9], [-HW + 0.55, 5.3], [-HW, 4.6], [-HW, 0.7]];
  const halls = [-2 * HW, 0, 2 * HW];
  for (const zc of halls) {
    const pts: V3[] = [];
    for (const x of [-L / 2, L / 2]) for (const [z, y] of sec) pts.push([x, y, zc + z * ((HW - C) / HW)]);
    for (const x of [-L / 2 + C, L / 2 - C]) for (const [z, y] of sec) pts.push([x, y, zc + z]);
    k.hull("concreteDark", pts);
    // roof: an ink skin on both slopes, glass skylight panels with ink ribs
    for (const s of [-1, 1]) {
      const a: [number, number] = [s * (HW - 0.55), 5.3], b: [number, number] = [0, 7.9];
      const ang = Math.atan2(b[1] - a[1], -(b[0] - a[0]) * s) * s;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const mz = zc + (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      k.at([0, my, mz], [ang, 0, 0], () => {
        k.box("ink", [L - 2 * C + 0.3, 0.1, len + 0.15], [0, 0.07, 0]);
        // glass skylights in ink frames: a run of panes up the slope, ink ribs across and along
        const glassL = zc === 2 * HW ? L * 0.55 : L - 2 * C - 0.6;
        const gx = zc === 2 * HW ? L / 2 - C - 0.3 - glassL / 2 : 0;
        const gz = -s * len * 0.15, gd = len * 0.62;
        k.box("glassPale", [glassL, 0.05, gd], [gx, 0.13, gz]);
        for (const x of spread(gx - glassL / 2, gx + glassL / 2, Math.round(glassL / 2.2))) k.box("ink", [0.14, 0.14, gd + 0.14], [x, 0.17, gz]);
        for (const z of [gz - gd / 2, gz + gd / 2]) k.box("ink", [glassL + 0.14, 0.14, 0.14], [gx, 0.17, z]);
      });
    }
    // glazed gable top at the far end
    k.hull("glass", [[-L / 2 - 0.02, 5.55, zc - 1.9], [-L / 2 - 0.02, 5.55, zc + 1.9], [-L / 2 - 0.02, 7.45, zc], [-L / 2 + 0.1, 5.55, zc - 1.9], [-L / 2 + 0.1, 5.55, zc + 1.9], [-L / 2 + 0.1, 7.45, zc]]);
  }
  // the big glazed wall on the long +z side, in a concrete frame with an ink grid
  const zs = 3 * HW + 0.02, gx0 = -1.2, gx1 = L / 2 - C - 0.4;
  k.box("concrete", [gx1 - gx0 + 0.6, 4.4, 0.25], [(gx0 + gx1) / 2, 2.6, zs]);
  k.box("clear", [gx1 - gx0, 3.9, 0.05], [(gx0 + gx1) / 2, 2.55, zs + 0.14]);
  // inside: a pale floor, a mezzanine edge and dark columns behind the glass
  k.box("inner", [gx1 - gx0, 0.05, 2.4], [(gx0 + gx1) / 2, 0.62, zs - 1.2]);
  k.box("inner", [gx1 - gx0, 0.25, 1.6], [(gx0 + gx1) / 2, 2.55, zs - 0.9]);
  k.box("graphite", [gx1 - gx0, 3.9, 0.05], [(gx0 + gx1) / 2, 2.55, zs - 2.4]);
  // the mullion grid: five bays of heavy posts, each split in two, a transom and a door rail
  for (const x of spread(gx0, gx1, 5)) k.box("ink", [0.14, 3.9, 0.14], [x, 2.55, zs + 0.17]);
  for (const x of spread(gx0, gx1, 10)) k.box("ink", [0.05, 3.9, 0.08], [x, 2.55, zs + 0.17]);
  for (const y of [0.6, 2.75, 4.5]) k.box("ink", [gx1 - gx0, 0.12, 0.14], [(gx0 + gx1) / 2, y, zs + 0.17]);
  k.box("ink", [gx1 - gx0, 0.05, 0.08], [(gx0 + gx1) / 2, 3.7, zs + 0.17]);
  // the orange sign, a block proud of the wall beside the glass
  k.cbox("orange", [1.9, 1.7, 0.3], [gx0 - 1.5, 2.3, zs + 0.1], 0.04);
  return k.build();
});

export function HyperlabBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={hyperlabParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ Waters */

export const WATERS = { w: 23, d: 12, h: 7.6 };

/** A long low concrete lab: chamfered corners, a ribbon window, a paper entrance canopy with an orange line, ink plant on the roof. */
export const watersParts = once(() => {
  const k = new Kit();
  const W = 23, D = 10, H = 5.8;
  const ring = (w: number, d: number, c: number, y: number): V3[] => chamferRect(w, d, c).map(([x, z]) => [x, y, z]);
  k.hull("concrete", [...ring(W, D, 1.4, 0), ...ring(W, D, 1.4, H - 0.6), ...ring(W - 0.9, D - 0.9, 1.0, H)]);
  // a low parapet rim round the roof
  for (const s of [-1, 1]) {
    k.box("concrete", [W - 3.0, 0.35, 0.25], [0, H + 0.17, s * (D / 2 - 0.6)]);
    k.box("concrete", [0.25, 0.35, D - 3.0], [s * (W / 2 - 0.6), H + 0.17, 0]);
  }
  // panel joints
  for (const x of [-W / 4, W / 4]) k.box("concreteDark", [0.05, H - 0.6, 0.04], [x, (H - 0.6) / 2, D / 2 + 0.01]);
  // the ribbon window, front and sides
  const wy = 3.8, wh = 1.15, ww = W - 4.4;
  k.box("ink", [ww + 0.2, wh + 0.2, 0.06], [0, wy, D / 2 - 0.0]);
  k.box("glass", [ww, wh, 0.06], [0, wy, D / 2 + 0.02]);
  for (const x of spread(-ww / 2, ww / 2, 14)) k.box("ink", [0.07, wh, 0.08], [x, wy, D / 2 + 0.04]);
  for (const s of [-1, 1]) {
    k.box("ink", [0.06, wh + 0.2, D - 4.4], [s * (W / 2), wy, 0]);
    k.box("glass", [0.06, wh, D - 4.6], [s * (W / 2 + 0.02), wy, 0]);
  }
  // the entrance: a paper table canopy with an orange line along its top edge, an ink door under it
  const cx = 1.5, cw = 6.2, cd = 3.4, ch = 2.4;
  k.box("paper", [cw, 0.32, cd], [cx, ch + 0.16, D / 2 + cd / 2]);
  for (const s of [-1, 1]) k.box("paper", [0.3, ch, cd], [cx + s * (cw / 2 - 0.15), ch / 2, D / 2 + cd / 2]);
  k.box("orange", [cw + 0.02, 0.07, 0.02], [cx, ch + 0.22, D / 2 + cd + 0.01]);
  k.box("orange", [0.02, 0.07, cd], [cx - cw / 2 - 0.01, ch + 0.22, D / 2 + cd / 2]);
  k.box("orange", [0.02, 0.07, cd], [cx + cw / 2 + 0.01, ch + 0.22, D / 2 + cd / 2]);
  k.box("ink", [cw - 1.2, ch - 0.2, 0.05], [cx, (ch - 0.2) / 2, D / 2 + 0.03]);
  // roof plant: two louvred ink enclosures with grid tops and fans, joined by ducts
  const unit = (x: number, z: number, w: number, d: number, fans: boolean) => {
    const h = 1.3, y = H;
    k.box("inkMatte", [w, h, d], [x, y + h / 2, z]);
    for (let i = 0; i < 6; i++) {
      const yy = y + 0.15 + i * 0.2;
      k.box("graphite", [w + 0.04, 0.05, d + 0.04], [x, yy, z]);
    }
    for (const gx of spread(x - w / 2 + 0.2, x + w / 2 - 0.2, Math.round(w / 0.9))) k.box("graphite", [0.06, 0.08, d - 0.4], [gx, y + h + 0.04, z]);
    for (const gz of spread(z - d / 2 + 0.2, z + d / 2 - 0.2, Math.round(d / 0.9))) k.box("graphite", [w - 0.4, 0.08, 0.06], [x, y + h + 0.04, gz]);
    k.box("ink", [w * 0.45, 0.4, d * 0.5], [x - w * 0.2, y + h + 0.2, z]);
    if (fans)
      for (const fx of [x + w * 0.2, x + w * 0.36]) {
        k.cyl("ink", 0.62, 0.62, 0.25, [fx, y + h + 0.12, z - d * 0.22], 16);
        k.cyl("graphite", 0.5, 0.5, 0.27, [fx, y + h + 0.13, z - d * 0.22], 16);
        k.box("ink", [0.9, 0.05, 0.1], [fx, y + h + 0.28, z - d * 0.22]);
        k.box("ink", [0.1, 0.05, 0.9], [fx, y + h + 0.28, z - d * 0.22]);
      }
  };
  unit(-5.6, 0.4, 7.2, 5.2, false);
  unit(5.4, -0.6, 7.0, 5.2, true);
  // ducts: two runs with a U-bend between the units
  for (const [z, r] of [[1.2, 1.0], [-0.6, 0.6]] as [number, number][]) {
    k.box("inkMatte", [1.6, 0.7, 0.7], [-1.4, H + 0.4, z]);
    k.add("inkMatte", new THREE.TorusGeometry(r, 0.35, 4, 10, Math.PI), [-0.6, H + 0.4, z - r], [Math.PI / 2, 0, -Math.PI / 2]);
    k.box("inkMatte", [1.4, 0.7, 0.7], [0.4, H + 0.4, z - 2 * r]);
  }
  return k.build();
});

export function WatersBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={watersParts()} />
    </group>
  );
}
