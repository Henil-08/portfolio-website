// Per-instance culling for the island-wide instanced meshes (docs/research/performance.md,
// "Draw budget"). The town's parts, the trackside furniture and the trees are each one
// InstancedMesh spread over the whole island, so three.js can't cull them: every copy went
// through the vertex shader twice a frame (the view and the shadow map), most of them far off
// screen and far outside the shadow camera. Once a frame (World.tsx `InstanceCuller`, after the
// camera and the sun have moved) each registered mesh's copies are tested against the camera's
// frustum and the sun's shadow frustum, exactly the tests three.js makes for a plain mesh, and
// only those in either are written to the front of its buffers. What is drawn, and every shadow
// cast, is the same; the copies nobody can see are skipped. The mesh itself is never culled
// whole: its owner may work in its onBeforeRender (the trees' registry does), which must run.
//
// Registration is passive: a page without the culler (the docs labs) draws every copy as before.
import * as THREE from "three";

type Entry = {
  mesh: THREE.InstancedMesh;
  /** every copy's matrix and colour, as the owner wrote them */
  m: Float32Array | null;
  c: Float32Array | null;
  /** world-space bounding spheres, x y z r per copy */
  s: Float32Array | null;
  n: number;
  /** the owner rewrote the buffers: take a new snapshot before culling */
  dirty: boolean;
  /** the mesh's world matrix the spheres were worked out with */
  at: Float32Array;
};

const entries = new Map<THREE.InstancedMesh, Entry>();

/** Hands a mesh to the culler. Call after its matrices (and colours) are written; returns the unregister. */
export function cullInstances(mesh: THREE.InstancedMesh) {
  // per-copy attributes beyond the matrix and colour would fall out of step when compacted
  for (const a of Object.values(mesh.geometry.attributes)) if ((a as THREE.InstancedBufferAttribute).isInstancedBufferAttribute) return () => {};
  entries.set(mesh, { mesh, m: null, c: null, s: null, n: 0, dirty: true, at: new Float32Array(16) });
  return () => {
    const e = entries.get(mesh);
    if (!e) return;
    entries.delete(mesh);
    restore(e);
  };
}

/** Stops culling a mesh (its owner is about to dispose it). */
export function uncull(mesh: THREE.InstancedMesh) {
  entries.delete(mesh);
}

/** The owner wrote new matrices or a new count (the trees' registry rebuilds): snapshot again. */
export function recull(mesh: THREE.InstancedMesh) {
  const e = entries.get(mesh);
  if (e) e.dirty = true;
}

/** Puts every copy back (unregistered, or the culler stopped). */
function restore(e: Entry) {
  if (!e.m) return;
  const im = e.mesh.instanceMatrix.array as Float32Array;
  im.set(e.m);
  e.mesh.instanceMatrix.clearUpdateRanges();
  e.mesh.instanceMatrix.needsUpdate = true;
  if (e.c && e.mesh.instanceColor) {
    (e.mesh.instanceColor.array as Float32Array).set(e.c);
    e.mesh.instanceColor.clearUpdateRanges();
    e.mesh.instanceColor.needsUpdate = true;
  }
  e.mesh.count = e.n;
}

const mi = new THREE.Matrix4();
const mw = new THREE.Matrix4();
const sp = new THREE.Sphere();

function snapshot(e: Entry) {
  const mesh = e.mesh;
  const n = mesh.count;
  e.n = n;
  e.m = (mesh.instanceMatrix.array as Float32Array).slice(0, n * 16);
  e.c = mesh.instanceColor ? (mesh.instanceColor.array as Float32Array).slice(0, n * 3) : null;
  if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
  const gs = mesh.geometry.boundingSphere!;
  e.s = new Float32Array(n * 4);
  mesh.updateWorldMatrix(true, false);
  e.at.set(mesh.matrixWorld.elements);
  for (let i = 0; i < n; i++) {
    mi.fromArray(e.m, i * 16);
    mw.multiplyMatrices(mesh.matrixWorld, mi);
    sp.copy(gs).applyMatrix4(mw);
    e.s.set([sp.center.x, sp.center.y, sp.center.z, sp.radius], i * 4);
  }
  e.dirty = false;
}

const frustum = new THREE.Frustum();
const pv = new THREE.Matrix4();

let paused = false;
/** Draws every copy again until `cullFrame` runs with culling on (dev A/B, a second view). */
export function pauseCulling() {
  if (paused) return;
  paused = true;
  for (const e of entries.values()) {
    restore(e);
    e.dirty = true;
  }
}

/** Hides the copies outside both frusta. `light` is the shadow-casting sun (or null). */
export function cullFrame(camera: THREE.Camera, light: THREE.DirectionalLight | null) {
  if (!entries.size) return;
  paused = false;
  camera.updateMatrixWorld();
  pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(pv, camera.coordinateSystem);
  let shadow: THREE.Frustum | null = null;
  if (light && light.castShadow) {
    light.updateMatrixWorld();
    light.target.updateMatrixWorld();
    light.shadow.updateMatrices(light);
    shadow = light.shadow.getFrustum();
  }
  for (const e of entries.values()) {
    const mesh = e.mesh;
    // moved since the snapshot (a parent placed late): the spheres are stale
    if (!e.dirty) {
      const w = mesh.matrixWorld.elements;
      for (let j = 0; j < 16; j++)
        if (w[j] !== e.at[j]) {
          restore(e);
          e.dirty = true;
          break;
        }
    }
    if (e.dirty) snapshot(e);
    const S = e.s!;
    const M = e.m!;
    const C = e.c;
    const im = mesh.instanceMatrix.array as Float32Array;
    const ic = C && mesh.instanceColor ? (mesh.instanceColor.array as Float32Array) : null;
    const cast = mesh.castShadow && shadow;
    let k = 0;
    for (let i = 0; i < e.n; i++) {
      sp.center.set(S[i * 4], S[i * 4 + 1], S[i * 4 + 2]);
      sp.radius = S[i * 4 + 3];
      if (!frustum.intersectsSphere(sp) && !(cast && shadow!.intersectsSphere(sp))) continue;
      im.set(M.subarray(i * 16, i * 16 + 16), k * 16);
      if (ic) ic.set(C!.subarray(i * 3, i * 3 + 3), k * 3);
      k++;
    }
    mesh.count = k;
    mesh.instanceMatrix.clearUpdateRanges();
    mesh.instanceMatrix.addUpdateRange(0, Math.max(1, k) * 16);
    mesh.instanceMatrix.needsUpdate = true;
    if (ic && mesh.instanceColor) {
      mesh.instanceColor.clearUpdateRanges();
      mesh.instanceColor.addUpdateRange(0, Math.max(1, k) * 3);
      mesh.instanceColor.needsUpdate = true;
    }
  }
}
