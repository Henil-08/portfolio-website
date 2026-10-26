"use client";

// The sea and the lakes: one surface at SEA_Y, coloured by how deep the water is
// over the terrain (read from the height texture), like the original ground
// gradient in folio-2025 (MIT): pale teal shallows, then deep blue-green, with a
// slow foam line where the water meets the beach. Lit like everything else, so
// it follows day and night. On top: the original teal glow along every shore (a faint
// emission at night too), two scrolling ripple layers in the normals so the sun
// glints, and a little fresnel toward grazing angles. At night every lamp by the
// water (promenade, pier, harbour lanterns, street lamps on the shore) lays a warm
// streak on the surface toward the camera, broken up by the ripples.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { C } from "./palette";
import { CANALS, LAKES, SEA_Y, canalDist, lakeDepthDist, shoreDist } from "./layout";
import { PIER_LAMP, PROM_LAMPS } from "./waterfront/layout";
import { HARBOUR } from "./districts/harbour";
import { FLOODS } from "./street/layoutStreet";
import { dayNight } from "./daynight";
import { heightTexture } from "./terrain";

const SIZE = 1400; // reaches past the fog in every direction

/** Distance from (x, z) to the nearest water edge (sea, lakes, harbour, river); negative in the water. */
function toWater(x: number, z: number) {
  return Math.min(shoreDist(x, z), ...CANALS.map((c) => -canalDist(c, x, z)), ...LAKES.map((l) => -lakeDepthDist(l, x, z)));
}

// Lamps whose light reaches the water: [x, z, strength].
const MAX_LIGHTS = 32;
const LIGHTS: [number, number, number][] = [
  ...PROM_LAMPS.map(([x, z]) => [x, z, 1] as [number, number, number]),
  [PIER_LAMP[0], PIER_LAMP[1], 1] as [number, number, number],
  ...HARBOUR.lanterns.map((m) => [m.elements[12], m.elements[14], 0.7] as [number, number, number]),
  ...FLOODS.filter((l) => toWater(l.px, l.pz) < 8).map((l) => [l.px, l.pz, 1.2] as [number, number, number]),
].slice(0, MAX_LIGHTS);

const uniforms = {
  uHeight: { value: null as THREE.Texture | null },
  uSize: { value: 1 },
  uMinY: { value: 0 },
  uMaxY: { value: 1 },
  uSeaY: { value: SEA_Y },
  uTime: { value: 0 },
  uShallow: { value: new THREE.Color("#7d9396") }, // shallows over concrete
  uMid: { value: new THREE.Color(C.water) },
  uDeep: { value: new THREE.Color(C.waterDeep) },
  uFoam: { value: new THREE.Color(C.paper) },
  uGlow: { value: new THREE.Color("#6b8a8e") }, // a cool grey-teal, Concrete & Ink
  uSky: { value: new THREE.Color("#d9dcd8") },
  uNight: { value: 0 },
  uLights: { value: Array.from({ length: MAX_LIGHTS }, (_, i) => new THREE.Vector3(...(LIGHTS[i] ?? [0, 0, 0]))) },
  uLightCount: { value: LIGHTS.length },
  uLamp: { value: new THREE.Color("#ffb867") },
};

function waterMaterial() {
  const h = heightTexture();
  uniforms.uHeight.value = h.texture;
  uniforms.uSize.value = h.size;
  uniforms.uMinY.value = h.minY;
  uniforms.uMaxY.value = h.maxY;
  {
    const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.18, metalness: 0.05 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWaterW;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWaterW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vWaterW;
          uniform sampler2D uHeight; uniform float uSize, uMinY, uMaxY, uSeaY, uTime, uNight;
          uniform vec3 uShallow, uMid, uDeep, uFoam, uGlow, uSky, uLamp;
          uniform vec3 uLights[${MAX_LIGHTS}];
          uniform int uLightCount;
          float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float wNoise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y);
          }
          // two ripple layers drifting different ways
          float wRipple(vec2 p) { return wNoise(p * 1.2 + vec2(uTime * 0.25, uTime * 0.1)) + wNoise(p * 2.9 - vec2(uTime * 0.14, -uTime * 0.22)) * 0.5; }
          float wGlow;`
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          {
            vec2 uv = vWaterW.xz / uSize + 0.5;
            float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
            float ground = uMinY + texture2D(uHeight, clamp(uv, 0.0, 1.0)).r * (uMaxY - uMinY);
            float depth = mix(3.0, uSeaY - ground, inside);
            vec3 c = mix(uShallow, uMid, smoothstep(0.05, 0.9, depth));
            c = mix(c, uDeep, smoothstep(0.9, 2.2, depth));
            // foam: a wobbling band along the shore, and a fainter second one further out
            float wob = sin(uTime * 1.3 + (vWaterW.x + vWaterW.z) * 0.6) * 0.035 + sin(uTime * 0.7 - vWaterW.x * 0.9) * 0.02;
            float foam = 1.0 - smoothstep(0.03, 0.12, depth + wob);
            float foam2 = (1.0 - smoothstep(0.0, 0.03, abs(depth - 0.32 - wob * 2.0))) * 0.35;
            // The shoreline glow: a lighter tint over the first metre or so of water
            wGlow = (1.0 - smoothstep(0.08, 0.75, depth)) * (1.0 - foam);
            c = mix(c, uGlow, wGlow * 0.55);
            c = mix(c, uFoam, clamp(foam + foam2, 0.0, 1.0));
            diffuseColor.rgb = c;
          }`
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          {
            // ripples: tilt the (view-space) normal by the ripple field's slope
            vec2 p = vWaterW.xz;
            float e = 0.15;
            float r0 = wRipple(p);
            vec2 g = vec2(wRipple(p + vec2(e, 0.0)) - r0, wRipple(p + vec2(0.0, e)) - r0) / e;
            vec3 nw = normalize(vec3(-g.x * 0.07, 1.0, -g.y * 0.07));
            normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz);
            // fresnel: a paler sky tint toward grazing angles
            float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, uSky, fr * 0.3 * (1.0 - uNight * 0.7));
          }`
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += uGlow * wGlow * (0.04 + uNight * 0.22);
          if (uNight > 0.01) {
            // lamp reflections: a streak from each lamp toward the camera, shimmering with the ripples
            float refl = 0.0;
            for (int i = 0; i < ${MAX_LIGHTS}; i++) {
              if (i >= uLightCount) break;
              vec3 L = uLights[i];
              vec2 v = vWaterW.xz - L.xy;
              if (dot(v, v) > 100.0) continue;
              vec2 toCam = normalize(cameraPosition.xz - L.xy);
              float along = dot(v, toCam);
              float across = dot(v, vec2(-toCam.y, toCam.x));
              float streak = exp(-across * across / 0.18) * exp(-along * along / 22.0) * smoothstep(-0.6, 0.4, along);
              refl += streak * L.z;
            }
            float shimmer = smoothstep(0.55, 1.05, wRipple(vWaterW.xz * 1.7));
            totalEmissiveRadiance += uLamp * refl * shimmer * uNight * 1.6;
          }`
        );
    };
    m.customProgramCacheKey = () => "water-v3";
    return m;
  }
}

export default function Water() {
  const material = useMemo(() => waterMaterial(), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uNight.value = dayNight.night;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_Y, 0]} material={material} receiveShadow>
      <planeGeometry args={[SIZE, SIZE, 1, 1]} />
    </mesh>
  );
}
