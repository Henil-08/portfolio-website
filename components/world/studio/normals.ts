// Creased normals for the faceted kit: smooth across shallow edges (chamfers, bevels), sharp
// above the crease angle (box corners, tree facets). Area-weighted, so a big face keeps its
// own normal right to its edge and the small chamfer next to it bends between the two faces:
// the chamfer reads as a soft rounded highlight, the faces stay flat. Like toCreasedNormals
// in three/examples/jsm/utils/BufferGeometryUtils, but weighted and in place.
import * as THREE from "three";

/**
 * Rewrites the normals of a non-indexed geometry (an indexed one is converted first and the
 * new geometry returned). `angle` in degrees: faces meeting at less than this share a normal.
 */
export function creaseNormals(geometry: THREE.BufferGeometry, angle = 50) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const n = pos.count;
  const tris = Math.floor(n / 3);
  // un-normalised face normals (length = twice the area) and unit ones
  const fa = new Float32Array(tris * 3);
  const fu = new Float32Array(tris * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1).sub(a);
    c.fromBufferAttribute(pos, t * 3 + 2).sub(a);
    b.cross(c);
    fa.set([b.x, b.y, b.z], t * 3);
    const l = b.length() || 1;
    fu.set([b.x / l, b.y / l, b.z / l], t * 3);
  }
  // vertices grouped by position (quantised to 0.1 mm)
  const groups = new Map<string, number[]>();
  const q = 1e4;
  const key = (i: number) => `${Math.round(pos.getX(i) * q)},${Math.round(pos.getY(i) * q)},${Math.round(pos.getZ(i) * q)}`;
  const keys: string[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const k = (keys[i] = key(i));
    const list = groups.get(k);
    if (list) list.push(i);
    else groups.set(k, [i]);
  }
  const cos = Math.cos(THREE.MathUtils.degToRad(angle));
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = (i / 3) | 0;
    let x = 0;
    let y = 0;
    let z = 0;
    const seen = new Set<number>();
    for (const j of groups.get(keys[i])!) {
      const u = (j / 3) | 0;
      if (seen.has(u)) continue;
      seen.add(u);
      if (fu[t * 3] * fu[u * 3] + fu[t * 3 + 1] * fu[u * 3 + 1] + fu[t * 3 + 2] * fu[u * 3 + 2] < cos) continue;
      x += fa[u * 3];
      y += fa[u * 3 + 1];
      z += fa[u * 3 + 2];
    }
    const l = Math.hypot(x, y, z) || 1;
    out[i * 3] = x / l;
    out[i * 3 + 1] = y / l;
    out[i * 3 + 2] = z / l;
  }
  g.setAttribute("normal", new THREE.BufferAttribute(out, 3));
  return g;
}

const cache = new WeakMap<THREE.BufferGeometry, Map<number, THREE.BufferGeometry>>();

/** A creased copy of a shared geometry, cached per geometry and angle (never dispose). */
export function creased(geometry: THREE.BufferGeometry, angle = 50) {
  let m = cache.get(geometry);
  if (!m) cache.set(geometry, (m = new Map()));
  let g = m.get(angle);
  if (!g) {
    g = creaseNormals(geometry.index ? geometry : geometry.clone(), angle);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    m.set(angle, g);
  }
  return g;
}
