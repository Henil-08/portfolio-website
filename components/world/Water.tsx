"use client";

// The sea and the lakes: one surface at SEA_Y, coloured by how deep the water is
// over the terrain (read from the height texture), like Bruno Simon's ground
// gradient in folio-2025 (MIT): pale teal shallows, then deep blue-green, with a
// slow foam line where the water meets the beach. Lit like everything else, so
// it follows day and night.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { C } from "./palette";
import { SEA_Y } from "./layout";
import { heightTexture } from "./terrain";

const SIZE = 1400; // reaches past the fog in every direction

const uniforms = {
  uHeight: { value: null as THREE.Texture | null },
  uSize: { value: 1 },
  uMinY: { value: 0 },
  uMaxY: { value: 1 },
  uSeaY: { value: SEA_Y },
  uTime: { value: 0 },
  uShallow: { value: new THREE.Color("#8fc4bb") },
  uMid: { value: new THREE.Color(C.water) },
  uDeep: { value: new THREE.Color(C.waterDeep) },
  uFoam: { value: new THREE.Color("#f4efe4") },
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
          uniform sampler2D uHeight; uniform float uSize, uMinY, uMaxY, uSeaY, uTime;
          uniform vec3 uShallow, uMid, uDeep, uFoam;`
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
            c = mix(c, uFoam, clamp(foam + foam2, 0.0, 1.0));
            diffuseColor.rgb = c;
          }`
        );
    };
    m.customProgramCacheKey = () => "water-v1";
    return m;
  }
}

export default function Water() {
  const material = useMemo(() => waterMaterial(), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_Y, 0]} material={material} receiveShadow>
      <planeGeometry args={[SIZE, SIZE, 1, 1]} />
    </mesh>
  );
}
