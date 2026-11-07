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
  return model("kit-cypress-v2", (k) => {
    planter(k, 1.2, 0.5, 0.1, 0.4);
    k.add("orange", box(0.11, 0.03, 0.42), { p: [0.545, 0.515, 0.28] });
    k.add("orange", box(0.012, 0.1, 0.42), { p: [0.604, 0.47, 0.28] });
    k.add("ink", prism(0.08, 0.065, 1.0, 6), { p: [0, 0.4, 0] });
    k.add(
      "sageLeaf",
      spindle(
        8,
        [
          [1.05, 0],
          [1.35, 0.46],
          [2.0, 0.66],
          [2.7, 0.63],
          [3.4, 0.46],
          [4.0, 0.2],
          [4.32, 0],
        ],
        5,
        0.12,
      ),
    );
  });
}

const TILE: Paint[] = ["sageLeaf", "sageLeaf", "sageLeaf", "sage", "leafLight"];

/** Round tree: a tiled icosphere crown on an ink trunk with an orange collar, in a shallow concrete tray. 4.8 m. */
export function roundTreeModel() {
  return model("kit-round-tree-v2", (k) => {
    // a thin square plate with a shallow frame
    const out = roundRect(1.7, 1.7, 0.02, 1);
    k.add("concreteLight", ring(out, inset(out, 0.07), 0, 0.07));
    k.add("concrete", slab(inset(out, 0.065), 0, 0.045));
    const R = 1.6;
    const cy = 1.75 + R;
    // the orange collar sits on the trunk just under the crown
    k.add("ink", prism(0.13, 0.11, cy - 0.04, 8), { p: [0, 0.04, 0] });
    k.add("orange", prism(0.12, 0.12, 0.06, 8), { p: [0, cy - R * 0.93 - 0.12, 0] });
    k.add("sageLeafDark", new THREE.IcosahedronGeometry(R * 0.93, 1), { p: [0, cy, 0] });
    // every face is its own slightly shrunk tile, so the seams read as grooves
    const ico = new THREE.IcosahedronGeometry(R, 1); // already one vertex per face corner (non-indexed)
    const p = ico.attributes.position;
    const r = rng(21);
    for (let f = 0; f < p.count; f += 3) {
      const v = [0, 1, 2].map((i) => new THREE.Vector3().fromBufferAttribute(p, f + i));
      const c = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
      const pts: V3[] = [];
      for (const a of v) {
        const t = a.clone().lerp(c, 0.06);
        pts.push([t.x, t.y + cy, t.z]);
        const b = t.clone().multiplyScalar(0.93);
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
  return model("kit-grasses-v2", (k) => {
    const L = 1.6;
    const D = 0.62;
    const H = 0.5;
    k.add("concreteDark", cbox(L, H, D, 0.07), { p: [0, H / 2, 0] });
    k.add("graphite", slab(roundRect(L - 0.12, D - 0.12, 0.02, 1), H, H + 0.004));
    k.add("orange", box(0.1, 0.11, 0.012), { p: [0.58, H - 0.1, D / 2 + 0.002] });
    const r = rng(17);
    // mostly sage, paper and sand, a little ink; wide, long, arching blades
    const paints: Paint[] = ["sageBlade", "paperBlade", "sandBlade", "sageBlade", "inkBlade", "paperBlade", "sandBlade", "sageBlade"];
    for (let i = 0; i < 130; i++) {
      const x = (r() - 0.5) * (L - 0.22);
      const z = (r() - 0.5) * (D - 0.2);
      const out = x / (L / 2);
      const yaw = (out >= 0 ? 0 : Math.PI) + (r() - 0.5) * 2.2;
      const lean = 0.04 + Math.abs(out) * 0.25 + r() * 0.2;
      const len = 0.7 + r() * 0.55 - Math.abs(out) * 0.2;
      k.add(paints[i % paints.length], blade(len, 0.065 + r() * 0.04, lean, yaw, 0.45 + r() * 0.8), { p: [x, H, z] });
    }
    // seed heads: tan feathered plumes, a stack of small chevrons on a thin stalk
    for (let i = 0; i < 6; i++) {
      const x = -0.55 + i * 0.22 + (r() - 0.5) * 0.06;
      const z = (r() - 0.5) * 0.2;
      const tilt = (x / (L / 2)) * 0.3;
      const top = 0.8 + r() * 0.3;
      k.add("sandBlade", blade(top, 0.012, tilt, 0, 0), { p: [x, H, z] });
      const head: Paint = i % 3 === 1 ? "paper" : "gravel";
      for (let j = 0; j < 7; j++) {
        const t = top + j * 0.045;
        const px = x + Math.sin(tilt) * t;
        const py = H + Math.cos(tilt) * t;
        // a chevron: two small plates in a V pointing up
        for (const sd of [-1, 1]) k.add(head, cbox(0.045, 0.012, 0.03, 0.004), { p: [px + sd * 0.019, py, z], r: [0, 0, -tilt + sd * 0.55] });
      }
      k.add(head, prism(0.022, 0, 0.06, 4), { p: [x + Math.sin(tilt) * (top + 0.32), H + Math.cos(tilt) * (top + 0.32), z], r: [0, 0, -tilt] });
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

/** Rocks (concept "rocks"): three big chamfered concrete boulders on dense dark grit in a thin square concrete tray; an orange hook on the front one. 3.2 m square. */
export function rocksModel(chips = 4200) {
  return model(`kit-rocks-v2-${chips}`, (k) => {
    const out = roundRect(3.2, 3.2, 0.01, 1);
    k.add("concrete", ring(out, inset(out, 0.045), 0, 0.07));
    k.add("stone", slab(inset(out, 0.04), 0, 0.04));
    // dense dark grit: small pebbles in greys
    gravel(k, ["stone", "graphite", "concreteDark", "stone", "concrete"], 3.1, 3.1, 0.044, chips, 9, chips > 600 ? 0.013 : 0.026, undefined, chips > 600);
    // three big, blocky, sharply cut boulders that fill the tray
    k.add("concrete", boulder(3, 1.35, 0.9, 1.2, 0.2), { p: [-0.6, 0.02, -0.38], r: [0, 0.22, 0] });
    k.add("concrete", boulder(5, 1.05, 0.8, 1.3, 0.18), { p: [0.72, 0.02, -0.22], r: [0, -0.18, 0] });
    k.add("concrete", boulder(7, 1.3, 0.68, 1.0, 0.17), { p: [0.02, 0.02, 0.5], r: [0, 0.06, 0] });
    // the orange hook draped over the front boulder's top front edge
    k.add("orange", box(0.045, 0.022, 0.12), { p: [0.2, 0.71, 0.84] });
    k.add("orange", box(0.045, 0.11, 0.022), { p: [0.2, 0.65, 0.92], r: [0.45, 0, 0] });
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
