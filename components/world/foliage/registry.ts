// Module-level registry that draws every tree and bush in one call per kind.
//
// <Tree>/<Bush> render only an empty group and register it here. The registry owns
// one InstancedMesh per kind (./species.ts: cypress, round, bush), adds them to the
// scene, and rebuilds their instance buffers whenever a tree mounts, unmounts, moves
// or is hidden. Trees are static, so after a short settle period it only re-checks
// twice a second. One flat-shaded, wind-swaying, see-through material for all kinds.
import * as THREE from "three";
import { patchSeeThrough } from "../seeThrough";
import { withWind } from "../alive/sway";
import { KINDS, kindGeometry, type TreeKind } from "./species";

export type { TreeKind } from "./species";

type Entry = {
  obj: THREE.Object3D;
  kind: TreeKind;
  /** seeded variety: yaw, size, height stretch, brightness */
  yaw: number;
  size: number;
  stretch: number;
  tint: number;
  last: Float32Array;
  shown: boolean;
};

const entries = new Set<Entry>();
let host: THREE.Scene | null = null;
const meshes = new Map<TreeKind, THREE.InstancedMesh>();
let material: THREE.MeshStandardMaterial | null = null;
let dirty = true;
let settle = 0;
let lastFrame = -1;

/** Gentle: the trees are solid, so a lean, not a shiver. */
const SWAY = { amount: 0.03, flutter: 0.008, maxHeight: 7 };

function treeMaterial() {
  if (!material) material = patchSeeThrough(withWind(new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true }), SWAY));
  return material;
}

function ensureMesh(kind: TreeKind, count: number) {
  const m = meshes.get(kind);
  if (m && m.instanceMatrix.count >= count) return m;
  const cap = Math.max(256, (m?.instanceMatrix.count ?? 0) * 2, count);
  const next = new THREE.InstancedMesh(kindGeometry(kind), treeMaterial(), cap);
  next.name = `trees-${kind}`;
  next.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  next.castShadow = true;
  next.receiveShadow = true;
  next.frustumCulled = false;
  next.matrixAutoUpdate = false;
  next.count = 0;
  next.onBeforeRender = (renderer) => sync(renderer);
  next.onBeforeShadow = (renderer) => sync(renderer);
  if (m) {
    m.removeFromParent();
    m.dispose();
  }
  meshes.set(kind, next);
  host?.add(next);
  return next;
}

function shownInScene(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

const _local = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Color();

function rebuild() {
  const counts = new Map<TreeKind, number>();
  for (const e of entries) if (e.shown) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  for (const [kind, n] of counts) ensureMesh(kind, n);
  const index = new Map<TreeKind, number>();
  for (const e of entries) {
    if (!e.shown) continue;
    const m = meshes.get(e.kind)!;
    const i = index.get(e.kind) ?? 0;
    index.set(e.kind, i + 1);
    _local.compose(_v.set(0, 0, 0), _q.setFromAxisAngle(_up, e.yaw), _s.set(e.size, e.size * e.stretch, e.size));
    _m.multiplyMatrices(e.obj.matrixWorld, _local);
    m.setMatrixAt(i, _m);
    m.setColorAt(i, _c.setScalar(e.tint));
  }
  for (const [kind, m] of meshes) {
    m.count = index.get(kind) ?? 0;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

function sync(renderer: THREE.WebGLRenderer) {
  const frame = renderer.info.render.frame;
  if (frame === lastFrame) return;
  lastFrame = frame;
  if (settle > 0) settle--;
  else if (!dirty && frame % 30 !== 0) return;
  for (const e of entries) {
    const shown = shownInScene(e.obj);
    if (shown !== e.shown) {
      e.shown = shown;
      dirty = true;
    }
    const m = e.obj.matrixWorld.elements;
    for (let i = 0; i < 16; i++) {
      if (m[i] !== e.last[i]) {
        e.last.set(m);
        dirty = true;
        break;
      }
    }
  }
  if (dirty) {
    dirty = false;
    rebuild();
  }
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as { __foliage?: object }).__foliage = { trees: entries.size, calls: renderer.info.render.calls, kinds: [...meshes].map(([k, m]) => `${k}:${m.count}:${!!m.parent}`) };
  }
}

function attach(scene: THREE.Scene) {
  if (host === scene) return;
  host = scene;
  // every kind exists from the start, so a sync always runs even before a kind has trees
  for (const kind of Object.keys(KINDS) as TreeKind[]) scene.add(ensureMesh(kind, 0));
}

function detachIfEmpty() {
  if (entries.size || !host) return;
  for (const m of meshes.values()) m.removeFromParent();
  host = null;
}

/** Register a tree group. Returns the unregister function (for an effect cleanup). */
export function registerTree(scene: THREE.Scene, obj: THREE.Object3D, kind: TreeKind, seed: number) {
  attach(scene);
  const h = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const e: Entry = {
    obj,
    kind,
    yaw: h(1) * Math.PI * 2,
    size: 0.92 + h(2) * 0.16,
    stretch: 1 + (h(3) * 2 - 1) * KINDS[kind].stretch,
    tint: 0.93 + h(4) * 0.12,
    last: new Float32Array(16),
    shown: true,
  };
  obj.updateWorldMatrix(true, false);
  e.last.set(obj.matrixWorld.elements);
  entries.add(e);
  dirty = true;
  settle = 90;
  return () => {
    entries.delete(e);
    dirty = true;
    detachIfEmpty();
  };
}
