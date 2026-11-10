"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { updateSeeThrough } from "./seeThrough";
import * as THREE from "three";
import { carState, ghostLeader } from "./carState";
import { input } from "./input";
import { getState, setNear } from "./store";
import { sceneParams } from "./Effects";
import { dayNight } from "./daynight";
import { studio } from "./bloom/state";
import { zones, type Zone } from "./layout";
import { garageSheet, garageView } from "./garage/state";
import { blendCamera } from "./garage/anim";
import { ease } from "./smooth";
import { CAM_NEXT } from "./look";
import { CHASE, chaseOffset, spring } from "./chase";

// The world camera's lens (World.tsx), which the garage's cockpit shot borrows and gives back.
const FOV = 34;
const NEAR = 0.5;

const OFFSET = new THREE.Vector3(10.5, 12.5, 14);
const look = new THREE.Vector3();
const tmp = new THREE.Vector3();
const orbit = new THREE.Vector3();
const off = new THREE.Vector3();
const goal = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
const lookAt = new THREE.Vector3();

// Camera: slow orbit during the intro, then the original follow pattern (MIT,
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
  const garageLens = useRef({ on: false });
  // ?cam=next (chase.ts): the camera's and the look target's offsets from the car on springs, the smoothed heading, the lens
  const chase = useRef({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), look: new THREE.Vector3(), lvel: new THREE.Vector3(), fwd: new THREE.Vector3(1, 0, 0), fov: CHASE.fov, init: false });

  useFrame((state, dt) => {
    const phase = getState().phase;
    const portrait = size.height > size.width;
    const zoom = portrait ? 1.45 : 1;
    const k1 = ease(10, dt);

    // Hands off the controls with the autopilot lab running: watch the leading ghost.
    const touching = input.forward || input.back || input.steer;
    idle.current = touching ? 0 : idle.current + dt;
    const follow = ghostLeader.active && idle.current > 1.5 ? ghostLeader.pos : carState.pos;
    const kf = follow === ghostLeader.pos ? ease(4, dt) : k1;

    prev.current.set(target.current.x, target.current.z);
    target.current.x += (follow.x - target.current.x) * kf;
    target.current.z += (follow.z - target.current.z) * kf;
    // Follow the car up and down the hills, gently.
    target.current.y += (follow.y - 0.3 - target.current.y) * ease(3, dt);

    // Pull back a little at speed.
    const spd = Math.hypot(target.current.x - prev.current.x, target.current.z - prev.current.y) / Math.max(dt, 1e-4);
    zoomS.current += (THREE.MathUtils.smoothstep(spd, 5, 30) * 0.22 - zoomS.current) * k1;
    let followPos = tmp.copy(OFFSET).multiplyScalar(zoom * (1 + zoomS.current)).add(target.current);
    let followLook = target.current;
    let fovNow = FOV;
    if (CAM_NEXT) {
      // behind the nose, on springs: the heading eases round (never with a slide), the camera and
      // its look target follow critically damped, and the look runs a little ahead of the car
      const c = chase.current;
      const f = carState.forward;
      if (f.x * f.x + f.z * f.z > 0.01) c.fwd.lerp(goal.set(f.x, 0, f.z).normalize(), ease(3, dt)).normalize();
      const vx = (target.current.x - prev.current.x) / Math.max(dt, 1e-4);
      const vz = (target.current.z - prev.current.y) / Math.max(dt, 1e-4);
      const ahead = Math.min(1, CHASE.aheadMax / Math.max(1e-4, Math.hypot(vx, vz) * CHASE.ahead));
      // the springs work on the offsets from the car, not on world positions: a world spring trails
      // a moving car by 2v/omega (metres at speed); this one only eases the swing round a corner
      lookGoal.set(vx * CHASE.ahead * ahead, CHASE.lookUp, vz * CHASE.ahead * ahead);
      chaseOffset(c.fwd, zoom * (1 + zoomS.current * 0.5), goal);
      if (!c.init || phase !== "world") {
        c.pos.copy(goal);
        c.look.copy(lookGoal);
        c.vel.set(0, 0, 0);
        c.lvel.set(0, 0, 0);
        c.init = true;
      } else {
        spring(c.pos, c.vel, goal, 6, dt);
        spring(c.look, c.lvel, lookGoal, 6, dt);
      }
      c.fov += (CHASE.fov + CHASE.fovSpeed * THREE.MathUtils.smoothstep(spd, 5, CHASE.speedFull) - c.fov) * ease(2, dt);
      followPos = off.copy(c.pos).add(target.current);
      followLook = lookAt.copy(c.look).add(target.current);
      fovNow = c.fov;
    }

    // Dev and headless checks: window.__cam = [x, y, z, tx, ty, tz] pins the camera.
    const dbg = (window as unknown as { __cam?: number[] }).__cam;
    if (dbg) {
      camera.position.set(dbg[0], dbg[1], dbg[2]);
      camera.lookAt(dbg[3], dbg[4], dbg[5]);
      return;
    }

    if (phase !== "world") {
      // The opening (bloom/Opening.tsx) drives the camera after this; the chase pose is kept
      // up to date here so the hand-over when driving starts is the same frame.
      target.current.set(carState.pos.x, carState.pos.y - 0.3, carState.pos.z);
      camera.position.copy(followPos);
      camera.lookAt(followLook);
      orbit.copy(camera.position);
      blend.current = 1;
      return;
    }

    // Garage experience (garage/GarageShow.tsx): from the chase pose behind the stand-in as it
    // drives into the bay, into the driver's eye. The picture is framed in the part of the screen
    // the garage's sheet leaves free (a view offset) with a lens that fits it, and the lens goes
    // back when it is over.
    {
      const lens = garageLens.current;
      if (garageView.car) {
        const cam = state.camera as THREE.PerspectiveCamera;
        const b = garageView.poses.b;
        const W = size.width;
        const H = size.height;
        const free = garageSheet(W, H).free;
        const rw = THREE.MathUtils.lerp(W, free.w, b);
        const rh = THREE.MathUtils.lerp(H, free.h, b);
        const ry = free.y * b;
        const fov = blendCamera(garageView.poses, followPos, followLook, fovNow, camera.position, look, rw / rh);
        camera.lookAt(look);
        cam.fov = fov;
        cam.near = THREE.MathUtils.lerp(NEAR, 0.04, b);
        cam.aspect = rw / rh;
        cam.setViewOffset(rw, rh, 0, -ry, W, H);
        cam.updateProjectionMatrix();
        lens.on = true;
        orbit.copy(camera.position);
        return;
      }
      if (lens.on) {
        const cam = state.camera as THREE.PerspectiveCamera;
        cam.clearViewOffset();
        cam.fov = fovNow;
        cam.near = NEAR;
        cam.aspect = size.width / size.height;
        cam.updateProjectionMatrix();
        lens.on = false;
      }
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
          ? tmp.set(c.x + 8, c.y + 55, c.z + 10)
          : sh.style === "low"
            ? tmp.set(c.x + Math.cos(ang) * 5, c.y + 0.8, c.z + Math.sin(ang) * 5)
            : sh.style === "chase"
              ? tmp.copy(carState.forward).multiplyScalar(-6).add(c).setY(c.y + 2.2)
              : tmp.set(c.x + Math.cos(ang) * 14, c.y + 7, c.z + Math.sin(ang) * 14);
      camera.position.lerp(goal, ease(3, dt));
      camera.lookAt(c.x, c.y + 0.5, c.z);
      return;
    }

    // Rise from the turntable shot up to the chase camera, then follow.
    blend.current = Math.min(1, blend.current + dt * 0.7);
    const k = THREE.MathUtils.smootherstep(blend.current, 0, 1);
    camera.position.lerpVectors(orbit, followPos, k);
    look.copy(followLook);
    camera.lookAt(look);
    if (CAM_NEXT) {
      const cam = state.camera as THREE.PerspectiveCamera;
      if (Math.abs(cam.fov - fovNow) > 0.01) {
        cam.fov = fovNow;
        cam.updateProjectionMatrix();
      }
    }
  });

  // After the camera has moved: where the car is on screen, for the see-through.
  useFrame((state) => {
    camera.updateMatrixWorld();
    updateSeeThrough(camera, state.gl);
  });

  return null;
}

// The sun follows the car so the shadow map stays sharp where it matters.

const _studio = new THREE.Vector3();
const _at = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _shift = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Moves the sun and its target together, across the light's view, so the shadow camera sits on
 * whole shadow-map texels. Following the car by any fraction of a texel re-rasterizes every
 * shadow edge a little differently each frame, and they crawl and sparkle as you drive; on the
 * texel grid a static shadow is drawn into the same texels every frame. The direction and
 * everything the light covers are unchanged (at most half a texel, 1.7 cm, of shift).
 */
function snapToTexels(l: THREE.DirectionalLight, target: THREE.Vector3) {
  const cam = l.shadow.camera;
  const texel = (cam.right - cam.left) / l.shadow.mapSize.x;
  // the shadow camera's own axes (it looks from the light at the target, up is +y)
  _dir.subVectors(l.position, target).normalize();
  _right.crossVectors(UP, _dir);
  if (_right.lengthSq() < 1e-8) return;
  _right.normalize();
  _up.crossVectors(_dir, _right);
  const u = target.dot(_right);
  const v = target.dot(_up);
  _shift.copy(_right).multiplyScalar(Math.round(u / texel) * texel - u).addScaledVector(_up, Math.round(v / texel) * texel - v);
  target.add(_shift);
  l.position.add(_shift);
}

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
    // round the car (before its first frame, the origin); dev and headless checks: window.__sunAt =
    // [x, y, z] follows that point instead, window.__shadowSnapOff = true follows without the snap
    const dev = process.env.NODE_ENV !== "production" ? (window as unknown as { __sunAt?: number[]; __shadowSnapOff?: boolean }) : null;
    const c = dev?.__sunAt ? _at.fromArray(dev.__sunAt) : carState.pos;
    // The sun arcs across the sky with the clock (it stays above the horizon for
    // shadows; at night it becomes a dim, cool moonlight). In the garage it is the studio's
    // fixed key (the proposal's turntable light), easing onto the arc as the world comes in.
    const a = dayNight.t * Math.PI * 2;
    const elev = Math.max(0.35, Math.abs(Math.sin(a)));
    l.position.set(c.x + Math.cos(a) * 40, c.y + 40 * elev + 8, c.z + 14 + Math.sin(a) * 10);
    if (studio.k > 0) l.position.lerp(_studio.set(c.x + 14 * 2, c.y + 22 * 2, c.z + 10 * 2), studio.k);
    tgt.position.set(c.x, c.y, c.z);
    if (!dev?.__shadowSnapOff) snapToTexels(l, tgt.position);

    const p = sceneParams();
    // the garage studio snaps in (the world is hidden at once); the world's light eases
    const k = studio.k >= 1 ? 1 : ease(3, dt);
    l.intensity += (p.sun - l.intensity) * k;
    l.color.lerp(p.sunColor, k);
    if (hemi.current) {
      hemi.current.intensity += (p.hemi - hemi.current.intensity) * k;
      hemi.current.color.lerp(p.hemiSky, k);
      hemi.current.groundColor.lerp(p.hemiGround, k);
    }
    if (scene.fog) (scene.fog as THREE.Fog).color.lerp(p.fog, k);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#ffffff", "#b8b4a9", 0.7]} />
      <directionalLight
        ref={light}
        intensity={2.4}
        color="#fff6ea"
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
          top: { value: new THREE.Color("#d3d8da") },
          mid: { value: new THREE.Color("#e9e7e1") },
          bottom: { value: new THREE.Color("#e2dfd8") },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
          void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : mix(mid, bottom, smoothstep(0.0, -0.3, h));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
          }`,
      }),
    []
  );
  useFrame((_, dt) => {
    const p = sceneParams();
    // the garage studio snaps in (the world is hidden at once); the world's light eases
    const k = studio.k >= 1 ? 1 : ease(3, dt);
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
