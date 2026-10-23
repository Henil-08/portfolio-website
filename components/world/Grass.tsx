"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "./carState";
import { dayNight } from "./daynight";
import { GARAGES, ISLAND_RADIUS, PIT, SECTORS, TRACK_WIDTH, trackCurve, zones } from "./layout";
import { C } from "./palette";

// Wind-blown grass around the car, Bruno style: thousands of instanced blades in a
// field that follows the car (snapped to a grid so it doesn't swim), swaying in the
// vertex shader. A mask painted from the track and building footprints keeps
// blades off the asphalt and out of buildings.

// Fewer blades on phones.
const COUNT = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? 22000 : 56000;
const SIZE = 56; // field width in metres
const MASK_RES = 1024;
const WORLD = (ISLAND_RADIUS + 6) * 2;

function makeMask() {
  const c = document.createElement("canvas");
  c.width = c.height = MASK_RES;
  const g = c.getContext("2d")!;
  const s = MASK_RES / WORLD;
  const tx = (x: number) => (x + WORLD / 2) * s;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, MASK_RES, MASK_RES);
  // Outside the island: no grass.
  g.globalCompositeOperation = "destination-in";
  g.beginPath();
  g.arc(tx(0), tx(0), (ISLAND_RADIUS - 1) * s, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "source-over";
  g.fillStyle = g.strokeStyle = "#000";
  // Track plus kerbs and run-off.
  g.lineWidth = (TRACK_WIDTH + 3.5) * s;
  g.lineJoin = g.lineCap = "round";
  g.beginPath();
  trackCurve.getSpacedPoints(300).forEach((p, i) => (i ? g.lineTo(tx(p.x), tx(p.z)) : g.moveTo(tx(p.x), tx(p.z))));
  g.closePath();
  g.stroke();
  // Pit lane and garages.
  g.fillRect(tx(PIT.from - 6), tx(PIT.z - 4), (PIT.to - PIT.from + 12) * s, 9 * s);
  for (const gr of GARAGES) g.fillRect(tx(gr.x - 5), tx(PIT.garageZ - 5), 10 * s, 9 * s);
  // Plaza and the places.
  g.beginPath();
  g.arc(tx(0), tx(3), 10 * s, 0, Math.PI * 2);
  g.fill();
  for (const z of zones) g.fillRect(tx(z.pos[0] - z.size[0] / 2), tx(z.pos[1] - z.size[1] / 2), z.size[0] * s, z.size[1] * s);
  for (const sc of SECTORS) {
    g.save();
    g.translate(tx(sc.scene[0]), tx(sc.scene[1]));
    g.rotate(-sc.sceneRot);
    g.fillRect(-14 * s, -10 * s, 28 * s, 20 * s);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}

function makeBlades() {
  // One blade: a tapered strip of 3 segments, base at y = 0.
  const blade = new THREE.BufferGeometry();
  const w = 0.085;
  const pos = [-w, 0, 0, w, 0, 0, -w * 0.7, 0.33, 0, w * 0.7, 0.33, 0, -w * 0.35, 0.66, 0, w * 0.35, 0.66, 0, 0, 1, 0];
  blade.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  blade.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]);
  const g = new THREE.InstancedBufferGeometry().copy(blade as unknown as THREE.InstancedBufferGeometry);
  const off = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    off[i * 4] = (Math.random() - 0.5) * SIZE;
    off[i * 4 + 1] = (Math.random() - 0.5) * SIZE;
    off[i * 4 + 2] = 0.3 + Math.random() * 0.38; // height
    off[i * 4 + 3] = Math.random() * Math.PI * 2; // rotation
  }
  g.setAttribute("aOffset", new THREE.InstancedBufferAttribute(off, 4));
  g.instanceCount = COUNT;
  return g;
}

export default function Grass() {
  const mesh = useRef<THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>>(null);
  const geo = useMemo(() => makeBlades(), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uCenter: { value: new THREE.Vector2() },
          uMask: { value: makeMask() },
          uWorld: { value: WORLD },
          uSize: { value: SIZE },
          uBase: { value: new THREE.Color(C.grassDark).offsetHSL(0, 0.05, -0.08) },
          uTip: { value: new THREE.Color(C.grass).offsetHSL(0.01, 0.1, 0.06) },
          uNight: { value: 0 },
        },
        vertexShader: /* glsl */ `
          attribute vec4 aOffset;
          uniform float uTime; uniform vec2 uCenter; uniform sampler2D uMask; uniform float uWorld; uniform float uSize;
          varying float vH; varying float vFade;
          void main() {
            vec2 wp = uCenter + aOffset.xy;
            // Wrap blades into the field around the car so the patch never runs out.
            wp = uCenter + mod(aOffset.xy - uCenter + uSize * 0.5, uSize) - uSize * 0.5;
            float m = texture2D(uMask, wp / uWorld + 0.5).r;
            float edge = 1.0 - smoothstep(uSize * 0.35, uSize * 0.5, length(wp - uCenter));
            float h = aOffset.z * m * edge;
            vec3 p = position;
            float c = cos(aOffset.w), s = sin(aOffset.w);
            p.xz = mat2(c, -s, s, c) * p.xz;
            p.y *= h;
            // Wind: two travelling waves, stronger toward the tip.
            float wave = sin(wp.x * 0.35 + uTime * 1.6) * 0.6 + sin(wp.y * 0.5 + uTime * 2.3) * 0.4;
            p.x += wave * 0.12 * position.y * position.y * h * 3.0;
            p.z += wave * 0.06 * position.y * position.y * h * 3.0;
            vH = position.y;
            vFade = m * edge;
            gl_Position = projectionMatrix * viewMatrix * vec4(p.x + wp.x, p.y, p.z + wp.y, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uBase; uniform vec3 uTip; uniform float uNight;
          varying float vH; varying float vFade;
          void main() {
            if (vFade < 0.05) discard;
            vec3 col = mix(uBase, uTip, vH);
            col *= mix(1.0, 0.11, uNight);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    []
  );

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    m.material.uniforms.uTime.value += dt;
    m.material.uniforms.uCenter.value.set(carState.pos.x, carState.pos.z);
    m.material.uniforms.uNight.value = dayNight.night;
  });

  return <mesh ref={mesh} geometry={geo} material={mat} frustumCulled={false} />;
}
