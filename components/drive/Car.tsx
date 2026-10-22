"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  MeshStandardMaterial,
  Vector3,
  type Group,
  type PerspectiveCamera,
} from "three";
import { readInput, requests, type DriveInput } from "./input";
import { createCar, gearFor, stepCar, TOP_SPEED, type Surface } from "./physics";
import { telemetry } from "./telemetry";
import { blobTexture, numberTexture } from "./textures";
import {
  CHECKPOINTS,
  CRICKET,
  FOOTBALL,
  HALF_WIDTH,
  KERB_WIDTH,
  SAMPLES,
  SECTOR_SPLITS,
  ZONE_RADIUS,
  headingAt,
  inPitBox,
  kerbAt,
  nearestSample,
  onApron,
  samples,
} from "./circuit";

export type Zone = "garage" | "cricket" | "football" | null;

export type RaceEvent =
  | { type: "checkpoint"; index: number }
  | { type: "sector"; sector: number; time: number; valid: boolean }
  | { type: "lap"; time: number; valid: boolean }
  | { type: "zone"; zone: Zone }
  | { type: "invalid" };

type Props = {
  /** false until lights out */
  enabled: boolean;
  reducedMotion: boolean;
  onEvent: (e: RaceEvent) => void;
};

// Grid slot: a few metres behind the line, slightly left of centre
const GRID_BACK = 5; // samples
const START_INDEX = SAMPLES - GRID_BACK;

const IDLE: DriveInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };

const wrap = (d: number) => {
  if (d > SAMPLES / 2) return d - SAMPLES;
  if (d < -SAMPLES / 2) return d + SAMPLES;
  return d;
};

function spawn(index: number, lateral = 0) {
  const s = samples[index];
  return createCar(s.x + s.nx * lateral, s.z + s.nz * lateral, headingAt(index));
}

export function Car({ enabled, reducedMotion, onEvent }: Props) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const steerL = useRef<Group>(null);
  const steerR = useRef<Group>(null);
  const spinFL = useRef<Group>(null);
  const spinFR = useRef<Group>(null);
  const spinRL = useRef<Group>(null);
  const spinRR = useRef<Group>(null);
  const rainLight = useRef<MeshStandardMaterial>(null);

  const car = useRef(spawn(START_INDEX, 3));
  const race = useRef({
    idx: START_INDEX,
    lapProgress: -GRID_BACK, // samples past the line this lap
    lapTime: 0,
    lastSplit: 0,
    valid: true,
    running: false,
    zone: null as Zone,
    spin: 0,
    snapCamera: true,
  });
  const cam = useRef({ pos: new Vector3(), look: new Vector3(), tmp: new Vector3() });

  const mats = useMemo(
    () => ({
      red: new MeshStandardMaterial({ color: "#e10600", roughness: 0.35, metalness: 0.25, flatShading: true }),
      white: new MeshStandardMaterial({ color: "#f3f4f6", roughness: 0.4, flatShading: true }),
      carbon: new MeshStandardMaterial({ color: "#121418", roughness: 0.6 }),
      halo: new MeshStandardMaterial({ color: "#23262d", roughness: 0.5, metalness: 0.4 }),
      tyre: new MeshStandardMaterial({ color: "#16171a", roughness: 0.9, flatShading: true }),
      rim: new MeshStandardMaterial({ color: "#8a909c", roughness: 0.3, metalness: 0.7 }),
      helmet: new MeshStandardMaterial({ color: "#ffc531", roughness: 0.3 }),
      number: new MeshStandardMaterial({ map: numberTexture("08"), transparent: true, roughness: 0.4 }),
    }),
    [],
  );
  const shadow = useMemo(() => blobTexture(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const c = car.current;
    const r = race.current;

    // Reset to the nearest point on the centre line, facing the right way
    if (requests.reset) {
      requests.reset = false;
      const near = nearestSample(c.x, c.z, r.idx);
      car.current = spawn(near.index);
      r.idx = near.index;
      r.snapCamera = true;
    }
    const cs = car.current;

    if (enabled && !r.running) r.running = true;
    const input = enabled ? readInput() : IDLE;

    // Surface under the car
    const near = nearestSample(cs.x, cs.z, r.idx);
    const off = Math.abs(near.lateral);
    let surface: Surface = "grass";
    if (off <= HALF_WIDTH) surface = "track";
    else if (off <= HALF_WIDTH + KERB_WIDTH && kerbAt[near.index]) surface = "kerb";
    else if (onApron(cs.x, cs.z)) surface = "track";

    stepCar(cs, input, dt, surface);

    // ---- lap progress, sectors, checkpoints
    const step = wrap(near.index - r.idx);
    const prev = r.lapProgress;
    if (Math.abs(step) > 40) {
      // jumped across the infield: still timed, but it won't count as a best
      if (r.valid && r.running) onEvent({ type: "invalid" });
      r.valid = false;
    } else {
      r.lapProgress += step;
    }
    r.idx = near.index;
    const now = r.lapProgress;

    if (r.running) {
      r.lapTime += dt;
      CHECKPOINTS.forEach((cp, k) => {
        if (prev < cp && now >= cp) onEvent({ type: "checkpoint", index: k });
      });
      SECTOR_SPLITS.forEach((sp, k) => {
        if (prev < sp && now >= sp) {
          onEvent({ type: "sector", sector: k, time: r.lapTime - r.lastSplit, valid: r.valid });
          r.lastSplit = r.lapTime;
        }
      });
      if (now >= SAMPLES) {
        onEvent({ type: "sector", sector: 2, time: r.lapTime - r.lastSplit, valid: r.valid });
        onEvent({ type: "lap", time: r.lapTime, valid: r.valid });
        r.lapProgress -= SAMPLES;
        r.lapTime = 0;
        r.lastSplit = 0;
        r.valid = true;
      }
    }

    // ---- off-track places
    const speed = Math.abs(cs.forward);
    let zone: Zone = null;
    // the garage opens once you stop in the box and stays open until you leave it
    if (inPitBox(cs.x, cs.z)) zone = r.zone === "garage" || speed < 2 ? "garage" : null;
    else if (Math.hypot(cs.x - CRICKET.x, cs.z - CRICKET.z) < ZONE_RADIUS.cricket) zone = "cricket";
    else if (Math.hypot(cs.x - FOOTBALL.x, cs.z - FOOTBALL.z) < ZONE_RADIUS.football) zone = "football";
    if (zone !== r.zone) {
      r.zone = zone;
      onEvent({ type: "zone", zone });
    }

    // ---- telemetry for the HUD
    telemetry.speedKmh = speed * 3.6;
    telemetry.gear = gearFor(cs.forward, input.throttle);
    telemetry.lapTime = r.lapTime;
    telemetry.progress = Math.max(0, Math.min(1, now / SAMPLES));
    telemetry.offTrack = surface === "grass" && !onApron(cs.x, cs.z);

    // ---- visuals
    const g = root.current;
    if (g) {
      g.position.set(cs.x, 0, cs.z);
      g.rotation.y = cs.heading;
    }
    if (body.current) {
      // a little roll into the slide and pitch under braking
      body.current.rotation.z = Math.max(-0.05, Math.min(0.05, -cs.slip * 0.012));
      const pitch = input.brake && cs.forward > 1 ? 0.025 : input.throttle ? -0.012 : 0;
      body.current.rotation.x += (pitch - body.current.rotation.x) * Math.min(1, dt * 8);
    }
    r.spin += (cs.forward * dt) / 0.34;
    for (const w of [spinFL, spinFR, spinRL, spinRR]) if (w.current) w.current.rotation.x = r.spin;
    if (steerL.current) steerL.current.rotation.y = -cs.steer;
    if (steerR.current) steerR.current.rotation.y = -cs.steer;
    if (rainLight.current) rainLight.current.emissiveIntensity = input.brake || input.handbrake ? 3 : 0.6;

    // ---- chase camera
    const camera = state.camera as PerspectiveCamera;
    const fx = Math.sin(cs.heading);
    const fz = Math.cos(cs.heading);
    const k = cam.current;
    const back = 8.5 + speed * 0.025;
    k.tmp.set(cs.x - fx * back, 3.1 + speed * 0.008, cs.z - fz * back);
    const lookAhead = 5 + speed * 0.05;
    const lookX = cs.x + fx * lookAhead;
    const lookZ = cs.z + fz * lookAhead;
    if (r.snapCamera) {
      k.pos.copy(k.tmp);
      k.look.set(lookX, 1, lookZ);
      r.snapCamera = false;
    } else {
      k.pos.lerp(k.tmp, 1 - Math.exp(-dt * 4.5));
      k.look.lerp(k.tmp.set(lookX, 1, lookZ), 1 - Math.exp(-dt * 9));
    }
    camera.position.copy(k.pos);
    if (!reducedMotion && speed > 8 && surface !== "track") {
      const amt = surface === "grass" ? 0.06 : 0.025;
      camera.position.x += (Math.random() - 0.5) * amt;
      camera.position.y += (Math.random() - 0.5) * amt;
    }
    camera.lookAt(k.look);
    const fov = 58 + (speed / TOP_SPEED) * (reducedMotion ? 6 : 20);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <group ref={root}>
      {/* contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, -0.1]}>
        <planeGeometry args={[2.8, 6.2]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>

      <group ref={body}>
        {/* floor and plank */}
        <mesh material={mats.carbon} position={[0, 0.12, -0.2]}>
          <boxGeometry args={[1.5, 0.06, 4.4]} />
        </mesh>
        {/* nose */}
        <mesh material={mats.red} position={[0, 0.3, 1.85]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.36, 0.22, 1.5]} />
        </mesh>
        <mesh material={mats.white} position={[0, 0.23, 2.62]}>
          <boxGeometry args={[0.3, 0.13, 0.3]} />
        </mesh>
        <mesh material={mats.number} position={[0, 0.425, 1.55]} rotation={[-Math.PI / 2 + 0.08, 0, Math.PI]}>
          <planeGeometry args={[0.34, 0.34]} />
        </mesh>
        {/* cockpit tub */}
        <mesh material={mats.red} position={[0, 0.42, 0.45]}>
          <boxGeometry args={[0.8, 0.45, 1.5]} />
        </mesh>
        <mesh material={mats.carbon} position={[0, 0.65, 0.3]}>
          <boxGeometry args={[0.5, 0.04, 0.75]} />
        </mesh>
        <mesh material={mats.helmet} position={[0, 0.78, 0.12]}>
          <sphereGeometry args={[0.16, 10, 8]} />
        </mesh>
        {/* halo */}
        <mesh material={mats.halo} position={[0, 0.84, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.035, 6, 14, Math.PI]} />
        </mesh>
        <mesh material={mats.halo} position={[0, 0.74, 0.52]}>
          <boxGeometry args={[0.05, 0.2, 0.05]} />
        </mesh>
        {/* sidepods with a white stripe */}
        <mesh material={mats.red} position={[0, 0.36, -0.55]}>
          <boxGeometry args={[1.45, 0.38, 1.6]} />
        </mesh>
        <mesh material={mats.white} position={[0, 0.5, -0.55]}>
          <boxGeometry args={[1.47, 0.05, 1.6]} />
        </mesh>
        <mesh material={mats.carbon} position={[0, 0.38, 0.26]}>
          <boxGeometry args={[1.46, 0.22, 0.04]} />
        </mesh>
        {/* engine cover, airbox, fin */}
        <mesh material={mats.red} position={[0, 0.6, -1.15]}>
          <boxGeometry args={[0.62, 0.5, 1.5]} />
        </mesh>
        <mesh material={mats.red} position={[0, 0.45, -2.0]}>
          <boxGeometry args={[0.36, 0.3, 0.6]} />
        </mesh>
        <mesh material={mats.red} position={[0, 0.95, -0.35]}>
          <boxGeometry args={[0.34, 0.32, 0.6]} />
        </mesh>
        <mesh material={mats.carbon} position={[0, 0.98, -0.04]}>
          <boxGeometry args={[0.24, 0.2, 0.03]} />
        </mesh>
        <mesh material={mats.white} position={[0, 1.0, -1.2]}>
          <boxGeometry args={[0.03, 0.42, 1.1]} />
        </mesh>
        <mesh material={mats.number} position={[0.316, 0.62, -1.15]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.46, 0.46]} />
        </mesh>
        <mesh material={mats.number} position={[-0.316, 0.62, -1.15]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.46, 0.46]} />
        </mesh>
        {/* front wing */}
        <mesh material={mats.carbon} position={[0, 0.1, 2.55]}>
          <boxGeometry args={[1.9, 0.04, 0.5]} />
        </mesh>
        <mesh material={mats.red} position={[0, 0.17, 2.42]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[1.9, 0.04, 0.25]} />
        </mesh>
        {[0.95, -0.95].map((x) => (
          <mesh key={x} material={mats.white} position={[x, 0.16, 2.5]}>
            <boxGeometry args={[0.04, 0.24, 0.6]} />
          </mesh>
        ))}
        {/* rear wing */}
        <mesh material={mats.red} position={[0, 0.92, -2.35]}>
          <boxGeometry args={[1.0, 0.05, 0.42]} />
        </mesh>
        <mesh material={mats.white} position={[0, 1.04, -2.45]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[1.0, 0.04, 0.25]} />
        </mesh>
        {[0.52, -0.52].map((x) => (
          <mesh key={x} material={mats.carbon} position={[x, 0.82, -2.38]}>
            <boxGeometry args={[0.04, 0.5, 0.65]} />
          </mesh>
        ))}
        <mesh material={mats.carbon} position={[0, 0.45, -2.35]}>
          <boxGeometry args={[0.9, 0.04, 0.25]} />
        </mesh>
        <mesh material={mats.carbon} position={[0, 0.68, -2.25]}>
          <boxGeometry args={[0.06, 0.45, 0.12]} />
        </mesh>
        {/* rain light, brighter under braking */}
        <mesh position={[0, 0.4, -2.56]}>
          <boxGeometry args={[0.16, 0.08, 0.03]} />
          <meshStandardMaterial ref={rainLight} color="#ff2a1f" emissive="#ff1a10" emissiveIntensity={0.6} />
        </mesh>
        {/* suspension arms */}
        <mesh material={mats.carbon} position={[0, 0.33, 1.6]}>
          <boxGeometry args={[1.35, 0.04, 0.06]} />
        </mesh>
        <mesh material={mats.carbon} position={[0, 0.36, -1.75]}>
          <boxGeometry args={[1.3, 0.04, 0.06]} />
        </mesh>
      </group>

      {/* wheels: steer group > spin group > tyre */}
      <group ref={steerL} position={[0.82, 0.33, 1.6]}>
        <group ref={spinFL}>
          <Wheel radius={0.33} width={0.34} tyre={mats.tyre} rim={mats.rim} />
        </group>
      </group>
      <group ref={steerR} position={[-0.82, 0.33, 1.6]}>
        <group ref={spinFR}>
          <Wheel radius={0.33} width={0.34} tyre={mats.tyre} rim={mats.rim} />
        </group>
      </group>
      <group ref={spinRL} position={[0.8, 0.36, -1.75]}>
        <Wheel radius={0.36} width={0.42} tyre={mats.tyre} rim={mats.rim} />
      </group>
      <group ref={spinRR} position={[-0.8, 0.36, -1.75]}>
        <Wheel radius={0.36} width={0.42} tyre={mats.tyre} rim={mats.rim} />
      </group>
    </group>
  );
}

function Wheel({
  radius,
  width,
  tyre,
  rim,
}: {
  radius: number;
  width: number;
  tyre: MeshStandardMaterial;
  rim: MeshStandardMaterial;
}) {
  return (
    <group>
      <mesh material={tyre} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, width, 14]} />
      </mesh>
      <mesh material={rim} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.6, radius * 0.6, width + 0.02, 8]} />
      </mesh>
      {/* a spoke so you can see the wheel turn */}
      <mesh material={tyre}>
        <boxGeometry args={[width + 0.04, 0.06, radius * 1.1]} />
      </mesh>
    </group>
  );
}
