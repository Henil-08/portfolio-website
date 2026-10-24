// Adapted from folio-2025 (MIT, see public/vendor/LICENSE.md), sources/Game/Wind.js
// (strength driven like sources/Game/Weather.js `wind` property)
//
// One wind field for the whole world. Grass, foliage, flags, leaves, dust, wind
// lines and birds all read it, either through the GLSL chunk below (shared
// uniforms, so one update moves everything) or through the CPU `windAt`.
import * as THREE from "three";
import { perlinTexture, remapClamp, samplePerlin } from "./noise";
import { heightTexture } from "../terrain";
import { getState } from "../store";

const angle = Math.PI * 0.6;

export const wind = {
  angle,
  /** Unit direction in the XZ plane: (x, z). */
  direction: new THREE.Vector2(Math.sin(angle), Math.cos(angle)),
  positionFrequency: 0.5,
  /** 0.1..1, follows the slow `weather` value. */
  strength: 0.5,
  /** The original Weather.wind, 0..1. */
  weather: 0.5,
  localTime: 0,
  timeFrequency: 0.1,
  /** Seconds since the wind started (scaled 2x like the original ticker). */
  elapsed: 0,
  /** Extra strength while a gust override is on (rain/snow storms). */
  boost: 0,
};

/** Uniforms shared by every wind-driven material. Spread into a material's uniforms. */
export const windUniforms = {
  uWindDir: { value: wind.direction },
  uWindStrength: { value: wind.strength },
  uWindTime: { value: 0 },
  uWindFreq: { value: wind.positionFrequency },
  /** Scaled seconds, for flutter on top of the gusts. */
  uWindElapsed: { value: 0 },
  uPerlin: { value: null as THREE.Texture | null },
};

/** Lazily attach the perlin texture (needs `document`-free DataTexture, safe anywhere). */
export function getWindUniforms() {
  if (!windUniforms.uPerlin.value) windUniforms.uPerlin.value = perlinTexture();
  return windUniforms;
}

// The original weather noise: sin(x) * sin(1.678x) * sin(2.345x)
const weatherNoise = (x: number) => Math.sin(x) * Math.sin(x * 1.678) * Math.sin(x * 2.345);
// The original day lasts 4 minutes; its wind follows noise(dayProgress * 1).
const DAY = 4 * 60;
const START = 7.3; // start somewhere breezy

let lastFrame = -1;
let overrideValue: number | null = null;

/**
 * Advance the wind once per frame. Safe to call from several components: only the
 * first call with a given frame stamp does anything.
 * @param frame a per-frame stamp (R3F `state.clock.elapsedTime` works)
 * @param delta real seconds since last frame
 */
export function updateWind(frame: number, delta: number) {
  if (frame === lastFrame) return;
  lastFrame = frame;
  const deltaScaled = Math.min(delta, 1 / 30) * 2;
  wind.elapsed += deltaScaled;
  // Weather wind, plus a stormy boost when the race engineer sets rain or snow.
  const storm = getState().scene.weather !== "clear" ? 0.35 : 0;
  wind.boost += (storm - wind.boost) * Math.min(1, delta * 0.5);
  const base = overrideValue ?? weatherNoise(START + wind.elapsed / 2 / DAY) * 0.5 + 0.5;
  wind.weather = THREE.MathUtils.clamp(base + wind.boost, 0, 1);
  wind.strength = remapClamp(wind.weather, 0, 1, 0.1, 1);
  wind.localTime += deltaScaled * wind.timeFrequency * wind.strength;
  windUniforms.uWindStrength.value = wind.strength;
  windUniforms.uWindTime.value = wind.localTime;
  windUniforms.uWindElapsed.value = wind.elapsed % (Math.PI * 200); // wraps cleanly for integer frequencies
}

/** Force the original weather wind (0..1) for the lab or debugging. Pass null to follow the weather again. */
export function overrideWindWeather(value: number | null) {
  overrideValue = value;
}

/** CPU twin of the GLSL `windOffset`: wind push at a world XZ, written to `out` (x, z). */
export function windAt(x: number, z: number, out: THREE.Vector2) {
  const rx = x * wind.positionFrequency;
  const rz = z * wind.positionFrequency;
  const d = wind.direction;
  const n1 = samplePerlin(rx * 0.2 + d.x * wind.localTime, rz * 0.2 + d.y * wind.localTime) - 0.5;
  const n2 = samplePerlin(rx * 0.1 + d.x * wind.localTime * 0.2, rz * 0.1 + d.y * wind.localTime * 0.2) - 0.5;
  const k = (n1 + n2) * wind.strength;
  return out.set(d.x * k, d.y * k);
}

/** GLSL: `vec2 windOffset(vec2 worldXZ)`, the original Wind.offsetNode. */
export const WIND_GLSL = /* glsl */ `
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform float uWindTime;
uniform float uWindFreq;
uniform float uWindElapsed;
uniform sampler2D uPerlin;
vec2 windOffset(vec2 p) {
  vec2 rp = p * uWindFreq;
  float n1 = texture2D(uPerlin, rp * 0.2 + uWindDir * uWindTime).r - 0.5;
  float n2 = texture2D(uPerlin, rp * 0.1 + uWindDir * (uWindTime * 0.2)).r - 0.5;
  return uWindDir * (n1 + n2) * uWindStrength;
}
`;

// ---------------------------------------------------------------- terrain

type HeightTex = { texture: THREE.DataTexture; size: number; minY: number; maxY: number };

/** Terrain uniforms + define for shaders. Reads `heightTexture()` when called. */
export function terrainShader() {
  const h = heightTexture() as HeightTex | null;
  return {
    defines: h ? { USE_TERRAIN_HEIGHT: "" } : ({} as Record<string, string>),
    uniforms: {
      uHeightTex: { value: h ? h.texture : null },
      uHeightSize: { value: h ? h.size : 1 },
      uHeightMin: { value: h ? h.minY : 0 },
      uHeightMax: { value: h ? h.maxY : 0 },
      // grid vertices per side: the grid's first/last vertices sit on the extent's edges
      uHeightRes: { value: h ? (h.texture.image.width as number) : 2 },
    },
  };
}

/** GLSL: `float terrainHeight(vec2 worldXZ)`; 0 while the island is flat. */
export const TERRAIN_GLSL = /* glsl */ `
#ifdef USE_TERRAIN_HEIGHT
uniform sampler2D uHeightTex;
uniform float uHeightSize;
uniform float uHeightMin;
uniform float uHeightMax;
uniform float uHeightRes;
float terrainHeight(vec2 p) {
  vec2 g = (p / uHeightSize + 0.5) * (uHeightRes - 1.0);
  float h = texture2D(uHeightTex, (g + 0.5) / uHeightRes).r;
  return mix(uHeightMin, uHeightMax, h);
}
#else
float terrainHeight(vec2 p) { return 0.0; }
#endif
`;
