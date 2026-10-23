"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { carState, ghostLeader } from "./carState";
import { input } from "./input";
import { getState, setNear } from "./store";
import { sceneParams } from "./Effects";
import { dayNight } from "./daynight";
import { zones, type Zone } from "./layout";

const OFFSET = new THREE.Vector3(10.5, 12.5, 14);
const look = new THREE.Vector3();
const tmp = new THREE.Vector3();
const orbit = new THREE.Vector3();

// Camera: slow orbit during the intro, then Bruno Simon's follow pattern (MIT,
// folio-2025): smooth the target's X/Z once, fixed offset, look at the target.
// No velocity lead and no second lag, which is what made the car look jittery.
export function CameraRig() {
  const { camera, size } = useThree();
  const blend = useRef(0);
  const target = useRef(new THREE.Vector3());
  const prev = useRef(new THREE.Vector2());
  const zoomS = useRef(0);
  const shot = useRef<{ id: number; style: string; t: number } | null>(null);
  const idle = useRef(0);

  useFrame(({ clock }, dt) => {
    const phase = getState().phase;
    const portrait = size.height > size.width;
    const zoom = portrait ? 1.45 : 1;
    const k1 = Math.min(1, dt * 10);

    // Hands off the controls with the autopilot lab running: watch the leading ghost.
    const touching = input.forward || input.back || input.steer;
    idle.current = touching ? 0 : idle.current + dt;
    const follow = ghostLeader.active && idle.current > 1.5 ? ghostLeader.pos : carState.pos;
    const kf = follow === ghostLeader.pos ? Math.min(1, dt * 4) : k1;

    prev.current.set(target.current.x, target.current.z);
    target.current.x += (follow.x - target.current.x) * kf;
    target.current.z += (follow.z - target.current.z) * kf;
    target.current.y = 0;

    // Pull back a little at speed.
    const spd = Math.hypot(target.current.x - prev.current.x, target.current.z - prev.current.y) / Math.max(dt, 1e-4);
    zoomS.current += (THREE.MathUtils.smoothstep(spd, 5, 30) * 0.22 - zoomS.current) * k1;
    const followPos = tmp.copy(OFFSET).multiplyScalar(zoom * (1 + zoomS.current)).add(target.current);

    const a = clock.elapsedTime * 0.06 + 0.7;
    orbit.set(Math.cos(a) * 95, 62, Math.sin(a) * 95);

    if (phase !== "world") {
      camera.position.copy(orbit);
      camera.lookAt(0, 0, 0);
      blend.current = 0;
      return;
    }

    // Agent camera shots take over for a few seconds.
    const want = getState().shot;
    if (want && want.id !== shot.current?.id) shot.current = { id: want.id, style: want.style, t: 0 };
    if (shot.current && shot.current.t < 5) {
      const sh = shot.current;
      sh.t += dt;
      const c = target.current;
      const ang = sh.t * 0.5;
      const goal =
        sh.style === "aerial"
          ? tmp.set(c.x + 8, 55, c.z + 10)
          : sh.style === "low"
            ? tmp.set(c.x + Math.cos(ang) * 5, 0.8, c.z + Math.sin(ang) * 5)
            : sh.style === "chase"
              ? tmp.copy(carState.forward).multiplyScalar(-6).add(c).setY(2.2)
              : tmp.set(c.x + Math.cos(ang) * 14, 7, c.z + Math.sin(ang) * 14);
      camera.position.lerp(goal, Math.min(1, dt * 3));
      camera.lookAt(c.x, 0.5, c.z);
      return;
    }

    // Swoop from the orbit down to the car, then follow.
    blend.current = Math.min(1, blend.current + dt * 0.45);
    const k = THREE.MathUtils.smootherstep(blend.current, 0, 1);
    camera.position.lerpVectors(orbit, followPos, k);
    look.set(0, 0, 0).lerp(target.current, k);
    camera.lookAt(look);
  });

  return null;
}

// The sun follows the car so the shadow map stays sharp where it matters.

export function Sun() {
  const light = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();
  const tgt = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    scene.add(tgt);
    if (light.current) light.current.target = tgt;
    return () => {
      scene.remove(tgt);
    };
  }, [scene, tgt]);

  useFrame((_, dt) => {
    const l = light.current;
    if (!l) return;
    const st = getState();
    const c = st.phase === "world" ? carState.pos : new THREE.Vector3(0, 0, 0);
    // The sun arcs across the sky with the clock (it stays above the horizon for
    // shadows; at night it becomes a dim blue moonlight).
    const a = dayNight.t * Math.PI * 2;
    const elev = Math.max(0.35, Math.abs(Math.sin(a)));
    l.position.set(c.x + Math.cos(a) * 40, 40 * elev + 8, c.z + 14 + Math.sin(a) * 10);
    tgt.position.set(c.x, 0, c.z);

    const p = sceneParams();
    const k = Math.min(1, dt * 3);
    l.intensity += (p.sun - l.intensity) * k;
    l.color.lerp(p.sunColor, k);
    if (hemi.current) hemi.current.intensity += (p.hemi - hemi.current.intensity) * k;
    if (scene.fog) (scene.fog as THREE.Fog).color.lerp(p.fog, k);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#f4efe6", "#8f8a80", 0.35]} />
      <directionalLight
        ref={light}
        intensity={1.9}
        color="#fff1e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  );
}

export function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color("#b9c9d3") },
          mid: { value: new THREE.Color("#e6e4df") },
          bottom: { value: new THREE.Color("#d8d2c8") },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
          void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : mix(mid, bottom, smoothstep(0.0, -0.3, h));
          gl_FragColor = vec4(c, 1.0); }`,
      }),
    []
  );
  useFrame((_, dt) => {
    const p = sceneParams();
    const k = Math.min(1, dt * 3);
    (mat.uniforms.top.value as THREE.Color).lerp(p.top, k);
    (mat.uniforms.mid.value as THREE.Color).lerp(p.mid, k);
    (mat.uniforms.bottom.value as THREE.Color).lerp(p.bottom, k);
  });
  return (
    <mesh material={mat} scale={800} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}

function inside(z: Zone, x: number, y: number, pad: number) {
  const dx = x - z.pos[0];
  const dz = y - z.pos[1];
  const r = -(z.rotY ?? 0);
  const lx = dx * Math.cos(r) - dz * Math.sin(r);
  const lz = dx * Math.sin(r) + dz * Math.cos(r);
  return Math.abs(lx) <= z.size[0] / 2 + pad && Math.abs(lz) <= z.size[1] / 2 + pad;
}

// Tracks which place the car is parked at, with a little hysteresis on the way out.
export function ZoneWatcher() {
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const s = getState();
    if (t.current < 0.1 || s.phase !== "world") return;
    t.current = 0;
    const { x, z } = carState.pos;
    if (s.near) {
      const cur = zones.find((q) => q.id === s.near);
      if (cur && inside(cur, x, z, 3)) return;
    }
    const hit = zones.find((q) => inside(q, x, z, 0)) ?? null;
    if (hit?.id !== s.near) setNear(hit?.id ?? null);
  });
  return null;
}
