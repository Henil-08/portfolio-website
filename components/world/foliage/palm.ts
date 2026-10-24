// The beach palm for the foliage registry: a curved tapering trunk and one merged
// crown (nine drooping fronds round a husk ball, two greens as vertex colours), so
// every palm on the island is two instanced draws instead of eleven meshes each.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C } from "../palette";

/** Where the crown sits on the trunk (the trunk leans toward +X). */
export const PALM_TOP = new THREE.Vector3(0.9, 3.95, 0);

function frond() {
  // a tapered leaf blade drooping away from the trunk top along +X, with a centre crease
  const segs = 14;
  const pos: number[] = [];
  const idx: number[] = [];
  const L = 1.9;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * L;
    const y = 0.35 * t - 0.95 * t * t;
    const w = Math.sin(Math.PI * Math.pow(t, 0.7)) * 0.3 + 0.02;
    pos.push(x, y, -w, x, y + 0.06 * (1 - t), 0, x, y, w);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 3;
    const b = a + 3;
    idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g.toNonIndexed();
}

function paint(g: THREE.BufferGeometry, hex: string) {
  const c = new THREE.Color(hex);
  const n = g.getAttribute("position").count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.deleteAttribute("uv");
  g.deleteAttribute("normal"); // normals are computed once the parts are merged
  return g;
}

let crown: THREE.BufferGeometry | null = null;
/** Nine fronds and the husk, already placed at PALM_TOP. */
export function palmCrownGeometry() {
  if (crown) return crown;
  const parts: THREE.BufferGeometry[] = [];
  const husk = new THREE.SphereGeometry(0.16, 16, 10).toNonIndexed();
  parts.push(paint(husk, C.woodDark));
  for (let i = 0; i < 9; i++) {
    const f = frond();
    const s = i % 2 ? 0.92 : 1.05;
    f.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (i / 9) * Math.PI * 2 + 0.3, (i % 2) * 0.22 - 0.05)), new THREE.Vector3(s, s, s)));
    parts.push(paint(f, i % 3 ? C.leafPalm : C.leafDark));
  }
  crown = mergeGeometries(parts)!;
  crown.translate(PALM_TOP.x, PALM_TOP.y, PALM_TOP.z);
  crown.computeVertexNormals();
  return crown;
}

let trunk: THREE.BufferGeometry | null = null;
/** Smooth curved tube, radius 0.2 at the base tapering to 0.12, leaning toward +X. */
export function palmTrunkGeometry() {
  if (trunk) return trunk;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const t = i / 7;
    return new THREE.Vector3(0.9 * t * t, t * 3.9, 0);
  });
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, 24, 1, 14, false);
  const p = g.getAttribute("position");
  const c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const t = Math.min(1, Math.max(0, y / 3.9));
    const along = curve.getPoint(t, c);
    const r = 0.2 - t * 0.08;
    p.setXYZ(i, along.x + (p.getX(i) - along.x) * r, y, p.getZ(i) * r);
  }
  g.computeVertexNormals();
  trunk = g;
  return g;
}
