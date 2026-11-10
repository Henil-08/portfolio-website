// Studio variants of the world's materials: the same paint, plus (each optional)
//  - baked ambient occlusion from a per-vertex `studioAO` attribute (see ao.ts), applied like an
//    aoMap (indirect light) and a little to the direct light, so creases and feet darken;
//  - a faint procedural grain on concrete and paper: low-frequency mottling, fine pores and a
//    touch of roughness variation, in object space so it stays put on the model;
//  - smooth shading (flatShading off) for geometry with creased normals (normals.ts).
// Every variant is a clone, cached per base material and options: the base is never touched.
import * as THREE from "three";
import { relook } from "../look";

export type StudioMat = {
  /** geometry carries a `studioAO` attribute */
  ao?: boolean;
  /** grain strength 0..1 (0 = none); "auto" picks it from the colour (concrete, paper) */
  grain?: number | "auto";
  /** smooth shading (use with creased normals) */
  smooth?: boolean;
  /** how much of the AO also darkens direct light (0..1) */
  aoDirect?: number;
};

const NOISE = /* glsl */ `
varying vec3 vStudioPos;
float sHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float sNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(sHash(i), sHash(i + vec3(1,0,0)), f.x), mix(sHash(i + vec3(0,1,0)), sHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(sHash(i + vec3(0,0,1)), sHash(i + vec3(1,0,1)), f.x), mix(sHash(i + vec3(0,1,1)), sHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

/** Grain strength a colour gets in "auto": light, low-saturation paints (concrete, paper). */
export function autoGrain(c: THREE.Color) {
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  if (hsl.s > 0.25) return 0;
  // linear lightness: concrete ~0.65, paper ~0.9, ink ~0.007
  return hsl.l > 0.35 ? 1 : 0;
}

const cache = new WeakMap<THREE.Material, Map<string, THREE.Material>>();

/** The studio variant of a material (cached; never dispose). Non-standard materials come back as they are. */
export function studioMaterial<M extends THREE.Material>(base: M, o: StudioMat = {}): M {
  if (!(base instanceof THREE.MeshStandardMaterial)) return base;
  const grain = o.grain === "auto" ? autoGrain(base.color) : (o.grain ?? 0);
  const ao = !!o.ao;
  const smooth = !!o.smooth;
  const aoDirect = o.aoDirect ?? 0.5;
  const key = `${ao}|${grain}|${smooth}|${aoDirect}`;
  let m = cache.get(base);
  if (!m) cache.set(base, (m = new Map()));
  const hit = m.get(key);
  if (hit) return hit as M;
  // ?look=next: the clone gets the look's shader patch back (look.ts relook), and runs it first
  const mat = relook((base as THREE.MeshStandardMaterial).clone());
  const prev = Object.prototype.hasOwnProperty.call(mat, "onBeforeCompile") ? mat.onBeforeCompile.bind(mat) : null;
  const prevKey = prev ? mat.customProgramCacheKey.bind(mat) : null;
  if (smooth && !base.map) mat.flatShading = false;
  if (ao || grain > 0) {
    mat.onBeforeCompile = (s, r) => {
      prev?.(s, r);
      s.uniforms.uGrain = { value: grain };
      s.uniforms.uAoDirect = { value: aoDirect };
      s.vertexShader = s.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vStudioPos;
${ao ? "attribute float studioAO; varying float vStudioAO;" : ""}`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
vStudioPos = position;
${ao ? "vStudioAO = studioAO;" : ""}`,
        );
      s.fragmentShader = s.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform float uGrain; uniform float uAoDirect;
${NOISE}
${ao ? "varying float vStudioAO;" : ""}`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
float sGrain = 0.0;
if (uGrain > 0.0) {
  vec3 sp = vStudioPos;
  // broad mottling, finer cloud, and sparse dark pores
  float m1 = sNoise(sp * 1.7) - 0.5;
  float m2 = sNoise(sp * 9.0) - 0.5;
  float pore = smoothstep(0.82, 0.95, sNoise(sp * 55.0));
  sGrain = m1 * 0.06 + m2 * 0.035;
  diffuseColor.rgb *= 1.0 + uGrain * sGrain - uGrain * pore * 0.12;
}`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + uGrain * sGrain * 0.6, 0.04, 1.0);`,
        );
      if (ao)
        s.fragmentShader = s.fragmentShader.replace(
          "#include <aomap_fragment>",
          `#include <aomap_fragment>
{
  float sao = vStudioAO;
  reflectedLight.indirectDiffuse *= sao;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( saturate( dot( geometryNormal, geometryViewDir ) ), sao, material.roughness );
  #endif
  reflectedLight.directDiffuse *= mix(1.0, sao, uAoDirect);
  reflectedLight.directSpecular *= mix(1.0, sao, uAoDirect);
}`,
        );
    };
    mat.customProgramCacheKey = () => `${prevKey ? `${prevKey()}|` : ""}studio|${key}`;
  }
  mat.needsUpdate = true;
  m.set(key, mat);
  return mat as unknown as M;
}
