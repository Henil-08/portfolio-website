"use client";

// The wipe that covers a teleport, ported from folio-2025 (MIT, public/vendor/LICENSE.md),
// sources/Game/Overlay.js: a full-screen quad that fills in diagonally from one corner
// through a tiled pattern plus 45-degree strokes, 2 s in (power1.inOut), and clears from
// the other corner in 4 s. Colours are the site's ink instead of the original's aubergine.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { setState, teleport } from "./store";
import type { ZoneId } from "./layout";
import { swoosh } from "./sound";

const SHOW = 2; // s
const HIDE = 4; // s

const wipe = { progress: 0, inverted: false, from: 0, to: 0, t: 1, dur: 1, done: null as null | (() => void), busy: false };

const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2; // power1.inOut

function run(to: number, dur: number, inverted: boolean, done: () => void) {
  wipe.from = wipe.progress;
  wipe.to = to;
  wipe.t = 0;
  wipe.dur = dur;
  wipe.inverted = inverted;
  wipe.done = done;
}

/** Close the map, wipe the screen, move the car to `zone` behind it, then clear. */
export function wipeTo(zone: ZoneId) {
  setState({ menuOpen: false });
  if (wipe.busy) return;
  wipe.busy = true;
  swoosh("in");
  run(1, SHOW, false, () => {
    teleport(zone);
    swoosh("out");
    run(0, HIDE, true, () => {
      wipe.busy = false;
    });
  });
}

const vertexShader = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const fragmentShader = /* glsl */ `
uniform sampler2D uPattern;
uniform float uProgress;
uniform float uInverted;
uniform float uPatternSize;
uniform float uStroke;
uniform vec2 uRes;
uniform vec3 uA;
uniform vec3 uB;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 fc = gl_FragCoord.xy;
  float stroke = abs(mod((fc.x + fc.y) / uStroke, 1.0) - 0.5) * 2.0;
  float pattern = texture2D(uPattern, mod(fc / uPatternSize, 1.0)).a / 0.68;
  if (uInverted > 0.5) pattern = 1.0 - pattern;
  float mask = (pattern + stroke * 0.2) / 1.2;
  // from the top-left corner (screen uv with y down, as the original's screenUV)
  vec2 suv = vec2(fc.x / uRes.x, 1.0 - fc.y / uRes.y);
  float diag = length(suv) / 1.414;
  if (uInverted > 0.5) diag = 1.0 - diag;
  float p = (uProgress - diag * 0.5) * 2.0;
  if (p < mask) discard;
  float mixK = length(suv) + (hash(fc) - 0.5) * 0.2;
  gl_FragColor = vec4(mix(uA, uB, clamp(mixK, 0.0, 1.0)), 1.0);
  #include <colorspace_fragment>
}
`;

const U = {
  uPattern: { value: null as THREE.Texture | null },
  uProgress: { value: 0 },
  uInverted: { value: 0 },
  uPatternSize: { value: 200 },
  uStroke: { value: 10 },
  uRes: { value: new THREE.Vector2(1, 1) },
  uA: { value: new THREE.Color("#1f2133") },
  uB: { value: new THREE.Color("#171928") },
};

export default function Overlay() {
  const { gl, size } = useThree();
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader, fragmentShader, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, uniforms: U }),
    []
  );
  const geo = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  const mesh = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const r = gl.getPixelRatio();
    U.uRes.value.set(size.width * r, size.height * r);
    U.uPatternSize.value = 200 * r;
  }, [gl, size]);

  useEffect(() => {
    const tex = new THREE.TextureLoader().load("/vendor/overlay/overlayPattern.png");
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    U.uPattern.value = tex;
    // headless checks: window.__wipeTo("podium")
    if (process.env.NODE_ENV !== "production") (window as unknown as { __wipeTo: typeof wipeTo }).__wipeTo = wipeTo;
    return () => {
      tex.dispose();
      mat.dispose();
      geo.dispose();
    };
  }, [mat, geo]);

  useFrame((_, dt) => {
    if (wipe.t < 1) {
      wipe.t = Math.min(1, wipe.t + Math.min(dt, 0.1) / wipe.dur);
      wipe.progress = wipe.from + (wipe.to - wipe.from) * ease(wipe.t);
      if (wipe.t >= 1 && wipe.done) {
        const d = wipe.done;
        wipe.done = null;
        d();
      }
    }
    U.uProgress.value = wipe.progress;
    U.uInverted.value = wipe.inverted ? 1 : 0;
    if (mesh.current) mesh.current.visible = wipe.busy || wipe.progress > 0;
  });

  return <mesh ref={mesh} geometry={geo} material={mat} frustumCulled={false} renderOrder={99} visible={false} userData={{ noMap: true }} />;
}
