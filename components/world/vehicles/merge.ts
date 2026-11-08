// The player's vehicle as few meshes as it can be (docs/research/performance.md, "Round 3").
// Each model is built from dozens of small meshes, every one a draw call in the view and another
// in the shadow map. Once the vehicle has settled (mounted, any swap finished), the meshes that
// move together are baked into one mesh per material for each rigid part: the body (`root`),
// each wheel's spinning, steering and swapping groups, the TH-18's DRS flap. The baked mesh hangs
// on the same group, with the same material, so it moves, lights and shades exactly like the
// parts it stands for; those are hidden, not removed. Left alone: anything named (the brake
// lamps, the wet-tyre bands: Vehicle.tsx swaps their materials), anything transparent or
// textured (draw order, uv), instanced or morphing meshes.
//
// `unmerge` puts everything back (a livery change, a new vehicle, a swap starting). `check`
// compares every hidden part's place on its group with where it was baked: a part that moved by
// itself (something animated that this file doesn't know about) undoes the bake for good.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Baked = {
  meshes: THREE.Mesh[];
  hidden: { mesh: THREE.Mesh; anchor: THREE.Object3D; rel: THREE.Matrix4 }[];
};

const _inv = new THREE.Matrix4();
const _rel = new THREE.Matrix4();

const plain = (m: THREE.Material) => {
  if (m.transparent || m.alphaTest > 0) return false;
  for (const [k, v] of Object.entries(m)) if (k.endsWith("Map") && v) return false;
  return !(m as THREE.MeshStandardMaterial).map;
};

function bakeable(o: THREE.Object3D): o is THREE.Mesh {
  const m = o as THREE.Mesh;
  if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.SkinnedMesh).isSkinnedMesh) return false;
  if (o.name || !o.visible || Array.isArray(m.material) || !m.material) return false;
  const g = m.geometry;
  // groups only matter with a material array (a box has six, all drawn with its one material)
  if (!g.attributes.position || !g.attributes.normal || Object.keys(g.morphAttributes).length) return false;
  if (m.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return false;
  return plain(m.material);
}

/** Bakes the static meshes under `root`, each into the nearest of `anchors` (root counts as one). */
export function merge(root: THREE.Object3D, anchors: Set<THREE.Object3D>): Baked {
  anchors.add(root);
  root.updateWorldMatrix(true, true);
  const groups = new Map<string, { anchor: THREE.Object3D; mat: THREE.Material; cast: boolean; recv: boolean; color: boolean; parts: THREE.Mesh[] }>();
  const visit = (o: THREE.Object3D, anchor: THREE.Object3D) => {
    if (!o.visible) return; // invisible branches stay as they are
    for (const c of o.children) {
      const a = anchors.has(c) ? c : anchor;
      if (bakeable(c) && !anchors.has(c)) {
        const mat = c.material as THREE.Material;
        const color = !!(mat as THREE.MeshStandardMaterial).vertexColors && !!c.geometry.attributes.color;
        const key = `${a.id}/${mat.uuid}/${c.castShadow}/${c.receiveShadow}/${color}`;
        let g = groups.get(key);
        if (!g) groups.set(key, (g = { anchor: a, mat, cast: c.castShadow, recv: c.receiveShadow, color, parts: [] }));
        g.parts.push(c);
      }
      visit(c, a);
    }
  };
  visit(root, root);

  const out: Baked = { meshes: [], hidden: [] };
  for (const g of groups.values()) {
    if (g.parts.length < 2) continue; // nothing to save
    _inv.copy(g.anchor.matrixWorld).invert();
    const geos: THREE.BufferGeometry[] = [];
    const rels: THREE.Matrix4[] = [];
    for (const m of g.parts) {
      const src = m.geometry;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", src.attributes.position.clone());
      geo.setAttribute("normal", src.attributes.normal.clone());
      if (g.color) geo.setAttribute("color", src.attributes.color.clone());
      const n = src.attributes.position.count;
      const idx = src.index ? Array.from(src.index.array as ArrayLike<number>) : Array.from({ length: n }, (_, i) => i);
      _rel.multiplyMatrices(_inv, m.matrixWorld);
      // a mirrored part (negative scale) was drawn with its winding flipped by three; baked in, the
      // flip has to be in the triangles themselves
      if (_rel.determinant() < 0) for (let i = 0; i + 2 < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
      geo.setIndex(idx);
      geo.applyMatrix4(_rel);
      geos.push(geo);
      rels.push(_rel.clone());
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, g.mat);
    mesh.name = "vehicle-baked";
    mesh.castShadow = g.cast;
    mesh.receiveShadow = g.recv;
    g.anchor.add(mesh);
    out.meshes.push(mesh);
    g.parts.forEach((m, i) => {
      m.visible = false;
      out.hidden.push({ mesh: m, anchor: g.anchor, rel: rels[i] });
    });
  }
  return out;
}

/** Puts the parts back and drops the baked meshes. */
export function unmerge(b: Baked | null) {
  if (!b) return;
  for (const h of b.hidden) h.mesh.visible = true;
  for (const m of b.meshes) {
    m.removeFromParent();
    m.geometry.dispose();
  }
  b.hidden.length = 0;
  b.meshes.length = 0;
}

/** True while every hidden part still sits where it was baked on its group. */
export function check(b: Baked) {
  for (const h of b.hidden) {
    h.anchor.updateWorldMatrix(true, false);
    h.mesh.updateWorldMatrix(true, false);
    _inv.copy(h.anchor.matrixWorld).invert();
    _rel.multiplyMatrices(_inv, h.mesh.matrixWorld);
    const a = _rel.elements;
    const r = h.rel.elements;
    for (let i = 0; i < 16; i++) if (Math.abs(a[i] - r[i]) > 1e-4) return false;
  }
  return true;
}

export type { Baked };
