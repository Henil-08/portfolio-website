// Tinted shadows, after folio-2025 (MIT, public/vendor/LICENSE.md), Materials/MeshDefaultMaterial.js:
// the original never lets a shadow go grey; shadowed albedo is multiplied by a violet
// shadow colour (#6d3fff by day, #2f00db at night). Here it is one patch of three's shared
// shader chunks, so every lit material (standard, physical, lambert, our patched ones)
// gets it without touching them: the sun's shadow-map term is kept as `tsShadow` while
// lighting, and the final colour is pulled toward a violet-tinted copy where it is low.
// Import once, before anything compiles.
import * as THREE from "three";

const PATCHED = "/* tinted-shadows */";
const DIR_SHADOW =
  "directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;";

/** How violet a shadow turns: the multiplier on the shadowed colour, and how much of it. */
const TINT = "vec3( 0.80, 0.72, 1.28 )";
const AMOUNT = "0.8";

if (!THREE.ShaderChunk.lights_fragment_begin.includes(PATCHED) && THREE.ShaderChunk.lights_fragment_begin.includes(DIR_SHADOW)) {
  THREE.ShaderChunk.lights_fragment_begin =
    `${PATCHED}\n#define TS_SHADOW\nfloat tsShadow = 1.0;\n` +
    THREE.ShaderChunk.lights_fragment_begin.replace(
      DIR_SHADOW,
      DIR_SHADOW.replace("directLight.color *= ", "float tsS = ").replace(/;$/, ";") + "\n\t\ttsShadow = min( tsShadow, tsS );\n\t\tdirectLight.color *= tsS;"
    );
  THREE.ShaderChunk.opaque_fragment =
    `#ifdef TS_SHADOW\noutgoingLight = mix( outgoingLight, outgoingLight * ${TINT}, ( 1.0 - tsShadow ) * ${AMOUNT} );\n#endif\n` + THREE.ShaderChunk.opaque_fragment;
}

export {};
