// Shared pieces for the models rebuilt in code from their approved concepts (docs/BRAND.md,
// 2026-11-05): one cached material per brand colour, and `Kit`, a builder that collects
// boxes, faceted hulls and extrusions per material and merges them into one geometry each,
// so a whole model is a handful of draw calls and its parts can feed an InstancedMesh.
// Units are metres, y up, origin on the ground at the footprint's centre, front faces +z.
import { createElement } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";

export const B = {
  paper: "#f3f2ed",
  ink: "#151515",
  concrete: "#d9d6ce",
  concreteDark: "#b8b4a9",
  graphite: "#2b2c2e",
  glass: "#1f262b",
  orange: "#ff4f00",
  leaf: "#5c6a4b",
  lamp: "#fff3dc",
};

const std = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

/** Mesh-wire panels: a square grid of ink wire, see-through between the wires (uv in metres / cell). */
function wireMat(vertical = false) {
  if (typeof document === "undefined") return std(B.ink, 0.6, 0.2);
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 5, 32);
  if (!vertical) g.fillRect(0, 0, 32, 5);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ color: B.ink, alphaMap: t, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.2 });
}

const MAKERS = {
  paper: () => std(B.paper, 0.6),
  ink: () => std(B.ink, 0.55, 0.2),
  inkMatte: () => std(B.ink, 0.85),
  concrete: () => std(B.concrete, 0.95),
  concreteDark: () => std(B.concreteDark, 0.95),
  graphite: () => std(B.graphite, 0.6, 0.3),
  strap: () => std("#6d6e6b", 0.8),
  glass: () => std("#45515a", 0.25, 0.1),
  /** see-through glass for shop fronts and garage doors */
  clear: () => new THREE.MeshStandardMaterial({ color: "#8c979b", roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.32, depthWrite: false }),
  /** pale interiors seen through clear glass */
  inner: () => std("#e4e2dc", 0.85),
  orange: () => std(B.orange, 0.55),
  leaf: () => std(B.leaf, 0.9),
  /** lamp lenses and the lit start light: glow a little by day */
  lens: () => new THREE.MeshStandardMaterial({ color: "#f4f1e8", emissive: B.lamp, emissiveIntensity: 0.25, roughness: 0.25, metalness: 0.1 }),
  lit: () => new THREE.MeshStandardMaterial({ color: B.orange, emissive: B.orange, emissiveIntensity: 1.4, roughness: 0.4, toneMapped: false }),
  wire: () => wireMat(false),
  bars: () => wireMat(true),
};
export type MatKey = keyof typeof MAKERS;
const cache = new Map<MatKey, THREE.Material>();
/** The shared material for a key (never dispose: every built model uses the same ones). */
export function bm(k: MatKey) {
  let m = cache.get(k);
  if (!m) cache.set(k, (m = MAKERS[k]()));
  return m;
}

export type Parts = Partial<Record<MatKey, THREE.BufferGeometry>>;
type V3 = [number, number, number];

/** Every part non-indexed with position, normal and uv, so any mix merges. */
function prep(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((out.getAttribute("position").count) * 2), 2));
  for (const name of Object.keys(out.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") out.deleteAttribute(name);
  out.clearGroups();
  return out;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3(1, 1, 1);
function mat4(p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) {
  tmpQ.setFromEuler(tmpE.set(...r));
  return new THREE.Matrix4().compose(new THREE.Vector3(...p), tmpQ, tmpS.set(...s).clone());
}

/** A convex solid through `pts` (flat facets: the faceted, chamfered look). */
export function hullGeo(pts: V3[]) {
  return new ConvexGeometry(pts.map((p) => new THREE.Vector3(...p)));
}

/** Corners of a w x d rectangle with its corners cut by c, as [x, z] around the centre. */
export function chamferRect(w: number, d: number, c: number): [number, number][] {
  const x = w / 2, z = d / 2;
  if (c <= 0) return [[-x, -z], [x, -z], [x, z], [-x, z]];
  return [[-x + c, -z], [x - c, -z], [x, -z + c], [x, z - c], [x - c, z], [-x + c, z], [-x, z - c], [-x, -z + c]];
}

/**
 * A box w x h x d centred on the origin with chamfered edges: `c` on the vertical edges,
 * `top` and `bot` on the top and bottom edges.
 */
export function cboxGeo(w: number, h: number, d: number, c = 0, top = c, bot = c) {
  const pts: V3[] = [];
  const ring = (y: number, inset: number) => {
    for (const [x, z] of chamferRect(w - 2 * inset, d - 2 * inset, Math.max(0, c - inset * 0.6))) pts.push([x, y, z]);
  };
  ring(-h / 2 + bot, 0);
  ring(h / 2 - top, 0);
  if (bot > 0) ring(-h / 2, bot);
  if (top > 0) ring(h / 2, top);
  return hullGeo(pts);
}

/** A flat shape (in x, y) extruded `depth` along +z from z = 0. */
export function extrudeGeo(shape: THREE.Shape, depth: number) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
}

/** A wire panel w x h in the x-y plane, its uv in cells of `cell` metres. */
export function panelGeo(w: number, h: number, cell = 0.1) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / cell), uv.getY(i) * (h / cell));
  return g;
}

/**
 * Four sloped faces from an outer w x h opening at z = 0 to an inner one `inset` smaller at
 * z = -depth: a window reveal (the deep coffers on the town blocks).
 */
export function revealGeo(w: number, h: number, inset: number, depth: number, insetY = inset) {
  const o = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  const i = [[-w / 2 + inset, -h / 2 + insetY], [w / 2 - inset, -h / 2 + insetY], [w / 2 - inset, h / 2 - insetY], [-w / 2 + inset, h / 2 - insetY]];
  const pos: number[] = [];
  for (let k = 0; k < 4; k++) {
    const n = (k + 1) % 4;
    const a = [o[k][0], o[k][1], 0], b = [o[n][0], o[n][1], 0], c = [i[n][0], i[n][1], -depth], d = [i[k][0], i[k][1], -depth];
    pos.push(...a, ...c, ...b, ...a, ...d, ...c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Collects parts per material under a transform stack, then merges each material once. */
export class Kit {
  private parts = new Map<MatKey, THREE.BufferGeometry[]>();
  private m = new THREE.Matrix4();

  add(k: MatKey, g: THREE.BufferGeometry, p?: V3, r?: V3, s?: V3) {
    const out = prep(g);
    if (p || r || s) out.applyMatrix4(mat4(p, r, s));
    out.applyMatrix4(this.m);
    let list = this.parts.get(k);
    if (!list) this.parts.set(k, (list = []));
    list.push(out);
    return this;
  }
  box(k: MatKey, s: V3, p: V3, r?: V3) {
    return this.add(k, new THREE.BoxGeometry(...s), p, r);
  }
  /** chamfered box (see `cboxGeo`), centred on `p` */
  cbox(k: MatKey, s: V3, p: V3, c: number, top = c, bot = c, r?: V3) {
    return this.add(k, cboxGeo(s[0], s[1], s[2], c, top, bot), p, r);
  }
  hull(k: MatKey, pts: V3[]) {
    return this.add(k, hullGeo(pts));
  }
  cyl(k: MatKey, rt: number, rb: number, h: number, p: V3, seg = 12, r?: V3) {
    return this.add(k, new THREE.CylinderGeometry(rt, rb, h, seg), p, r);
  }
  /** a bar from a to b with a square section `t` */
  bar(k: MatKey, a: V3, b: V3, t: number) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const g = new THREE.BoxGeometry(t, len, t);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(va.add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    return this.add(k, g);
  }
  /** run `fn` with its parts moved to `p`, turned by `r` */
  at(p: V3, r: V3 | number, fn: () => void, s?: V3) {
    const prev = this.m.clone();
    this.m.multiply(tmpM.copy(mat4(p, typeof r === "number" ? [0, r, 0] : r, s)));
    fn();
    this.m.copy(prev);
    return this;
  }
  build(): Parts {
    const out: Parts = {};
    for (const [k, list] of this.parts) {
      out[k] = mergeGeometries(list)!;
      for (const g of list) g.dispose();
    }
    this.parts.clear();
    return out;
  }
}

/** A builder run once, on first use (module-level cache, so every copy shares its geometry). */
export function once<T>(fn: () => T) {
  let v: T | undefined;
  return () => (v ??= fn());
}

/** Seeded random in [0, 1) for scatter that must be the same every render. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const SHADOW_FREE: MatKey[] = ["clear", "lens", "lit", "inner"];
/** The meshes for built parts, one per material, shared materials. */
export function partMeshes(parts: Parts) {
  return (Object.keys(parts) as MatKey[]).map((k) => ({ key: k, geometry: parts[k]!, material: bm(k), cast: !SHADOW_FREE.includes(k) }));
}

/** Built parts as one group of meshes (cast and receive shadows; glass and lamps don't cast). */
export function Built({ parts }: { parts: Parts }) {
  return createElement(
    "group",
    null,
    partMeshes(parts).map((m) => createElement("mesh", { key: m.key, geometry: m.geometry, material: m.material, castShadow: m.cast, receiveShadow: true })),
  );
}
