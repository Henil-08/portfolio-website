// Soft round billboards for particles (dust, fireflies). Instanced attributes:
// aPuff = (x, y, z, size), aPuffColor = (r, g, b, alpha). One draw call per system.
import * as THREE from "three";

export function makePuffGeometry(count: number) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const puff = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  const color = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  puff.setUsage(THREE.DynamicDrawUsage);
  color.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("aPuff", puff);
  g.setAttribute("aPuffColor", color);
  g.instanceCount = 0;
  return g;
}

/**
 * @param glow additive and untouched by fog/night (fireflies); otherwise soft
 * normal-blended puffs that darken with `uDim` and take scene fog (dust).
 */
export function makePuffMaterial(glow: boolean) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: !glow,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: !glow,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uDim: { value: 1 } },
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      attribute vec4 aPuff; attribute vec4 aPuffColor;
      varying vec2 vUv; varying vec4 vColor;
      void main() {
        vUv = position.xy * 2.0;
        vColor = aPuffColor;
        vec4 mvPosition = viewMatrix * vec4(aPuff.xyz, 1.0);
        mvPosition.xy += position.xy * aPuff.w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uDim;
      varying vec2 vUv; varying vec4 vColor;
      void main() {
        float d = length(vUv);
        float a = ${glow ? "pow(max(0.0, 1.0 - d), 2.5)" : "smoothstep(1.0, 0.25, d)"} * vColor.a;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor.rgb * uDim, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}
