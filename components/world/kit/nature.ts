// Nature kit (concepts tree-cypress, tree-round, bush, grasses, rocks): faceted leaf solids in
// concrete planters and trays. Builders return cached Models (see ./shared).
import * as THREE from "three";
import { box, cbox, gravel, hull, inset, model, prism, ring, rng, roundRect, slab, type Kit, type Paint, type V3 } from "./shared";

/** Square concrete planter, hollow, with a lower concrete floor inside. */
function planter(k: Kit, w: number, h: number, wall: number, floor: number) {
  const out = roundRect(w, w, 0.05, 1);
  k.add("concrete", ring(out, inset(out, wall), 0, h));
  k.add("concreteDark", slab(inset(out, wall - 0.005), 0, floor));
}

/** Spindle of jittered rings: [y, radius] stations, `n` points a ring. */
function spindle(seed: number, st: [number, number][], n: number, jitter: number) {
  const r = rng(seed);
  const pts: V3[] = [];
  st.forEach(([y, rad], i) => {
    const off = i * 0.7 + r();
    if (rad < 0.02) {
      pts.push([(r() - 0.5) * jitter, y, (r() - 0.5) * jitter]);
      return;
    }
    for (let j = 0; j < n; j++) {
      const a = off + (j / n) * Math.PI * 2;
      const rr = rad * (1 - jitter + r() * jitter * 2);
      pts.push([Math.cos(a) * rr, y + (r() - 0.5) * jitter * 0.6, Math.sin(a) * rr]);
    }
  });
  return hull(pts);
}

/** Cypress: a tall faceted spindle on an ink trunk in a square concrete planter with an orange edge clip. 4.3 m. */
export function cypressModel() {
  return model("kit-cypress", (k) => {
    planter(k, 1.2, 0.5, 0.1, 0.4);
    k.add("orange", box(0.11, 0.03, 0.42), { p: [0.545, 0.515, 0.28] });
    k.add("orange", box(0.012, 0.1, 0.42), { p: [0.604, 0.47, 0.28] });
    k.add("ink", prism(0.08, 0.065, 1.0, 6), { p: [0, 0.4, 0] });
    k.add(
      "leafLight",
      spindle(
        8,
        [
          [1.15, 0],
          [1.45, 0.38],
          [2.0, 0.55],
          [2.7, 0.52],
          [3.4, 0.38],
          [4.0, 0.16],
          [4.32, 0],
        ],
        5,
        0.12,
      ),
    );
  });
}

const TILE: Paint[] = ["leafLight", "leafLight", "leafLight", "leaf"];

/** Round tree: a tiled icosphere crown on an ink trunk with an orange collar, in a shallow concrete tray. 4.8 m. */
export function roundTreeModel() {
  return model("kit-round-tree", (k) => {
    const out = roundRect(1.8, 1.8, 0.04, 1);
    k.add("concrete", ring(out, inset(out, 0.09), 0, 0.12));
    k.add("concreteDark", slab(inset(out, 0.085), 0, 0.07));
    k.add("ink", prism(0.13, 0.11, 1.55, 8), { p: [0, 0.07, 0] });
    k.add("orange", prism(0.118, 0.118, 0.05, 8), { p: [0, 1.52, 0] });
    const R = 1.65;
    const cy = 1.6 + R * 0.93;
    k.add("leaf", new THREE.IcosahedronGeometry(R * 0.955, 1), { p: [0, cy, 0] });
    // every face is its own slightly shrunk tile, so the seams read as grooves
    const ico = new THREE.IcosahedronGeometry(R, 1).toNonIndexed();
    const p = ico.attributes.position;
    const r = rng(21);
    for (let f = 0; f < p.count; f += 3) {
      const v = [0, 1, 2].map((i) => new THREE.Vector3().fromBufferAttribute(p, f + i));
      const c = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
      const pts: V3[] = [];
      for (const a of v) {
        const t = a.clone().lerp(c, 0.03);
        pts.push([t.x, t.y + cy, t.z]);
        const b = t.clone().multiplyScalar(0.95);
        pts.push([b.x, b.y + cy, b.z]);
      }
      k.add(TILE[Math.floor(r() * TILE.length)], hull(pts));
    }
  });
}

/** Rounded faceted bush: octagonal bands with chamfered top and foot. */
function bushBody(R: number, H: number, rot: number) {
  const pts: V3[] = [];
  const rings: [number, number][] = [
    [0, 0.72],
    [0.22, 1],
    [0.72, 1],
    [1, 0.62],
  ];
  for (const [y, s] of rings)
    for (let j = 0; j < 8; j++) {
      const a = rot + (j / 8) * Math.PI * 2;
      pts.push([Math.cos(a) * R * s, y * H, Math.sin(a) * R * s]);
    }
  return hull(pts);
}

/** Bush tray size (plan) and rim. */
export const BUSH = { w: 2.7, d: 2.3, r: 0.3, rim: 0.1, rimH: 0.13, bed: 0.085 };

/**
 * Three faceted bushes (concept "bush") on a bed of real gravel: individual pebbles, mixed sizes
 * and four stone colours, packed over a gravel-coloured bed, in a rounded concrete tray with a
 * paper label strip (an ink rule and an ink dot) along the front-left and an orange clip on the
 * front-right rim. `chips` sets the pebble count (the world's bushes carry fewer). 2.7 x 2.3 m.
 */
export function bushModel(chips = 3600) {
  return model(`kit-bush-v2-${chips}`, (k) => {
    const { w, d, r, rim, rimH, bed } = BUSH;
    const out = roundRect(w, d, r, 5);
    k.add("concreteLight", ring(out, inset(out, rim), 0, rimH));
    k.add("gravel", slab(inset(out, rim - 0.005), 0, bed));
    const inner = (x: number, z: number) => Math.abs(x) < w / 2 - rim - 0.02 && Math.abs(z) < d / 2 - rim - 0.02 && Math.hypot(Math.max(0, Math.abs(x) - (w / 2 - r)), Math.max(0, Math.abs(z) - (d / 2 - r))) < r - rim - 0.02;
    const big = chips > 600;
    gravel(k, ["gravel", "paper", "concrete", "gravel", "concreteLight", "concreteDark"], w - 2 * rim, d - 2 * rim, bed + 0.004, chips, 4, big ? 0.015 : 0.03, inner, big);
    // label strip on the front-left rim: a paper plate with an ink rule along its outer edge,
    // and an ink dot on the rim's face at its end
    const zf = d / 2 - rim / 2;
    k.add("paper", box(1.05, 0.012, rim - 0.01), { p: [-w / 2 + r + 0.48, rimH + 0.006, zf] });
    k.add("ink", box(1.05, 0.014, 0.012), { p: [-w / 2 + r + 0.48, rimH + 0.007, d / 2 - 0.015] });
    k.add("ink", prism(0.024, 0.024, 0.01, 12), { p: [-w / 2 + r + 0.97, rimH * 0.5, d / 2 + 0.002], r: [Math.PI / 2, 0, 0] });
    // orange clip over the front-right rim
    k.add("orange", box(0.07, 0.03, rim + 0.02), { p: [0.62, rimH + 0.012, zf] });
    k.add("orange", box(0.07, 0.07, 0.012), { p: [0.62, rimH - 0.025, d / 2 + 0.008] });
    // the bushes: big at the back right, a mid one to the left, a small one in front
    k.add("sage", bushBody(0.7, 1.25, 0.2), { p: [0.45, bed - 0.02, -0.3] });
    k.add("sage", bushBody(0.6, 1.02, 0.45), { p: [-0.72, bed - 0.02, 0.22] });
    k.add("sage", bushBody(0.35, 0.66, 0.1), { p: [0.12, bed - 0.02, 0.62] });
  });
}

/** A tapered, curving blade: a strip from base to tip. */
function blade(len: number, w: number, lean: number, yaw: number, curve: number) {
  const n = 6;
  const pos: number[] = [];
  const pt = (i: number, side: number) => {
    const t = i / n;
    const ang = lean + curve * t * t;
    // path in the blade's own plane: up and out
    let x = 0;
    let y = 0;
    for (let j = 0; j < i; j++) {
      const a = lean + curve * (j / n) ** 2;
      x += Math.sin(a) * (len / n);
      y += Math.cos(a) * (len / n);
    }
    const hw = (w / 2) * (1 - t) * side;
    // width runs across the lean direction, with a little twist
    const px = x + Math.cos(ang) * hw * 0.25;
    const pz = hw;
    const py = y - Math.sin(ang) * hw * 0.25;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return [px * c - pz * s, py, px * s + pz * c];
  };
  for (let i = 0; i < n; i++) {
    const a = pt(i, -1);
    const b = pt(i, 1);
    const c = pt(i + 1, -1);
    const d = pt(i + 1, 1);
    pos.push(...a, ...b, ...d, ...a, ...d, ...c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** Ornamental grasses (ink, paper, sage and sand blades with stacked seed heads) in a long chamfered concrete trough with an orange tag. 1.6 m long. */
export function grassesModel() {
  return model("kit-grasses", (k) => {
    const L = 1.6;
    const D = 0.62;
    const H = 0.5;
    k.add("concreteDark", cbox(L, H, D, 0.07), { p: [0, H / 2, 0] });
    k.add("graphite", slab(roundRect(L - 0.12, D - 0.12, 0.02, 1), H, H + 0.004));
    k.add("orange", box(0.1, 0.11, 0.012), { p: [0.58, H - 0.1, D / 2 + 0.002] });
    const r = rng(17);
    const paints: Paint[] = ["inkBlade", "paperBlade", "sageBlade", "sandBlade", "inkBlade", "paperBlade", "sandBlade"];
    for (let i = 0; i < 120; i++) {
      const x = (r() - 0.5) * (L - 0.25);
      const z = (r() - 0.5) * (D - 0.22);
      // lean away from the trough's middle, more at the ends
      const out = x / (L / 2);
      const yaw = (out >= 0 ? 0 : Math.PI) + (r() - 0.5) * 1.6;
      const lean = 0.03 + Math.abs(out) * 0.3 + r() * 0.2;
      const len = 0.55 + r() * 0.55 - Math.abs(out) * 0.15;
      k.add(paints[i % paints.length], blade(len, 0.06 + r() * 0.035, lean, yaw, 0.2 + r() * 0.5), { p: [x, H, z] });
    }
    // seed heads: a thin stalk and a stack of chevrons
    for (let i = 0; i < 6; i++) {
      const x = -0.55 + i * 0.22 + (r() - 0.5) * 0.06;
      const z = (r() - 0.5) * 0.2;
      const tilt = (x / (L / 2)) * 0.35;
      const top = 0.75 + r() * 0.3;
      k.add("sandBlade", blade(top, 0.012, tilt, 0, 0), { p: [x, H, z] });
      const head = i % 2 === 0 ? "paper" : "gravel";
      for (let j = 0; j < 6; j++) {
        const y = H + top + j * 0.055;
        const dx = Math.sin(tilt) * (top + j * 0.055);
        k.add(head, cbox(0.085, 0.05, 0.06, 0.016), { p: [x + dx, y, z], r: [0, 0.2 * j, -tilt + (j % 2 ? 0.25 : -0.25)] });
      }
      const dx = Math.sin(tilt) * (top + 0.36);
      k.add(head, prism(0.04, 0, 0.09, 4), { p: [x + dx, H + top + 0.33, z], r: [0, 0, -tilt] });
    }
  });
}

/** A chamfered boulder: a cbox-like hull with every corner pulled at random. */
function boulder(seed: number, w: number, h: number, d: number, c: number) {
  const r = rng(seed);
  const pts: V3[] = [];
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const j = () => 1 + (r() - 0.5) * 0.18;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const cc = c * j();
        pts.push([sx * x * j(), sy * (y - cc), sz * (z - cc)]);
        pts.push([sx * (x - cc), sy * y * (sy > 0 ? j() : 1), sz * (z - cc)]);
        pts.push([sx * (x - cc), sy * (y - cc), sz * z * j()]);
      }
  const g = hull(pts);
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox!.min.y, 0);
  return g;
}

/** Three chamfered concrete boulders on grey gravel in a thin square tray; an orange hook on the front one. 2.6 m square. */
export function rocksModel() {
  return model("kit-rocks", (k) => {
    const out = roundRect(2.6, 2.6, 0.01, 1);
    k.add("concrete", ring(out, inset(out, 0.04), 0, 0.06));
    k.add("stone", slab(inset(out, 0.035), 0, 0.035));
    gravel(k, ["concreteDark", "stone", "concrete"], 2.5, 2.5, 0.04, 700, 9, 0.024);
    k.add("concrete", boulder(3, 1.1, 0.85, 1.0, 0.2), { p: [-0.5, 0.02, -0.4], r: [0, 0.25, 0] });
    k.add("concrete", boulder(5, 0.95, 0.75, 1.05, 0.19), { p: [0.62, 0.02, -0.2], r: [0, -0.2, 0] });
    k.add("concrete", boulder(7, 1.05, 0.62, 0.85, 0.17), { p: [0.0, 0.02, 0.45], r: [0, 0.08, 0] });
    // the hook sits over the front boulder's top front edge
    k.add("orange", box(0.045, 0.022, 0.1), { p: [0.15, 0.64, 0.66] });
    k.add("orange", box(0.045, 0.1, 0.022), { p: [0.15, 0.6, 0.72], r: [0.5, 0, 0] });
  });
}

const boulders = new Map<string, THREE.BufferGeometry>();

/**
 * One loose boulder from the rocks concept (chamfered, corners pulled at random), w x h x d,
 * centred on its middle (`foot`: origin at its foot instead). For instanced knock-about rocks.
 */
export function boulderGeometry(seed: number, w = 2, h = 1.4, d = 1.7, foot = false) {
  const key = `${seed}|${w}|${h}|${d}|${foot}`;
  let g = boulders.get(key);
  if (!g) {
    g = boulder(seed, w, h, d, Math.min(w, h, d) * 0.22);
    if (!foot) g.translate(0, -h / 2, 0);
    g.deleteAttribute("uv");
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    boulders.set(key, g);
  }
  return g;
}
