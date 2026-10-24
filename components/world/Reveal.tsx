"use client";

// The opening, after folio-2025 (MIT, see public/vendor/LICENSE.md):
// sources/Game/Reveal.js and World/Intro.js, in the site's own colours, 1.5x faster.
//
//  1. Loading: an ink floor with a soft dot grid (the site's colours), and a thin red ring on
//     the ground round the start that fills clockwise as the world gets ready.
//  2. The ring shrinks away (power4.in) and the world opens inside a circle round
//     the car (back.out). Every surface the circle cuts glows along the cut, so
//     trees and grass end in a bright cylinder wall. A "click to start" label
//     and the sound toggle pop in beside it (elastic.out).
//  3. Start: the circle dips a little, then sweeps out over the whole world
//     (back.in) while the camera eases back, with the reveal whoosh.
//
// The original discards fragments in every material; here it is one post pass
// that rebuilds each pixel's world position from the depth buffer, so it covers
// every material (custom shaders, text, instanced foliage) without touching
// them. It runs as its own pass before bloom, so only what is inside glows.
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { BlendFunction, Effect, EffectAttribute, EffectPass } from "postprocessing";
import * as THREE from "three";
import { getState, setState, useWorld } from "./store";
import { REVEAL_AT } from "./start";
import { heightAt } from "./terrain";
import { revealSound } from "./sound";

/** Shared with the camera rig: how far out the circle is and how close the camera sits. */
export const reveal = {
  radius: 0,
  zoom: 0.88, // multiplier on the chase offset; 1 = normal
  done: false,
};

/** The intro floor; Experience.tsx paints the page this colour before the canvas exists, so nothing jumps. */
export const FLOOR = "#171928";

const OPEN = 5; // the original's 3.5, scaled with our bigger car
const FAR = 36;
const ZOOM_INTRO = 0.88;
// Timings (s): the original's, 1.5x faster (owner)
const FILL = 0.55;
const SHRINK = 0.6;
const OPENING = 1.0;
const SWEEP = 1.35;

// gsap's eases, as plain functions
const backOut = (t: number, s = 1.7) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
const backIn = (t: number, s = 1.3) => (s + 1) * t ** 3 - s * t ** 2;
const power4In = (t: number) => t ** 4;
const power2In = (t: number) => t * t;
/** gsap elastic.out(1, p) */
const elasticOut = (t: number, p = 0.3) => (t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1);

const fragment = /* glsl */ `
uniform vec2 uCenter;
uniform float uRadius;
uniform float uThick;
uniform vec3 uRing;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform float uActive;
uniform float uLoader;   // loader ring radius (0 = gone)
uniform float uProgress; // 0..1 of the loader ring drawn
uniform float uGround;   // ground height at the start
uniform vec3 uFloor;
uniform vec3 uDot;
uniform vec3 uLine;
uniform float uGrid;     // 0..1 grid fade-in

// Our floor: deep ink with a timing-screen grid, soft cream dots every metre and
// faint hairlines every 10 m (the site's ink / cream / red, not the original's purple).
float dots(vec2 p, float cell, float radius) {
  vec2 q = fract(p / cell) - 0.5;
  float d = length(q) * cell;
  float aa = fwidth(d) * 1.2;
  return 1.0 - smoothstep(radius - aa, radius + aa, d);
}
float hairline(vec2 p, float cell, float width) {
  vec2 q = abs(fract(p / cell + 0.5) - 0.5) * cell;
  vec2 aa = fwidth(p) * 1.0;
  vec2 l = 1.0 - smoothstep(vec2(width) - aa, vec2(width) + aa, q);
  return max(l.x, l.y);
}

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
  // where this pixel's ray meets the ground: the grid and the loader ring live there
  vec4 n4 = uInvView * (uInvProj * vec4(ndc, -1.0, 1.0) / (uInvProj * vec4(ndc, -1.0, 1.0)).w);
  vec4 f4 = uInvView * (uInvProj * vec4(ndc, 1.0, 1.0) / (uInvProj * vec4(ndc, 1.0, 1.0)).w);
  vec3 dir = f4.xyz - n4.xyz;
  vec2 ground = n4.xz + dir.xz * ((uGround - n4.y) / dir.y);
  vec2 rel = ground - uCenter;
  float dp = length(rel);

  // outside: the ink floor and its grid, fading in on the first frames
  vec3 floorCol = uFloor;
  floorCol = mix(floorCol, uLine, hairline(ground, 10.0, 0.03) * 0.55 * uGrid);
  floorCol = mix(floorCol, uDot, dots(ground, 1.0, 0.04) * 0.32 * uGrid);
  float inside = 1.0 - step(uRadius, d);
  vec3 c = mix(floorCol, inputColor.rgb, inside);

  // the cut: every surface within uThick of the circle glows (a cylinder of light)
  float cut = inside * step(uRadius - uThick, d);
  c = mix(c, uRing, cut);

  // loader: an arc on the ground that fills clockwise from the top of the screen
  if (uLoader > 0.0) {
    float band = step(uLoader - uThick * 0.8, dp) * (1.0 - step(uLoader, dp));
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
        ["uThick", new THREE.Uniform(0.08)],
        // the site's racing red, past 1 so it blooms
        ["uRing", new THREE.Uniform(new THREE.Color("#ff4b3e").multiplyScalar(4.5))],
        ["uFloor", new THREE.Uniform(new THREE.Color(FLOOR))],
        ["uDot", new THREE.Uniform(new THREE.Color("#fff8ec"))],
        ["uLine", new THREE.Uniform(new THREE.Color("#4a4d63"))],
        ["uGrid", new THREE.Uniform(0)],
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

/** Loader and label state, shared between the driver, the pass and the label. */
const load = { shown: 0, ring: OPEN, label: 0, grid: 0 };

/**
 * Mount inside <EffectComposer> after AO and before bloom. It is handed over as a
 * Pass (not an Effect) so the composer keeps it apart: bloom then reads the
 * revealed image and nothing outside the circle glows through.
 */
export function RevealPass() {
  const { camera } = useThree();
  const effect = useMemo(() => new RevealEffect(), []);
  const pass = useMemo(() => new EffectPass(camera, effect), [camera, effect]);
  useEffect(
    () => () => {
      pass.dispose();
      effect.dispose();
    },
    [pass, effect],
  );
  useFrame(() => {
    const u = effect.uniforms;
    u.get("uRadius")!.value = reveal.radius;
    u.get("uActive")!.value = reveal.done ? 0 : 1;
    u.get("uLoader")!.value = load.ring;
    u.get("uProgress")!.value = load.shown;
    u.get("uGrid")!.value = load.grid;
    (u.get("uInvProj")!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.get("uInvView")!.value as THREE.Matrix4).copy(camera.matrixWorld);
  });
  return <primitive object={pass} dispose={null} />;
}

/**
 * Drives the opening: -1 loading (ring fills) -> 0 ring shrinks -> 1 circle open
 * (label, waiting for start) -> 2 sweep out on start.
 */
export function RevealDriver() {
  const { gl, scene, camera } = useThree();
  const st = useRef({ stage: -1, t: 0, fast: false, age: 0, compiled: false, compiling: false });
  useEffect(() => {
    st.current.fast = new URLSearchParams(window.location.search).has("skip");
  }, []);
  useFrame((_, dt) => {
    const s = st.current;
    if (reveal.done) return;
    const g = getState();
    // ?skip (dev and headless checks): no opening at all
    if (s.fast && g.ready) {
      load.ring = 0;
      reveal.radius = FAR;
      reveal.zoom = 1;
      reveal.done = true;
      setState({ opened: true, revealed: true });
      return;
    }
    const step = Math.min(dt, 1 / 30);
    s.age += dt;

    if (s.stage === -1) {
      // compile every material up front, not mid-reveal
      if (g.ready && !s.compiling) {
        s.compiling = true;
        gl.compileAsync(scene, camera).then(
          () => (s.compiled = true),
          () => (s.compiled = true),
        );
      }
      const target = !g.ready ? Math.min(0.6, s.age / 2) : s.compiled ? 1 : 0.8;
      // smoothed like the original (delta * 10), but never faster than a full ring
      // in FILL seconds, so it is always seen drawing, even after a long first frame
      load.grid = Math.min(1, load.grid + step / 0.35);
      load.shown = Math.min(load.shown + step / FILL, load.shown + (target - load.shown) * Math.min(1, step * 10));
      if (s.compiled && load.shown > 0.99) {
        load.shown = 1;
        s.stage = 0;
        s.t = 0;
      }
      return;
    }

    s.t += step;
    if (s.stage === 0) {
      // the loader ring shrinks into the start, then the circle opens
      const k = Math.min(1, s.t / SHRINK);
      load.ring = OPEN * (1 - power4In(k));
      if (k >= 1) {
        load.ring = 0;
        s.stage = 1;
        s.t = 0;
      }
    } else if (s.stage === 1) {
      reveal.radius = OPEN * backOut(Math.min(1, s.t / OPENING));
      reveal.zoom = ZOOM_INTRO;
      // the label pops in a moment later (elastic.out)
      load.label = elasticOut(Math.max(0, Math.min(1, (s.t - 0.4) / 1.35)));
      if (s.t > 0.4 && !g.opened) setState({ opened: true });
      if (g.phase === "world") {
        s.stage = 2;
        s.t = 0;
        revealSound();
      }
    } else if (s.stage === 2) {
      const k = Math.min(1, s.t / SWEEP);
      reveal.radius = OPEN + (FAR - OPEN) * backIn(k);
      reveal.zoom = ZOOM_INTRO + (1 - ZOOM_INTRO) * Math.max(0, backIn(Math.min(1, s.t / (SWEEP * 0.875)), 1.5));
      load.label = 1 - power2In(Math.min(1, s.t / 0.2));
      if (k >= 1) {
        reveal.done = true;
        reveal.zoom = 1;
        load.label = 0;
        setState({ revealed: true });
      }
    }
  });
  return null;
}

const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * The start label and sound toggle, in the site's own type (Geist Mono, cream),
 * beside the circle in the world. Drawn as DOM over the canvas
 * (drei Html) so the reveal pass doesn't paint the grid over it.
 */
export function IntroLabel() {
  const muted = useWorld((s) => s.muted);
  const opened = useWorld((s) => s.opened);
  const revealed = useWorld((s) => s.revealed);
  const group = useRef<THREE.Group>(null);
  const box = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const right = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // to the right of the circle on screen, a little above the ground
    right.set(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize();
    g.position.set(REVEAL_AT[0] + right.x * (OPEN + 1.4), heightAt(REVEAL_AT[0], REVEAL_AT[1]) + 2.2, REVEAL_AT[1] + right.z * (OPEN + 1.4));
    if (box.current) box.current.style.transform = `scale(${Math.max(0, load.label)})`;
  });
  if (revealed || !opened) return null;
  return (
    <group ref={group}>
      <Html center zIndexRange={[60, 60]}>
        <div ref={box} style={{ transform: "scale(0)", transformOrigin: "0% 50%" }} className="pointer-events-none flex select-none items-center gap-3 text-[#fff8ec]">
          <svg width="54" height="22" viewBox="0 0 54 22" fill="none" aria-hidden className="opacity-80">
            <path d="M53 4C38 2 20 4 6 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 8l1 7.5 7.5-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex flex-col items-start gap-2">
            <p className="whitespace-nowrap font-mono text-[13px] uppercase leading-none tracking-[0.3em]">{COARSE ? "Tap to start" : "Click to start"}</p>
            <button
              type="button"
              aria-label={muted ? "Sound off" : "Sound on"}
              onClick={(e) => {
                e.stopPropagation();
                setState({ muted: !muted });
              }}
              className="pointer-events-auto flex items-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.25em] text-[#fff8ec]/60 transition hover:text-[#fff8ec]"
            >
              <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden>
                <path d="M1.5 5h2.5L8 1.8v10.4L4 9H1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                {muted ? <path d="M11 4.5l4 5m0-5l-4 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /> : <path d="M11 4.2c1.2 1.6 1.2 4 0 5.6M13.2 2.6c2.1 2.6 2.1 6.2 0 8.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
              </svg>
              {muted ? "Sound off" : "Sound on"}
            </button>
          </div>
        </div>
      </Html>
    </group>
  );
}
