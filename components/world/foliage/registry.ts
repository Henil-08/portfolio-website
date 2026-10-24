// Module-level registry that draws every tree and bush in a handful of calls.
//
// <Tree>/<Bush> render only an empty group and register it here. The registry
// owns one foliage mesh (every clump of every species, one instanced draw) and one
// InstancedMesh per trunk model, adds them to the scene, and rebuilds their
// instance buffers whenever a tree mounts, unmounts, moves or is hidden. Trees are
// static, so after a short settle period it only re-checks twice a second.
import * as THREE from "three";
import { clumpGeometry } from "./clump";
import { foliageDepthMaterial, foliageMaterial, foliageUniforms } from "./material";
import { patchSeeThrough } from "../seeThrough";
import { linearColor, SPECIES, trunkGeometry, type SpeciesId, type TrunkId } from "./species";
import { C } from "../palette";
import { palmCrownGeometry, palmTrunkGeometry } from "./palm";
import { withWind } from "../alive/sway";

/** What a registered group draws: one of the clump species, or the beach palm. */
export type TreeKind = SpeciesId | "palm";

type Entry = {
  obj: THREE.Object3D;
  species: TreeKind;
  /** extra yaw + size jitter from the seed */
  yaw: number;
  size: number;
  roll: number;
  tint: number;
  last: Float32Array;
  shown: boolean;
};

const entries = new Set<Entry>();
let host: THREE.Scene | null = null;
let foliage: THREE.Mesh | null = null;
let foliageCap = 0;
const trunks = new Map<TrunkId, THREE.InstancedMesh>();
let trunkMat: THREE.MeshStandardMaterial | null = null;
/** Palms: instanced trunks and crowns (./palm.ts). */
const palms: { trunk: THREE.InstancedMesh | null; crown: THREE.InstancedMesh | null } = { trunk: null, crown: null };
const PALM_SWAY = { amount: 0.05, flutter: 0.05 };
let dirty = true;
let settle = 0;
let lastFrame = -1;
let sun: THREE.DirectionalLight | null = null;

/** The original clumps read a touch small on our scaled-down trunks; fill them out. */
const CROWN_FILL = 1.12;

const ATTRS = { aCrown: 4, aTree: 4, aColA: 3, aColB: 3 } as const;

function makeFoliageGeometry(cap: number) {
  const base = clumpGeometry();
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const k of ["position", "normal", "uv"]) g.setAttribute(k, base.getAttribute(k));
  for (const [k, n] of Object.entries(ATTRS)) {
    const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n);
    a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute(k, a);
  }
  g.instanceCount = 0;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return g;
}

function ensureFoliage(count: number) {
  if (!foliage) {
    foliageCap = Math.max(1024, count);
    foliage = new THREE.Mesh(makeFoliageGeometry(foliageCap), foliageMaterial());
    foliage.name = "foliage";
    foliage.customDepthMaterial = foliageDepthMaterial();
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    foliage.frustumCulled = false;
    foliage.matrixAutoUpdate = false;
    foliage.onBeforeRender = (renderer, scene) => sync(renderer, scene);
    foliage.onBeforeShadow = (renderer) => sync(renderer, host);
    host?.add(foliage);
  } else if (count > foliageCap) {
    while (foliageCap < count) foliageCap *= 2;
    const old = foliage.geometry;
    foliage.geometry = makeFoliageGeometry(foliageCap);
    old.dispose();
  }
  return foliage;
}

function ensureTrunk(id: TrunkId, count: number) {
  const m = trunks.get(id);
  if (m && m.instanceMatrix.count >= count) return m;
  const cap = Math.max(256, m ? m.instanceMatrix.count * 2 : 0, count);
  if (!trunkMat) trunkMat = patchSeeThrough(new THREE.MeshStandardMaterial({ color: C.woodDark, roughness: 0.75, metalness: 0, side: THREE.DoubleSide }));
  const next = new THREE.InstancedMesh(trunkGeometry(id), trunkMat, cap);
  next.name = `trunk-${id}`;
  next.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  next.castShadow = true;
  next.receiveShadow = true;
  next.frustumCulled = false;
  next.matrixAutoUpdate = false;
  next.count = 0;
  if (m) {
    m.removeFromParent();
    m.dispose();
  }
  trunks.set(id, next);
  host?.add(next);
  return next;
}

function palmMesh(geometry: THREE.BufferGeometry, material: THREE.Material, cap: number, name: string) {
  const m = new THREE.InstancedMesh(geometry, material, cap);
  m.name = name;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.castShadow = true;
  m.receiveShadow = true;
  m.frustumCulled = false;
  m.matrixAutoUpdate = false;
  m.count = 0;
  host?.add(m);
  return m;
}

function ensurePalms(count: number) {
  if (palms.trunk && palms.trunk.instanceMatrix.count >= count) return;
  const cap = Math.max(64, count, (palms.trunk?.instanceMatrix.count ?? 0) * 2);
  for (const m of [palms.trunk, palms.crown]) {
    m?.removeFromParent();
    m?.dispose();
  }
  const bark = withWind(new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.6 }), { ...PALM_SWAY, flutter: 0 });
  const leaves = withWind(new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }), PALM_SWAY);
  palms.trunk = palmMesh(palmTrunkGeometry(), bark, cap, "palm-trunks");
  palms.crown = palmMesh(palmCrownGeometry(), leaves, cap, "palm-crowns");
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

function rebuild() {
  const all = [...entries].filter((e) => e.shown);
  const list = all.filter((e) => e.species !== "palm") as (Entry & { species: SpeciesId })[];
  const palmList = all.filter((e) => e.species === "palm");
  if (palmList.length || palms.trunk) {
    ensurePalms(palmList.length);
    palmList.forEach((e, i) => {
      _local.compose(_v.set(0, 0, 0), _q.setFromAxisAngle(_up, e.yaw), _s.set(1, 1, 1));
      _m.multiplyMatrices(e.obj.matrixWorld, _local);
      palms.trunk!.setMatrixAt(i, _m);
      palms.crown!.setMatrixAt(i, _m);
    });
    for (const m of [palms.trunk!, palms.crown!]) {
      m.count = palmList.length;
      m.instanceMatrix.needsUpdate = true;
    }
  }
  let crowns = 0;
  const trunkCount = new Map<TrunkId, number>();
  for (const e of list) {
    const sp = SPECIES[e.species];
    crowns += sp.crowns.length;
    if (sp.trunk) trunkCount.set(sp.trunk, (trunkCount.get(sp.trunk) ?? 0) + 1);
  }
  const f = ensureFoliage(crowns);
  for (const [id, n] of trunkCount) ensureTrunk(id, n);
  const g = f.geometry as THREE.InstancedBufferGeometry;
  const aCrown = g.getAttribute("aCrown") as THREE.InstancedBufferAttribute;
  const aTree = g.getAttribute("aTree") as THREE.InstancedBufferAttribute;
  const aColA = g.getAttribute("aColA") as THREE.InstancedBufferAttribute;
  const aColB = g.getAttribute("aColB") as THREE.InstancedBufferAttribute;
  const ci = aCrown.array as Float32Array;
  const ti = aTree.array as Float32Array;
  const ca = aColA.array as Float32Array;
  const cb = aColB.array as Float32Array;
  const tIndex = new Map<TrunkId, number>();
  let k = 0;
  for (const e of list) {
    const sp = SPECIES[e.species];
    const s = sp.scale * e.size;
    _local.compose(_v.set(0, 0, 0), _q.setFromAxisAngle(_up, e.yaw), _s.set(s, s, s));
    _m.multiplyMatrices(e.obj.matrixWorld, _local);
    const worldScale = s * e.obj.matrixWorld.getMaxScaleOnAxis();
    const groundY = e.obj.matrixWorld.elements[13];
    if (sp.trunk) {
      const i = tIndex.get(sp.trunk) ?? 0;
      trunks.get(sp.trunk)!.setMatrixAt(i, _m);
      tIndex.set(sp.trunk, i + 1);
    }
    const A = linearColor(sp.colA);
    const B = linearColor(sp.colB);
    sp.crowns.forEach(([x, y, z, r], j) => {
      _v.set(x, y, z).applyMatrix4(_m);
      ci.set([_v.x, _v.y, _v.z, r * worldScale * CROWN_FILL], k * 4);
      ti.set([groundY, e.roll + j * 2.399, e.tint * (1 + ((j * 37) % 7) * 0.012 - 0.036), sp.sway], k * 4);
      ca.set([A.r, A.g, A.b], k * 3);
      cb.set([B.r, B.g, B.b], k * 3);
      k++;
    });
  }
  g.instanceCount = k;
  for (const a of [aCrown, aTree, aColA, aColB]) {
    a.clearUpdateRanges();
    a.addUpdateRange(0, k * a.itemSize);
    a.needsUpdate = true;
  }
  for (const [id, m] of trunks) {
    m.count = tIndex.get(id) ?? 0;
    m.instanceMatrix.needsUpdate = true;
  }
}

function findSun(scene: THREE.Object3D | null) {
  if (sun && sun.parent) return sun;
  sun = null;
  scene?.traverse((o) => {
    if (!sun && (o as THREE.DirectionalLight).isDirectionalLight) sun = o as THREE.DirectionalLight;
  });
  return sun;
}

function sync(renderer: THREE.WebGLRenderer, scene: THREE.Object3D | null) {
  const frame = renderer.info.render.frame;
  if (frame === lastFrame) return;
  lastFrame = frame;
  const l = findSun(scene);
  if (l) {
    l.target.updateMatrixWorld();
    foliageUniforms.uLightDir.value.setFromMatrixPosition(l.matrixWorld).sub(_v.setFromMatrixPosition(l.target.matrixWorld)).normalize();
  }
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
    (window as unknown as { __foliage?: object }).__foliage = { trees: entries.size, crowns: (foliage?.geometry as THREE.InstancedBufferGeometry | undefined)?.instanceCount, calls: renderer.info.render.calls, inScene: !!foliage?.parent, trunks: [...trunks].map(([id, m]) => `${id}:${m.count}:${!!m.parent}`), first: Array.from(((foliage?.geometry as THREE.InstancedBufferGeometry | undefined)?.getAttribute("aCrown")?.array ?? []).slice(0, 8)) };
  }
}

function attach(scene: THREE.Scene) {
  if (host === scene) return;
  host = scene;
  const f = ensureFoliage(0);
  scene.add(f);
  for (const m of trunks.values()) scene.add(m);
  for (const m of [palms.trunk, palms.crown]) if (m) scene.add(m);
}

function detachIfEmpty() {
  if (entries.size || !host) return;
  foliage?.removeFromParent();
  for (const m of trunks.values()) m.removeFromParent();
  for (const m of [palms.trunk, palms.crown]) m?.removeFromParent();
  host = null;
}

/** Register a tree group. Returns the unregister function (for an effect cleanup). */
export function registerTree(scene: THREE.Scene, obj: THREE.Object3D, species: TreeKind, seed: number) {
  attach(scene);
  // seeded variety: yaw, +-8% size, clump roll, +-4% brightness
  const h = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const e: Entry = {
    obj,
    species,
    yaw: h(1) * Math.PI * 2,
    size: 0.92 + h(2) * 0.16,
    roll: h(3) * Math.PI * 2,
    tint: 0.96 + h(4) * 0.08,
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
