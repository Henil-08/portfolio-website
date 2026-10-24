// Adapted from folio-2025 (MIT, see public/vendor/LICENSE.md),
// sources/Game/World/Foliage.js `setMaterial` (TSL on WebGPU there; here the same
// ideas as onBeforeCompile patches on a MeshStandardMaterial for WebGLRenderer).
//
// Every foliage clump in the world is one instance of the clump geometry, drawn by
// a single mesh. Per instance: aCrown = world centre + scale, aTree = (ground y,
// roll, tint, sway), aColA / aColB = the two-tone colours.
//
// Vertex: the clump is billboarded toward whatever camera is rendering (the main
// camera, or the sun's shadow camera, so shadows are cast from full clumps), rolled
// by its own angle, pushed by the shared wind (more the higher above the ground it
// sits), and its leaf UVs spin with the wind's strength like the original's.
// Colour: mix(colorA, colorB, smoothstep(0, 1, dot(worldNormal, sunDirection))).
// Alpha: the leaf SDF texture's red channel against a threshold (0.3, like the original's).
// Received shadows are looked up a little toward the sun (the original's shadowOffset), so a
// crown doesn't speckle itself with its own shadow.
import * as THREE from "three";
import { getWindUniforms, WIND_GLSL } from "../alive/wind";
import { SEE_GLSL, SEE_VERTEX, SEE_VERTEX_GLSL, seeUniforms } from "../seeThrough";

export const foliageUniforms = {
  uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
  uThreshold: { value: 0.3 },
  uShadowOffset: { value: 0.9 },
};

let texture: THREE.Texture | null = null;

/** The original leaf SDF (public/vendor/foliage/foliageSDF.png), loaded once. */
export function foliageTexture() {
  if (!texture) {
    if (typeof document === "undefined") {
      texture = new THREE.Texture();
    } else {
      texture = new THREE.TextureLoader().load("/vendor/foliage/foliageSDF.png");
      texture.colorSpace = THREE.NoColorSpace;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    }
  }
  return texture;
}

const VERTEX_COMMON = /* glsl */ `
attribute vec4 aCrown;
attribute vec4 aTree;
attribute vec3 aColA;
attribute vec3 aColB;
${WIND_GLSL}

// Camera-facing basis (right, up, toward camera), rolled by the instance angle.
mat3 foliageBasis() {
  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 f = vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  float c = cos(aTree.y);
  float s = sin(aTree.y);
  return mat3(r * c + u * s, u * c - r * s, f);
}

// Clump centre after the wind push: grows with the height above the tree's ground.
vec3 foliageCentre(out vec2 wind) {
  vec3 p = aCrown.xyz;
  wind = windOffset(p.xz);
  float h = clamp(p.y - aTree.x, 0.0, 8.0);
  p.xz += wind * aTree.w * h;
  return p;
}
`;

const BEGIN_VERTEX = /* glsl */ `
  vec2 foliageWind;
  vec3 foliageC = foliageCentre(foliageWind);
  mat3 foliageB = foliageBasis();
  vec3 transformed = foliageC + foliageB * (position * aCrown.w);
`;

let main: THREE.MeshStandardMaterial | null = null;
let depth: THREE.MeshDepthMaterial | null = null;

/** The one foliage material (all species: colours come per instance). */
export function foliageMaterial() {
  if (main) return main;
  const tex = foliageTexture();
  // alphaMap + alphaTest are only here so three hands them to the shadow depth
  // material (the original shadow mask: SDF > 0.5). The main pass does its own test.
  main = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.9,
    metalness: 0,
    alphaMap: tex,
    alphaTest: 0.5,
    shadowSide: THREE.DoubleSide,
  });
  main.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, getWindUniforms(), foliageUniforms, seeUniforms, { uFoliageMap: { value: tex } });
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uLightDir;
        uniform float uShadowOffset;
        varying vec2 vFoliageUv;
        varying vec3 vFoliageColor;
        ${SEE_VERTEX_GLSL}
        ${VERTEX_COMMON}`
      )
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        mat3 foliageBN = foliageBasis();
        vec3 objectNormal = normalize(foliageBN * normal);
        {
          float mixStrength = smoothstep(0.0, 1.0, dot(objectNormal, uLightDir));
          vFoliageColor = mix(aColA, aColB, mixStrength) * aTree.z;
        }`
      )
      .replace(
        "#include <begin_vertex>",
        `${BEGIN_VERTEX}
        {
          // leaf cards spin with the wind, around the card centre (original: wind length * 2.2)
          float a = length(foliageWind) * 2.2;
          float c = cos(a);
          float s = sin(a);
          vec2 q = uv - 0.5;
          vFoliageUv = vec2(q.x * c - q.y * s, q.x * s + q.y * c) + 0.5;
        }`
      )
      .replace(
        "#include <worldpos_vertex>",
        /* glsl */ `#include <worldpos_vertex>
        #ifdef USE_SHADOWMAP
          worldPosition.xyz += uLightDir * uShadowOffset * aCrown.w;
        #endif`
      )
      .replace("#include <project_vertex>", `#include <project_vertex>\n${SEE_VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uFoliageMap;
        uniform float uThreshold;
        varying vec2 vFoliageUv;
        varying vec3 vFoliageColor;
        ${SEE_GLSL}`
      )
      .replace("#include <color_fragment>", "diffuseColor.rgb = vFoliageColor;")
      .replace("#include <alphamap_fragment>", "")
      .replace(
        "#include <alphatest_fragment>",
        // The original see-through: sdf * mix(threshold, 1, distanceFade) against the threshold
        /* glsl */ `if (texture2D(uFoliageMap, clamp(vFoliageUv, 0.0, 1.0)).r * mix(uThreshold, 1.0, seeFade(vViewPosition.z)) < uThreshold) discard;`
      );
  };
  main.customProgramCacheKey = () => "foliage-see";
  return main;
}

/** Shadow caster twin: same billboard + wind, faced toward the sun's camera. */
export function foliageDepthMaterial() {
  if (depth) return depth;
  depth = new THREE.MeshDepthMaterial({ alphaMap: foliageTexture(), alphaTest: 0.5 });
  depth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, getWindUniforms());
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_COMMON}`)
      .replace("#include <begin_vertex>", BEGIN_VERTEX);
  };
  depth.customProgramCacheKey = () => "foliage-depth";
  return depth;
}
