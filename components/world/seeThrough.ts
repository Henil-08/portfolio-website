// See-through round the car, after folio-2025 (MIT, see public/vendor/LICENSE.md), sources/Game/World/Foliage.js: a soft circle on screen round the car
// where whatever stands between it and the camera fades away. The original's foliage alpha is
// sdf * mix(threshold, 1, distanceFade) against the threshold, with the circle's
// edges at 3 / radius and 15 / radius of the camera distance. Solid things here
// (buildings, bridges) have no alpha, so they dither-discard instead: fully cut at
// the car, thinning out toward the circle's edge. Only fragments nearer the camera
// than the car and higher than its roof fade (so the road in front of the car never
// does); everything else stays solid. Shadows are untouched.
import * as THREE from "three";
import { carState } from "./carState";

export const seeUniforms = {
  uSeeCar: { value: new THREE.Vector2(-10, -10) }, // the car on screen, 0..1
  uSeeRes: { value: new THREE.Vector2(1, 1) }, // drawing buffer, px
  uSeeEdge: { value: new THREE.Vector2(0.1, 0.4) }, // circle edges, in screen heights
  uSeeDepth: { value: 0 }, // the car's distance in front of the camera
  uSeeY: { value: -1e4 }, // nothing lower than this fades (just over the car)
  uSeeViewInv: { value: new THREE.Matrix4() }, // camera.matrixWorld, view -> world
};

/** Vertex side: world height of each vertex, after <project_vertex> (instancing included). */
export const SEE_VERTEX_GLSL = /* glsl */ `
uniform mat4 uSeeViewInv;
varying float vSeeY;
`;
export const SEE_VERTEX = /* glsl */ `
  vSeeY = (uSeeViewInv * mvPosition).y;
`;

export const SEE_GLSL = /* glsl */ `
uniform vec2 uSeeCar;
uniform vec2 uSeeRes;
uniform vec2 uSeeEdge;
uniform float uSeeDepth;
uniform float uSeeY;
varying float vSeeY;
// 0 on the car -> 1 at the circle's edge and beyond; 1 for anything not in front of and above the car
float seeFade(float viewDepth) {
  if (viewDepth > uSeeDepth - 1.5 || vSeeY < uSeeY) return 1.0;
  vec2 d = gl_FragCoord.xy / uSeeRes - uSeeCar;
  d.x *= uSeeRes.x / uSeeRes.y;
  return smoothstep(uSeeEdge.x, uSeeEdge.y, length(d));
}
float seeBayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float seeBayer4(vec2 a) { return seeBayer2(0.5 * a) * 0.25 + seeBayer2(a); }
`;

/** Discard dithered fragments inside the circle. For materials with vViewPosition (standard, phong...). */
const SEE_DISCARD = /* glsl */ `
  {
    float seeF = seeFade(vViewPosition.z);
    if (seeF < 1.0 && seeBayer4(gl_FragCoord.xy) >= seeF) discard;
  }
`;

const patched = new WeakSet<THREE.Material>();

/** Add the see-through to a material in place, after any patch it already has. */
export function patchSeeThrough<T extends THREE.Material>(m: T): T {
  if (patched.has(m)) return m;
  patched.add(m);
  const prev = m.onBeforeCompile.bind(m);
  const prevKey = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (shader, renderer) => {
    prev(shader, renderer);
    Object.assign(shader.uniforms, seeUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${SEE_VERTEX_GLSL}`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${SEE_VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${SEE_GLSL}`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${SEE_DISCARD}`);
  };
  m.customProgramCacheKey = () => prevKey() + "|see";
  return m;
}

const clones = new Map<THREE.Material, THREE.Material>();

/** A see-through twin of a shared (cached) material, so its other users stay solid. */
export function seeThrough<T extends THREE.Material>(source: T): T {
  let m = clones.get(source) as T | undefined;
  if (!m) {
    m = patchSeeThrough(source.clone() as T);
    clones.set(source, m);
  }
  return m;
}

const v = new THREE.Vector3();
const res = new THREE.Vector2();

/** Each frame: where the car is on screen and how far, and the circle's size (the original 3/r, 15/r, scaled to buildings). */
export function updateSeeThrough(camera: THREE.Camera, gl: THREE.WebGLRenderer) {
  gl.getDrawingBufferSize(res);
  seeUniforms.uSeeRes.value.copy(res);
  seeUniforms.uSeeViewInv.value.copy(camera.matrixWorld);
  seeUniforms.uSeeY.value = carState.pos.y + 1; // a metre above the chassis: parapets at the car's own level stay solid
  v.copy(carState.pos);
  v.y += 0.4;
  const r = Math.max(1, camera.position.distanceTo(v));
  v.applyMatrix4(camera.matrixWorldInverse);
  seeUniforms.uSeeDepth.value = -v.z;
  v.applyMatrix4(camera.projectionMatrix);
  seeUniforms.uSeeCar.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
  seeUniforms.uSeeEdge.value.set(2 / r, 8.5 / r);
}
