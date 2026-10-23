"use client";

// The opening reveal, after Bruno Simon's folio-2025 (MIT, (c) 2025 Bruno Simon),
// sources/Game/Reveal.js: the world exists only inside a circle round the start,
// with a thin glowing ring on its edge and the dark aubergine of his panels
// outside. While the start prompt is up the circle sits at 3.5 m round the car
// (back.out, 2 s) with the camera pulled in; on start it sweeps out to 30 m
// (back.in, 2 s) while the camera eases back to the chase view.
//
// Bruno discards fragments in every material. Here it is one post effect that
// rebuilds each pixel's world position from the depth buffer, so it covers every
// material (custom shaders, text, instanced foliage) without touching them.
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import * as THREE from "three";
import { getState, setState } from "./store";
import { SPAWN } from "./layout";

/** Shared with the camera rig: how far out the circle is and how close the camera sits. */
export const reveal = {
  radius: 0,
  zoom: 0.5, // multiplier on the chase offset; 1 = normal
  done: false,
};

const OPEN = 3.5;
const FAR = 30;

// gsap's eases, as plain functions
const backOut = (t: number, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
const backIn = (t: number, s = 1.3) => (s + 1) * t ** 3 - s * t ** 2;

const fragment = /* glsl */ `
uniform vec2 uCenter;
uniform float uRadius;
uniform float uThick;
uniform vec3 uRing;
uniform vec3 uBg;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform float uActive;

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (uActive < 0.5) { outputColor = inputColor; return; }
  float d = 1e9;
  if (depth < 0.99999) {
    vec4 view = uInvProj * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    view /= view.w;
    vec3 world = (uInvView * view).xyz;
    d = length(world.xz - uCenter);
  }
  // a soft corner-to-corner wash outside, like Bruno's panels
  vec3 bg = mix(uBg * 1.25, uBg, smoothstep(0.0, 1.4, length(uv - vec2(0.2, 0.8))));
  float inside = 1.0 - step(uRadius, d);
  float ring = inside * step(uRadius - uThick, d);
  vec3 c = mix(bg, inputColor.rgb, inside);
  c = mix(c, uRing, ring);
  outputColor = vec4(c, inputColor.a);
}
`;

class RevealEffect extends Effect {
  constructor() {
    super("RevealEffect", fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["uCenter", new THREE.Uniform(new THREE.Vector2(SPAWN[0], SPAWN[1]))],
        ["uRadius", new THREE.Uniform(0)],
        ["uThick", new THREE.Uniform(0.06)],
        // Bruno's reveal colour, pushed past 1 so the ring blooms
        ["uRing", new THREE.Uniform(new THREE.Color("#e88eff").multiplyScalar(5.5))],
        ["uBg", new THREE.Uniform(new THREE.Color("#1d1721"))],
        ["uInvProj", new THREE.Uniform(new THREE.Matrix4())],
        ["uInvView", new THREE.Uniform(new THREE.Matrix4())],
        ["uActive", new THREE.Uniform(1)],
      ]),
    });
  }
}

/** Mount inside <EffectComposer>, first, so the ring blooms and AO never shows outside. */
export function RevealPass() {
  const effect = useMemo(() => new RevealEffect(), []);
  const { camera } = useThree();
  useEffect(() => () => effect.dispose(), [effect]);
  useFrame(() => {
    const u = effect.uniforms;
    u.get("uRadius")!.value = reveal.radius;
    u.get("uActive")!.value = reveal.done ? 0 : 1;
    (u.get("uInvProj")!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.get("uInvView")!.value as THREE.Matrix4).copy(camera.matrixWorld);
  });
  return <primitive object={effect} dispose={null} />;
}

/** Drives the reveal from the store: ready -> open the small circle; world -> sweep out. */
const st = { stage: -1, t: 0, fast: false };

export function RevealDriver() {
  useEffect(() => {
    st.fast = new URLSearchParams(window.location.search).has("skip");
  }, []);
  useFrame((_, dt) => {
    if (reveal.done) return;
    const s = getState();
    const speed = st.fast ? 4 : 1;
    if (st.stage < 0 && s.ready) {
      st.stage = 0;
      st.t = 0;
    }
    if (st.stage === 0 && s.phase === "world") {
      st.stage = 1;
      st.t = 0;
    }
    st.t += dt * speed;
    if (st.stage === 0) {
      const k = Math.min(1, st.t / 2);
      reveal.radius = OPEN * backOut(k);
      reveal.zoom = 0.5;
    } else if (st.stage === 1) {
      const k = Math.min(1, st.t / 2);
      reveal.radius = OPEN + (FAR - OPEN) * Math.max(0, backIn(k));
      const kz = Math.min(1, st.t / 1.75);
      reveal.zoom = 0.5 + (1 - 0.5) * Math.max(0, Math.min(1, backIn(kz, 1.5)));
      if (k >= 1 && kz >= 1) {
        reveal.done = true;
        reveal.zoom = 1;
        setState({ revealed: true });
      }
    }
  });
  return null;
}
