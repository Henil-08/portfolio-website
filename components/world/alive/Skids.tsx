// Faint skid marks when the car slides. The original wheels print into the ground
// through sources/Game/Tracks.js (a 25 m ribbon per wheel that the terrain
// reads); that lives on in alive/Tracks.tsx for the grass. Rubber on asphalt
// needs to stay put longer than a moving 40 m window, so skids are a ring buffer
// of quads instead: each slide segment is one instance, fading over ~25 s.
// One draw call.
"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "../carState";
import { dayNight } from "../daynight";
import { input } from "../input";
import { carSlip, offTrack, wheelContact, WHEEL_LOCAL } from "./ground";

const COARSE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const MAX = COARSE ? 400 : 900;
const LIFE = 25; // seconds
const WIDTH = 0.24;
const STEP = 0.3; // metres per segment

function makeGeometry() {
  const g = new THREE.InstancedBufferGeometry();
  // x: 0 at the segment start, 1 at its end; y: side -1..1
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4); // start xyz, birth
  const b = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4).fill(-1e9), 4); // end xyz, strength
  a.setUsage(THREE.DynamicDrawUsage);
  b.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute("aStart", a);
  g.setAttribute("aEnd", b);
  g.instanceCount = MAX;
  return g;
}

function makeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uLife: { value: LIFE },
      uWidth: { value: WIDTH },
      uColor: { value: new THREE.Color("#1d1b1a") }, // rubber on asphalt
      uEarth: { value: new THREE.Color("#5b5240") }, // scuffed earth on grass
      uDim: { value: 1 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      attribute vec4 aStart; attribute vec4 aEnd;
      uniform float uTime; uniform float uLife; uniform float uWidth;
      varying float vAlpha; varying float vSide; varying float vEarth;
      void main() {
        // aEnd.w > 0 on asphalt, < 0 on grass/gravel
        vEarth = step(aEnd.w, 0.0);
        float age = uTime - aStart.w;
        vAlpha = abs(aEnd.w) * step(-100.0, aEnd.w) * (1.0 - smoothstep(uLife * 0.4, uLife, age)) * step(age, uLife);
        vec3 dir = aEnd.xyz - aStart.xyz;
        vec2 n = normalize(vec2(-dir.z, dir.x) + 1e-5) * uWidth * 0.5;
        vec3 p = mix(aStart.xyz, aEnd.xyz, position.x) + vec3(n.x, 0.0, n.y) * position.y;
        // overlap the joins a little
        p += normalize(dir + 1e-5) * (position.x - 0.5) * 0.04;
        vSide = position.y;
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform vec3 uColor; uniform vec3 uEarth; uniform float uDim;
      varying float vAlpha; varying float vSide; varying float vEarth;
      void main() {
        float a = vAlpha * (1.0 - smoothstep(0.55, 1.0, abs(vSide)));
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(uColor, uEarth, vEarth) * uDim, a * mix(1.0, 0.6, vEarth));
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

const contact = new THREE.Vector3();

/** Skid marks under sliding wheels. Mount once. */
export function Skids() {
  const mesh = useRef<THREE.Mesh>(null);
  const sys = useRef<{
    geometry: THREE.InstancedBufferGeometry;
    material: THREE.ShaderMaterial;
    head: number;
    time: number;
    last: THREE.Vector3[];
    active: boolean[];
  } | null>(null);

  useEffect(() => {
    const geometry = makeGeometry();
    const material = makeMaterial();
    sys.current = { geometry, material, head: 0, time: 0, last: WHEEL_LOCAL.map(() => new THREE.Vector3()), active: WHEEL_LOCAL.map(() => false) };
    const m = mesh.current!;
    m.geometry = geometry;
    m.material = material;
    m.visible = true;
    return () => {
      sys.current = null;
      geometry.dispose();
      material.dispose();
    };
  }, []);

  useFrame((_, dt) => {
    const s = sys.current;
    if (!s) return;
    s.time += Math.min(dt, 1 / 30);
    s.material.uniforms.uTime.value = s.time;
    s.material.uniforms.uDim.value = THREE.MathUtils.lerp(1, 0.06, dayNight.night);

    const slip = carSlip();
    const sliding =
      carState.grounded &&
      slip.speed > 3 &&
      (slip.lateral > 3 || (input.handbrake && slip.speed > 4) || (slip.lateral > 2 && slip.speed > 18));
    // 0..1 how hard: fainter for gentle slides
    const strength = THREE.MathUtils.clamp((slip.lateral - 1.5) / 8 + (input.handbrake ? 0.2 : 0), 0.12, 0.4);
    const startAttr = s.geometry.getAttribute("aStart") as THREE.InstancedBufferAttribute;
    const endAttr = s.geometry.getAttribute("aEnd") as THREE.InstancedBufferAttribute;
    let dirty = false;
    for (let i = 0; i < WHEEL_LOCAL.length; i++) {
      const rearOrHard = WHEEL_LOCAL[i].rear || slip.lateral > 5;
      if (!sliding || !rearOrHard) {
        s.active[i] = false;
        continue;
      }
      wheelContact(i, contact);
      contact.y += 0.04;
      if (!s.active[i]) {
        s.active[i] = true;
        s.last[i].copy(contact);
        continue;
      }
      if (s.last[i].distanceTo(contact) < STEP) continue;
      if (s.last[i].distanceTo(contact) > 3) {
        s.last[i].copy(contact); // teleport
        continue;
      }
      const k = s.head;
      s.head = (s.head + 1) % MAX;
      startAttr.setXYZW(k, s.last[i].x, s.last[i].y, s.last[i].z, s.time);
      // marks on grass are earthy and fainter (sign of w); offTrack is cheap enough at 0.3 m steps
      endAttr.setXYZW(k, contact.x, contact.y, contact.z, offTrack(contact.x, contact.z) ? -strength : strength);
      s.last[i].copy(contact);
      dirty = true;
    }
    if (dirty) {
      startAttr.needsUpdate = true;
      endAttr.needsUpdate = true;
    }
  });

  return <mesh ref={mesh} visible={false} frustumCulled={false} renderOrder={1} />;
}
