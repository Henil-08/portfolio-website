// Dev only: writes the static world out for the light bake (scripts/bake/run.mjs drives it through
// window.__bake in a headless tab). Everything is in world space, one GLB per area chunk:
//   - receivers: the plain, opaque, lit meshes that stand still (terrain, road, kerbs, the pit
//     building, town blocks, sector buildings, trackside structures, hardscape), one glTF mesh
//     each, named by its bake id (ids.ts), with normals and albedo (COLOR_0) for the bounce;
//   - occluders: everything else that stands still and casts light and shade onto them (the
//     instanced kit, trees, small parts), merged into one mesh per chunk, never baked itself.
// Left out: the vehicles, knock-about props (any instanced copy resting on a dynamic physics
// body), water, grass, glass and cut-outs, anything that moved while it was watched.
import * as THREE from "three";
import { bakeable, eligible, receivers, worldBox } from "./ids";
import { heightAt } from "../terrain";

export type ChunkOut = { name: string; glb: string; receivers: number; tris: number; occluderTris: number; area: number; list: [string, number, number, string][] };

/** Island-wide ground (planar light map over x and z, no unwrap). */
const TERRAIN_MIN = 200;
/** Meshes this long (m) go to the "wide" chunk rather than a quadrant (the road, long kerbs). */
const WIDE = 140;
/** Receivers with more triangles than this and denser than perM2 (per m² of surface) are left as occluders. */
const DENSE = { tris: 3000, perM2: 150 };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const _m = new THREE.Matrix4();
const _n = new THREE.Matrix3();
const _v = new THREE.Vector3();
const _c = new THREE.Color();
const _b = new THREE.Box3();

type Rec = { id: string; mesh: THREE.Mesh; box: THREE.Box3 };
type Occ = { pos: number[]; idx: number[] };

/**
 * @param bodies world positions of every dynamic physics body (x, z, y triples): instanced copies
 *   resting on one are knock-about props and are left out.
 */
export async function exportStatic(scene: THREE.Scene, bodies: Float32Array) {
  // every copy of the culled instanced meshes back in their buffers (World.tsx InstanceCuller)
  const w = window as unknown as { __cullOff?: boolean };
  w.__cullOff = true;
  await wait(400);
  scene.updateMatrixWorld(true);

  // anything that moves while watched is animated: snapshot, wait, compare
  const snap = new Map<THREE.Object3D, Float32Array>();
  const instSnap = new Map<THREE.InstancedMesh, Float32Array>();
  scene.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    snap.set(o, Float32Array.from(o.matrixWorld.elements));
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) instSnap.set(im, (im.instanceMatrix.array as Float32Array).slice(0, im.count * 16));
  });
  await wait(1500);
  scene.updateMatrixWorld(true);
  const moved = (o: THREE.Object3D) => {
    const a = snap.get(o);
    if (!a) return true;
    for (let i = 0; i < 16; i++) if (Math.abs(a[i] - o.matrixWorld.elements[i]) > 1e-4) return true;
    const im = o as THREE.InstancedMesh;
    if (im.isInstancedMesh) {
      const b = instSnap.get(im);
      const now = im.instanceMatrix.array as Float32Array;
      if (!b || b.length !== im.count * 16) return true;
      for (let i = 0; i < b.length; i++) if (Math.abs(b[i] - now[i]) > 1e-4) return true;
    }
    return false;
  };

  // dynamic bodies on a 2 m grid, for the knock-about test
  const grid = new Map<string, number[]>();
  for (let i = 0; i < bodies.length; i += 3) {
    const k = `${Math.floor(bodies[i] / 2)},${Math.floor(bodies[i + 1] / 2)}`;
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(bodies[i], bodies[i + 1], bodies[i + 2]);
  }
  const onBody = (p: THREE.Vector3) => {
    const gx = Math.floor(p.x / 2);
    const gz = Math.floor(p.z / 2);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const l = grid.get(`${gx + dx},${gz + dz}`);
        if (!l) continue;
        for (let i = 0; i < l.length; i += 3) if (Math.hypot(l[i] - p.x, l[i + 1] - p.z, l[i + 2] - p.y) < 1) return true;
      }
    return false;
  };

  // receivers
  const recs: Rec[] = [];
  for (const [id, mesh] of receivers(scene)) {
    if (moved(mesh)) continue;
    // fine detail (lettering, logos): thousands of tiny triangles would shred the light map
    // into specks; they shade the ground as occluders and keep their own look
    const tris = (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    if (tris > DENSE.tris && tris / Math.max(1e-3, surface(mesh)) > DENSE.perM2) continue;
    recs.push({ id, mesh, box: worldBox(mesh, new THREE.Box3()) });
  }
  const recSet = new Set(recs.map((r) => r.mesh));

  // island bounds from the receivers, for the quadrants
  const island = new THREE.Box3();
  for (const r of recs) island.union(r.box);
  const mid = island.getCenter(new THREE.Vector3());
  const chunkOf = (b: THREE.Box3) => {
    const s = b.getSize(_v);
    if (s.x > TERRAIN_MIN && s.z > TERRAIN_MIN) return "terrain";
    if (Math.max(s.x, s.z) > WIDE) return "wide";
    const c = b.getCenter(_v);
    return (c.z < mid.z ? "n" : "s") + (c.x < mid.x ? "w" : "e");
  };

  // occluders: every other still, opaque mesh (instanced copies expanded), in world space
  const occ: Occ = { pos: [], idx: [] };
  const stats = { movables: 0, moving: 0, instCopies: 0, flat: 0, undersides: 0, instanced: [] as [string, number, number][] };
  const addGeo = (g: THREE.BufferGeometry, m: THREE.Matrix4, into: Occ = occ) => {
    if (!g.boundingBox) g.computeBoundingBox();
    if (flatOnGround(_b.copy(g.boundingBox!).applyMatrix4(m))) return void stats.flat++;
    const p = g.attributes.position;
    const base = into.pos.length / 3;
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(m);
      into.pos.push(_v.x, _v.y, _v.z);
    }
    const ix = g.index;
    const n = ix ? ix.count : p.count;
    const s = g.drawRange.start;
    const e = Math.min(n, s + g.drawRange.count);
    for (let i = s; i + 2 < e; i += 3) {
      const a = base + (ix ? ix.getX(i) : i);
      const b = base + (ix ? ix.getX(i + 1) : i + 1);
      const c = base + (ix ? ix.getX(i + 2) : i + 2);
      if (underside(into.pos, a, b, c)) {
        stats.undersides++;
        continue;
      }
      into.idx.push(a, b, c);
    }
  };
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || recSet.has(mesh) || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (!mesh.geometry?.attributes.position || !eligible(mesh, scene)) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    // occluders may be multi-material, but nothing see-through, cut out (wire fences) or hidden (ids.ts)
    if (!mats.every((m) => bakeable(m))) return;
    if (moved(mesh)) {
      stats.moving++;
      return;
    }
    const im = mesh as THREE.InstancedMesh;
    if (im.isInstancedMesh) {
      const g = im.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      // a knock-about kind: its copies rest on dynamic bodies (static kit has none at its middle)
      let hits = 0;
      const n = Math.min(im.count, 40);
      for (let i = 0; i < n; i++) {
        im.getMatrixAt(i, _m);
        _m.premultiply(im.matrixWorld);
        if (onBody(_b.copy(g.boundingBox!).applyMatrix4(_m).getCenter(_v))) hits++;
      }
      stats.instanced.push([im.name || im.parent?.name || "", im.count, n ? +(hits / n).toFixed(2) : 0]);
      if (n && hits / n > 0.15) {
        stats.movables++;
        return;
      }
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, _m);
        addGeo(g, _m.premultiply(im.matrixWorld));
      }
      stats.instCopies += im.count;
      return;
    }
    addGeo(mesh.geometry, mesh.matrixWorld);
  });
  w.__cullOff = false;

  // receivers grouped into chunks; occluder triangles go to every chunk whose (grown) box they touch
  const groups = new Map<string, Rec[]>();
  for (const r of recs) {
    const c = chunkOf(r.box);
    (groups.get(c) ?? groups.set(c, []).get(c)!).push(r);
  }
  const chunks: ChunkOut[] = [];
  for (const [name, list] of groups) {
    const reach = new THREE.Box3();
    for (const r of list) reach.union(r.box);
    reach.expandByScalar(12);
    reach.max.y = Infinity; // sun shadows come from above: tall things nearby count
    // occluders: receivers of other chunks nearby count too
    const o: Occ = { pos: [], idx: [] };
    const remap = new Map<number, number>();
    for (let t = 0; t < occ.idx.length; t += 3) {
      const a = occ.idx[t];
      const b = occ.idx[t + 1];
      const c = occ.idx[t + 2];
      if (!triIn(occ.pos, a, b, c, reach)) continue;
      for (const v of [a, b, c]) {
        let j = remap.get(v);
        if (j === undefined) {
          j = o.pos.length / 3;
          remap.set(v, j);
          o.pos.push(occ.pos[v * 3], occ.pos[v * 3 + 1], occ.pos[v * 3 + 2]);
        }
        o.idx.push(j);
      }
    }
    for (const r of recs) if (!list.includes(r) && r.box.intersectsBox(reach)) addGeo(r.mesh.geometry, r.mesh.matrixWorld, o);
    const { glb, tris, area } = writeGlb(name, list, o);
    chunks.push({
      name,
      glb: b64(glb),
      receivers: list.length,
      tris,
      occluderTris: o.idx.length / 3,
      area,
      // id, triangles, size (m), colour: for the log
      list: list.map((r) => [r.id, (r.mesh.geometry.index?.count ?? r.mesh.geometry.attributes.position.count) / 3, +r.box.getSize(_v).length().toFixed(1), "#" + (r.mesh.material as THREE.MeshStandardMaterial).color.getHexString()]),
    });
  }
  return { chunks, stats: { ...stats, receivers: recs.length, island: [island.min.toArray(), island.max.toArray()] } };
}

/**
 * Flat things lying on the ground (slabs, covers, markings): as occluders they would only black out
 * the ground a centimetre under them, which shows wherever the two z-fight; they cast nothing else.
 */
function flatOnGround(b: THREE.Box3) {
  if (b.max.y - b.min.y > 0.2) return false;
  return b.min.y < heightAt((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2) + 0.3;
}

/**
 * A triangle facing down within 30 cm of the ground: the bottom of a slab, or a ribbon wound the
 * other way (the game culls it from above). It shades nothing the real-time light would, and in
 * Cycles it would black out the ground just under it.
 */
function underside(pos: number[], a: number, b: number, c: number) {
  const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
  const ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az;
  const vx = pos[c * 3] - ax, vy = pos[c * 3 + 1] - ay, vz = pos[c * 3 + 2] - az;
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (!len || ny / len > -0.3) return false;
  const top = Math.max(ay, pos[b * 3 + 1], pos[c * 3 + 1]);
  return top < heightAt(ax + (ux + vx) / 3, az + (uz + vz) / 3) + 0.3;
}

/** World surface area of a mesh (m²). */
function surface(mesh: THREE.Mesh) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  const ix = g.index;
  const n = ix ? ix.count : p.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let area = 0;
  for (let t = 0; t + 2 < n; t += 3) {
    a.fromBufferAttribute(p, ix ? ix.getX(t) : t).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(p, ix ? ix.getX(t + 1) : t + 1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(p, ix ? ix.getX(t + 2) : t + 2).applyMatrix4(mesh.matrixWorld);
    area += c.sub(a).cross(b.sub(a)).length() / 2;
  }
  return area;
}

function triIn(pos: number[], a: number, b: number, c: number, box: THREE.Box3) {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const v of [a, b, c]) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
  }
  return x1 >= box.min.x && x0 <= box.max.x && y1 >= box.min.y && y0 <= box.max.y && z1 >= box.min.z && z0 <= box.max.z;
}

/** One GLB: a node per receiver (name = bake id) plus one "occluders" node; world space, no transforms. */
function writeGlb(name: string, list: Rec[], occ: Occ) {
  const parts: ArrayBuffer[] = [];
  let off = 0;
  const views: object[] = [];
  const accessors: object[] = [];
  const add = (arr: Float32Array | Uint32Array, type: string, target: number, minmax = false) => {
    const pad = (4 - (arr.byteLength % 4)) % 4;
    views.push({ buffer: 0, byteOffset: off, byteLength: arr.byteLength, target });
    parts.push(arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer);
    if (pad) parts.push(new ArrayBuffer(pad));
    off += arr.byteLength + pad;
    const comps = type === "VEC3" ? 3 : 1;
    const acc: Record<string, unknown> = { bufferView: views.length - 1, componentType: arr instanceof Float32Array ? 5126 : 5125, count: arr.length / comps, type };
    if (minmax) {
      const mn = [Infinity, Infinity, Infinity];
      const mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < arr.length; i += 3) for (let k = 0; k < 3; k++) {
        mn[k] = Math.min(mn[k], arr[i + k]);
        mx[k] = Math.max(mx[k], arr[i + k]);
      }
      acc.min = mn;
      acc.max = mx;
    }
    accessors.push(acc);
    return accessors.length - 1;
  };
  const meshes: object[] = [];
  const nodes: object[] = [];
  let tris = 0;
  let area = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const r of list) {
    const g = r.mesh.geometry;
    const p = g.attributes.position;
    const nrm = g.attributes.normal;
    const col = g.attributes.color;
    const mat = r.mesh.material as THREE.MeshStandardMaterial;
    const pos = new Float32Array(p.count * 3);
    const nor = new Float32Array(p.count * 3);
    const rgb = new Float32Array(p.count * 3);
    _n.getNormalMatrix(r.mesh.matrixWorld);
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(r.mesh.matrixWorld);
      pos.set([_v.x, _v.y, _v.z], i * 3);
      if (nrm) _v.fromBufferAttribute(nrm, i).applyMatrix3(_n).normalize();
      else _v.set(0, 1, 0);
      nor.set([_v.x, _v.y, _v.z], i * 3);
      _c.copy(mat.color);
      if (col && mat.vertexColors) _c.multiply(new THREE.Color(col.getX(i), col.getY(i), col.getZ(i)));
      rgb.set([_c.r, _c.g, _c.b], i * 3);
    }
    const ix = g.index;
    const n = ix ? ix.count : p.count;
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = ix ? ix.getX(i) : i;
    for (let t = 0; t < n; t += 3) {
      a.fromArray(pos, idx[t] * 3);
      b.fromArray(pos, idx[t + 1] * 3);
      c.fromArray(pos, idx[t + 2] * 3);
      area += c.sub(a).cross(b.sub(a)).length() / 2;
    }
    tris += n / 3;
    meshes.push({
      name: r.id,
      primitives: [{ attributes: { POSITION: add(pos, "VEC3", 34962, true), NORMAL: add(nor, "VEC3", 34962), COLOR_0: add(rgb, "VEC3", 34962) }, indices: add(idx, "SCALAR", 34963) }],
      extras: { flat: !!mat.flatShading || !nrm, side: mat.side },
    });
    nodes.push({ name: r.id, mesh: meshes.length - 1 });
  }
  if (occ.idx.length) {
    meshes.push({ name: "occluders", primitives: [{ attributes: { POSITION: add(new Float32Array(occ.pos), "VEC3", 34962, true) }, indices: add(new Uint32Array(occ.idx), "SCALAR", 34963) }] });
    nodes.push({ name: "occluders", mesh: meshes.length - 1 });
  }
  const json = {
    asset: { version: "2.0", generator: "hg light bake export" },
    scene: 0,
    scenes: [{ name, nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: off }],
  };
  const enc = new TextEncoder().encode(JSON.stringify(json));
  const jpad = (4 - (enc.length % 4)) % 4;
  const jlen = enc.length + jpad;
  const total = 12 + 8 + jlen + 8 + off;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jlen, true);
  dv.setUint32(16, 0x4e4f534a, true);
  out.set(enc, 20);
  out.fill(0x20, 20 + enc.length, 20 + jlen);
  dv.setUint32(20 + jlen, off, true);
  dv.setUint32(24 + jlen, 0x004e4942, true);
  let at = 28 + jlen;
  for (const p of parts) {
    out.set(new Uint8Array(p), at);
    at += p.byteLength;
  }
  return { glb: out, tris, area };
}

function b64(u: Uint8Array) {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
