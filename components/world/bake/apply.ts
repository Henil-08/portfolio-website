// The baked light on the game's static meshes (look=next only; scripts/bake/run.mjs makes it).
//
// public/bake/manifest.json lists one texture per area chunk and, per mesh, its bake id (ids.ts),
// corner and vertex counts. Each texture packs, linear:
//   R  ambient occlusion: the aoMap (three reads .r), so the sky and every indirect light settle
//      into corners and under things, day and night;
//   G  sun visibility at the day clock's sun: far shadows. The real-time sun's shadow map only
//      covers ~34 m round the car; past it the bake's shadows take over (distance shadowmask),
//      by day and dusk, on surfaces that faced the bake's sun (elsewhere the direction differs);
//   B  the bounce (indirect diffuse light of the day bake / the chunk's `bounce` scale), added
//      under the sun's current colour and strength, gone at night.
// The light-map uv comes per corner (<chunk>.uv.bin, uint16 pairs in the game's index order); a
// mesh gets a copy of its geometry with a `uv1` attribute, its vertices split only where the
// unwrap put a seam. The terrain's map is planar over x and z (no uv file).
import * as THREE from "three";
import { receivers } from "./ids";

export type ChunkMeta = {
  name: string;
  tex: string;
  size: number;
  bounce: number;
  planar: [number, number, number, number] | null;
  uv: string | null;
  receivers: [string, number, number][];
};
export type Manifest = { version: number; sun: [number, number, number]; light: { sun: number }; chunks: ChunkMeta[] };

export const BASE = "/bake/";
/** How strong the baked AO is (1: as baked). */
export const AO_INTENSITY = 0.85;
/** The bounce's share (it comes on top of the HDRI's fill). */
const BOUNCE_K = 0.75;

/** Shared by every baked material; Baked.tsx writes them each frame. */
export const bakeUniforms = {
  uBakeDay: { value: 1 },
  uBakeCenter: { value: new THREE.Vector3() },
  uBakeFar: { value: new THREE.Vector2(22, 31) },
  uBakeSun: { value: new THREE.Vector3(0, 1, 0) },
  uBakeTint: { value: new THREE.Color(1, 1, 1) },
};

/** `fade`: how far in the bake is on this mesh (0..1), shared by the meshes swapped in together (Baked.tsx ramps it). */
export type Baked = { mesh: THREE.Mesh; geometry: THREE.BufferGeometry; tex: THREE.Texture; bounce: number; fade: { value: number } };

export async function loadManifest(): Promise<Manifest | null> {
  try {
    const r = await fetch(`${BASE}manifest.json`);
    return r.ok ? ((await r.json()) as Manifest) : null;
  } catch {
    return null;
  }
}

function loadTexture(url: string) {
  return new Promise<THREE.Texture>((res, rej) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.NoColorSpace;
        t.channel = 1;
        t.anisotropy = 4;
        res(t);
      },
      undefined,
      rej,
    );
  });
}

export type Loaded = { meta: ChunkMeta; tex: THREE.Texture; uv: Uint16Array | null }[];

/** Every chunk's texture and light-map uv. */
export function loadChunks(manifest: Manifest): Promise<Loaded> {
  return Promise.all(
    manifest.chunks.map(async (meta) => {
      const [tex, buf] = await Promise.all([loadTexture(BASE + meta.tex), meta.uv ? fetch(BASE + meta.uv).then((r) => r.arrayBuffer()) : Promise.resolve(null)]);
      return { meta, tex, uv: buf ? new Uint16Array(buf) : null };
    }),
  );
}

/**
 * Finds the baked meshes in `scene` (all, or only the ids in `want`) and makes their light-mapped
 * geometries (not yet on the meshes). `missing`: ids with no matching mesh right now.
 */
export function match(scene: THREE.Scene, chunks: Loaded, want?: Set<string>) {
  const live = receivers(scene);
  const near = nearby(live);
  const taken = new Set<THREE.Mesh>();
  const out: (Baked & { id: string })[] = [];
  const missing: string[] = [];
  const fade = { value: 0 };
  for (const { meta: c, tex, uv } of chunks) {
    let corner = 0;
    for (const [id, corners, verts] of c.receivers) {
      const at = corner;
      corner += corners;
      if (want && !want.has(id)) continue;
      const mesh = find(id, live, near, taken);
      const g = mesh?.geometry;
      if (!mesh || !g || g.attributes.position.count !== verts || (g.index ? g.index.count : g.attributes.position.count) !== corners) {
        missing.push(id);
        continue;
      }
      const geometry = c.planar ? planarGeometry(mesh, c.planar) : uv ? splitGeometry(g, uv.subarray(at * 2, (at + corners) * 2)) : null;
      if (!geometry) continue;
      taken.add(mesh);
      out.push({ id, mesh, geometry, tex, bounce: c.bounce, fade });
    }
  }
  return { baked: out, missing };
}

/** Live meshes by their counts (the id's first two fields), for the near match. */
function nearby(live: Map<string, THREE.Mesh>) {
  const by = new Map<string, [number[], THREE.Mesh][]>();
  for (const [k, m] of live) {
    const f = k.split("#")[0].split(".");
    const head = `${f[0]}.${f[1]}`;
    (by.get(head) ?? by.set(head, []).get(head)!).push([f.slice(2).map(Number), m]);
  }
  return by;
}

/** The mesh with this id; failing that, one with the same counts whose box is within a step (5 cm) on every side (a rounding flip). */
function find(id: string, live: Map<string, THREE.Mesh>, near: ReturnType<typeof nearby>, taken: Set<THREE.Mesh>) {
  const exact = live.get(id);
  if (exact && !taken.has(exact)) return exact;
  const f = id.split("#")[0].split(".");
  const box = f.slice(2).map(Number);
  for (const [b, m] of near.get(`${f[0]}.${f[1]}`) ?? []) if (!taken.has(m) && b.every((v, i) => Math.abs(v - box[i]) <= 1)) return m;
  return undefined;
}

/** Same vertices, plus uv1 over the chunk's x/z rectangle (world space). */
function planarGeometry(mesh: THREE.Mesh, [x0, z0, sx, sz]: [number, number, number, number]) {
  const src = mesh.geometry;
  const g = shallow(src);
  const p = src.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
    uv[i * 2] = (v.x - x0) / sx;
    uv[i * 2 + 1] = (v.z - z0) / sz;
  }
  g.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** The geometry with a per-corner uv1: a vertex is copied only where its corners disagree. */
function splitGeometry(src: THREE.BufferGeometry, uvq: Uint16Array) {
  const n = src.attributes.position.count;
  const ix = src.index;
  const corners = ix ? ix.count : n;
  const firstKey = new Float64Array(n).fill(-1); // keys reach 2^32: not an Int32Array
  const extra = new Map<number, number>(); // (vertex, uv) -> new vertex, for the seams
  const from: number[] = []; // new vertex -> source vertex
  const keys: number[] = [];
  const index = new Uint32Array(corners);
  for (let c = 0; c < corners; c++) {
    const v = ix ? ix.getX(c) : c;
    const key = uvq[c * 2] * 65536 + uvq[c * 2 + 1];
    if (firstKey[v] === -1) {
      firstKey[v] = key;
      index[c] = v;
    } else if (firstKey[v] === key) index[c] = v;
    else {
      const k = v * 4294967296 + key;
      let j = extra.get(k);
      if (j === undefined) {
        j = n + from.length;
        from.push(v);
        keys.push(key);
        extra.set(k, j);
      }
      index[c] = j;
    }
  }
  const total = n + from.length;
  const g = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(src.attributes)) {
    const attr = a as THREE.BufferAttribute;
    const size = attr.itemSize;
    const Arr = (attr.array as Float32Array).constructor as Float32ArrayConstructor;
    const arr = new Arr(total * size);
    for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) arr[i * size + k] = attr.getComponent(i, k);
    for (let e = 0; e < from.length; e++) for (let k = 0; k < size; k++) arr[(n + e) * size + k] = attr.getComponent(from[e], k);
    g.setAttribute(name, new THREE.BufferAttribute(arr, size, attr.normalized));
  }
  const uv = new Float32Array(total * 2);
  for (let i = 0; i < n; i++) {
    const key = firstKey[i] < 0 ? 0 : firstKey[i];
    uv[i * 2] = Math.floor(key / 65536) / 65535;
    uv[i * 2 + 1] = (key % 65536) / 65535;
  }
  for (let e = 0; e < from.length; e++) {
    uv[(n + e) * 2] = Math.floor(keys[e] / 65536) / 65535;
    uv[(n + e) * 2 + 1] = (keys[e] % 65536) / 65535;
  }
  g.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
  g.setIndex(total > 65535 ? new THREE.BufferAttribute(index, 1) : new THREE.BufferAttribute(Uint16Array.from(index), 1));
  for (const gr of src.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
  g.boundingBox = src.boundingBox?.clone() ?? null;
  g.boundingSphere = src.boundingSphere?.clone() ?? null;
  return g;
}

/** A new geometry over the same attribute buffers (they stay shared on the GPU) and index. */
function shallow(src: THREE.BufferGeometry) {
  const g = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(src.attributes)) g.setAttribute(name, a);
  g.setIndex(src.index);
  for (const gr of src.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
  g.boundingBox = src.boundingBox?.clone() ?? null;
  g.boundingSphere = src.boundingSphere?.clone() ?? null;
  return g;
}

/* ------------------------------------------------------------------ the material patch */

const VERT = /* glsl */ `
#ifdef BAKE_LIGHT
  vBakeW = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`;

const FRAG_HEAD = /* glsl */ `
uniform float uBakeDay;
uniform vec3 uBakeCenter;
uniform vec2 uBakeFar;
uniform vec3 uBakeSun;
uniform vec3 uBakeTint;
uniform float uBakeBounce;
uniform float uBakeFade;
varying vec3 vBakeW;`;

// before the direct lights: the sun's far shadow from the bake
const FRAG_SUN = /* glsl */ `
vec3 bakeT = texture2D( aoMap, vAoMapUv ).rgb;
float bakeSun = 1.0;
{
  vec3 wn = normalize( ( vec4( nonPerturbedNormal, 0.0 ) * viewMatrix ).xyz );
  float far = smoothstep( uBakeFar.x, uBakeFar.y, distance( vBakeW.xz, uBakeCenter.xz ) );
  float facing = smoothstep( 0.05, 0.3, dot( wn, uBakeSun ) );
  bakeSun = mix( 1.0, bakeT.g, uBakeDay * far * facing * uBakeFade );
}`;

// the AO, faded in (three's aomap_fragment with the intensity scaled), then the bounce, which the
// AO already holds (it was baked with the occluders)
const FRAG_AO = THREE.ShaderChunk.aomap_fragment.replaceAll("aoMapIntensity", "( aoMapIntensity * uBakeFade )");
const FRAG_BOUNCE = /* glsl */ `
reflectedLight.indirectDiffuse += bakeT.b * uBakeBounce * uBakeDay * uBakeFade * uBakeTint * BRDF_Lambert( material.diffuseColor );`;

const LIGHTS = THREE.ShaderChunk.lights_fragment_begin.replace(
  "getDirectionalLightInfo( directionalLight, directLight );",
  "getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= bakeSun;",
);

const patched = new WeakSet<THREE.Material>();
export const isBakeMaterial = (m: THREE.Material) => patched.has(m);

/**
 * Adds the bake's patch to a (per-mesh) material, after whatever patches it already has. `fade`
 * (0..1) brings the whole bake in (AO, far sun shadow, bounce) and hands over from look.ts's
 * per-vertex AO, which the bake replaces, so it never lands in one frame.
 */
export function patchBake(m: THREE.Material, bounce: number, fade: { value: number }) {
  if (patched.has(m)) return;
  patched.add(m);
  const prev = m.onBeforeCompile.bind(m);
  const own = m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey;
  const prevKey = own ? m.customProgramCacheKey.bind(m) : () => prev.toString();
  const uBakeBounce = { value: bounce * Math.PI * BOUNCE_K };
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    if (sh.fragmentShader.includes("uBakeBounce")) return;
    Object.assign(sh.uniforms, bakeUniforms, { uBakeBounce, uBakeFade: fade });
    sh.defines = { ...sh.defines, BAKE_LIGHT: "" };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vBakeW;")
      .replace("#include <project_vertex>", `#include <project_vertex>\n${VERT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_HEAD}`)
      .replace("#include <lights_fragment_begin>", `${FRAG_SUN}\n${LIGHTS}`)
      .replace("#include <aomap_fragment>", `${FRAG_AO}\n${FRAG_BOUNCE}`)
      // look.ts's per-vertex AO (the geometry keeps it) hands over to the bake as it fades in
      .replace("float lao = vLookAO;", "float lao = mix( vLookAO, 1.0, uBakeFade );");
  };
  m.customProgramCacheKey = () => `${prevKey()}|bake`;
  m.needsUpdate = true;
}
