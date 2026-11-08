// 02 Teardown: how a project object comes apart, read from its own scene graph once.
// The object is split into parts at the first level of its tree that has several (descending
// through single-child wrappers, and into the biggest part while there are fewer than three).
// The biggest part is the body and stays put; every other part slides out along the object's
// axis it already lies off the body on (never down into the table), the ones on the same axis
// stepped further out by their order, so the exploded view reads like an engineering drawing.
// Small parts ride with the nearest big one. Everything is in the object's own frame (its
// root group), so the sink, the turntable and the camera never change the offsets.
import * as THREE from "three";
import type { Item } from "@/components/world/garage/anim";
import { pad } from "@/components/brand/tokens";

export type Part = {
  node: THREE.Object3D;
  /** the node's own position when assembled */
  base: THREE.Vector3;
  /** where it goes fully exploded, in its parent's frame */
  delta: THREE.Vector3;
  /** the same move in the object's frame, for the drawings */
  off: THREE.Vector3;
  /** its centre and size in the object's frame (assembled) */
  centre: THREE.Vector3;
  size: THREE.Vector3;
  /** order it leaves in (0 first), and whether it gets a callout */
  order: number;
  label: number;
  /** a small part that rides with a big one: its index in `parts`, else -1 */
  rides: number;
};

export type Rig = {
  slug: string;
  parts: Part[];
  /** assembled bounds in the object's frame */
  box: THREE.Box3;
  /** everything, fully exploded, in the object's frame */
  apart: THREE.Box3;
  /** edges in the object's frame (x0 y0 z0 x1 y1 z1 per segment) and the part each belongs to */
  segs: Float32Array;
  segPart: Uint8Array;
  /** callout parts, biggest first (indices into parts) */
  labels: number[];
};

/** Per-object rules where the generic split needs help: how deep to go, how far apart. */
const RULES: Record<string, { deeper?: number; spread?: number }> = {};

const MAX_MOVING = 8;
export const MAX_LABELS = 5;

const tmpBox = new THREE.Box3();
const tmpM = new THREE.Matrix4();

/** Bounds of a node in the root's frame. */
function boundsIn(node: THREE.Object3D, rootInv: THREE.Matrix4) {
  const b = new THREE.Box3();
  node.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry || skip(m)) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    tmpBox.copy(m.geometry.boundingBox!).applyMatrix4(tmpM.multiplyMatrices(rootInv, m.matrixWorld));
    b.union(tmpBox);
  });
  return b;
}

/** Meshes the drawings and bounds leave out: text, instanced and shader-drawn ones. */
function skip(m: THREE.Mesh) {
  const g = m.geometry as THREE.BufferGeometry & { isInstancedBufferGeometry?: boolean };
  return !!g.isInstancedBufferGeometry || (m as unknown as { isTroikaText?: boolean }).isTroikaText === true || (m.material as THREE.Material)?.type === "ShaderMaterial";
}

const vol = (s: THREE.Vector3) => Math.max(s.x, 0.01) * Math.max(s.y, 0.01) * Math.max(s.z, 0.01);

/** The nodes the object comes apart into. */
function splitNodes(root: THREE.Object3D, rootInv: THREE.Matrix4, deeper: number) {
  const solid = (n: THREE.Object3D) => !boundsIn(n, rootInv).isEmpty();
  let node: THREE.Object3D = root;
  for (;;) {
    const kids = node.children.filter(solid);
    if (kids.length === 1 && kids[0].children.length) node = kids[0];
    else break;
  }
  let parts = node.children.filter(solid);
  // too few (under four): open up the biggest, as long as it has insides
  for (let i = 0; i < 3 + deeper && parts.length < 4; i++) {
    const big = parts.map((p) => ({ p, v: vol(boundsIn(p, rootInv).getSize(new THREE.Vector3())) })).sort((a, b) => b.v - a.v)[0]?.p;
    const inner = big?.children.filter(solid) ?? [];
    if (!big || inner.length < 2) break;
    parts = [...parts.filter((p) => p !== big), ...inner];
  }
  return parts;
}

/** Reads the object (assembled, as mounted) and works out its parts, moves, edges and callouts. */
export function analyse(root: THREE.Object3D, slug: string): Rig {
  const rule = RULES[slug] ?? {};
  root.updateWorldMatrix(true, true);
  const rootInv = root.matrixWorld.clone().invert();
  const nodes = splitNodes(root, rootInv, rule.deeper ?? 0);
  const box = boundsIn(root, rootInv);
  const R = box.getSize(new THREE.Vector3()).length() / 2 || 0.5;
  const parts: Part[] = nodes.map((node) => {
    const b = boundsIn(node, rootInv);
    return { node, base: node.position.clone(), delta: new THREE.Vector3(), off: new THREE.Vector3(), centre: b.getCenter(new THREE.Vector3()), size: b.getSize(new THREE.Vector3()), order: 0, label: -1, rides: -1 };
  });
  // the body is the biggest; the next biggest move; the rest ride with the nearest mover
  const bySize = parts.map((_, i) => i).sort((a, b) => vol(parts[b].size) - vol(parts[a].size));
  const body = bySize[0];
  const movers = bySize.slice(1, MAX_MOVING + 1);
  const bc = parts[body].centre;
  const spread = (rule.spread ?? 1) * R;
  // along which of the object's axes each mover leaves, and how far: stepped out per axis
  // each mover takes the direction it already lies off the body in, best first, as long as
  // that lane has room (two per direction), so the parts spread round the body instead of
  // stacking up one way; never down into the table
  const lanes = new Map<string, number[]>();
  const LANE = Math.max(2, Math.ceil(movers.length / 5));
  for (const i of [...movers].sort((a, b) => parts[b].centre.distanceTo(bc) - parts[a].centre.distanceTo(bc))) {
    const d = parts[i].centre.clone().sub(bc);
    if (d.length() < R * 0.06) d.set(0, 1, 0);
    const opts = (
      [
        ["x+", d.x],
        ["x-", -d.x],
        ["z+", d.z * 0.95],
        ["z-", -d.z * 0.95],
        ["y+", d.y * 0.85],
      ] as const
    )
      .map(([k, v]) => [k, v] as [string, number])
      .sort((a, b) => b[1] - a[1]);
    const key = opts.find(([k]) => (lanes.get(k)?.length ?? 0) < LANE)?.[0] ?? opts[0][0];
    if (!lanes.has(key)) lanes.set(key, []);
    lanes.get(key)!.push(i);
  }
  for (const [key, list] of lanes) {
    const axis = key[0] as "x" | "y" | "z";
    const sign = key[1] === "-" ? -1 : 1;
    list.sort((a, b) => Math.abs(parts[a].centre[axis] - bc[axis]) - Math.abs(parts[b].centre[axis] - bc[axis]));
    let reach = (parts[body].size[axis] / 2) * 0.3 + spread * 0.3;
    for (const i of list) {
      const p = parts[i];
      p.off[axis] = sign * reach;
      reach += p.size[axis] * 0.5 + spread * 0.1;
    }
  }
  movers.forEach((i, k) => (parts[i].order = k + 1));
  for (const i of bySize.slice(MAX_MOVING + 1)) {
    const p = parts[i];
    let best = body;
    let bd = Infinity;
    for (const j of movers) {
      const dd = p.centre.distanceTo(parts[j].centre);
      if (dd < bd) {
        bd = dd;
        best = j;
      }
    }
    p.rides = best;
    p.off.copy(parts[best].off);
    p.order = parts[best].order;
  }
  // each move in the node's parent's frame
  for (const p of parts) {
    const par = p.node.parent!;
    const a = par.worldToLocal(root.localToWorld(p.centre.clone()));
    const z = par.worldToLocal(root.localToWorld(p.centre.clone().add(p.off)));
    p.delta.copy(z.sub(a));
  }
  const apart = box.clone();
  for (const p of parts) apart.union(new THREE.Box3().setFromCenterAndSize(p.centre.clone().add(p.off), p.size));
  const labels = bySize.slice(0, MAX_LABELS);
  labels.forEach((i, j) => (parts[i].label = j));

  // edges for the drawings, in the object's frame, tagged with their part
  const segs: number[] = [];
  const tags: number[] = [];
  const partOf = new Map<THREE.Object3D, number>();
  parts.forEach((p, i) => p.node.traverse((o) => partOf.set(o, i)));
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry?.getAttribute("position") || skip(m)) return;
    const e = edgesOf(m.geometry);
    tmpM.multiplyMatrices(rootInv, m.matrixWorld);
    const v = new THREE.Vector3();
    const tag = partOf.get(m) ?? body;
    for (let i = 0; i < e.length; i += 3) {
      v.set(e[i], e[i + 1], e[i + 2]).applyMatrix4(tmpM);
      segs.push(v.x, v.y, v.z);
      if (i % 6 === 0) tags.push(tag);
    }
  });
  return { slug, parts, box, apart, segs: new Float32Array(segs), segPart: new Uint8Array(tags), labels };
}

const edgeCache = new WeakMap<THREE.BufferGeometry, Float32Array>();
function edgesOf(g: THREE.BufferGeometry) {
  let e = edgeCache.get(g);
  if (!e) {
    const eg = new THREE.EdgesGeometry(g, 28);
    e = (eg.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
    eg.dispose();
    edgeCache.set(g, e);
  }
  return e;
}

/** easeInOut on a part's own window inside the explode: they leave one after another. */
const STAGGER = 0.11;
export function partProgress(e: number, order: number, n: number) {
  const span = 1 + STAGGER * Math.max(0, n - 1);
  const k = Math.min(1, Math.max(0, e * span - STAGGER * Math.max(0, order - 1)));
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

/** Puts every part at explode `e` (0 assembled .. 1 apart). */
export function applyRig(rig: Rig, e: number) {
  const n = rig.parts.reduce((m, p) => Math.max(m, p.order), 0);
  for (const p of rig.parts) {
    const k = p.order === 0 ? 0 : partProgress(e, p.order, n);
    p.node.position.copy(p.base).addScaledVector(p.delta, k);
  }
}

/** What each callout says, and the datasheet line it stands for. */
export type Callout = { code: string; text: string; kind: "spec" | "stack"; key: string };
export function calloutsOf(it: Item, n: number): Callout[] {
  const specs = it.p.specs ?? [[it.p.headline.label.charAt(0).toUpperCase() + it.p.headline.label.slice(1), it.p.headline.value]];
  const lines: Omit<Callout, "code">[] = [...specs.map(([k, v]) => ({ text: `${k} · ${v}`, kind: "spec" as const, key: k })), ...it.p.stack.map((s) => ({ text: s, kind: "stack" as const, key: s }))];
  return Array.from({ length: n }, (_, j) => ({ code: `P${pad(it.index + 1)}-${pad(j + 1)}`, ...lines[j % lines.length] }));
}
