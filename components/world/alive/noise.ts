// Adapted from folio-2025 (MIT, see public/vendor/LICENSE.md), sources/Game/Noises.js
//
// The original renders a 128x128 tileable perlin texture on the GPU once at boot
// (perlinNode(uv, 6, 6) remapped 0.1..0.9 -> 0..1, plus a per-texel hash in G).
// We compute the very same function on the CPU instead, so the GPU texture and
// the CPU sampler (used by flags, leaves, dust, birds) agree exactly.
import * as THREE from "three";

export const NOISE_RES = 128;

const fract = (x: number) => x - Math.floor(x);
// GLSL mod
const gmod = (a: number, b: number) => a - b * Math.floor(a / b);
const modulo = (a: number, b: number) => gmod(gmod(a, b) + b, b);

/** The original `random(vec2)`: two pseudo random numbers in -1..1. */
function random(x: number, y: number, out: [number, number]) {
  const a = x * 127.1 + y * 311.7;
  const b = x * 269.5 + y * 183.3;
  out[0] = -1 + 2 * fract(Math.sin(a) * 43758.5453123);
  out[1] = -1 + 2 * fract(Math.sin(b) * 43758.5453123);
  return out;
}

/** The original `hash(vec2).x`. */
export function hash(x: number, y: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const ll: [number, number] = [0, 0];
const lr: [number, number] = [0, 0];
const ul: [number, number] = [0, 0];
const ur: [number, number] = [0, 0];

/** The original `perlinNode(uv, cellAmount, period)`. */
function perlin(u: number, v: number, cells: number, period: number) {
  const x = u * cells;
  const y = v * cells;
  const minX = modulo(Math.floor(x), period);
  const minY = modulo(Math.floor(y), period);
  const maxX = modulo(Math.ceil(x), period);
  const maxY = modulo(Math.ceil(y), period);
  const fx = fract(x);
  const fy = fract(y);
  const bx = smooth(fx);
  const by = smooth(fy);
  random(minX, minY, ll);
  random(maxX, minY, lr);
  random(minX, maxY, ul);
  random(maxX, maxY, ur);
  const a = ll[0] * fx + ll[1] * fy;
  const b = lr[0] * (fx - 1) + lr[1] * fy;
  const c = ul[0] * fx + ul[1] * (fy - 1);
  const d = ur[0] * (fx - 1) + ur[1] * (fy - 1);
  const lower = a + (b - a) * bx;
  const upper = c + (d - c) * bx;
  return (lower + (upper - lower) * by) * 0.8 + 0.5;
}

let data: Float32Array | null = null;

/** Perlin values (R channel of the original texture), row-major, NOISE_RES^2. */
export function perlinData() {
  if (!data) {
    data = new Float32Array(NOISE_RES * NOISE_RES);
    for (let j = 0; j < NOISE_RES; j++) {
      for (let i = 0; i < NOISE_RES; i++) {
        const p = perlin((i + 0.5) / NOISE_RES, (j + 0.5) / NOISE_RES, 6, 6);
        // .remap(0.1, 0.9, 0, 1), unclamped like TSL's remap
        data[j * NOISE_RES + i] = (p - 0.1) / 0.8;
      }
    }
  }
  return data;
}

let tex: THREE.DataTexture | null = null;

/** The shared tileable perlin texture: R = perlin, G = hash. Repeat wrapping, linear. */
export function perlinTexture() {
  if (!tex) {
    const d = perlinData();
    const px = new Uint8Array(NOISE_RES * NOISE_RES * 4);
    for (let j = 0; j < NOISE_RES; j++) {
      for (let i = 0; i < NOISE_RES; i++) {
        const k = j * NOISE_RES + i;
        px[k * 4] = Math.round(THREE.MathUtils.clamp(d[k], 0, 1) * 255);
        px[k * 4 + 1] = Math.round(hash(Math.floor(i) / NOISE_RES, Math.floor(j) / NOISE_RES) * 255);
        px[k * 4 + 2] = 0;
        px[k * 4 + 3] = 255;
      }
    }
    tex = new THREE.DataTexture(px, NOISE_RES, NOISE_RES, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
  }
  return tex;
}

/** CPU equivalent of `texture(perlin, uv).r` with repeat wrapping and bilinear filtering. */
export function samplePerlin(u: number, v: number) {
  const d = perlinData();
  const x = u * NOISE_RES - 0.5;
  const y = v * NOISE_RES - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const i0 = modulo(x0, NOISE_RES);
  const i1 = modulo(x0 + 1, NOISE_RES);
  const j0 = modulo(y0, NOISE_RES) * NOISE_RES;
  const j1 = modulo(y0 + 1, NOISE_RES) * NOISE_RES;
  const cl = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
  const a = cl(d[j0 + i0]);
  const b = cl(d[j0 + i1]);
  const c = cl(d[j1 + i0]);
  const e = cl(d[j1 + i1]);
  return (a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy;
}

// ---------------------------------------------------------------- helpers

/** Seeded PRNG (mulberry32), so every system's layout is stable and lint-safe. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const remapClamp = (v: number, a: number, b: number, c: number, d: number) => {
  const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1);
  return c + (d - c) * t;
};
