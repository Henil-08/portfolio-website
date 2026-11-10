// Which meshes the light bake covers, and the id that ties a baked result back onto a mesh
// (scripts/bake/run.mjs; docs/ROADMAP.md "Working rules"). Used by both ends of the pipeline:
// export.ts (dev, writes the static world out for Blender) and apply.ts (the game, ?look=next),
// so the two always pick and name the same meshes.
//
// The world is built by code, not loaded, so there is no file name to key on. A mesh's id is what
// it is and where it stands: vertex and index counts and its world bounding box to 5 cm. The same
// build gives the same ids on every load; a mesh that changed shape or moved gets a new id, its
// old bake no longer matches and it simply draws unbaked until the next rebake.
import * as THREE from "three";

/** Subtrees never baked: the vehicles, the garage and opening sets, the sea, debug overlays. */
const SKIP_NAMES = new Set(["player-vehicle", "vehicle-body", "garage-show", "vehicle-swap-scan", "studio-sweep", "water", "scale-lineup"]);

export function skipped(o: THREE.Object3D) {
  return SKIP_NAMES.has(o.name) || !!o.userData.bloomSkip || !!o.userData.noMap;
}

/** Shown, and not under a skipped subtree. */
export function eligible(o: THREE.Object3D, root: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (!p.visible || skipped(p)) return false;
  return true;
}

const LIT = new Set(["MeshStandardMaterial", "MeshPhysicalMaterial", "MeshLambertMaterial", "MeshPhongMaterial"]);

/** An opaque lit material that can take a light map (no glass, no cut-outs, no custom shaders). */
export function bakeable(m: THREE.Material | THREE.Material[]) {
  if (Array.isArray(m)) return false;
  return LIT.has(m.type) && m.visible && m.colorWrite && !m.transparent && m.opacity >= 1 && !m.alphaTest && !(m as THREE.MeshStandardMaterial).alphaMap;
}

/**
 * Smallest world size (bounding box diagonal, m) worth its own patch of a light map. Anything
 * smaller (benches, bins, posts) keeps look.ts's per-vertex AO and shades the ground as an occluder.
 */
export const MIN_SIZE = 2;

const _box = new THREE.Box3();
const _v = new THREE.Vector3();
const r5 = (x: number) => Math.round(x * 20);

/** World bounding box of a plain mesh (its geometry's box, moved by its world matrix). */
export function worldBox(mesh: THREE.Mesh, out = _box) {
  const g = mesh.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  return out.copy(g.boundingBox!).applyMatrix4(mesh.matrixWorld);
}

/** The bake id: counts and world box (5 cm), unique within one traversal by a #n suffix. */
export function keyOf(mesh: THREE.Mesh) {
  const g = mesh.geometry;
  const b = worldBox(mesh);
  const v = g.attributes.position.count;
  const i = g.index ? g.index.count : 0;
  return `${v}.${i}.${r5(b.min.x)}.${r5(b.min.y)}.${r5(b.min.z)}.${r5(b.max.x)}.${r5(b.max.y)}.${r5(b.max.z)}`;
}

/** Plain meshes that may take a bake, keyed by id, in scene order. */
export function receivers(root: THREE.Object3D) {
  const out = new Map<string, THREE.Mesh>();
  const seen = new Map<string, number>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (!mesh.geometry?.attributes.position) return;
    const k = keyOf(mesh);
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    if (!bakeable(mesh.material) || !eligible(mesh, root)) return;
    if (worldBox(mesh).getSize(_v).length() < MIN_SIZE) return;
    out.set(n ? `${k}#${n}` : k, mesh);
  });
  return out;
}
