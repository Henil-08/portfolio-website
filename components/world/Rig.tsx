"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "./carState";
import { enterZone, getState, leaveZone, setState } from "./store";
import { zones, type Zone } from "./layout";

const OFFSET = new THREE.Vector3(10.5, 12.5, 14);
const look = new THREE.Vector3();
const want = new THREE.Vector3();
const tmp = new THREE.Vector3();

// Camera: slow orbit over the island during the intro, then a smooth follow cam.
export function CameraRig() {
  const { camera, size } = useThree();
  const blend = useRef(0);
  const target = useRef(new THREE.Vector3());

  useFrame(({ clock }, dt) => {
    const phase = getState().phase;
    const portrait = size.height > size.width;
    const zoom = portrait ? 1.45 : 1;

    // Follow target leads the car a little in the direction it's moving.
    tmp.copy(carState.vel).setY(0).multiplyScalar(0.35).clampLength(0, 6);
    want.copy(carState.pos).add(tmp);
    want.y = 0;
    target.current.lerp(want, 1 - Math.exp(-dt * 4));

    const followPos = tmp.copy(OFFSET).multiplyScalar(zoom).add(target.current);

    if (phase !== "world") {
      // Intro: wide, slow orbit.
      const a = clock.elapsedTime * 0.06 + 0.7;
      const r = 95;
      camera.position.set(Math.cos(a) * r, 62, Math.sin(a) * r);
      camera.lookAt(0, 0, 0);
      blend.current = 0;
      return;
    }

    blend.current = Math.min(1, blend.current + dt * 0.45);
    const k = THREE.MathUtils.smootherstep(blend.current, 0, 1);
    if (k < 1) {
      // Swoop from the orbit down to the car.
      const a = clock.elapsedTime * 0.06 + 0.7;
      const orbit = new THREE.Vector3(Math.cos(a) * 95, 62, Math.sin(a) * 95);
      camera.position.lerpVectors(orbit, followPos, k);
      look.lerpVectors(new THREE.Vector3(0, 0, 0), target.current, k);
    } else {
      camera.position.lerp(followPos, 1 - Math.exp(-dt * 6));
      look.copy(target.current);
    }
    camera.lookAt(look);
  });

  return null;
}

// The sun follows the car so the shadow map stays sharp where it matters.
export function Sun() {
  const light = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  const tgt = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    scene.add(tgt);
    if (light.current) light.current.target = tgt;
    return () => {
      scene.remove(tgt);
    };
  }, [scene, tgt]);

  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const phase = getState().phase;
    const c = phase === "world" ? carState.pos : new THREE.Vector3(0, 0, 0);
    l.position.set(c.x + 24, 40, c.z + 14);
    tgt.position.set(c.x, 0, c.z);
  });

  return (
    <>
      <hemisphereLight args={["#fbf7f0", "#b7b0a2", 0.55]} />
      <directionalLight
        ref={light}
        intensity={2.4}
        color="#fff4e6"
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

// Opens a zone's card when the car rolls into it, with a little hysteresis on the way out.
export function ZoneWatcher() {
  const t = useRef(0);
  useFrame((_, dt) => {
    const s = getState();

    t.current += dt;
    if (t.current < 0.1 || s.phase !== "world") return;
    t.current = 0;
    const { x, z } = carState.pos;
    if (s.dismissed) {
      const d = zones.find((q) => q.id === s.dismissed);
      if (d && !inside(d, x, z, 3)) setState({ dismissed: null });
    }
    if (s.zone) {
      const cur = zones.find((q) => q.id === s.zone);
      if (cur && !inside(cur, x, z, 3)) leaveZone(cur.id);
      if (cur && inside(cur, x, z, 3)) return;
    }
    const hit = zones.find((q) => q.id !== getState().dismissed && inside(q, x, z, 0));
    if (hit && hit.id !== s.zone) enterZone(hit.id);
  });
  return null;
}
