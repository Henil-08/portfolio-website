// Anti-aliased wire for alpha-tested mesh panels (the debris fence, the kit's wire panels;
// docs/research/performance.md, "Shimmer"). A plain alpha test cuts each wire on or off per pixel,
// and wires a pixel wide or less crawl and sparkle as the camera moves. Here the same cut, at the
// same threshold, is spread over one pixel of the alpha's own screen gradient and the edge
// blends, so the wires stand where they stood, without the crawl. Where the wires come closer
// together on screen than a few pixels (far off, or edge-on along a straight) no cut can hold
// still, so the panel fades to the wires' average cover: a steady tinted screen, no moire.
import * as THREE from "three";

/** 1: the soft cut; 0: the plain alpha test (dev A/B: window.__wireAA.value). */
export const wireUniform = { value: 1 };
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __wireAA: typeof wireUniform }).__wireAA = wireUniform;

export function wireAA<T extends THREE.Material & { alphaTest: number }>(m: T, key: string): T {
  m.transparent = true; // the soft edge blends; full-cover texels stay opaque and write depth
  // the bars only repeat across (u); a grid or a weave both ways
  const across = key === "bars";
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWireAA = wireUniform;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uWireAA;").replace(
      "#include <alphatest_fragment>",
      `#ifdef USE_ALPHATEST
      {
        float a = diffuseColor.a;
        float soft = clamp((a - alphaTest) / max(fwidth(a), 1e-4) + 0.5, 0.0, 1.0);
        float cut = mix(step(alphaTest, a), soft, uWireAA);
        #ifdef USE_ALPHAMAP
        // Wires closer together than a few pixels (far off, or seen edge-on along a straight)
        // can't be drawn wire by wire: cut one by one they beat against the pixel grid in moire
        // bands that crawl with the slightest move. There the panel takes the wires' average
        // cover (the texture's last mip), as a fine mesh reads from afar: a steady tinted screen,
        // a half heavier than the true cover, as the wires read when each is still drawn a pixel wide.
        vec2 ux = dFdx(vAlphaMapUv);
        vec2 uy = dFdy(vAlphaMapUv);
        float cells = ${across ? "length(vec2(ux.x, uy.x))" : "max(length(ux), length(uy))"};
        float fine = smoothstep(0.2, 0.4, cells) * uWireAA;
        cut = mix(cut, min(1.0, texture2D(alphaMap, vAlphaMapUv, 16.0).g * 1.5) * opacity, fine);
        #endif
        diffuseColor.a = cut;
        if (diffuseColor.a < 0.002) discard;
      }
      #endif`,
    );
  };
  m.customProgramCacheKey = () => `wire-aa2-${key}`;
  return m;
}
