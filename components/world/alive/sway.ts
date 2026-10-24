// Adapted from folio-2025 (MIT, see public/vendor/LICENSE.md),
// sources/Game/World/Flowers.js and sources/Game/World/Foliage.js
//
// The original moves foliage with `positionLocal + vec3(wind.x, 0, wind.y) * height`
// (flowers) and spins each leaf card's alpha by the wind's length (trees and
// bushes). Our trees are solid ellipsoids, so we keep the first idea for every
// foliage material: displace vertices by the shared wind field, weighted by
// their height above the ground, plus a small leaf flutter scaled by the wind's
// length. With no wind the geometry is untouched, so the look at rest is the same.
import * as THREE from "three";
import { getWindUniforms, terrainShader, TERRAIN_GLSL, WIND_GLSL } from "./wind";

const cache = new Map<string, THREE.Material>();

export type SwayOpts = {
  /** metres of push per metre of height at full wind (default 0.12) */
  amount?: number;
  /** leaf flutter in metres at full wind (default 0.02) */
  flutter?: number;
  /** height (m) above which the push stops growing (default 6) */
  maxHeight?: number;
};

/**
 * A wind-swaying twin of a (cached) MeshStandardMaterial. Same colour, roughness
 * and everything else; only the vertex positions move. Cached per source + options.
 */
export function withWind<T extends THREE.MeshStandardMaterial>(source: T, o: SwayOpts = {}): T {
  const amount = o.amount ?? 0.12;
  const flutter = o.flutter ?? 0.02;
  const maxHeight = o.maxHeight ?? 6;
  const key = `${source.uuid}:${amount}:${flutter}:${maxHeight}`;
  let m = cache.get(key) as T | undefined;
  if (m) return m;
  m = source.clone() as T;
  const terrain = terrainShader();
  const u = {
    uSwayAmount: { value: amount },
    uSwayFlutter: { value: flutter },
    uSwayMaxHeight: { value: maxHeight },
    ...terrain.uniforms,
  };
  m.defines = { ...(m.defines ?? {}), ...terrain.defines };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, getWindUniforms());
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uSwayAmount; uniform float uSwayFlutter; uniform float uSwayMaxHeight;
        ${WIND_GLSL}
        ${TERRAIN_GLSL}`
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        {
          mat4 swayModel = modelMatrix;
          #ifdef USE_INSTANCING
            swayModel = modelMatrix * instanceMatrix;
          #endif
          vec4 swayWorld = swayModel * vec4(transformed, 1.0);
          float swayHeight = clamp(swayWorld.y - terrainHeight(swayWorld.xz), 0.0, uSwayMaxHeight);
          vec2 swayWind = windOffset(swayWorld.xz);
          vec2 swayOffset = swayWind * uSwayAmount * swayHeight;
          // flutter: quick small shiver, stronger in strong wind, phase from position
          float swayPhase = dot(swayWorld.xyz, vec3(1.7, 2.3, 1.3));
          float swayShiver = sin(uWindElapsed * 9.0 + swayPhase) * length(swayWind) * 2.0;
          vec3 swayWorldOffset = vec3(swayOffset.x, 0.0, swayOffset.y)
            + vec3(uWindDir.x, 0.4, uWindDir.y) * swayShiver * uSwayFlutter * min(swayHeight, 1.0);
          transformed += inverse(mat3(swayModel)) * swayWorldOffset;
        }`
      );
  };
  m.customProgramCacheKey = () => `${source.customProgramCacheKey()}|wind-sway`;
  cache.set(key, m);
  return m;
}
