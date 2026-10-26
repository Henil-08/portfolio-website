// The Bloom's shader patch, applied centrally to every material in the world (nothing in the
// world's own files knows about it). It hides each fragment until the wave reaches it:
//
//  - "flat" materials (anything drawn on a big mesh: terrain, roads, water, merged runs) appear
//    where the wave front has passed, per fragment;
//  - "stand" materials (only ever on small meshes or instances: trees, props, buildings, signs)
//    arrive by their own origin (or their instance's) and rise from it, scaled up in height.
//
// The shadow pass gets the same treatment through a patched depth material, so nothing casts a
// shadow before it is there.
//
// Cost: while it is on every patched program carries a discard. When the build is done `off()`
// swaps every material back to its own program. The patched versions compile during the boot,
// the own ones while the garage is up (`warmOwn`), and three.js keeps every program a material
// has used, so switching either way is a lookup, never a compile.
import * as THREE from "three";
import { PLAN, RAD_POW } from "./plan";

/** Shared by every patched program; the opening writes them once a frame. */
export const U = {
  uBloomT: { value: -1e4 },
  uBloomC: { value: new THREE.Vector2() },
  uBloomR: { value: 100 },
  /** inverse of the main camera's projection x view, for custom shaders */
  uBloomInvVP: { value: new THREE.Matrix4() },
};

type Mode = "flat" | "stand";
type Entry = { mode: Mode; obc: THREE.Material["onBeforeCompile"]; key: () => string };
const patched = new Map<THREE.Material, Entry>();
/** Shadow casters we gave a patched depth material, and what they had before. */
const depthOwners = new Map<THREE.Object3D, THREE.Material | undefined>();
let on = false;

/** Objects whose world radius is past this are "big": their materials reveal per fragment. */
const BIG = 9;

const ARRIVE = /* glsl */ `
uniform float uBloomT; uniform vec2 uBloomC; uniform float uBloomR;
float bloomArrive(vec2 p) {
  return ${PLAN.solid.a.toFixed(3)} + ${PLAN.solid.b.toFixed(3)} * pow(min(1.0, distance(p, uBloomC) / uBloomR), ${(1 / RAD_POW).toFixed(5)});
}`;
const OFF = (m: Mode) => (m === "stand" ? PLAN.standOff.toFixed(3) : "0.0");

/** Vertex code, after the world position `bw` (vec3) is known. `out` writes the position back. */
function standVertex(out: string) {
  return `
    vec4 ba = vec4(0.0, 0.0, 0.0, 1.0);
    #ifdef USE_INSTANCING
      ba = instanceMatrix * ba;
    #endif
    ba = modelMatrix * ba;
    vBloomP = ba.xz;
    {
      float bk = clamp((uBloomT - bloomArrive(ba.xz) - ${PLAN.standOff.toFixed(3)}) / ${PLAN.rise.toFixed(3)}, 0.0, 1.0);
      float bs = 1.0 + 2.6 * pow(bk - 1.0, 3.0) + 1.6 * pow(bk - 1.0, 2.0); // back.out(1.6)
      bw.y = ba.y + (bw.y - ba.y) * max(1e-3, bs);
      ${out}
    }`;
}

/** Finds `void main() {` and returns the index just past its brace, and the index of its closing brace. */
function mainSpan(src: string) {
  const m = /void\s+main\s*\(\s*(?:void)?\s*\)\s*\{/.exec(src);
  if (!m) return null;
  const open = m.index + m[0].length;
  let depth = 1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return { open, close: i };
  }
  return null;
}

function inject(sh: THREE.WebGLProgramParametersWithUniforms, mode: Mode, glsl3: boolean) {
  Object.assign(sh.uniforms, U);
  // once per program: a derived material (troika) runs its base material's hook too
  if (sh.fragmentShader.includes("bloomArrive")) return true;
  const vary = glsl3 ? "out vec2 vBloomP;" : "varying vec2 vBloomP;";
  const varyF = glsl3 ? "in vec2 vBloomP;" : "varying vec2 vBloomP;";
  let vs = sh.vertexShader;
  if (vs.includes("#include <project_vertex>")) {
    // built-in shaders: the world position from mvPosition (the view matrix is rigid), which also
    // holds in the shadow pass, where the view is the light's
    const body = `{
      vec3 bw = transpose(mat3(viewMatrix)) * (mvPosition.xyz - viewMatrix[3].xyz);
      ${mode === "stand" ? standVertex("gl_Position = projectionMatrix * viewMatrix * vec4(bw, 1.0);") : "vBloomP = bw.xz;"}
    }`;
    vs = vs.replace("#include <project_vertex>", `#include <project_vertex>\n${body}`);
    vs = vs.replace("#include <common>", `#include <common>\n${vary}\n${ARRIVE}\nuniform mat4 uBloomInvVP;`);
    if (!vs.includes("vBloomP;")) vs = `${vary}\n${ARRIVE}\n${vs}`;
  } else {
    // custom shaders: back from clip space with the main camera, at the end of main
    const span = mainSpan(vs);
    if (!span) return false;
    const body = `{
      vec4 bq = uBloomInvVP * gl_Position;
      vec3 bw = bq.xyz / bq.w;
      ${mode === "stand" ? standVertex("gl_Position = projectionMatrix * viewMatrix * vec4(bw, 1.0);") : "vBloomP = bw.xz;"}
    }`;
    vs = `${vary}\n${ARRIVE}\nuniform mat4 uBloomInvVP;\n${vs.slice(0, span.close)}\n${body}\n${vs.slice(span.close)}`;
  }
  let fs = sh.fragmentShader;
  const span = mainSpan(fs);
  if (!span) return false;
  fs = `${fs.slice(0, span.open)}\n  if (bloomArrive(vBloomP) + ${OFF(mode)} > uBloomT) discard;\n${fs.slice(span.open)}`;
  fs = fs.includes("#include <common>") ? fs.replace("#include <common>", `#include <common>\n${varyF}\n${ARRIVE}`) : `${varyF}\n${ARRIVE}\n${fs}`;
  sh.vertexShader = vs;
  sh.fragmentShader = fs;
  return true;
}

function patch(m: THREE.Material, mode: Mode) {
  if (patched.has(m)) return;
  const obc = m.onBeforeCompile;
  // a material on the default key is keyed by its onBeforeCompile's source: keep that one
  const own = m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey;
  const src = obc.toString();
  const prevKey = own ? m.customProgramCacheKey.bind(m) : () => src;
  const glsl3 = (m as THREE.ShaderMaterial).glslVersion === THREE.GLSL3;
  // troika's derived materials (drei <Text>) always answer onBeforeCompile with their own handler
  // and call whatever is set as an extra hook from inside it: chaining to it would recurse
  const derived = !!(m as THREE.Material & { isDerivedMaterial?: boolean }).isDerivedMaterial;
  patched.set(m, { mode, obc, key: prevKey });
  m.onBeforeCompile = (sh, r) => {
    if (!derived) obc.call(m, sh, r);
    // the bloom's uniforms ride along on both versions: three keeps the uniforms of the last
    // compile, and either version may be the last one compiled
    Object.assign(sh.uniforms, U);
    if (on) inject(sh, mode, glsl3);
  };
  m.customProgramCacheKey = () => (on ? `${prevKey()}|bloom-${mode}` : prevKey());
}

const depthMats: Record<Mode, THREE.MeshDepthMaterial | null> = { flat: null, stand: null };
function depthFor(mode: Mode) {
  let d = depthMats[mode];
  if (!d) {
    d = depthMats[mode] = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    patch(d, mode);
  }
  return d;
}

const isSky = (o: THREE.Mesh, m: THREE.Material) => m.side === THREE.BackSide && (m as THREE.ShaderMaterial).isShaderMaterial && o.scale.x >= 100;
const radiusOf = (o: THREE.Mesh) => {
  const g = o.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const s = o.getWorldScale(_s);
  return (g.boundingSphere?.radius ?? 0) * Math.max(s.x, s.y, s.z);
};
const _s = new THREE.Vector3();

/**
 * Patches every material under `root` that isn't patched yet, except under `skip` objects
 * (userData.bloomSkip, the player's vehicle). Returns how many it patched.
 */
export function scan(root: THREE.Object3D, skip: (o: THREE.Object3D) => boolean) {
  const seen = new Map<THREE.Material, { big: boolean; objs: THREE.Mesh[] }>();
  const visit = (o: THREE.Object3D) => {
    if (o.userData.bloomSkip || skip(o)) return;
    const mesh = o as THREE.Mesh;
    if (mesh.material && mesh.geometry) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // an instanced mesh is judged by one instance (its base geometry)
      const big = radiusOf(mesh) > BIG;
      for (const m of mats) {
        if ((m as THREE.RawShaderMaterial).isRawShaderMaterial || isSky(mesh, m)) continue;
        const e = seen.get(m) ?? { big: false, objs: [] };
        e.big ||= big;
        e.objs.push(mesh);
        seen.set(m, e);
      }
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  let n = 0;
  for (const [m, e] of seen) {
    const was = patched.get(m);
    if (!was) {
      patch(m, e.big ? "flat" : "stand");
      n++;
    }
    const mode = patched.get(m)!.mode;
    for (const o of e.objs) {
      if (!o.castShadow || depthOwners.has(o)) continue;
      if (o.customDepthMaterial) {
        if (!patched.has(o.customDepthMaterial)) patch(o.customDepthMaterial, mode);
        continue;
      }
      depthOwners.set(o, undefined);
      if (on) o.customDepthMaterial = depthFor(mode);
      else depthFor(mode);
      (o.userData as { bloomDepth?: Mode }).bloomDepth = mode;
    }
  }
  return n;
}

function flip(next: boolean) {
  if (on === next) return;
  on = next;
  for (const m of patched.keys()) m.needsUpdate = true;
  for (const [o, prev] of depthOwners) {
    const mode = (o.userData as { bloomDepth?: Mode }).bloomDepth ?? "flat";
    o.customDepthMaterial = on ? depthFor(mode) : prev;
  }
}

/**
 * Compiles every material's own program while the patched ones stay in use: the synchronous
 * part of `compile` runs with the patch off, then it is turned straight back on, so the next
 * frame draws the patched programs again and the own ones finish compiling on the side (in
 * parallel where the browser can). `bloomOff` then only switches.
 */
export function warmOwn(compile: () => Promise<unknown>) {
  if (!on) return compile();
  on = false;
  for (const m of patched.keys()) m.needsUpdate = true;
  const p = compile();
  on = true;
  for (const m of patched.keys()) m.needsUpdate = true;
  return p;
}

/** Turns the patch on: everything not reached by the wave is hidden. */
export const bloomOn = () => flip(true);
/** Back to every material's own program (already compiled, so it costs nothing). */
export const bloomOff = () => flip(false);
export const bloomIsOn = () => on;

/** Dev: how many materials and shadow casters are patched, by mode. */
export function bloomStats() {
  let flat = 0;
  let stand = 0;
  for (const e of patched.values()) {
    if (e.mode === "flat") flat++;
    else stand++;
  }
  return { flat, stand, depth: depthOwners.size, on };
}
