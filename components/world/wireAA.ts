// Anti-aliased wire for alpha-tested mesh panels (the debris fence, the kit's wire panels;
// docs/research/performance.md, "Shimmer"). A plain alpha test cuts each wire on or off per pixel,
// and wires a pixel wide or less crawl and sparkle as the camera moves. Here the same cut, at the
// same threshold, is spread over one pixel of the alpha's own screen gradient and the edge
// blends, so the wires stand where they stood and still fade out at the same distance (the mip's
// averaged alpha drops under the threshold there exactly as before), without the crawl.
import * as THREE from "three";

/** 1: the soft cut; 0: the plain alpha test (dev A/B: window.__wireAA.value). */
export const wireUniform = { value: 1 };
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __wireAA: typeof wireUniform }).__wireAA = wireUniform;

export function wireAA<T extends THREE.Material & { alphaTest: number }>(m: T, key: string): T {
  m.transparent = true; // the soft edge blends; full-cover texels stay opaque and write depth
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWireAA = wireUniform;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uWireAA;").replace(
      "#include <alphatest_fragment>",
      `#ifdef USE_ALPHATEST
      {
        float a = diffuseColor.a;
        float soft = clamp((a - alphaTest) / max(fwidth(a), 1e-4) + 0.5, 0.0, 1.0);
        diffuseColor.a = mix(step(alphaTest, a), soft, uWireAA);
        if (diffuseColor.a < 0.002) discard;
      }
      #endif`,
    );
  };
  m.customProgramCacheKey = () => `wire-aa-${key}`;
  return m;
}
