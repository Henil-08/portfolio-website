"use client";

// The opening, after folio-2025 (MIT, see public/vendor/LICENSE.md):
// sources/Game/Reveal.js, World/Intro.js and World/Grid.js.
//
//  1. Loading: a dark floor with a purple cross grid, and a thin glowing ring on
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

const OPEN = 5; // the original's 3.5, scaled with our bigger car
const FAR = 36;
const ZOOM_INTRO = 0.88;

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

// The original's grid (Grid.js): line sets mixed over a dark floor.
float gridLine(vec2 p, float cell, float thickness, float cross) {
  vec2 r = p / cell;
  vec2 crossGrid = step(abs(fract(r) - 0.5), vec2((1.0 - cross) * 0.5));
  float crossMask = 1.0 - mix(crossGrid.x, 1.0, crossGrid.y);
  vec2 deriv = fwidth(r);
  vec2 drawWidth = clamp(vec2(thickness), deriv, vec2(1.0));
  vec2 aa = deriv * 1.5;
  vec2 g = 1.0 - abs(fract(r) * 2.0 - 1.0);
  vec2 line = smoothstep(drawWidth + aa, drawWidth - aa, g) * clamp(vec2(thickness) / drawWidth, 0.0, 1.0);
  line = mix(line, vec2(thickness), clamp(deriv * 2.0 - 1.0, 0.0, 1.0)) * crossMask;
  return mix(line.x, 1.0, line.y);
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

  // outside: the dark floor and its grid (1 m cells marked with crosses, lines every 10 m)
  vec3 floorCol = vec3(0.0103, 0.0098, 0.0137); // #1b191f, linear
  floorCol = mix(floorCol, vec3(0.2647, 0.0908, 1.0), gridLine(ground, 1.0, 0.02, 0.2) * 0.85); // #8d55ff
  floorCol = mix(floorCol, vec3(0.1329, 0.0865, 0.1413), gridLine(ground, 10.0, 0.002, 1.0)); // #675369
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
        // the original's reveal colour and intensity, past 1 so it blooms
        ["uRing", new THREE.Uniform(new THREE.Color("#e88eff").multiplyScalar(5.5))],
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
const load = { shown: 0, ring: OPEN, label: 0 };

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
      const target = !g.ready ? Math.min(0.6, s.age / 3) : s.compiled ? 1 : 0.8;
      // the original smooths its progress at delta * 10
      load.shown += (target - load.shown) * Math.min(1, step * 10);
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
      const k = Math.min(1, s.t / 0.9);
      load.ring = OPEN * (1 - power4In(k));
      if (k >= 1) {
        load.ring = 0;
        s.stage = 1;
        s.t = 0;
      }
    } else if (s.stage === 1) {
      reveal.radius = OPEN * backOut(Math.min(1, s.t / 1.5));
      reveal.zoom = ZOOM_INTRO;
      // the label pops in a moment later (elastic.out, 2 s, after 0.6 s)
      load.label = elasticOut(Math.max(0, Math.min(1, (s.t - 0.6) / 2)));
      if (s.t > 0.6 && !g.opened) setState({ opened: true });
      if (g.phase === "world") {
        s.stage = 2;
        s.t = 0;
        revealSound();
      }
    } else if (s.stage === 2) {
      const k = Math.min(1, s.t / 2);
      reveal.radius = OPEN + (FAR - OPEN) * backIn(k);
      reveal.zoom = ZOOM_INTRO + (1 - ZOOM_INTRO) * Math.max(0, backIn(Math.min(1, s.t / 1.75), 1.5));
      load.label = 1 - power2In(Math.min(1, s.t / 0.3));
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
 * The original's "click to start" label and sound toggle (static/intro/*.png),
 * beside the circle in the world, facing the camera. Drawn as DOM over the canvas
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
        <div ref={box} style={{ transform: "scale(0)", transformOrigin: "20% 50%" }} className="pointer-events-none flex select-none flex-col items-center">
          {/* the original's labels, made white-on-transparent (they were masks) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COARSE ? "/vendor/intro/touchLabel.png" : "/vendor/intro/mouseKeyboardLabel.png"} alt={COARSE ? "Tap to start" : "Click to start"} width={300} height={150} draggable={false} />
          <button
            type="button"
            aria-label={muted ? "Sound off" : "Sound on"}
            onClick={(e) => {
              e.stopPropagation();
              setState({ muted: !muted });
            }}
            className="pointer-events-auto mt-1 ml-[88px] h-[46px] w-[58px] bg-no-repeat opacity-90 transition hover:opacity-100"
            style={{ backgroundImage: "url(/vendor/intro/sound.png)", backgroundSize: "116px 46px", backgroundPosition: muted ? "-58px 0" : "0 0" }}
          />
        </div>
      </Html>
    </group>
  );
}
