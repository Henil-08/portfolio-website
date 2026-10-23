"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { carState } from "./carState";
import { enterZone, getState, leaveZone, setState } from "./store";
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

  useFrame(({ clock }, dt) => {
    const phase = getState().phase;
    const portrait = size.height > size.width;
    const zoom = portrait ? 1.45 : 1;
    const k1 = Math.min(1, dt * 10);

    prev.current.set(target.current.x, target.current.z);
    target.current.x += (carState.pos.x - target.current.x) * k1;
    target.current.z += (carState.pos.z - target.current.z) * k1;
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
      <hemisphereLight args={["#f4efe6", "#8f8a80", 0.35]} />
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
