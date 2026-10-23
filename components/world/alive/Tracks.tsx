// Adapted from Bruno Simon's folio-2025 (MIT, (c) 2025 Bruno Simon), sources/Game/Tracks.js
// (used by sources/Game/World/VisualVehicle.js and sources/Game/Terrain.js)
//
// Each wheel drags a 128-sample ribbon behind it. Every frame the ribbons are drawn
// additively into a small top-down render target (40 m, 512 px) centred on the
// car; the grass reads it and lies down where the wheels have been.
// Differences from Bruno: WebGL instead of WebGPU, so the four wheel ribbons share
// one mesh (one draw call), the ribbon vertices are built on the CPU from the
// trail samples (same maths as his vertex node), and we project to the target in the vertex shader
// instead of with an orthographic camera (WebGL's render target origin is bottom
// left). Ribbon half width is 0.38 m instead of 0.5 because our tyres are narrower.
// Added: the trail also fades with time (REGROW), so parted grass grows back even
// where the car stopped, not only once it has driven 25 m on.
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { wheelContact } from "./ground";

const SUBDIVISIONS = 128;
const ROWS = 4;
const RESOLUTION = 512;
const SIZE = 40;
const TIME_THROTTLE = 1 / 30;
const DISTANCE_THROTTLE = 0.2;
const THICKNESS = 0.38;
/** Seconds for parted grass to grow most of the way back (time constant of the fade). */
const REGROW = 4;

/** Shared: the grass samples these. */
export const tracks = {
  target: null as THREE.WebGLRenderTarget | null,
  focus: new THREE.Vector2(),
  size: SIZE,
  /** Uniforms the grass spreads into its material. */
  uniforms: {
    uTracks: { value: null as THREE.Texture | null },
    uTracksFocus: { value: new THREE.Vector2() },
    uTracksSize: { value: SIZE },
  },
};

export function tracksTarget() {
  if (!tracks.target) {
    tracks.target = new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
    });
    tracks.uniforms.uTracks.value = tracks.target.texture;
  }
  return tracks.target;
}

function makeGeometry() {
  const cols = SUBDIVISIONS + 1;
  const ratio = new Float32Array(ROWS * cols * 2);
  const side = new Float32Array(ROWS * cols * 2);
  const idx: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let i = 0; i < cols; i++) {
      const k = (r * cols + i) * 2;
      ratio[k] = ratio[k + 1] = i / SUBDIVISIONS;
      side[k] = 1;
      side[k + 1] = -1;
      if (i < SUBDIVISIONS) idx.push(k, k + 1, k + 2, k + 2, k + 1, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  // position = (world x, world z, contact alpha), rebuilt from the trail data every frame
  const position = new THREE.BufferAttribute(new Float32Array(ROWS * cols * 2 * 3), 3);
  position.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("position", position);
  g.setAttribute("aRatio", new THREE.BufferAttribute(ratio, 1));
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  g.setIndex(idx);
  return g;
}

function makeSystem() {
  // Bruno's per-track data texture (x, y, z, touching) x 128, kept on the CPU.
  const data = new Float32Array(SUBDIVISIONS * ROWS * 4);
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, // the ribbon's winding flips with the direction of travel
    uniforms: {
      uFocus: { value: new THREE.Vector2() },
      uHalf: { value: SIZE / 2 },
    },
    vertexShader: /* glsl */ `
      attribute float aRatio; attribute float aSide;
      uniform vec2 uFocus; uniform float uHalf;
      varying float vContact; varying float vRatio; varying float vSide; varying vec2 vScreen;
      void main() {
        vec2 clip = (position.xy - uFocus) / uHalf;
        vScreen = clip * 0.5 + 0.5;
        vContact = position.z;
        vRatio = aRatio;
        vSide = aSide * 0.5 + 0.5;
        gl_Position = vec4(clip, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vContact; varying float vRatio; varying float vSide; varying vec2 vScreen;
      float rc(float v, float a, float b, float c, float d) { return mix(c, d, clamp((v - a) / (b - a), 0.0, 1.0)); }
      void main() {
        float endAlpha = 1.0 - smoothstep(0.5, 1.0, vRatio);
        float startAlpha = smoothstep(0.0, 0.05, vRatio);
        float contactAlpha = vContact;
        float renderEdgeAlpha = rc(vScreen.x, 0.0, 0.2, 0.0, 1.0) * rc(vScreen.x, 0.8, 1.0, 1.0, 0.0)
          * rc(vScreen.y, 0.0, 0.2, 0.0, 1.0) * rc(vScreen.y, 0.8, 1.0, 1.0, 0.0);
        float trackEdgeAlpha = 1.0 - abs(vSide - 0.5) * 2.0;
        float alpha = endAlpha * startAlpha * contactAlpha * trackEdgeAlpha * renderEdgeAlpha;
        gl_FragColor = vec4(1.0, 0.0, 0.0, alpha);
      }`,
  });
  const geometry = makeGeometry();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.OrthographicCamera(); // unused by the shader, required by render()
  const rows = Array.from({ length: ROWS }, () => ({ lastTime: -Infinity, last: new THREE.Vector3(Infinity, Infinity, Infinity) }));
  return { data, geometry, material, scene, camera, rows };
}

/**
 * Bruno's ribbon vertex maths on the CPU: column i reads sample i-1 (his
 * half-texel offset on a nearest-filtered texture), the side offset is
 * perpendicular to the step from sample i-2.
 */
function buildRibbons(sys: ReturnType<typeof makeSystem>) {
  const { data } = sys;
  const attr = sys.geometry.getAttribute("position") as THREE.BufferAttribute;
  const out = attr.array as Float32Array;
  const cols = SUBDIVISIONS + 1;
  for (let r = 0; r < ROWS; r++) {
    const base = r * SUBDIVISIONS * 4;
    for (let i = 0; i < cols; i++) {
      const c = base + Math.min(Math.max(i - 1, 0), SUBDIVISIONS - 1) * 4;
      const pv = base + Math.min(Math.max(i - 2, 0), SUBDIVISIONS - 1) * 4;
      const angle = Math.atan2(data[c + 2] - data[pv + 2], data[c] - data[pv]);
      const k = (r * cols + i) * 2 * 3;
      for (let sd = 0; sd < 2; sd++) {
        const sideSign = sd === 0 ? -1 : 1; // sign(side) * -1
        const a = angle + sideSign * Math.PI * 0.5;
        out[k + sd * 3] = data[c] + Math.cos(a) * THICKNESS;
        out[k + sd * 3 + 1] = data[c + 2] + Math.sin(a) * THICKNESS;
        out[k + sd * 3 + 2] = data[c + 3];
      }
    }
  }
  attr.needsUpdate = true;
}

const contact = new THREE.Vector3();
const clear = new THREE.Color();

/** Renders the wheel ribbons into `tracks.target` every frame. Mount once. */
export function Tracks() {
  const ref = useRef<ReturnType<typeof makeSystem> | null>(null);
  useEffect(() => {
    tracksTarget();
    const sys = makeSystem();
    ref.current = sys;
    return () => {
      ref.current = null;
      sys.material.dispose();
      sys.geometry.dispose();
    };
  }, []);

  useFrame(({ clock, gl }, dt) => {
    const sys = ref.current;
    if (!sys) return;
    const target = tracksTarget();
    const now = clock.elapsedTime;
    const { data, rows } = sys;
    // Touching the ground: the chassis is grounded and low.
    const touching = carState.grounded;
    const fade = Math.exp(-Math.min(dt, 0.1) / REGROW);
    for (let i = 3; i < data.length; i += 4) data[i] *= fade;
    for (let r = 0; r < ROWS; r++) {
      wheelContact(r, contact);
      const row = rows[r];
      const base = r * SUBDIVISIONS * 4;
      if (now - row.lastTime > TIME_THROTTLE && row.last.distanceTo(contact) > DISTANCE_THROTTLE) {
        // Move data one "pixel"
        for (let i = SUBDIVISIONS - 1; i > 0; i--) {
          const i4 = base + i * 4;
          data[i4] = data[i4 - 4];
          data[i4 + 1] = data[i4 - 3];
          data[i4 + 2] = data[i4 - 2];
          data[i4 + 3] = data[i4 - 1];
        }
        row.lastTime = now;
        row.last.copy(contact);
      }
      data[base] = contact.x;
      data[base + 1] = contact.y;
      data[base + 2] = contact.z;
      data[base + 3] = touching ? 1 : 0;
    }
    buildRibbons(sys);

    // Focus on the car (Bruno focuses on the view's focus point, which follows it).
    tracks.focus.set(carState.pos.x, carState.pos.z);
    tracks.uniforms.uTracksFocus.value.copy(tracks.focus);
    sys.material.uniforms.uFocus.value.copy(tracks.focus);

    // Render
    const prevTarget = gl.getRenderTarget();
    const prevAlpha = gl.getClearAlpha();
    gl.getClearColor(clear);
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 1);
    gl.clear(true, false, false);
    gl.render(sys.scene, sys.camera);
    gl.setRenderTarget(prevTarget);
    gl.setClearColor(clear, prevAlpha);
  });
  return null;
}
