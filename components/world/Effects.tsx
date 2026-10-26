"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BallCollider, CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { carState } from "./carState";
import { getState, setState, subscribe, useWorld } from "./store";
import { dayNight } from "./daynight";
import { heightAt } from "./terrain";
import { BALL_R, Cone, Football, TYRE_H, TYRE_R, Tyre } from "./models/props";
import { nightGlow } from "./models/props/shared";

// Lighting keyframes, Concrete & Ink (docs/BRAND.md "World"). The day/night cycle blends
// between them by sun elevation. Day is the approved proposal's light (app/docs/brand/world
// models.tsx `Lights`): a white sky fill over a concrete bounce, a paper-white key, neutral
// paper sky and fog. Dusk warms the key a little and keeps the paper readable. Night is ink:
// a cool, dim moon over a near-black bounce, so the floodlights, lamps and the orange carry it.
export const SCENES = {
  day: { sun: 2.4, sunColor: "#fff6ea", hemi: 0.7, hemiSky: "#ffffff", hemiGround: "#b8b4a9", env: 0.2, exposure: 0.94, top: "#d3d8da", mid: "#e9e7e1", bottom: "#e2dfd8", fog: "#e9e7e1" },
  golden: { sun: 1.9, sunColor: "#ffd2a6", hemi: 0.8, hemiSky: "#f3ebe2", hemiGround: "#9a948a", env: 0.24, exposure: 0.98, top: "#c8ccd0", mid: "#e6ddd2", bottom: "#ddd6cc", fog: "#e2dcd3" },
  night: { sun: 0.8, sunColor: "#a9bdd6", hemi: 0.9, hemiSky: "#4a5664", hemiGround: "#1a1c20", env: 0.1, exposure: 1.0, top: "#0b0d10", mid: "#16191d", bottom: "#0f1114", fog: "#15181b" },
} as const;

// Rain on top of any of them: the key dims and the sky and fog go concrete grey.
const RAIN = { sun: 0.45, hemi: 0.85, grey: 0.55, dark: 0.88 };

const WEATHER_N = 2200;

function makeWeatherGeometry() {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(WEATHER_N * 3);
  for (let i = 0; i < WEATHER_N; i++) {
    p[i * 3] = (Math.random() - 0.5) * 60;
    p[i * 3 + 1] = Math.random() * 30;
    p[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  return g;
}

function makeConfetti(at: [number, number]) {
  return Array.from({ length: CONFETTI }).map(() => ({
    p: new THREE.Vector3(at[0], 1, at[1]),
    v: new THREE.Vector3((Math.random() - 0.5) * 9, 8 + Math.random() * 8, (Math.random() - 0.5) * 9),
    r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
    s: Math.random() * 6,
  }));
}

// Rain or snow in a box that follows the car.
export function Weather() {
  const weather = useWorld((s) => s.scene.weather);
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => makeWeatherGeometry(), []);

  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts || weather === "clear") return;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const fall = weather === "rain" ? 26 : 3;
    for (let i = 0; i < WEATHER_N; i++) {
      // wrapped, not stepped once: a long frame would otherwise drop them below the box for good
      const y = (((pos.getY(i) - fall * dt) % 30) + 30) % 30;
      pos.setY(i, y);
      if (weather === "snow") pos.setX(i, pos.getX(i) + Math.sin(y + i) * dt * 0.6);
    }
    pos.needsUpdate = true;
    pts.position.set(carState.pos.x, 0, carState.pos.z);
  });

  if (weather === "clear") return null;
  return (
    <points ref={ref} geometry={geo} frustumCulled={false} userData={{ noMap: true }}>
      <pointsMaterial
        color={weather === "rain" ? "#8f949a" : "#ffffff"}
        size={weather === "rain" ? 0.14 : 0.18}
        transparent
        opacity={weather === "rain" ? 0.7 : 0.9}
        depthWrite={false}
      />
    </points>
  );
}

type Params = { sun: number; sunColor: THREE.Color; hemi: number; hemiSky: THREE.Color; hemiGround: THREE.Color; env: number; exposure: number; top: THREE.Color; mid: THREE.Color; bottom: THREE.Color; fog: THREE.Color };
const K = Object.fromEntries(
  Object.entries(SCENES).map(([k, v]) => [
    k,
    { ...v, sunColor: new THREE.Color(v.sunColor), hemiSky: new THREE.Color(v.hemiSky), hemiGround: new THREE.Color(v.hemiGround), top: new THREE.Color(v.top), mid: new THREE.Color(v.mid), bottom: new THREE.Color(v.bottom), fog: new THREE.Color(v.fog) },
  ])
) as Record<keyof typeof SCENES, Params>;
const out: Params = { ...K.day, sunColor: new THREE.Color(), hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), top: new THREE.Color(), mid: new THREE.Color(), bottom: new THREE.Color(), fog: new THREE.Color() };

function blend(a: Params, b: Params, k: number) {
  out.sun = THREE.MathUtils.lerp(a.sun, b.sun, k);
  out.hemi = THREE.MathUtils.lerp(a.hemi, b.hemi, k);
  out.env = THREE.MathUtils.lerp(a.env, b.env, k);
  out.exposure = THREE.MathUtils.lerp(a.exposure, b.exposure, k);
  out.sunColor.lerpColors(a.sunColor, b.sunColor, k);
  out.hemiSky.lerpColors(a.hemiSky, b.hemiSky, k);
  out.hemiGround.lerpColors(a.hemiGround, b.hemiGround, k);
  out.top.lerpColors(a.top, b.top, k);
  out.mid.lerpColors(a.mid, b.mid, k);
  out.bottom.lerpColors(a.bottom, b.bottom, k);
  out.fog.lerpColors(a.fog, b.fog, k);
  return out;
}

const wetColor = (c: THREE.Color, w: number) => {
  const l = (c.r + c.g + c.b) / 3;
  return c.lerp(grey.setRGB(l, l, l), w * RAIN.grey).multiplyScalar(1 - w * (1 - RAIN.dark));
};
const grey = new THREE.Color();

function timeOfDay() {
  const e = dayNight.sunElevation;
  if (e > 0.3) return blend(K.day, K.day, 0);
  if (e > 0.1) return blend(K.golden, K.day, (e - 0.1) / 0.2);
  if (e > -0.15) return blend(K.night, K.golden, (e + 0.15) / 0.25);
  return blend(K.night, K.night, 0);
}

/** Current lighting, blended from the sun's elevation, then wetted by the rain. */
export function sceneParams() {
  const p = timeOfDay();
  const w = dayNight.rain;
  if (w > 0) {
    p.sun *= 1 - w * (1 - RAIN.sun);
    p.hemi *= 1 - w * (1 - RAIN.hemi);
    for (const c of [p.top, p.mid, p.bottom, p.fog, p.sunColor]) wetColor(c, w);
  }
  return p;
}

const CYCLE = 360; // seconds for a full day
// Where a jump lands: noon, the middle of dusk (sun ~6 degrees up), midnight.
const TIME_OF = { day: 0.24, golden: 0.484, night: 0.74 };
const labelOf = (e: number): keyof typeof TIME_OF => (e > 0.2 ? "day" : e > -0.05 ? "golden" : "night");

// Drives the clock. The store's scene.time follows it, so set_scene (the race engineer,
// or `__world.setState({scene: {time}})` in headless checks) always jumps, even when the
// clock has drifted away from the label it last set. Dev: window.__clockStop = true holds it.
export function DayNight() {
  const label = useRef(getState().scene.time);
  useEffect(() => {
    dayNight.t = TIME_OF[label.current];
    return subscribe(() => {
      const t = getState().scene.time;
      if (t !== label.current) {
        label.current = t;
        dayNight.t = TIME_OF[t];
      }
    });
  }, []);
  useFrame((_, dt) => {
    const stop = process.env.NODE_ENV !== "production" && (window as unknown as { __clockStop?: boolean }).__clockStop;
    // capped so one long frame (a shader compile, a slow headless capture) can't skip the dusk
    if (!stop) dayNight.t = (dayNight.t + Math.min(dt, 0.1) / CYCLE) % 1;
    dayNight.sunElevation = Math.sin(dayNight.t * Math.PI * 2);
    dayNight.night = THREE.MathUtils.smoothstep(-dayNight.sunElevation, -0.08, 0.2);
    const wet = getState().scene.weather === "rain" ? 1 : 0;
    dayNight.rain += (wet - dayNight.rain) * Math.min(1, dt * 0.8);
    nightGlow(dayNight.night);
    const now = labelOf(dayNight.sunElevation);
    if (now !== label.current) {
      label.current = now;
      const cur = getState().scene;
      setState({ scene: { ...cur, time: now } });
    }
  });
  return null;
}

// Showers at random times, like folio-2025 (MIT, public/vendor/LICENSE.md, Weather.js):
// rain = humidity above 0.65 x clouds, both slow sine-product noise on a wall-clock
// cycle, so every visitor gets the same sky. The original's humidity follows the
// seasons; ours is fixed at 0.72, which rains ~10% of the time in ~5 min showers,
// roughly once an hour. Only the edges switch the weather, so a manual set_scene sticks
// until the next shower starts or stops.
const RAIN_CYCLE = 240; // s, the original's day cycle
const HUMIDITY = 0.72;
const weatherNoise = (x: number) => Math.sin(x) * Math.sin(x * 1.678) * Math.sin(x * 2.345);
export function rainAmount(now = Date.now()) {
  const p = now / 1000 / RAIN_CYCLE;
  const humidity = HUMIDITY + weatherNoise(p * 0.36) * 0.2;
  const clouds = weatherNoise(p * 0.44);
  return THREE.MathUtils.clamp((humidity - 0.65) / 0.35, 0, 1) * THREE.MathUtils.clamp(clouds, 0, 1);
}

export function RainCycle() {
  useEffect(() => {
    let raining: boolean | null = null;
    const tick = () => {
      const r = rainAmount();
      const next = raining ? r > 0.06 : r > 0.12;
      if (next === raining) return;
      const first = raining === null;
      raining = next;
      const cur = getState().scene;
      if (cur.weather === "snow" || (first && !next)) return;
      setState({ scene: { ...cur, weather: next ? "rain" : "clear" } });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}

// Exposure follows the time of day.
export function Exposure() {
  useFrame(({ gl, scene }, dt) => {
    const want = sceneParams().exposure;
    gl.toneMappingExposure += (want - gl.toneMappingExposure) * Math.min(1, dt * 2);
    // The studio environment (reflections on paint and glass) dims at night too.
    scene.environmentIntensity = sceneParams().env;
  });
  return null;
}

// Things the agent drops into the world. They fall from the sky as real physics objects.
export function Spawns() {
  const spawns = useWorld((s) => s.spawns);
  return (
    <>
      {spawns.map((s) =>
        s.thing === "confetti" ? (
          <Confetti key={s.id} at={s.at} />
        ) : (
          Array.from({ length: s.count }).map((_, i) => {
            const a = (i / s.count) * Math.PI * 2;
            const r = 1.5 + (i % 3);
            const px = s.at[0] + Math.cos(a) * r;
            const pz = s.at[1] + Math.sin(a) * r;
            const pos: [number, number, number] = [px, heightAt(px, pz) + 6 + i * 0.6, pz];
            if (s.thing === "footballs")
              return (
                <RigidBody key={`${s.id}-${i}`} colliders={false} position={pos} mass={0.35} restitution={0.7}>
                  <BallCollider args={[BALL_R]} />
                  <group position={[0, -BALL_R, 0]}>
                    <Football />
                  </group>
                </RigidBody>
              );
            if (s.thing === "tyres")
              return (
                <RigidBody key={`${s.id}-${i}`} colliders={false} position={pos} mass={0.6}>
                  <CylinderCollider args={[TYRE_H / 2, TYRE_R]} />
                  <group position={[0, -TYRE_H / 2, 0]}>
                    <Tyre compound={(["soft", "medium", "hard", "inter"] as const)[i % 4]} />
                  </group>
                </RigidBody>
              );
            return (
              <RigidBody key={`${s.id}-${i}`} colliders={false} position={pos} mass={0.25}>
                <CuboidCollider args={[0.2, 0.27, 0.2]} />
                <group position={[0, -0.27, 0]}>
                  <Cone />
                </group>
              </RigidBody>
            );
          })
        )
      )}
    </>
  );
}

const CONFETTI = 260;
function Confetti({ at }: { at: [number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const state = useMemo(() => makeConfetti(at), [at]);
  const colors = useMemo(() => ["#d42a2f", "#f8f7f4", "#c9a047", "#2f3238"].map((c) => new THREE.Color(c)), []);
  const m = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < CONFETTI; i++) mesh.setColorAt(i, colors[i % colors.length]);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [colors]);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    state.forEach((c, i) => {
      c.v.y -= 9 * dt;
      c.v.multiplyScalar(1 - dt * 0.8);
      c.p.addScaledVector(c.v, dt);
      const floor = heightAt(c.p.x, c.p.z) + 0.02;
      if (c.p.y < floor) {
        c.p.y = floor;
        c.v.set(0, 0, 0);
      }
      c.r.x += dt * c.s;
      c.r.y += dt * c.s * 0.7;
      m.position.copy(c.p);
      m.rotation.copy(c.r);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, CONFETTI]} castShadow>
      <planeGeometry args={[0.18, 0.1]} />
      <meshStandardMaterial side={THREE.DoubleSide} roughness={0.5} />
    </instancedMesh>
  );
}
