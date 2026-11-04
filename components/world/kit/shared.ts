// The world kit: models rebuilt in code from the approved concepts (public/models/concepts,
// docs/BRAND.md 2026-11-05). A model is a handful of merged geometries, one per paint, over
// shared cached materials, so the world can instance any of them later (one InstancedMesh per
// paint). Everything is flat-shaded with chamfered edges, in metres, origin at the foot.
import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Concrete & Ink palette (docs/BRAND.md "World"). */
export const KIT = {
  paper: "#f3f2ed",
  ink: "#151515",
  concrete: "#d9d6ce",
  concreteDark: "#b8b4a9",
  graphite: "#2b2c2e",
  glass: "#1f262b",
  gravel: "#cdc4b0",
  leaf: "#5c6a4b",
  leafLight: "#73805c",
  orange: "#ff4f00",
} as const;

type PaintDef = { c: string; r?: number; m?: number; glow?: number; o?: number; double?: boolean; net?: boolean };

const PAINTS = {
  paper: { c: KIT.paper, r: 0.7 },
  ink: { c: KIT.ink, r: 0.6, m: 0.1 },
  concrete: { c: KIT.concrete, r: 0.95 },
  concreteDark: { c: KIT.concreteDark, r: 0.95 },
  graphite: { c: KIT.graphite, r: 0.7 },
  glass: { c: KIT.glass, r: 0.12, m: 0.4, o: 0.78 },
  gravel: { c: KIT.gravel, r: 1 },
  leaf: { c: KIT.leaf, r: 0.85 },
  leafLight: { c: KIT.leafLight, r: 0.85 },
  sage: { c: "#9aa38c", r: 0.85 },
  /** grey stone for gravel beds */
  stone: { c: "#8f8c86", r: 1 },
  orange: { c: KIT.orange, r: 0.55 },
  /** lit lantern panes: paper that glows a little by day */
  glow: { c: "#fbf8ef", r: 0.5, glow: 0.55 },
  /** thin blades seen from both sides */
  inkBlade: { c: KIT.ink, r: 0.7, double: true },
  paperBlade: { c: KIT.paper, r: 0.7, double: true },
  sageBlade: { c: "#9aa38c", r: 0.8, double: true },
  sandBlade: { c: "#c9bfa8", r: 0.8, double: true },
  /** cord net: an ink grid on a transparent sheet (keeps its uvs) */
  net: { c: KIT.ink, r: 0.8, double: true, net: true },
} satisfies Record<string, PaintDef>;

export type Paint = keyof typeof PAINTS;

let netTex: THREE.Texture | null = null;
function netTexture() {
  if (netTex) return netTex;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#151515";
  g.fillRect(0, 0, 64, 9);
  g.fillRect(0, 0, 9, 64);
  netTex = new THREE.CanvasTexture(cv);
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
  netTex.anisotropy = 4;
  return netTex;
}

const mats = new Map<Paint, THREE.MeshStandardMaterial>();

/** One shared material per paint. Never dispose. */
export function kitMat(p: Paint) {
  let m = mats.get(p);
  if (m) return m;
  const d: PaintDef = PAINTS[p];
  m = new THREE.MeshStandardMaterial({ color: d.c, roughness: d.r ?? 0.7, metalness: d.m ?? 0, flatShading: true });
  if (d.double) m.side = THREE.DoubleSide;
  if (d.glow) {
    m.emissive.set(d.c);
    m.emissiveIntensity = d.glow;
  }
  if (d.o !== undefined) {
    m.transparent = true;
    m.opacity = d.o;
    m.depthWrite = false;
  }
  if (d.net) {
    m.map = netTexture();
    m.alphaTest = 0.08;
    m.transparent = true;
    m.depthWrite = false;
    m.flatShading = false;
  }
  mats.set(p, m);
  return m;
}

export type V3 = [number, number, number];
export type V2 = [number, number];
/** Place a part: position, Euler rotation (radians), uniform or per-axis scale. */
export type Xf = { p?: V3; r?: V3; s?: number | V3 };

/** A built model: one merged geometry per paint. */
export type Model = { paint: Paint; geometry: THREE.BufferGeometry }[];

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

function place(g: THREE.BufferGeometry, xf?: Xf) {
  if (!xf) return g;
  const s = xf.s ?? 1;
  const sv = typeof s === "number" ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  _q.setFromEuler(_e.set(...(xf.r ?? [0, 0, 0])));
  _m.compose(new THREE.Vector3(...(xf.p ?? [0, 0, 0])), _q, sv);
  g.applyMatrix4(_m);
  return g;
}

/** Collects parts by paint and merges them. */
export class Kit {
  private parts = new Map<Paint, THREE.BufferGeometry[]>();
  add(paint: Paint, g: THREE.BufferGeometry, xf?: Xf) {
    let n = g.index ? g.toNonIndexed() : g.clone();
    if (paint !== "net") {
      for (const k of Object.keys(n.attributes)) if (k !== "position") n.deleteAttribute(k);
      n.computeVertexNormals();
    } else if (!n.attributes.normal) n.computeVertexNormals();
    n.clearGroups();
    n = place(n, xf);
    const list = this.parts.get(paint) ?? [];
    list.push(n);
    this.parts.set(paint, list);
    return this;
  }
  done(): Model {
    const out: Model = [];
    for (const [paint, list] of this.parts) {
      const g = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!g) throw new Error(`kit: merge failed for ${paint}`);
      g.computeBoundingSphere();
      g.computeBoundingBox();
      out.push({ paint, geometry: g });
    }
    return out;
  }
}

const models = new Map<string, Model>();

/** Cached model: `make` runs once per key. */
export function model(key: string, make: (k: Kit) => void): Model {
  let m = models.get(key);
  if (!m) {
    const k = new Kit();
    make(k);
    m = k.done();
    models.set(key, m);
  }
  return m;
}

/* ------------------------------------------------------------------ shapes */

/** Convex hull of points: flat faceted solids. */
export function hull(pts: V3[]) {
  return new ConvexGeometry(pts.map((p) => new THREE.Vector3(...p)));
}

/** Box w x h x d centred on the origin with every edge chamfered by c. */
export function cbox(w: number, h: number, d: number, c = 0.02) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const cc = Math.min(c, x * 0.49, y * 0.49, z * 0.49);
  const pts: V3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        pts.push([sx * x, sy * (y - cc), sz * (z - cc)]);
        pts.push([sx * (x - cc), sy * y, sz * (z - cc)]);
        pts.push([sx * (x - cc), sy * (y - cc), sz * z]);
      }
  return hull(pts);
}

/** Box chamfered on its four vertical edges only (top and bottom stay square). */
export function vbox(w: number, h: number, d: number, c = 0.02) {
  const x = w / 2;
  const z = d / 2;
  const pts: V3[] = [];
  for (const y of [-h / 2, h / 2])
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        pts.push([sx * x, y, sz * (z - c)]);
        pts.push([sx * (x - c), y, sz * z]);
      }
  return hull(pts);
}

/** Plain box (sharp edges) centred on the origin. */
export function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}

/** n-sided prism between radii rb (bottom) and rt (top), from y 0 to h. */
export function prism(rb: number, rt: number, h: number, sides = 8, rot = Math.PI / sides) {
  const g = new THREE.CylinderGeometry(rt, rb, h, sides, 1);
  g.rotateY(rot);
  g.translate(0, h / 2, 0);
  return g;
}

/** Lathe of a [radius, y] profile with few sides: a faceted turned shape. */
export function lathe(profile: V2[], sides = 8, rot = Math.PI / sides) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    sides,
    rot,
  );
  return g;
}

/** Square bar of section t from a to b (rails, frames, handles). */
export function bar(a: V3, b: V3, t: number, t2 = t) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.BoxGeometry(t, len, t2);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyQuaternion(q);
  const mid = va.add(vb).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

/** Round rod (n sides) of radius r from a to b. */
export function rod(a: V3, b: V3, r: number, sides = 6) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(r, r, va.distanceTo(vb), sides, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  g.applyQuaternion(q);
  const mid = va.add(vb).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

/** Rounded (or chamfered, with seg=1) rectangle outline in plan, [x, z], counter-clockwise. */
export function roundRect(w: number, d: number, r: number, seg = 4): V2[] {
  const out: V2[] = [];
  const cs: [number, number, number][] = [
    [w / 2 - r, d / 2 - r, 0],
    [-w / 2 + r, d / 2 - r, Math.PI / 2],
    [-w / 2 + r, -d / 2 + r, Math.PI],
    [w / 2 - r, -d / 2 + r, (3 * Math.PI) / 2],
  ];
  // in shape space (x, -z) the order below runs counter-clockwise
  for (const [cx, cz, a0] of cs)
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  return out;
}

function shape(pts: V2[]) {
  // plan [x, z] -> shape (x, -z) so that after rotateX(-90deg) it lands back on (x, z)
  return pts.map(([x, z]) => new THREE.Vector2(x, -z));
}

/** Solid slab with a plan outline, from y0 to y1. */
export function slab(outline: V2[], y0: number, y1: number) {
  const s = new THREE.Shape(shape(outline));
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

/** Wall ring between an outer and inner plan outline, from y0 to y1 (planters, trays, rims). */
export function ring(outer: V2[], inner: V2[], y0: number, y1: number) {
  const s = new THREE.Shape(shape(outer));
  s.holes.push(new THREE.Path(shape(inner).reverse()));
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

/** Plan outline scaled about the origin. */
export function inset(pts: V2[], d: number): V2[] {
  // offset each vertex along the averaged normal of its two edges
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const e1 = norm([p[0] - a[0], p[1] - a[1]]);
    const e2 = norm([b[0] - p[0], b[1] - p[1]]);
    // inward normal for a counter-clockwise loop in (x, z) with z flipped = left of travel
    const n1: V2 = [-e1[1], e1[0]];
    const n2: V2 = [-e2[1], e2[0]];
    const m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const k = d / Math.max(0.3, m[0] * n1[0] + m[1] * n1[1]);
    return [p[0] + m[0] * k, p[1] + m[1] * k];
  });
}

function norm([x, y]: V2): V2 {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

/** Seeded random in [0, 1). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A gravel bed: small faceted chips scattered over a plan rectangle at height y. */
export function gravel(k: Kit, paints: Paint[], w: number, d: number, y: number, n: number, seed: number, size = 0.035, keep?: (x: number, z: number) => boolean) {
  const r = rng(seed);
  const chip = new THREE.OctahedronGeometry(1, 0);
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * w;
    const z = (r() - 0.5) * d;
    if (keep && !keep(x, z)) continue;
    const s = size * (0.6 + r() * 0.8);
    k.add(paints[i % paints.length], chip, { p: [x, y, z], r: [r() * 3, r() * 3, r() * 3], s: [s, s * 0.55, s * 0.9] });
  }
}

/**
 * One vertex-coloured geometry from a model's paints (colours in linear, like THREE.Color),
 * for pipelines that draw a kind with a single `vertexColors` material. `only` limits the
 * paints (e.g. leave out "glow" or "glass" to give them their own material).
 */
export function bake(m: Model, opts: { only?: Paint[]; skip?: Paint[]; xf?: Xf } = {}) {
  const parts: THREE.BufferGeometry[] = [];
  const c = new THREE.Color();
  for (const { paint, geometry } of m) {
    if (opts.only && !opts.only.includes(paint)) continue;
    if (opts.skip?.includes(paint)) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", geometry.attributes.position.clone());
    g.setAttribute("normal", geometry.attributes.normal.clone());
    c.set(PAINTS[paint].c);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    parts.push(g);
  }
  const out = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (!out) throw new Error("kit: bake failed");
  place(out, opts.xf);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/** One paint of a model as its own geometry (or null), placed like `bake`. */
export function part(m: Model, paint: Paint, xf?: Xf) {
  const p = m.find((x) => x.paint === paint);
  if (!p) return null;
  const g = place(p.geometry.clone(), xf);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
