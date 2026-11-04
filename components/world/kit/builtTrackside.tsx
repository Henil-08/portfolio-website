"use client";

// Trackside models rebuilt in code from their approved concepts (public/models/concepts/
// grandstand, floodlight, gantry, tecpro, marshal, pitwall). Each is a cached `*Parts()`
// builder (merged per material, ready for InstancedMesh) and a component. Front faces +z.
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { B, Built, Kit, cboxGeo, chamferRect, once, panelGeo, type MatKey } from "./builtShared";

type G = ThreeElements["group"];
type V3 = [number, number, number];
const spread = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/* ------------------------------------------------------------------ grandstand */

export const GRANDSTAND = { w: 17, d: 12, h: 9, rows: 8 };

/** A bucket seat facing +z: pan and back as one faceted hull, its origin at the front of the tread. */
function seat(k: Kit, mat: MatKey, x: number, y: number, z: number) {
  k.hull(mat, [
    [x - 0.22, y + 0.38, z - 0.05], [x + 0.22, y + 0.38, z - 0.05], [x - 0.2, y + 0.44, z - 0.42], [x + 0.2, y + 0.44, z - 0.42],
    [x - 0.22, y + 0.3, z - 0.05], [x + 0.22, y + 0.3, z - 0.05], [x - 0.2, y + 0.9, z - 0.52], [x + 0.2, y + 0.9, z - 0.52],
  ]);
  k.box("graphite", [0.08, 0.32, 0.08], [x, y + 0.16, z - 0.25]);
}

export type StandOpts = { w?: number; rows?: number; fence?: boolean };
const standCache = new Map<string, ReturnType<Kit["build"]>>();
/** Where the stand's tiers sit (local, unscaled): front of the platform, back wall, top tier, seat rows. */
export function grandstandFrame({ w = GRANDSTAND.w, rows = GRANDSTAND.rows }: StandOpts = {}) {
  const R = 0.85, RISE = 0.5, Y0 = 0.9, ZF = 3.2;
  return { w, rows, R, RISE, Y0, ZF, front: ZF + 2.2, back: ZF - rows * R - 0.4, top: Y0 + rows * RISE, x0: -w / 2 + 0.6, x1: w / 2 - 2.4 };
}

/**
 * Concrete tiers of ink seats (one paper row), stairs up the right, a wedge side wall, a paper
 * roof on an ink frame and, with `fence`, a mesh fence across the front left. Cached per option set.
 */
export function grandstandParts(o: StandOpts = {}) {
  const key = JSON.stringify(o);
  const hit = standCache.get(key);
  if (hit) return hit;
  const k = new Kit();
  const { w: W, rows: N } = grandstandFrame(o);
  const { R, RISE, Y0, ZF, x0, x1 } = grandstandFrame(o); // seating between the left wall and the stairs
  // front platform and the tiers
  k.box("concrete", [W, Y0, 2.2], [0, Y0 / 2, ZF + 1.1]);
  for (let i = 0; i < N; i++) {
    const zf = ZF - i * R, y = Y0 + i * RISE;
    k.box("concrete", [W - 1.2, y + RISE, R], [-0.6, (y + RISE) / 2, zf - R / 2]);
    for (let s = 0; s < 2; s++) k.box("concrete", [1.6, y + RISE * (s + 1) * 0.5, R / 2], [W / 2 - 1.6, (y + RISE * (s + 1) * 0.5) / 2, zf - (R / 2) * (s + 0.5)]);
    const paper = i === Math.min(3, N - 2);
    for (const x of spread(x0 + 0.3, x1 - 0.3, Math.round((x1 - x0) / 0.58))) seat(k, paper && x > x0 + 4 ? "paper" : "inkMatte", x, y + RISE, zf - 0.05);
  }
  const zb = ZF - N * R, ytop = Y0 + N * RISE;
  // back wall and the low left wall
  k.box("concrete", [W - 0.6, ytop + 1.6, 0.4], [-0.3, (ytop + 1.6) / 2, zb - 0.2]);
  k.cbox("concrete", [0.4, ytop + 1.6, ZF - zb + 2.0], [-W / 2 + 0.2, (ytop + 1.6) / 2, (ZF + zb) / 2 - 0.9], 0, 0.12, 0, [0, 0, 0]);
  // the wedge wall on the right, following the rake, chamfered on top
  const xw = W / 2 - 0.4;
  const wedge: V3[] = [];
  for (const dx of [-0.4, 0.4]) {
    const t = dx < 0 ? 0 : 0.25;
    wedge.push([xw + dx, 0, ZF + 2.2], [xw + dx, 0, zb - 0.4], [xw + dx, ytop + 1.6 - t, zb - 0.4], [xw + dx, Y0 + 0.6 - t, ZF + 2.2]);
  }
  k.hull("concrete", wedge);
  // the roof: a paper sheet on an ink frame, front posts with V braces, one orange box
  const ry = ytop + 4.2, rz0 = zb - 0.6, rz1 = ZF + 1.2;
  k.add("paper", cboxGeo(W + 0.4, 0.2, rz1 - rz0, 0, 0.05, 0), [0, ry + 0.3, (rz0 + rz1) / 2], [0.06, 0, 0]);
  const posts = spread(-W / 2 + 1.2, W / 2 - 1.0, Math.max(2, Math.round(W / 5.3)));
  for (const x of posts) {
    const zp = ZF - 1.6, yb = Y0 + 2 * RISE;
    k.box("ink", [0.18, ry - yb, 0.18], [x, (ry + yb) / 2, zp]);
    k.bar("ink", [x, ry - 1.1, zp], [x - 1.6, ry, zp], 0.12);
    k.bar("ink", [x, ry - 1.1, zp], [x + 1.6, ry, zp], 0.12);
    k.bar("ink", [x, ry, rz0 + 0.3], [x, ry + 0.2, rz1], 0.14);
    k.box("ink", [0.18, ry - ytop, 0.18], [x, ytop + (ry - ytop) / 2, zb - 0.3]);
  }
  for (const z of [rz1 - 0.2, ZF - 1.6, zb - 0.3]) k.box("ink", [W + 0.2, 0.16, 0.16], [0, ry + 0.02, z]);
  k.box("orange", [0.35, 0.35, 0.3], [posts[2] + 0.15, ry - 0.5, ZF - 1.4]);
  // mesh fence along the front left
  if (o.fence !== false) {
    const fz = ZF + 2.0, fh = 2.0;
    const fx = spread(-W / 2, 0.2, 4);
    for (const x of fx) k.box("ink", [0.1, fh + 0.1, 0.1], [x, fh / 2, fz]);
    for (let i = 0; i < 4; i++) {
      const a = fx[i], b = fx[i + 1];
      k.add("wire", panelGeo(b - a - 0.1, fh - 0.2, 0.12), [(a + b) / 2, fh / 2, fz]);
      for (const y of [0.1, fh * 0.42, fh]) k.box("ink", [b - a, 0.07, 0.07], [(a + b) / 2, y, fz]);
    }
  }
  const out = k.build();
  standCache.set(key, out);
  return out;
}

/** Every seat's tread point (local, unscaled), front row first: where a fan sits. */
export function standSeats(o: StandOpts = {}): V3[] {
  const { rows, R, RISE, Y0, ZF, x0, x1 } = grandstandFrame(o);
  const out: V3[] = [];
  for (let i = 0; i < rows; i++) for (const x of spread(x0 + 0.3, x1 - 0.3, Math.round((x1 - x0) / 0.58))) out.push([x, Y0 + (i + 1) * RISE, ZF - i * R - 0.32]);
  return out;
}

/** The stands in the game: a 13.3 m, five-row stand without its own fence (the track has a catch fence), at 0.75. */
export const STAND_GAME: StandOpts = { w: 13.3, rows: 5, fence: false };
export const STAND_SCALE = 0.75;
/** The game stand's z offset that puts its front at local z = 2.0 (where the old stands' front was). */
export const STAND_Z = 2.0 - grandstandFrame(STAND_GAME).front * STAND_SCALE;

export function GrandstandBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={grandstandParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ floodlight */

export const FLOODLIGHT = { h: 26, headW: 5.6, headH: 3.8, mast: 24, tilt: 0.42, cols: 6, rows: 4 };

/** The big floodlight: a chamfered ink mast on a concrete foot, a ladder to a railed platform, a wide paper-framed head of 24 lamps tilted at the road. */
export const floodlightParts = once(() => {
  const k = new Kit();
  const { mast: MH, headW: HW, headH: HH, tilt, cols, rows } = FLOODLIGHT;
  k.cbox("concrete", [2.4, 0.75, 2.4], [0, 0.375, 0], 0.55, 0.08, 0);
  k.cbox("ink", [1.5, 0.14, 1.5], [0, 0.82, 0], 0.3, 0.02, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    k.at([Math.cos(a) * 0.55, 0.89, Math.sin(a) * 0.55], -a, () => k.hull("ink", [[-0.2, 0, -0.03], [0.2, 0, -0.03], [-0.2, 0, 0.03], [0.2, 0, 0.03], [-0.2, 0.35, -0.03], [-0.2, 0.35, 0.03]]));
  }
  const sq = (w: number, c: number, y: number): V3[] => chamferRect(w, w, c).map(([x, z]) => [x, y, z]);
  k.hull("ink", [...sq(1.0, 0.18, 0.89), ...sq(0.72, 0.13, MH)]);
  for (const y of [MH * 0.42, MH * 0.74]) k.hull("graphite", [...sq(1.0 - (y / MH) * 0.28 + 0.03, 0.16, y - 0.03), ...sq(1.0 - (y / MH) * 0.28 + 0.03, 0.16, y + 0.03)]);
  // ladder up the +x face, then the platform under the head with its railing
  const lx = 0.72, l0 = 2.2, l1 = MH - 1.3;
  for (const z of [-0.22, 0.22]) k.box("ink", [0.05, l1 - l0, 0.05], [lx, (l0 + l1) / 2, z]);
  for (let y = l0 + 0.15; y < l1; y += 0.34) k.box("ink", [0.04, 0.04, 0.44], [lx, y, 0]);
  for (let y = l0; y < l1; y += 0.9) for (const z of [-0.22, 0.22]) k.box("ink", [0.32, 0.04, 0.04], [lx - 0.16, y, z]);
  const py = MH - 1.2;
  k.box("ink", [1.7, 0.08, 1.4], [1.15, py, 0]);
  for (const [x, z] of [[0.35, -0.7], [1.95, -0.7], [1.95, 0.7], [0.35, 0.7]] as [number, number][]) k.box("ink", [0.05, 1.05, 0.05], [x, py + 0.52, z]);
  for (const y of [py + 0.5, py + 1.02]) {
    k.box("ink", [0.05, 0.05, 1.4], [1.95, y, 0]);
    for (const z of [-0.7, 0.7]) k.box("ink", [1.6, 0.05, 0.05], [1.15, y, z]);
  }
  k.bar("ink", [0.36, py - 0.9, 0], [1.9, py - 0.05, 0], 0.06);
  // a small bracket on the other side, and the one orange: a box on the mast's face
  k.box("ink", [0.6, 0.06, 0.8], [-0.62, py + 0.1, 0]);
  k.box("orange", [0.3, 0.34, 0.12], [0.2, py + 0.15, 0.43]);
  // the head: a yoke on the mast top, a deep paper frame with an ink face of lamps
  k.cbox("ink", [0.9, 0.5, 0.9], [0, MH + 0.25, 0], 0.15, 0.05, 0);
  const hy = MH + 0.5 + HH / 2 - 0.2;
  k.at([0, hy, 0.25], [tilt, 0, 0], () => {
    k.add("paper", cboxGeo(HW, 0.6, HH, 0.45, 0.06, 0.06), [0, 0, 0], [Math.PI / 2, 0, 0]);
    k.add("ink", cboxGeo(HW - 0.2, 0.5, HH - 0.2, 0.4, 0.04, 0.04), [0, 0, -0.42], [Math.PI / 2, 0, 0]);
    k.box("inkMatte", [HW - 0.5, HH - 0.5, 0.05], [0, 0, 0.29]);
    const cw = (HW - 0.7) / cols, ch = (HH - 0.7) / rows;
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const x = -HW / 2 + 0.35 + cw * (c + 0.5), y = -HH / 2 + 0.35 + ch * (r + 0.5);
        k.cyl("ink", 0.34, 0.34, 0.22, [x, y, 0.34], 14, [Math.PI / 2, 0, 0]);
        k.cyl("lens", 0.26, 0.26, 0.05, [x, y, 0.45], 14, [Math.PI / 2, 0, 0]);
      }
    for (const x of spread(-HW / 2 + 0.35, HW / 2 - 0.35, cols)) k.box("graphite", [0.04, HH - 0.6, 0.06], [x, 0, 0.32]);
  });
  return k.build();
});

export function FloodlightBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={floodlightParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ gantry */

export const GANTRY = { span: 15, h: 8.4 };

/** The start gantry: chamfered ink posts on concrete feet, a beam with mitred corners, an LED board under it, five start lights on top (the middle one lit). */
export const gantryParts = once(() => {
  const k = new Kit();
  const X = GANTRY.span / 2, P = 0.9, PH = 6.2, BH = 0.9;
  for (const s of [-1, 1]) {
    const x = s * X;
    k.cbox("concrete", [2.4, 0.7, 1.9], [x, 0.35, 0], 0.08, 0.45, 0);
    k.cbox("ink", [P, PH - 0.7, P], [x, 0.7 + (PH - 0.7) / 2, 0], 0.16, 0, 0);
    k.box("graphite", [0.12, PH - 2.4, 0.05], [x - s * 0.18, 0.7 + (PH - 1.2) / 2 + 0.3, P / 2 + 0.005]);
    k.box("graphite", [P + 0.02, 0.04, P + 0.02], [x, 3.4, 0]);
    // the mitred elbow into the beam
    const pts: V3[] = [];
    for (const z of [-P / 2, P / 2]) {
      const zc = z * 0.82;
      pts.push([x - P / 2, PH, zc], [x + P / 2, PH, zc], [x + s * P / 2, PH + BH * 0.45, zc], [x + s * P * 0.05, PH + BH, zc], [x - s * 1.6, PH + BH, zc], [x - s * 1.6, PH + 0.0, zc]);
      pts.push([x - P / 2 + 0.16, PH - 0.01, z], [x + P / 2 - 0.16, PH - 0.01, z]);
    }
    k.hull("ink", pts);
    k.box("graphite", [0.04, BH + 0.02, P * 0.85], [x - s * 1.62, PH + BH / 2, 0]);
  }
  k.cbox("ink", [2 * X - 3.2, BH, P * 0.82], [0, PH + BH / 2, 0], 0.12, 0.12, 0.12, [Math.PI / 2, 0, 0]);
  // LED board
  k.cbox("ink", [7.4, 1.25, 0.45], [0, PH - 0.72, 0.18], 0.08);
  k.box("graphite", [7.0, 0.9, 0.04], [0, PH - 0.72, 0.42]);
  // five start lights
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 1.1, y = PH + BH + 0.55;
    k.cbox("ink", [0.95, 1.15, 0.75], [x, y, 0.15], 0.28, 0.1, 0.25);
    k.hull("ink", [[x - 0.42, y + 0.55, 0.55], [x + 0.42, y + 0.55, 0.55], [x - 0.42, y + 0.42, 0.85], [x + 0.42, y + 0.42, 0.85], [x - 0.42, y + 0.6, 0.5], [x + 0.42, y + 0.6, 0.5]]);
    k.cyl(i === 2 ? "lit" : "graphite", 0.3, 0.3, 0.06, [x, y - 0.05, 0.54], 14, [Math.PI / 2, 0, 0]);
  }
  return k.build();
});

export function GantryBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={gantryParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ TecPro */

/** One block: `l` along the wall, `h` tall, `t` thick, chamfered all round. */
export const TECPRO = { l: 1.25, h: 1.1, t: 1.0, c: 0.24 };
export type TecproPaint = "inkMatte" | "paper" | "orange";

/** A single TecPro block's body, centred on its own footprint, base at y = 0 (for instancing). */
export const tecproBodyGeo = once(() => cboxGeo(TECPRO.l, TECPRO.h, TECPRO.t, TECPRO.c).translate(0, TECPRO.h / 2, 0));
/** Its graphite strap round the block near one end, and the buckle on the front. */
export const tecproStrapParts = once(() => {
  const k = new Kit();
  const { l, h, t, c } = TECPRO;
  k.add("strap", cboxGeo(0.08, h + 0.02, t + 0.02, c, c, c), [l / 2 - 0.3, h / 2, 0], [0, 0, 0]);
  k.cbox("strap", [0.2, 0.26, 0.06], [l / 2 - 0.3, h / 2, t / 2 + 0.03], 0.02);
  k.box("graphite", [0.12, 0.04, 0.03], [l / 2 - 0.3, h / 2 + 0.05, t / 2 + 0.07]);
  return k.build().strap!;
});

/** Paints of the concept's wall, top row then bottom, left to right: black and white with one orange. */
export const TECPRO_WALL: TecproPaint[][] = [
  ["inkMatte", "paper", "paper", "inkMatte", "paper", "paper"],
  ["paper", "paper", "orange", "paper", "paper", "inkMatte"],
];

/** A two-high wall of TecPro blocks on a concrete strip, in the concept's paints. */
export const tecproWallParts = once(() => {
  const k = new Kit();
  const { l, h } = TECPRO;
  const n = TECPRO_WALL[0].length;
  k.box("concrete", [n * l + 0.8, 0.14, 1.6], [0, 0.07, 0]);
  TECPRO_WALL.forEach((row, ri) =>
    row.forEach((p, i) => {
      const x = (i - (n - 1) / 2) * l, y = 0.14 + (1 - ri) * h;
      k.add(p, tecproBodyGeo().clone(), [x, y, 0]);
      k.add("strap", tecproStrapParts().clone(), [x, y, 0]);
    }),
  );
  return k.build();
});

export function TecproBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={tecproWallParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ marshal post */

export const MARSHAL = { w: 2.5, d: 2.3, h: 3.3 };

/** A marshal post: a paper frame and light band under an ink roof, a concrete counter with an ink flag holder, the orange flag. */
export const marshalParts = once(() => {
  const k = new Kit();
  const { w: W, d: D } = MARSHAL;
  k.box("concrete", [W - 0.3, 0.15, D - 0.2], [0.1, 0.075, 0]);
  // paper pillar up the left, the light band across the top, a slim post at the front right
  k.cbox("paper", [0.38, 2.65, D], [-W / 2 + 0.19, 1.325, 0], 0.08, 0, 0.08);
  k.cbox("paper", [W, 0.6, D], [0, 2.65 + 0.3, 0], 0.1, 0, 0.12);
  k.box("lens", [W * 0.42, 0.36, 0.04], [-W * 0.18, 2.95, D / 2 + 0.01]);
  k.box("paper", [0.22, 2.5, 0.22], [W / 2 - 0.4, 1.4, D / 2 - 0.35]);
  // concrete back wall inside
  k.box("concrete", [W - 0.4, 2.65, 0.3], [0.15, 1.325, -D / 2 + 0.15]);
  // the counter, chamfered, at the front right, with the ink flag holder and the orange flag
  k.cbox("concrete", [1.75, 1.15, 1.25], [0.3, 0.15 + 0.575, D / 2 - 0.55], 0.12, 0.06, 0.1);
  k.box("ink", [0.32, 0.5, 0.18], [0.05, 0.15 + 0.95, D / 2 + 0.12]);
  k.box("concrete", [0.14, 0.36, 0.1], [0.05, 0.15 + 1.02, D / 2 + 0.2]);
  k.cyl("graphite", 0.02, 0.02, 0.9, [W / 2 + 0.1, 1.28, D / 2 - 0.15], 6, [0, 0, Math.PI / 2]);
  k.box("orange", [0.6, 0.6, 0.02], [W / 2 + 0.25, 1.0, D / 2 - 0.15]);
  // the ink roof, soft-cornered
  k.cbox("ink", [W + 0.1, 0.3, D + 0.15], [0.05, 3.1, 0], 0.18, 0.04, 0.04);
  return k.build();
});

export function MarshalBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={marshalParts()} />
    </group>
  );
}

/* ------------------------------------------------------------------ pit wall */

export const PITWALL = { booths: 4, pitch: 3.3, d: 3.8, h: 4.2 };

/**
 * The pit wall: a concrete wall with a paper cap and a tall bar fence toward the track (-z),
 * and four booths on the slab behind it, each with its own ink canopy, console and seat
 * facing the track. Number plates are separate meshes (`numberPlate`).
 */
export const pitWallParts = once(() => {
  const k = new Kit();
  const { booths: N, pitch: P, d: D } = PITWALL;
  const L = N * P + 1.0;
  const zw = -D / 2 + 0.3;
  // slab with a raised edge at the left end, and the wall: a sloped foot, an upright and a paper cap
  k.box("concrete", [L, 0.22, D], [0, 0.11, 0]);
  k.cbox("concrete", [0.4, 0.5, D], [-L / 2 + 0.2, 0.25, 0], 0, 0.15, 0);
  k.hull("concrete", [[-L / 2, 0, zw - 0.4], [L / 2, 0, zw - 0.4], [-L / 2, 0, zw + 0.35], [L / 2, 0, zw + 0.35], [-L / 2, 0.35, zw - 0.25], [L / 2, 0.35, zw - 0.25], [-L / 2, 0.35, zw + 0.25], [L / 2, 0.35, zw + 0.25], [-L / 2, 1.05, zw - 0.25], [L / 2, 1.05, zw - 0.25], [-L / 2, 1.05, zw + 0.25], [L / 2, 1.05, zw + 0.25]]);
  k.cbox("paper", [L, 0.4, 0.55], [0, 1.25, zw], 0, 0.04, 0);
  // the fence: posts kinked toward the track at the top, vertical bars
  const fy = 1.45, fh = 2.3;
  const posts = spread(-L / 2 + 0.1, L / 2 - 0.1, 4);
  for (const x of posts) {
    k.box("ink", [0.09, fh, 0.09], [x, fy + fh / 2, zw]);
    k.bar("ink", [x, fy + fh, zw], [x, fy + fh + 0.45, zw - 0.3], 0.08);
  }
  for (let i = 0; i < 4; i++) {
    const a = posts[i], b = posts[i + 1];
    k.add("bars", panelGeo(b - a - 0.09, fh - 0.15, 0.09), [(a + b) / 2, fy + fh / 2, zw]);
    for (const y of [fy + 0.06, fy + fh - 0.05]) k.box("ink", [b - a, 0.06, 0.06], [(a + b) / 2, y, zw]);
    k.add("bars", panelGeo(b - a - 0.09, 0.5, 0.09), [(a + b) / 2, fy + fh + 0.22, zw - 0.15], [-0.59, 0, 0]);
    k.box("ink", [b - a, 0.06, 0.06], [(a + b) / 2, fy + fh + 0.45, zw - 0.3]);
  }
  // the booths
  for (let i = 0; i < N; i++) {
    const x = (i - (N - 1) / 2) * P;
    const zc = zw + 0.3; // console against the wall
    // console desk: a concrete body with a paper top, a slanted leg at its left, a dark knee hole
    k.box("concrete", [P - 0.7, 0.85, 0.7], [x + 0.15, 0.22 + 0.425, zc + 0.35]);
    k.box("paper", [P - 0.6, 0.06, 0.85], [x + 0.15, 0.22 + 0.88, zc + 0.42]);
    k.box("inkMatte", [P - 1.6, 0.6, 0.04], [x + 0.35, 0.22 + 0.4, zc + 0.71]);
    k.hull("concrete", [[x - P / 2 + 0.25, 0.22, zc], [x - P / 2 + 0.55, 0.22, zc], [x - P / 2 + 0.25, 0.22, zc + 0.85], [x - P / 2 + 0.55, 0.22, zc + 0.85], [x - P / 2 + 0.25, 1.1, zc], [x - P / 2 + 0.25, 1.1, zc + 0.85], [x - P / 2 + 0.55, 1.1, zc], [x - P / 2 + 0.55, 1.1, zc + 0.85]]);
    // a partition and a pillar with the number plate at the right
    k.box("concrete", [0.14, 1.3, 1.9], [x + P / 2 - 0.12, 0.22 + 0.65, zc + 0.95]);
    k.cbox("concrete", [0.5, 1.6, 0.5], [x + P / 2 - 0.3, 0.22 + 0.8, zc + 1.95], 0.04, 0.04, 0);
    // the screen tilted on the desk, keyboard, the orange button
    k.at([x - 0.15, 0.22 + 0.91, zc + 0.3], [-0.35, 0, 0], () => {
      k.cbox("ink", [0.95, 0.6, 0.06], [0, 0.3, 0], 0.03);
      k.box("graphite", [0.85, 0.5, 0.01], [0, 0.31, 0.035]);
    });
    k.box("ink", [0.6, 0.03, 0.22], [x - 0.15, 0.22 + 0.925, zc + 0.6]);
    k.cyl("orange", 0.07, 0.07, 0.04, [x + 0.5, 0.22 + 0.93, zc + 0.55], 12);
    // seat facing the track on a single post
    const sz = zc + 1.35;
    k.box("ink", [0.06, 0.48, 0.06], [x - 0.1, 0.22 + 0.24, sz]);
    k.box("ink", [0.45, 0.03, 0.45], [x - 0.1, 0.24, sz]);
    k.hull("graphite", [[x - 0.32, 0.72, sz - 0.25], [x + 0.12, 0.72, sz - 0.25], [x - 0.32, 0.72, sz + 0.2], [x + 0.12, 0.72, sz + 0.2], [x - 0.32, 0.8, sz - 0.25], [x + 0.12, 0.8, sz - 0.25], [x - 0.3, 1.45, sz + 0.32], [x + 0.1, 1.45, sz + 0.32], [x - 0.3, 0.8, sz + 0.26], [x + 0.1, 0.8, sz + 0.26]]);
    // canopy: a hipped ink roof on a back post and a front post, a Z strut from its front edge to the desk
    const cy = 2.75, cz0 = zw + 0.1, cz1 = zc + 2.15, cw = P - 0.35;
    const ring = (w: number, d: number, y: number, dz = 0): V3[] => chamferRect(w, d, 0).map(([a, b]) => [a + x, y, b + (cz0 + cz1) / 2 + dz]);
    k.hull("ink", [...ring(cw, cz1 - cz0, cy), ...ring(cw, cz1 - cz0, cy + 0.12), ...ring(cw * 0.35, (cz1 - cz0) * 0.3, cy + 0.42)]);
    k.hull("ink", [[x - cw / 2, cy, cz1], [x + cw / 2, cy, cz1], [x - cw / 2, cy - 0.35, cz1 - 0.05], [x + cw / 2, cy - 0.35, cz1 - 0.05], [x - cw / 2, cy, cz1 - 0.12], [x + cw / 2, cy, cz1 - 0.12]]);
    k.box("ink", [0.09, cy - 0.22, 0.09], [x + cw / 2 - 0.1, 0.22 + (cy - 0.22) / 2, cz1 - 0.1]);
    k.box("ink", [0.09, cy - 1.15, 0.09], [x - cw / 2 + 0.15, 1.15 + (cy - 1.15) / 2, cz0 + 0.2]);
    k.bar("ink", [x - cw / 2 + 0.15, cy - 0.3, cz1 - 0.1], [x - 0.35, 0.22 + 0.9, zc + 0.75], 0.09);
  }
  return k.build();
});

const plates = new Map<string, THREE.MeshStandardMaterial>();
/** A small paper plate with an ink number (booths 1-4). */
export function numberPlate(text: string) {
  let m = plates.get(text);
  if (m) return m;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d")!;
    g.fillStyle = B.paper;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = B.ink;
    const fam = getComputedStyle(document.body).getPropertyValue("--font-plex-mono").trim();
    g.font = `500 72px ${fam ? `${fam}, ` : ""}monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 64, 68);
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
  plates.set(text, m);
  return m;
}

/** Where booth i's number plate sits (front face of its pillar). */
export function boothPlateAt(i: number): V3 {
  const { booths: N, pitch: P, d: D } = PITWALL;
  const zc = -D / 2 + 0.6;
  return [(i - (N - 1) / 2) * P + P / 2 - 0.3, 0.22 + 1.1, zc + 2.21];
}

export function PitWallBuilt(props: G) {
  return (
    <group {...props}>
      <Built parts={pitWallParts()} />
      {Array.from({ length: PITWALL.booths }, (_, i) => (
        <mesh key={i} position={boothPlateAt(i)} material={numberPlate(String(i + 1))}>
          <planeGeometry args={[0.32, 0.32]} />
        </mesh>
      ))}
    </group>
  );
}
