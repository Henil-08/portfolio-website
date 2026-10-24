"use client";

// The opening. While the world loads, nothing shows but a thin glowing ring on
// the ground round the start that fills clockwise as it gets ready (assets,
// shader compiles, then a run of steady frames, so the reveal never stutters).
// Full, the ring shrinks away and the world opens in a small circle round the
// car (back.out, 2 s); on start the circle sweeps out (back.in, 2 s).
//
// It is one post effect that rebuilds each pixel's world position from the depth
// buffer, so it covers every material (custom shaders, text, instanced foliage)
// without touching them.
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, Effect, EffectAttribute, type BloomEffect } from "postprocessing";
import * as THREE from "three";
import { getState, setState } from "./store";
import { REVEAL_AT } from "./start";
import { heightAt } from "./terrain";

/** Shared with the camera rig: how far out the circle is and how close the camera sits. */
export const reveal = {
  radius: 0,
  zoom: 1, // multiplier on the chase offset; 1 = normal
  done: false,
};

const OPEN = 5;
const BLOOM = 0.55; // World.tsx's bloom strength once the world is open

/** Bloom off during the opening (kept out of the hook for the React Compiler). */
function setBloom(list: RefObject<BloomEffect | null>[], v: number) {
  for (const r of list) if (r.current && r.current.intensity !== v) r.current.intensity = v;
}
const FAR = 34;
const STEADY = 24; // frames under FRAME_OK in a row before the ring completes
const FRAME_OK = 1 / 24;

// gsap's eases, as plain functions
const backOut = (t: number, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
const backIn = (t: number, s = 1.3) => (s + 1) * t ** 3 - s * t ** 2;
const power4In = (t: number) => t ** 4;

const fragment = /* glsl */ `
uniform vec2 uCenter;
uniform float uRadius;
uniform float uThick;
uniform vec3 uRing;
uniform vec3 uRingSoft;
uniform vec3 uBg;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform float uActive;
uniform float uLoader;   // loader ring radius (0 = gone)
uniform float uProgress; // 0..1 of the loader ring drawn
uniform float uGround;   // ground height at the start

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (uActive < 0.5) { outputColor = inputColor; return; }
  vec2 ndc = uv * 2.0 - 1.0;
  float d = 1e9;
  if (depth < 0.99999) {
    vec4 view = uInvProj * vec4(ndc, depth * 2.0 - 1.0, 1.0);
    view /= view.w;
    vec3 world = (uInvView * view).xyz;
    d = length(world.xz - uCenter);
  }
  // where this pixel's ray meets the ground plane: the rings trace that, so grass
  // and crowns never break them up
  vec4 n4 = uInvView * (uInvProj * vec4(ndc, -1.0, 1.0) / (uInvProj * vec4(ndc, -1.0, 1.0)).w);
  vec4 f4 = uInvView * (uInvProj * vec4(ndc, 1.0, 1.0) / (uInvProj * vec4(ndc, 1.0, 1.0)).w);
  vec3 dir = f4.xyz - n4.xyz;
  vec2 rel = n4.xz + dir.xz * ((uGround - n4.y) / dir.y) - uCenter;
  float dp = length(rel);
  // a soft corner-to-corner wash outside, like the UI panels
  vec3 bg = mix(uBg * 1.25, uBg, smoothstep(0.0, 1.4, length(uv - vec2(0.2, 0.8))));
  float inside = 1.0 - step(uRadius, d);
  vec3 c = mix(bg, inputColor.rgb, inside);
  // the circle's glowing edge, only where nothing inside the circle covers it
  float edge = step(uRadius - uThick, dp) * (1.0 - step(uRadius, dp)) * step(uRadius - uThick, d);
  c = mix(c, uRing, edge * step(0.01, uRadius));
  // soft halo either side of the rings (they come after bloom)
  float halo = step(0.01, uRadius) * exp(-abs(dp - uRadius + uThick * 0.5) * 9.0);
  if (uLoader > 0.0) halo = max(halo, exp(-abs(dp - uLoader + uThick * 0.5) * 9.0) * step(fract(atan(rel.x, -rel.y) / 6.2831853 + 0.375), uProgress));
  c += uRingSoft * halo;
  // loader: an arc that fills clockwise from the top of the screen
  if (uLoader > 0.0) {
    float band = step(uLoader - uThick, dp) * (1.0 - step(uLoader, dp));
    float a = fract(atan(rel.x, -rel.y) / 6.2831853 + 0.375);
    c = mix(c, uRing, band * step(a, uProgress));
  }
  outputColor = vec4(c, inputColor.a);
}
`;

class RevealEffect extends Effect {
  constructor() {
    super("RevealEffect", fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["uCenter", new THREE.Uniform(new THREE.Vector2(REVEAL_AT[0], REVEAL_AT[1]))],
        ["uRadius", new THREE.Uniform(0)],
        ["uThick", new THREE.Uniform(0.06)],
        ["uRing", new THREE.Uniform(new THREE.Color("#f6dcff"))],
        ["uRingSoft", new THREE.Uniform(new THREE.Color("#e88eff").multiplyScalar(0.35))],
        ["uBg", new THREE.Uniform(new THREE.Color("#1d1721"))],
        ["uInvProj", new THREE.Uniform(new THREE.Matrix4())],
        ["uInvView", new THREE.Uniform(new THREE.Matrix4())],
        ["uActive", new THREE.Uniform(1)],
        ["uLoader", new THREE.Uniform(OPEN)],
        ["uProgress", new THREE.Uniform(0)],
        ["uGround", new THREE.Uniform(heightAt(REVEAL_AT[0], REVEAL_AT[1]))],
      ]),
    });
  }
}

/** Loader state, shared between the driver and the pass. */
const load = { progress: 0, shown: 0, ring: OPEN };

/** Mount inside <EffectComposer> after AO and bloom, so nothing outside the circle shows or glows through. */
export function RevealPass() {
  const effect = useMemo(() => new RevealEffect(), []);
  const { camera } = useThree();
  useEffect(() => () => effect.dispose(), [effect]);
  useFrame(() => {
    const u = effect.uniforms;
    u.get("uRadius")!.value = reveal.radius;
    u.get("uActive")!.value = reveal.done ? 0 : 1;
    u.get("uLoader")!.value = load.ring;
    u.get("uProgress")!.value = load.shown;
    (u.get("uInvProj")!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.get("uInvView")!.value as THREE.Matrix4).copy(camera.matrixWorld);
  });
  return <primitive object={effect} dispose={null} />;
}

/**
 * Drives the opening: -1 loading (ring fills) -> 0 ring shrinks -> 1 small circle
 * open (start prompt) -> 2 sweep out on start.
 */
export function RevealDriver({ blooms = [] }: { blooms?: RefObject<BloomEffect | null>[] }) {
  const { gl, scene, camera } = useThree();
  const st = useRef({ stage: -1, t: 0, fast: false, age: 0, compiled: false, compiling: false, steady: 0 });
  useEffect(() => {
    st.current.fast = new URLSearchParams(window.location.search).has("skip");
  }, []);
  useFrame((_, dt) => {
    const s = st.current;
    setBloom(blooms, reveal.done ? BLOOM : 0);
    if (reveal.done) return;
    const g = getState();
    // ?skip (dev and headless checks): no opening at all
    if (s.fast && g.ready) {
      load.ring = 0;
      reveal.radius = FAR;
      reveal.done = true;
      setState({ opened: true, revealed: true });
      return;
    }
    const speed = s.fast ? 4 : 1;
    s.age += dt;

    if (s.stage === -1) {
      // Warm up once the scene is mounted: compile every material now, not mid-reveal.
      if (g.ready && !s.compiling) {
        s.compiling = true;
        gl.compileAsync(scene, camera).then(
          () => (s.compiled = true),
          () => (s.compiled = true),
        );
      }
      if (s.compiled) s.steady = dt < FRAME_OK ? s.steady + 1 : 0;
      // headless and slow machines never get steady frames: give up waiting after a while
      const settled = s.steady >= STEADY || (s.compiled && s.age > 14);
      const target = !g.ready ? Math.min(0.55, s.age / 10) : !s.compiled ? 0.7 : settled ? 1 : 0.7 + 0.3 * Math.min(1, s.steady / STEADY);
      load.progress = target;
      load.shown += (load.progress - load.shown) * Math.min(1, dt * 4 * speed);
      if (settled && load.shown > 0.995) {
        load.shown = 1;
        s.stage = 0;
        s.t = 0;
      }
      return;
    }

    s.t += Math.min(dt, 1 / 30) * speed;
    if (s.stage === 0) {
      // the loader ring shrinks into the start (power4.in, 1.5 s), then the circle opens
      const k = Math.min(1, s.t / 1.5);
      load.ring = OPEN * (1 - power4In(k));
      if (k >= 1) {
        load.ring = 0;
        s.stage = 1;
        s.t = 0;
      }
    } else if (s.stage === 1) {
      const k = Math.min(1, s.t / 2);
      reveal.radius = OPEN * backOut(k);
      if (k > 0.5 && !g.opened) setState({ opened: true });
      if (g.phase === "world") {
        s.stage = 2;
        s.t = 0;
      }
    } else if (s.stage === 2) {
      const k = Math.min(1, s.t / 2);
      reveal.radius = OPEN + (FAR - OPEN) * Math.max(0, backIn(k));
      if (k >= 1) {
        reveal.done = true;
        setState({ revealed: true });
      }
    }
  });
  return null;
}
