"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CoefficientCombineRule,
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { RigContext, liveryOf, vehicleByCode, type VehicleDef, type VehicleRig } from "./vehicles";
import { input } from "./input";
import { carState, ticker } from "./carState";
import { getState, setState, subscribe, toast, useWorld } from "./store";
import { PowerTrail } from "./powers/Trail";
import { Thrusters } from "./powers/Thrusters";
import { CAR_GROUPS, usePowers } from "./powers/usePowers";
import { power } from "./powers/state";
import { dayNight } from "./daynight";
import { heightAt } from "./terrain";
import { setWheelLocal } from "./alive/ground";
import { SEA_Y, SPAWN, headingFromTangent, nearestT3, trackPoint, trackTangent, zoneById } from "./layout";
import { engineIdle, engineUpdate, honk } from "./sound";

// Driving model ported from folio-2025 (MIT, see public/vendor/LICENSE.md),
// sources/Game/Physics/PhysicsVehicle.js and Player.js: same engine, brake and
// steering formulas, same suspension and friction settings, same 2x time scale.
// The wheel layout and the handling numbers come from each vehicle (vehicles/index.tsx).

type VehicleController = ReturnType<
  ReturnType<typeof useRapier>["world"]["createVehicleController"]
>;

const STEERING_AMPLITUDE = 0.5;
const ENGINE_FORCE = 300;
const TOP_SPEED = 5;
const BRAKE_AMPLITUDE = 35; // The original value, used for the idle and reverse brake
// Space brake: the original full 35 on every wheel stops the car dead. Ours ramps in
// and is gentler, and the rear lets go a little, so it slides down to a stop.
const HANDBRAKE_AMPLITUDE = 4;
const HANDBRAKE_RAMP = 0.4; // seconds to full brake
const HANDBRAKE_REAR_GRIP = 1.6; // rear side friction while braking (normal: SIDE_FRICTION)
const IDLE_BRAKE = 0.06;
// Low-speed grip: below LOW_SPEED (m/s) the tyres' side grip eases down to LOW_SIDE of
// normal. At a crawl with the wheels turned, full side friction overshot every step and
// the car shook left-right as it stopped (measured: the yaw rate flipped sign ~200 times
// in 6 s; with this, none).
const LOW_SPEED = 1.5;
const LOW_SIDE = 0.3;
const REVERSE_BRAKE = 0.4;

const SUSPENSION = {
  restLength: 0.7,
  stiffness: 20,
  // more damping than the original's jeep: the low F1 body dived and bounced at every stop
  compression: 14,
  relaxation: 6,
  maxTravel: 2,
  maxForce: 150,
};
const FRICTION_SLIP = 0.9;
const SIDE_FRICTION = 3;
// Static compression the springs settle at, measured in the headless check.
const SAG = 0.34;
// Wheel visuals stay within this of their resting height, whatever the raycast says
// (a ray starting inside a wall or post reports a wild suspension length).
const WHEEL_REST = SUSPENSION.restLength - SAG;
const WHEEL_PLAY = 0.25;
// The chassis centre rides ~0.45 m above the ground. Below the ground it has been
// shoved through the terrain (a post or wall at speed): respawn instead of
// leaving the body buried with the wheels sticking out.
const BURIED = 0.15;
/** Chassis centre height above the ground at rest, the same for every vehicle. */
const RIDE = 0.43;
// Dropped from a hair above rest. From any higher (the old 0.45 m) the car bounced on its
// springs at every load and teleport.
const REST_Y = RIDE + 0.02;
/** The old car's wheelbase (m): steering is scaled from it so every vehicle turns alike at the same handling. */
const BASE_WHEELBASE = 2.48;
const BASE_TRACK = 1.38;
/**
 * The vehicles are modelled in true metres (TH-18 5.6 m long) for the proposal's 12 m road; the
 * game's road is 8 m (layout.ts TRACK_WIDTH), so they drive at 2/3 size to keep the proposal's
 * car-to-road proportion (owner, 2026-10-26: the F1 looked too big for the world).
 */
export const VEHICLE_SCALE = 8 / 12;
const S = VEHICLE_SCALE;
/** The bike rides on two pairs of wheels this far either side of its centre line (hidden), and stays upright. */
const BIKE_TRACK = 0.28;
const BIKE_UPRIGHT = 10; // roll rate (rad/s) per rad of roll that brings the bike back up
const BIKE_LEAN_MAX = 0.7;

/**
 * Each vehicle's handling, from its garage stats [speed, grip, handling] (0..100):
 * - speed scales the top speed (steeply: the cap is soft) and a little of the engine force
 *   (90 = the old car),
 * - grip scales the tyres' side friction,
 * - handling scales the steering lock, which also grows with the wheelbase so a long car
 *   turns as tightly as a short one at the same handling, and the yaw inertia shrinks with it.
 * Inertia grows with the size the old car had: pitch with the wheelbase squared, roll with the
 * track squared (a long car on old-car inertia rocked on its springs and never got going).
 * E14 pulls harder than its speed says (its best event was acceleration).
 * The rest are the old car's numbers. Dev and headless checks: window.__tune is the live
 * vehicle's table (change it to compare variants).
 */
function tuneOf(def: VehicleDef) {
  const [speed, grip, handling] = def.stats;
  const k = (speed / 90) ** 1.5;
  const fz = Math.max(...def.wheels.map((w) => w.z)) * S;
  const rz = Math.min(...def.wheels.map((w) => w.z)) * S;
  const wheelbase = fz - rz;
  const track = Math.max(0.6, 2 * S * Math.max(...def.wheels.map((w) => Math.abs(w.x))));
  const L = (wheelbase / BASE_WHEELBASE) ** 2;
  return {
    idleBrake: IDLE_BRAKE,
    sideFriction: (SIDE_FRICTION * grip) / 90,
    // frontBrake < 0: the front idle brake fades out as the wheels turn (a turned, braked
    // front wheel kicked the yaw the other way when the throttle came off)
    frontBrake: -1,
    easeAng: 4,
    lowSide: LOW_SIDE,
    lowSpeed: LOW_SPEED,
    topSpeed: TOP_SPEED * k,
    engine: ENGINE_FORCE * (def.code === "V02" ? 1.05 : 0.8 + (0.2 * speed) / 90),
    steer: Math.atan(((Math.tan(STEERING_AMPLITUDE) * wheelbase) / BASE_WHEELBASE) * (handling / 82)),
    /** roll, yaw, pitch (the chassis frame's x, y, z) */
    inertia: [1.9 * (track / BASE_TRACK) ** 2, 1.9 * L * (82 / handling), 1.9 * L] as [number, number, number],
  };
}
type Tune = ReturnType<typeof tuneOf>;

/** Everything the physics needs from a vehicle, in the chassis frame (forward +X, right +Z). */
function specOf(def: VehicleDef) {
  const bike = def.wheels.length === 2;
  // model space (nose +z, left +x) to the chassis frame: x = model z, z = -model x
  const wheels = def.wheels.flatMap((w, i) =>
    (bike ? [BIKE_TRACK, -BIKE_TRACK] : [-w.x * S]).map((z) => ({
      slot: i,
      pos: new THREE.Vector3(w.z * S, -RIDE + w.r * S + WHEEL_REST, z),
      front: w.front,
      radius: w.r * S,
    })),
  );
  const fz = Math.max(...def.wheels.map((w) => w.z)) * S;
  const rz = Math.min(...def.wheels.map((w) => w.z)) * S;
  const halfW = Math.max(...def.wheels.map((w) => Math.abs(w.x))) * S;
  const min = def.box.min.map((v) => v * S);
  const max = def.box.max.map((v) => v * S);
  const top = Math.min(max[1], 1.2) - RIDE;
  return {
    bike,
    wheels,
    /** the physics wheels behind each visible wheel (two for each bike wheel) */
    slots: def.wheels.map((_, i) => wheels.flatMap((w, j) => (w.slot === i ? [j] : []))),
    /** the mass box: between the axles, so a crest meets the tyres first */
    chassis: { half: [(fz - rz) / 2, 0.19, bike ? BIKE_TRACK : Math.max(0.3, halfW - 0.1)] as const, x: (fz + rz) / 2 },
    /** the massless bumper round the whole body */
    bumper: { half: [(max[2] - min[2]) / 2, (top - 0.03) / 2, Math.max(max[0], -min[0], bike ? BIKE_TRACK + 0.05 : 0)] as const, x: (max[2] + min[2]) / 2, y: (top + 0.03) / 2 },
    tips: def.tips.map(([x, y, z]) => new THREE.Vector3(z * S, y * S - RIDE, -x * S)),
    steerAxis: new THREE.Vector3(...def.steerAxis),
    /** the wheels' contact points (chassis frame), for the powers' dust */
    dust: wheels.map((w) => ({ x: w.pos.x, z: w.pos.z })),
    tune: tuneOf(def),
  };
}
type Spec = ReturnType<typeof specOf>;
const SPECS = new Map<string, Spec>();
const specFor = (def: VehicleDef) => {
  let s = SPECS.get(def.code);
  if (!s) SPECS.set(def.code, (s = specOf(def)));
  return s;
};

const up = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpF = new THREE.Vector3();
const prevPos = new THREE.Vector3();
let snapWheels = true; // set by place(): put the wheel visuals straight at rest
// Parked: after a spawn or teleport the car is held in place (only its height
// settles, damped) until the first drive input, so it never bobs on its springs while the page
// loads (the intro camera copies the car, so any bob shook the whole picture).
const parked = { on: true, p: new THREE.Vector3(), q: new THREE.Quaternion(), still: 0 };
// Hands off and nearly stopped for this long (s): park again where it stands.
// Without it the raycast suspension never quite settles: the car bobs and creeps.
const REPARK_AFTER = 0.4;
const REPARK_SPEED = 0.12; // m/s, horizontal: only once it has all but stopped, so parking is never a visible jolt

// Tyre swap when the weather turns (s): the whole stop, each wheel's share, the delay between wheels.
const SWAP_TIME = 1.3;
const SWAP_EACH = 0.95;
const SWAP_STAGGER = 0.1;
const SWAP_OUT = 0.5; // m the old tyre slides out along the axle
// Wets: the TH-18's paper sidewall band turns blue.
const BAND_DRY = new THREE.MeshStandardMaterial({ color: "#f3f2ed", roughness: 0.7 });
const BAND_WET = new THREE.MeshStandardMaterial({ color: "#1f7fe0", roughness: 0.6 });

/** The player's vehicle: the one picked in the store, remounted whole when it changes. */
export default function Vehicle() {
  const code = useWorld((s) => s.vehicle);
  return <Drive key={code} def={vehicleByCode[code]} />;
}

function Drive({ def }: { def: VehicleDef }) {
  const spec = specFor(def);
  const { wheels: WHEELS, tune, chassis, bumper } = spec;
  const liveryName = useWorld((s) => s.livery);
  const livery = liveryOf(def.code, liveryName);
  const body = useRef<RapierRigidBody>(null);
  const model = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const controller = useRef<VehicleController | null>(null);
  // the model's wheel groups, per visible wheel (WheelSlot), and the TH-18's DRS flap
  const parts = useRef({ steer: [] as (THREE.Group | null)[], swap: [] as (THREE.Group | null)[], spin: [] as (THREE.Group | null)[], drs: null as THREE.Group | null });
  const lamps = useRef<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; base: number }[]>([]);
  const bands = useRef<THREE.Mesh[][]>([]);
  // Tyres: slicks in the dry, wets in the rain. `t` runs 0..1 through a swap.
  const tyres = useRef({ wet: null as boolean | null, to: false, t: 1 });
  const tipA = useRef<THREE.Group | null>(null);
  const tipB = useRef<THREE.Group | null>(null);
  const flipped = useRef(0);
  const wet = useRef(0);
  const buried = useRef(0);
  const lastHud = useRef(0);
  const goingForward = useRef(true);
  const speed = useRef(0); // simulation units per second, like the original's
  const brakeHeld = useRef(0); // seconds the brake has been held
  // The original stuck test: on the throttle, but under 0.5 m covered in the last 3 s.
  const stuck = useRef({ items: [] as [number, number][], told: false });
  const { world } = useRapier();

  const rig = useMemo<VehicleRig>(() => {
    const keep = (list: "steer" | "swap" | "spin") => (i: number) => (el: THREE.Group | null) => {
      parts.current[list][i] = el;
    };
    return {
      steer: keep("steer"),
      swap: keep("swap"),
      spin: keep("spin"),
      drs: (el) => {
        parts.current.drs = el;
      },
    };
  }, []);

  useEffect(() => {
    const b = body.current;
    if (!b) return;
    const v = world.createVehicleController(b);
    for (const w of WHEELS)
      v.addWheel(
        w.pos,
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 },
        SUSPENSION.restLength,
        w.radius,
      );
    for (let i = 0; i < WHEELS.length; i++) {
      v.setWheelFrictionSlip(i, FRICTION_SLIP);
      v.setWheelMaxSuspensionForce(i, SUSPENSION.maxForce);
      v.setWheelMaxSuspensionTravel(i, SUSPENSION.maxTravel);
      v.setWheelSideFrictionStiffness(i, tune.sideFriction);
      v.setWheelSuspensionCompression(i, SUSPENSION.compression);
      v.setWheelSuspensionRelaxation(i, SUSPENSION.relaxation);
      v.setWheelSuspensionStiffness(i, SUSPENSION.stiffness);
    }
    controller.current = v;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __tune: Tune }).__tune = tune;
    // the skid marks, dust and tracks follow this vehicle's wheels
    setWheelLocal(spec.bike ? WHEELS.map((w) => ({ x: w.pos.x, z: Math.sign(w.pos.z) * 0.04, rear: !w.front })) : WHEELS.map((w) => ({ x: w.pos.x, z: w.pos.z, rear: !w.front })));
    // A new vehicle picks up where the last one stood; the first one starts at the spawn.
    if (getState().ready) {
      const f = carState.forward;
      place(b, carState.pos.x, carState.pos.z, Math.atan2(-f.z, f.x));
    } else place(b, SPAWN[0], SPAWN[1], SPAWN[2]);
    const t = b.translation();
    prevPos.set(t.x, t.y, t.z);
    setState({ ready: true });
    return () => {
      world.removeVehicleController(v);
      controller.current = null;
    };
  }, [world, WHEELS, tune, spec]);

  // The lamps glow brighter as brake lights: each vehicle's lamp meshes get their own copy of
  // the material (some are shared with the docs turntables). Again after a livery change.
  useEffect(() => {
    const list: typeof lamps.current = [];
    model.current?.traverse((o) => {
      if (o instanceof THREE.Mesh && o.name === "lamp" && o.material instanceof THREE.MeshStandardMaterial) {
        const mat = o.material.clone();
        list.push({ mesh: o, mat, base: o.material.emissiveIntensity });
        o.userData.lampFrom = o.material;
        o.material = mat;
      }
    });
    lamps.current = list;
    return () => {
      for (const l of list) {
        if (l.mesh.material === l.mat) l.mesh.material = l.mesh.userData.lampFrom;
        l.mat.dispose();
      }
    };
  }, [livery]);

  // The tyre bands that turn blue on wets (TH-18), per visible wheel.
  useEffect(() => {
    bands.current = parts.current.spin.map((g) => {
      const out: THREE.Mesh[] = [];
      g?.traverse((o) => {
        if (o instanceof THREE.Mesh && o.name === "band") out.push(o);
      });
      return out;
    });
  }, []);

  // Teleports from the map menu and the race engineer.
  useEffect(() => {
    let last = getState().teleport?.id;
    return subscribe(() => {
      const tp = getState().teleport;
      if (!tp || tp.id === last || !body.current) return;
      last = tp.id;
      const z = zoneById[tp.zone];
      place(body.current, z.spawn[0], z.spawn[1], z.spawn[2]);
      prevPos.copy(body.current.translation() as THREE.Vector3);
    });
  }, []);

  // Dev and headless checks: window.__placeT(t) drops the car on the track at t;
  // window.__placeXZ(x, z, heading) drops it anywhere on the ground; window.__car is carState.
  useEffect(() => {
    const w = window as unknown as { __placeT: (t: number) => void; __placeXZ: (x: number, z: number, h?: number) => void; __car: typeof carState };
    w.__car = carState;
    w.__placeT = (t: number) => {
      if (!body.current) return;
      const p = trackPoint(t);
      place(body.current, p.x, p.z, headingFromTangent(trackTangent(t)), p.y + 0.9);
      prevPos.copy(body.current.translation() as THREE.Vector3);
    };
    w.__placeXZ = (x: number, z: number, h = 0) => {
      if (!body.current) return;
      place(body.current, x, z, h);
      prevPos.copy(body.current.translation() as THREE.Vector3);
    };
  }, []);

  // Pre-physics: the original PhysicsVehicle.updatePrePhysics.
  useBeforePhysicsStep(() => {
    const v = controller.current;
    if (!v) return;
    const driving = getState().phase === "world";
    const dts = ticker.deltaScaled;
    const b = body.current;
    const touching = input.forward || input.back || input.steer || input.handbrake || power.active !== null;
    // Dev and headless checks: window.__stepLog = [] records every physics step
    // [ground speed, yaw rate, sideways speed, roll, throttle] (use with window.__realtime).
    const log = process.env.NODE_ENV !== "production" ? (window as unknown as { __stepLog?: number[][] }).__stepLog : undefined;
    if (log && b && log.length < 20000) {
      const lv = b.linvel();
      const r = b.rotation();
      tmpQ.set(r.x, r.y, r.z, r.w);
      const side = tmpV.set(0, 0, 1).applyQuaternion(tmpQ);
      log.push([Math.hypot(lv.x, lv.z), b.angvel().y, lv.x * side.x + lv.z * side.z, Math.asin(THREE.MathUtils.clamp(side.y, -1, 1)), input.forward ? 1 : 0]);
    }
    if (!parked.on && b) {
      const lv = b.linvel();
      // hands off and slow: ease to a stop (no bob, no creep) instead of coasting on the springs
      const hs = Math.hypot(lv.x, lv.z);
      const ease = !touching && hs < 2.5 ? 1 - hs / 2.5 : 0;
      b.setLinearDamping(0.1 + ease * 2.5);
      b.setAngularDamping(0.1 + ease * tune.easeAng);
      const slow = Math.hypot(lv.x, lv.z) < REPARK_SPEED && Math.abs(b.angvel().y) < 0.6 && carState.grounded;
      parked.still = !touching && slow ? parked.still + ticker.delta : 0;
      if (parked.still > REPARK_AFTER) {
        const t = b.translation();
        const r = b.rotation();
        parked.on = true;
        parked.p.set(t.x, t.y, t.z);
        parked.q.set(r.x, r.y, r.z, r.w);
      }
    }
    if (parked.on && b) {
      if (driving && touching) {
        parked.on = false;
        parked.still = 0;
      }
      else {
        // x, z and rotation held; the height settles onto the springs, heavily damped, so it never bounces
        const t = b.translation();
        const vy = b.linvel().y;
        b.setTranslation({ x: parked.p.x, y: t.y, z: parked.p.z }, false);
        b.setRotation(parked.q, false);
        b.setLinvel({ x: 0, y: vy * 0.5, z: 0 }, false);
        b.setAngvel({ x: 0, y: 0, z: 0 }, false);
      }
    }
    // The bike's chassis is held upright: its roll rate is replaced by one that undoes the roll.
    // It leans only in the picture (useFrame).
    if (spec.bike && b && !parked.on) {
      const r = b.rotation();
      tmpQ.set(r.x, r.y, r.z, r.w);
      const fwd = tmpF.set(1, 0, 0).applyQuaternion(tmpQ);
      const roll = Math.asin(THREE.MathUtils.clamp(tmpV.set(0, 0, 1).applyQuaternion(tmpQ).y, -1, 1));
      const av = b.angvel();
      const along = av.x * fwd.x + av.y * fwd.y + av.z * fwd.z;
      const want = roll * BIKE_UPRIGHT;
      b.setAngvel({ x: av.x + (want - along) * fwd.x, y: av.y + (want - along) * fwd.y, z: av.z + (want - along) * fwd.z }, true);
    }

    let accelerating = driving ? input.forward - input.back : 0;
    const braking = driving && input.handbrake ? 1 : 0;
    if (braking) accelerating = 0;
    const steering = driving ? -input.steer : 0;

    const overflow = Math.max(0, speed.current - tune.topSpeed);
    let engine = ((accelerating * tune.engine) / (1 + overflow)) * dts;

    brakeHeld.current = braking ? brakeHeld.current + dts / 2 : 0; // dts runs at 2x
    let brake = 0;
    if (braking) brake = Math.min(1, brakeHeld.current / HANDBRAKE_RAMP) ** 1.5 * HANDBRAKE_AMPLITUDE * dts;
    else {
      let b = Math.abs(accelerating) < 0.1 ? tune.idleBrake : 0;
      if (
        speed.current > 0.5 &&
        ((accelerating > 0 && !goingForward.current) ||
          (accelerating < 0 && goingForward.current))
      ) {
        b = REVERSE_BRAKE;
        engine = 0;
      }
      // No power running and over normal top speed (OVERTAKE, SPLIT just ended): ease back to it in
      // about a second (the original lets the car coast down, which feels like the surge lingers).
      if (!power.active && speed.current > tune.topSpeed * 1.15) b = Math.max(b, Math.min(0.35, ((speed.current - tune.topSpeed) / tune.topSpeed) * 0.12));
      brake = b * BRAKE_AMPLITUDE * dts;
    }

    const steer = steering * tune.steer;
    const hsNow = b ? Math.hypot(b.linvel().x, b.linvel().z) : 0;
    const sideK = tune.sideFriction * THREE.MathUtils.lerp(tune.lowSide, 1, Math.min(1, hsNow / tune.lowSpeed));
    for (let i = 0; i < WHEELS.length; i++) {
      v.setWheelSteering(i, WHEELS[i].front ? steer : 0);
      // front brake fades out as the wheels turn (frontBrake < 0) or by a fixed factor
      const fb = tune.frontBrake < 0 ? 1 - Math.min(1, Math.abs(steering)) : tune.frontBrake;
      v.setWheelBrake(i, WHEELS[i].front ? brake * fb : brake);
      v.setWheelEngineForce(i, engine);
      v.setWheelSideFrictionStiffness(i, braking && !WHEELS[i].front ? HANDBRAKE_REAR_GRIP * (tune.sideFriction / SIDE_FRICTION) : sideK);
    }
    // SPLIT: the wheels' rays skip the props it's passing through, so it doesn't ride up on them
    v.updateVehicle(1 / 60, undefined, power.through ? CAR_GROUPS : undefined);
  });
  // the powers move the body after the controller (this registers its step second)
  usePowers({ code: def.code, body, model, lean, box: bumper, wheels: spec.dust, grounded: () => WHEELS.some((_, i) => !!controller.current?.wheelIsInContact(i)) });

  useFrame((_, dt) => {
    const v = controller.current;
    const b = body.current;
    if (!v || !b) return;

    // Post-physics measures, the original's style: speed from how far the body moved this step.
    const t = b.translation();
    tmpP.set(t.x, t.y, t.z);
    const moved = tmpV.copy(tmpP).sub(prevPos);
    speed.current = moved.length() / Math.max(ticker.deltaScaled, 1e-5);
    const r = b.rotation();
    tmpQ.set(r.x, r.y, r.z, r.w);
    carState.forward.set(1, 0, 0).applyQuaternion(tmpQ);
    goingForward.current =
      moved.lengthSq() < 1e-8 ||
      moved.clone().normalize().dot(carState.forward) > 0.5;
    carState.vel.copy(moved).divideScalar(Math.max(dt, 1e-4));
    carState.pos.copy(tmpP);
    prevPos.copy(tmpP);
    carState.speed = speed.current * 2 * (goingForward.current ? 1 : -1); // real m/s at 2x time
    carState.grounded = WHEELS.some((_, i) => v.wheelIsInContact(i));
    {
      const av = b.angvel();
      const side = tmpV.set(0, 0, 1).applyQuaternion(tmpQ); // the car's right/left axis
      carState.motion.yawRate = av.y;
      carState.motion.roll = Math.asin(THREE.MathUtils.clamp(side.y, -1, 1));
      carState.motion.lat = carState.vel.x * side.x + carState.vel.z * side.z;
    }

    const st = stuck.current;
    if (Math.abs(input.forward - input.back) > 0.5 && getState().phase === "world") {
      st.items.unshift([moved.length(), dt]);
      let dist = 0;
      let time = 0;
      let k = 0;
      for (; k < st.items.length && time < 3; k++) {
        dist += st.items[k][0];
        time += st.items[k][1];
      }
      st.items.length = k;
      if (time >= 3 && dist < 0.5 && !st.told) {
        st.told = true;
        toast("Stuck? Press R", "teal");
      } else if (dist > 2) st.told = false;
    } else st.items.length = 0;

    // Wheels follow the suspension (a bike wheel the mean of its pair), turn with the steering and spin.
    const P = parts.current;
    for (let i = 0; i < spec.slots.length; i++) {
      const g = P.steer[i];
      if (!g) continue;
      let len = 0;
      let steerNow = 0;
      for (const j of spec.slots[i]) {
        const raw = v.wheelIsInContact(j) ? v.wheelSuspensionLength(j) ?? WHEEL_REST : WHEEL_REST;
        len += THREE.MathUtils.clamp(raw, WHEEL_REST - WHEEL_PLAY, WHEEL_REST + WHEEL_PLAY) / spec.slots[i].length;
        steerNow = v.wheelSteering(j) ?? 0;
      }
      const ty = (WHEEL_REST - len) / S; // in the model's (unscaled) space
      g.position.y = snapWheels ? ty : g.position.y + (ty - g.position.y) * Math.min(1, dt * 50);
      const ud = g.userData as { steer?: number };
      const was = ud.steer ?? 0;
      // the bike's bars turn less than the physics wheels: it leans into the corner instead
      const steerVis = (spec.bike ? 0.5 : 1) * steerNow;
      ud.steer = was + (steerVis - was) * Math.min(1, dt * 32);
      g.quaternion.setFromAxisAngle(spec.steerAxis, ud.steer);
      const s = P.spin[i];
      if (s && !input.handbrake) s.rotation.x += (carState.speed / (def.wheels[i].r * S)) * dt;
    }
    snapWheels = false;

    // The bike leans into corners (the chassis stays upright): lean from the sideways pull.
    if (lean.current) {
      const want = spec.bike ? THREE.MathUtils.clamp(-Math.atan((speed.current * b.angvel().y) / 9.81), -BIKE_LEAN_MAX, BIKE_LEAN_MAX) : 0;
      lean.current.rotation.x += (want - lean.current.rotation.x) * Math.min(1, dt * 6);
    }

    // Rain starts or stops: a quick pit-stop swap, each tyre pops off sideways and the
    // new one springs on, a few hundredths apart. On load the right set is simply fitted.
    const ty = tyres.current;
    const wantWet = getState().scene.weather === "rain";
    if (ty.wet === null) ty.wet = ty.to = wantWet;
    else if (ty.t >= 1 && wantWet !== ty.wet) {
      ty.to = wantWet;
      ty.t = 0;
    }
    if (ty.t < 1) {
      ty.t = Math.min(1, ty.t + Math.min(dt, 1 / 30) / SWAP_TIME);
      for (let i = 0; i < def.wheels.length; i++) {
        const g = P.swap[i];
        if (!g) continue;
        const k = THREE.MathUtils.clamp((ty.t * SWAP_TIME - i * SWAP_STAGGER) / SWAP_EACH, 0, 1);
        const side = Math.sign(def.wheels[i].x) || 1;
        if (k < 0.45) {
          const out = (k / 0.45) ** 2;
          g.position.x = side * SWAP_OUT * out;
          g.scale.setScalar(1 - out);
        } else {
          for (const m of bands.current[i] ?? []) m.material = ty.to ? BAND_WET : BAND_DRY;
          const u = (k - 0.45) / 0.55;
          const c = 2.2; // back-out overshoot
          const s = 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
          g.position.x = side * SWAP_OUT * (1 - u) ** 2;
          g.scale.setScalar(Math.max(0, s));
        }
      }
      if (ty.t >= 1) {
        ty.wet = ty.to;
        for (const g of P.swap) {
          g?.position.setX(0);
          g?.scale.setScalar(1);
        }
      }
    } else for (const list of bands.current) for (const m of list) m.material = ty.wet ? BAND_WET : BAND_DRY;
    carState.tyres.wet = ty.t < 1 ? ty.to : ty.wet;
    carState.tyres.swap = ty.t;

    // The tail lamps glow a little, more at night, and flare as brake lights (handbrake,
    // or S while still rolling forward). Not tone mapped, so the flare blooms.
    const brakeLight = input.handbrake || (input.back > 0 && carState.speed > 1);
    const glow = brakeLight ? 2 : 0.55 + dayNight.night * 0.45;
    for (const l of lamps.current) l.mat.emissiveIntensity = l.base * glow;

    // DRS (TH-18): the flap opens with OVERTAKE.
    if (P.drs) {
      const want = -0.45 * power.drs;
      P.drs.rotation.x += (want - P.drs.rotation.x) * Math.min(1, dt * 12);
    }

    // Recover from flips and falls.
    tmpV.set(0, 1, 0).applyQuaternion(tmpQ);
    flipped.current = tmpV.y < 0.25 ? flipped.current + dt : 0;
    // In deep water (past the shallows) for a second: back onto the road, like the original respawn.
    wet.current = SEA_Y - heightAt(t.x, t.z) > 0.7 && t.y < SEA_Y + 0.4 ? wet.current + dt : 0;
    buried.current = t.y < heightAt(t.x, t.z) - BURIED ? buried.current + dt : 0;
    if (input.reset || flipped.current > 1.6 || wet.current > 1 || buried.current > 0.1 || t.y < heightAt(t.x, t.z) - 4) {
      input.reset = false;
      flipped.current = 0;
      wet.current = 0;
      buried.current = 0;
      if (t.y < heightAt(t.x, t.z) - 4) place(b, SPAWN[0], SPAWN[1], SPAWN[2]);
      else {
        // Back onto the nearest bit of road, facing the way you were going (the original R).
        const rt = nearestT3(t.x, t.y, t.z);
        const p = trackPoint(rt);
        const tan = trackTangent(rt);
        if (tan.x * carState.forward.x + tan.z * carState.forward.z < 0) tan.negate();
        place(b, p.x, p.z, headingFromTangent(tan), p.y + 0.9);
      }
      prevPos.copy(b.translation() as THREE.Vector3);
    }
    if (input.honk) {
      input.honk = false;
      honk();
    }

    if (getState().phase === "world") {
      engineUpdate(Math.abs(carState.speed) * 3.6, Math.abs(input.forward - input.back), power.active !== null, input.handbrake);
    } else engineIdle();

    lastHud.current += dt;
    if (lastHud.current > 0.1) {
      lastHud.current = 0;
      const kmh = Math.round(Math.abs(carState.speed) * 3.6);
      if (kmh !== getState().speed) setState({ speed: kmh });
    }
  });

  const inertia = tune.inertia;
  return (
    <>
      <PowerTrail anchor={tipA} />
      <PowerTrail anchor={tipB} />
      <RigidBody
        ref={body}
        colliders={false}
        position={[SPAWN[0], heightAt(SPAWN[0], SPAWN[1]) + REST_Y, SPAWN[1]]}
        linearDamping={0.1}
        angularDamping={0.1}
        canSleep={false}
        ccd
      >
        {/* The original chassis: mass 2.5 with the centre of mass well below the body.
            The colliders ride higher than the low bodies (the bumper 0.46 m off the ground)
            and the mass box only spans the axles, so a vehicle never beaches on a crest or
            a bank; a body may dip into the grass a little, which reads as cartoony. */}
        <CuboidCollider
          args={[...chassis.half]}
          position={[chassis.x, 0.19, 0]}
          collisionGroups={CAR_GROUPS}
          friction={0.4}
          massProperties={{
            mass: 2.5,
            centerOfMass: { x: chassis.x, y: -0.5, z: 0 },
            principalAngularInertia: { x: inertia[0], y: inertia[1], z: inertia[2] },
            angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 },
          }}
        />
        {/* The original bumper: a massless, frictionless box round the whole body,
            so walls push the vehicle along instead of catching a tyre, and no wheel
            ever pokes into a wall or a building. */}
        <CuboidCollider
          args={[...bumper.half]}
          position={[bumper.x, bumper.y, 0]}
          density={0}
          friction={0}
          collisionGroups={CAR_GROUPS}
          frictionCombineRule={CoefficientCombineRule.Min}
          restitution={0.05}
        />
        {/* the model stands on the ground line (and the bike leans about it); nose +z turned to +X */}
        <group ref={lean} position={[0, -RIDE, 0]}>
          <group ref={model} rotation={[0, Math.PI / 2, 0]} scale={S}>
            <RigContext.Provider value={rig}>
              <def.Model livery={livery} />
            </RigContext.Provider>
            {def.code === "V03" && <Thrusters />}
          </group>
        </group>
        {spec.tips.map((p, i) => (
          <group key={i} position={p} ref={i === 0 ? tipA : tipB} />
        ))}
      </RigidBody>
    </>
  );
}

function place(b: RapierRigidBody, x: number, z: number, heading: number, y = heightAt(x, z) + REST_Y) {
  const q = new THREE.Quaternion().setFromAxisAngle(up, heading);
  b.setTranslation({ x, y, z }, true);
  b.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
  b.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.setAngvel({ x: 0, y: 0, z: 0 }, true);
  snapWheels = true;
  parked.on = true;
  parked.p.set(x, y, z);
  parked.q.copy(q);
}
