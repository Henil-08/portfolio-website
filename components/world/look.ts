"use client";

// The rendering polish pass (docs/BRAND.md 2026-11-09, docs/research/art-direction.md §3): one
// switch for the whole look. `?look=next` turns it on and `?look=current` back off; the choice
// is kept in this browser (like Settings' quality) until the other one is asked for. The current
// look stays the default and every piece of the new one is gated on `NEXT`, so with the switch
// off nothing here runs or changes a material.
//
// Same palette, same models, same UI: what changes is how they are lit and rendered.
//  - HDR: filmic tone mapping (Khronos PBR Neutral: paper, ink and orange stay true below the
//    shoulder) with an exposure per time of day (Effects.tsx SCENES_NEXT, lookWorld.tsx).
//  - Light: the flat hemisphere fill goes to ~0.15, a CC0 overcast HDRI lights and reflects
//    (public/env), warm key over a cool fill; shadows take the sky's colour, never black.
//  - Materials (`lookMat`): roughness by surface class instead of uniform satin, clearcoat paint
//    on the vehicles (vehicles/kit.tsx), and tileable CC0 micro-textures (public/textures:
//    normal + roughness only, no colour) mapped triplanar in world space, so no model needs UVs.
//  - Baked AO on static kit models (lookWorld.tsx `StaticAO`, studio/ao.ts) through a `lookAO`
//    vertex attribute that every looked material reads (1 where nothing was baked), plus a soft
//    contact shadow under the car.
//  - AA and post: MSAA on the composer on High, SMAA kept on Balanced and Low; bloom 0.25, light
//    grain and a slight vignette on High only (World.tsx).
// Quality tiers scale it down (LOOK_TIERS): Low costs what the current look costs.
//
// Two more switches, off by default even with look=next: `?cam=next` (a lower, longer chase
// camera, Rig.tsx) and `?hud=next` (a quiet driving HUD, components/ui/Hud.tsx).
//
// Baked light from Blender (scripts/bake/*, components/world/bake/*, another pipeline) plugs in
// through `bakedLight` below: it resolves an aoMap / lightMap per static mesh and StaticAO applies
// it instead of the per-vertex bake.
import * as THREE from "three";
import type { Tier } from "./quality";

type Choice = "current" | "next";

/** A `?name=next|current` switch, remembered in this browser under `hg-<name>`. */
function choice(name: string): Choice {
  if (typeof window === "undefined") return "current";
  const key = `hg-${name}`;
  const q = new URLSearchParams(window.location.search).get(name);
  if (q === "next" || q === "current") {
    try {
      window.localStorage.setItem(key, q);
    } catch {}
    return q;
  }
  try {
    return window.localStorage.getItem(key) === "next" ? "next" : "current";
  } catch {
    return "current";
  }
}

/** The rendering polish pass is on (`?look=next`). */
export const NEXT = choice("look") === "next";
/** The lower, longer chase camera (`?cam=next`). */
export const CAM_NEXT = choice("cam") === "next";
/** The quiet driving HUD (`?hud=next`). */
export const HUD_NEXT = choice("hud") === "next";

/**
 * What each quality tier keeps of the new look. `msaa`: samples on the composer's render target
 * (SMAA when 0); `micro`: the micro-textures (a uniform, so a tier change recompiles nothing);
 * `grain`: film grain and the vignette. Low is the current look's cost: no MSAA, no texture
 * lookups, no extra post (tone mapping rides in the pass that already runs).
 */
export const LOOK_TIERS: Record<Tier, { msaa: number; micro: number; grain: boolean }> = {
  high: { msaa: 4, micro: 1, grain: true },
  balanced: { msaa: 0, micro: 1, grain: false },
  low: { msaa: 0, micro: 0, grain: false },
};

/* ------------------------------------------------------------------ surfaces */

/** Material classes of the new look. */
export type Surface = "paper" | "concrete" | "asphalt" | "ink" | "trim" | "glass" | "metal" | "rubber" | "paint" | "foliage" | "ground";
type Family = "concrete" | "asphalt" | "plaster" | "metal";
type SurfaceDef = {
  /** roughness and metalness (undefined: the material's own) */
  r?: number;
  m?: number;
  /** micro-texture family, its tile size in world metres, normal strength, roughness spread */
  fam?: Family;
  tile?: number;
  n?: number;
  spread?: number;
  /** extra env reflection (glass) */
  env?: number;
  /** how much the rain glosses it (0..1) */
  wet?: number;
};

// Roughness by class (art-direction.md 2.1): paper matte, concrete and asphalt rough, ink
// semi-matte, glass glossy, metal brushed, rubber dead matte. Tiles are world metres at the
// world's 2/3 scale, so a 2 m concrete tile is 3 m real.
const SURFACES: Record<Surface, SurfaceDef> = {
  paper: { r: 0.84, m: 0, fam: "plaster", tile: 1.5, n: 0.1, spread: 0.2, wet: 0.3 },
  concrete: { r: 0.9, m: 0, fam: "concrete", tile: 2.5, n: 0.28, spread: 0.3, wet: 0.6 },
  asphalt: { r: 0.9, m: 0, fam: "asphalt", tile: 1.6, n: 0.35, spread: 0.3, wet: 1 },
  ink: { r: 0.6, m: 0.05, fam: "plaster", tile: 1.2, n: 0.1, spread: 0.2, wet: 0.3 },
  /** the vehicles' ink and graphite parts: semi-matte, no texture at that size */
  trim: { r: 0.55, m: 0.08 },
  glass: { r: 0.04, m: 0.1, env: 1.4 },
  metal: { r: 0.34, m: 1, fam: "metal", tile: 0.6, n: 0.22, spread: 0.3 },
  rubber: { r: 0.94, m: 0 },
  paint: { r: 0.45, m: 0 },
  foliage: { r: 0.9, m: 0 },
  ground: {},
};

/** A best guess of a material's class from its paint, for the generic factories (props `mat()`). */
export function surfaceOf(m: THREE.MeshStandardMaterial): Surface {
  if (m.transparent && m.opacity < 0.95) return m.color.getHSL(_hsl).l < 0.4 ? "glass" : "paint";
  if (m.metalness >= 0.5) return "metal";
  m.color.getHSL(_hsl);
  const { h, s, l } = _hsl;
  if (s > 0.12 && h > 0.14 && h < 0.45 && l < 0.6) return "foliage";
  if (s > 0.35) return "paint";
  if (l < 0.12) return "ink";
  if (l > 0.82) return "paper";
  return "concrete";
}
const _hsl = { h: 0, s: 0, l: 0 };

/* ------------------------------------------------------------------ the shader patch */

/** Shared by every looked material: the tier's micro strength, 0 until the textures are in. */
export const lookUniforms = { uLookOn: { value: 0 }, /** rain, 0..1 (lookWorld.tsx LookTier) */ uLookWet: { value: 0 } };
let microWanted = 1;
let loaded = 0;
const FAMILIES: Family[] = ["concrete", "asphalt", "plaster", "metal"];
/** Mean roughness of each packed map (scripts/look/pack-textures.mjs prints them). */
const R_MEAN: Record<Family, number> = { concrete: 0.516, asphalt: 0.459, plaster: 0.513, metal: 0.469 };
const maps = new Map<Family, THREE.Texture>();
function mapOf(f: Family) {
  let t = maps.get(f);
  if (!t) {
    t = new THREE.TextureLoader().load(`/textures/${f}.webp`, () => {
      if (++loaded === FAMILIES.length) lookUniforms.uLookOn.value = microWanted;
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 4;
    maps.set(f, t);
  }
  return t;
}

/** The tier's micro strength (World.tsx, on every tier change). */
export function setLookTier(tier: Tier) {
  microWanted = LOOK_TIERS[tier].micro;
  if (loaded === FAMILIES.length) lookUniforms.uLookOn.value = microWanted;
}

const VERT_HEAD = /* glsl */ `
attribute float lookAO;
varying float vLookAO;
#ifdef LOOK_MICRO
varying vec3 vLookPos;
varying vec3 vLookN;
#endif`;
const VERT_BODY = /* glsl */ `
vLookAO = lookAO;
#ifdef LOOK_MICRO
{
  vec4 lw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    lw = instanceMatrix * lw;
  #endif
  vLookPos = (modelMatrix * lw).xyz;
  vLookN = (vec4(transformedNormal, 0.0) * viewMatrix).xyz;
}
#endif`;
const FRAG_HEAD = /* glsl */ `
varying float vLookAO;
#ifdef LOOK_MICRO
varying vec3 vLookPos;
varying vec3 vLookN;
uniform sampler2D uLookMap;
uniform float uLookOn;
uniform float uLookTile;
uniform float uLookNormal;
uniform float uLookSpread;
uniform float uLookRMean;
uniform float uLookWet;
uniform float uLookWetK;
#endif`;
// After the roughness: the three planes of a triplanar lookup, blended by the world normal
// (sharp weights, so most pixels read one plane), fading out with distance where the detail
// would only alias. Roughness moves round the class value; the normal's tilt is kept for later.
const FRAG_ROUGH = /* glsl */ `
vec3 lookTilt = vec3(0.0);
#ifdef LOOK_MICRO
{
  float lf = uLookOn * (1.0 - smoothstep(22.0, 60.0, length(vViewPosition)));
  if (lf > 0.0) {
    vec3 wn = normalize(vLookN);
    vec3 bw = pow(abs(wn), vec3(4.0));
    bw /= bw.x + bw.y + bw.z;
    vec3 p = vLookPos / uLookTile;
    float r = 0.0;
    if (bw.x > 0.02) { vec3 t = texture2D(uLookMap, p.zy).rgb; r += t.b * bw.x; vec2 d = t.rg * 2.0 - 1.0; lookTilt += vec3(0.0, d.y, d.x) * bw.x; }
    if (bw.y > 0.02) { vec3 t = texture2D(uLookMap, p.xz).rgb; r += t.b * bw.y; vec2 d = t.rg * 2.0 - 1.0; lookTilt += vec3(d.x, 0.0, d.y) * bw.y; }
    if (bw.z > 0.02) { vec3 t = texture2D(uLookMap, p.xy).rgb; r += t.b * bw.z; vec2 d = t.rg * 2.0 - 1.0; lookTilt += vec3(d.x, d.y, 0.0) * bw.z; }
    roughnessFactor = clamp(roughnessFactor + (r - uLookRMean) * uLookSpread * lf, 0.03, 1.0);
    lookTilt *= uLookNormal * lf;
  }
  // rain: wet surfaces gloss over (the tarmac most), so the lights and the sky show in them
  roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.4, uLookWet * uLookWetK);
}
#endif`;
const FRAG_NORMAL = /* glsl */ `
#ifdef LOOK_MICRO
if (dot(lookTilt, lookTilt) > 0.0) {
  vec3 lw = (vec4(normal, 0.0) * viewMatrix).xyz;
  normal = normalize((viewMatrix * vec4(normalize(lw + lookTilt), 0.0)).xyz);
}
#endif`;
// Baked AO (lookWorld.tsx StaticAO): like an aoMap on the indirect light, and a little on the
// direct light so feet and creases settle. 1 wherever nothing was baked (defaultAttributeValues).
const FRAG_AO = /* glsl */ `
{
  float lao = vLookAO;
  reflectedLight.indirectDiffuse *= lao;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( saturate( dot( geometryNormal, geometryViewDir ) ), lao, material.roughness );
  #endif
  reflectedLight.directDiffuse *= mix(1.0, lao, 0.35);
}`;

const looked = new WeakSet<THREE.Material>();

/** Adds the look's shader patch to a material in place (micro-texture and baked AO), before any later patch. */
function patch(m: THREE.MeshStandardMaterial, s: Surface) {
  if (looked.has(m)) return;
  looked.add(m);
  const d = SURFACES[s];
  const fam = d.fam;
  const prev = m.onBeforeCompile.bind(m);
  const own = m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey;
  const prevKey = own ? m.customProgramCacheKey.bind(m) : null;
  // the attribute reads 1 on any geometry that has no bake (three binds these for missing attributes)
  (m as THREE.Material & { defaultAttributeValues?: Record<string, number[]> }).defaultAttributeValues = { lookAO: [1] };
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    if (fam) {
      sh.defines = { ...sh.defines, LOOK_MICRO: "" };
      Object.assign(sh.uniforms, lookUniforms, {
        uLookMap: { value: mapOf(fam) },
        uLookTile: { value: d.tile ?? 1 },
        uLookNormal: { value: d.n ?? 0.3 },
        uLookSpread: { value: d.spread ?? 0.3 },
        uLookRMean: { value: R_MEAN[fam] },
        uLookWetK: { value: d.wet ?? 0 },
      });
    }
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_HEAD}`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${VERT_BODY}`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_HEAD}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n${FRAG_ROUGH}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${FRAG_NORMAL}`)
      .replace("#include <aomap_fragment>", `#include <aomap_fragment>\n${FRAG_AO}`);
  };
  m.customProgramCacheKey = () => `${prevKey ? prevKey() : ""}|look-${fam ?? "none"}`;
}

/**
 * The new look for a world material (no-op unless `NEXT`): roughness and metalness by its class
 * (guessed from the paint when not given), the micro-texture and the baked AO. In place; returns it.
 * Glowing materials (lamps, screens) only get the AO. `bake`: meshes drawn with it are static
 * models whose AO lookWorld.tsx StaticAO may bake (never the vehicles: their parts merge at run
 * time, vehicles/merge.ts, and every part must carry the same attributes).
 */
export function lookMat<M extends THREE.Material>(m: M, surface?: Surface, bake = false): M {
  if (!NEXT || !(m instanceof THREE.MeshStandardMaterial) || looked.has(m)) return m;
  const s = surface ?? surfaceOf(m);
  const glowing = m.emissiveIntensity > 0 && m.emissive.getHex() !== 0;
  const d = SURFACES[glowing ? "ground" : s];
  if (d.r !== undefined) m.roughness = d.r;
  if (d.m !== undefined) m.metalness = d.m;
  if (d.env !== undefined) m.envMapIntensity = d.env;
  m.userData.lookSurface = glowing ? "ground" : s;
  if (bake) m.userData.lookBake = true;
  patch(m, glowing ? "ground" : s);
  return m;
}

/** Puts the look back on a clone of a looked material (clones drop onBeforeCompile; userData survives). */
export function relook<M extends THREE.Material>(m: M): M {
  const s = m.userData?.lookSurface as Surface | undefined;
  if (NEXT && s && m instanceof THREE.MeshStandardMaterial) patch(m, s);
  return m;
}

/**
 * A clone of a world material that keeps every shader patch it had (a plain clone drops
 * onBeforeCompile): the look's, the see-through's (seeThrough.ts), a bay door's cut
 * (buildings/PitBuilding.tsx), whatever is on it. The patches only edit the shader, so the clone
 * can share them. For the baked light's per-mesh clones (bake/Baked.tsx, lookWorld.tsx), which
 * left the walls between the camera and the car solid and an open bay's door shut.
 */
export function clonePatched<M extends THREE.Material>(source: M): M {
  const m = source.clone() as M;
  if (source.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
    m.onBeforeCompile = source.onBeforeCompile;
    m.customProgramCacheKey = source.customProgramCacheKey;
    const d = (source as THREE.Material & { defaultAttributeValues?: Record<string, number[]> }).defaultAttributeValues;
    if (d) (m as THREE.Material & { defaultAttributeValues?: Record<string, number[]> }).defaultAttributeValues = d;
    if (looked.has(source)) looked.add(m);
    return m;
  }
  return relook(m);
}

/**
 * Car paint (vehicles/kit.tsx): a clearcoat over the livery's own colour and finish. The base
 * coat keeps at least 0.35 roughness so the clear coat carries the sharp reflection.
 */
export function carPaint(color: string, roughness: number, metalness: number) {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: Math.max(0.35, roughness),
    metalness,
    clearcoat: 1,
    clearcoatRoughness: 0.07,
  });
  m.userData.lookSurface = "paint";
  return m;
}

/* ------------------------------------------------------------------ baked light hook */

/** Baked maps for one static mesh: an aoMap and/or a lightMap (on `channel`'s uvs, default 1). */
export type BakedLight = { aoMap?: THREE.Texture; aoMapIntensity?: number; lightMap?: THREE.Texture; lightMapIntensity?: number; channel?: number };

/**
 * The Blender light-baking pipeline's way in (scripts/bake/*, components/world/bake/*): set
 * `bakedLight.resolve` to a function that returns the baked maps for a static mesh (or null),
 * then bump `bakedLight.version` when new bakes arrive. lookWorld.tsx `StaticAO` calls it for
 * every static looked mesh it visits (look=next only), applies what comes back on a per-mesh
 * clone of the material, and skips the per-vertex AO bake for that mesh. A lightMap replaces
 * the hemisphere fill under it, so bake with the look's light (Effects.tsx SCENES_NEXT).
 */
export const bakedLight: { resolve: ((mesh: THREE.Mesh) => BakedLight | null) | null; version: number } = { resolve: null, version: 0 };
