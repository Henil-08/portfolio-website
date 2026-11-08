"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CoefficientCombineRule,
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  useFilterContactPair,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { VEHICLE_DISPLAY, VEHICLE_SCALE, vehicleScale } from "./vehicles/scale";
import { garageBusy, garageView } from "./garage/state";
import { RigContext, liveryOf, vehicleByCode, type VehicleDef, type VehicleRig } from "./vehicles";
import { check, merge, unmerge, type Baked } from "./vehicles/merge";
import { swapping } from "./bloom/swap";
import { input } from "./input";
import { carState, sweepable, ticker } from "./carState";
import { getState, setState, subscribe, toast, useWorld } from "./store";
import { PowerTrail } from "./powers/Trail";
import { Thrusters } from "./powers/Thrusters";
import { CAR_GROUPS, SWEEP_GROUPS, usePowers } from "./powers/usePowers";
import { power } from "./powers/state";
import { dayNight } from "./daynight";
import { EXTENT, GRID, heightAt, heightGrid } from "./terrain";
import { setWheelLocal } from "./alive/ground";
import { PIT, SEA_Y, SPAWN, headingFromTangent, nearestT3, pitRoadCurves, trackPoint, trackTangent, zoneById } from "./layout";
import { engineIdle, engineUpdate, honk } from "./sound";
import { ease } from "./smooth";

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
// Static compression the springs settle at with 60 fps steps (window.__realtime: 0.156-0.159 for
// every vehicle). The old 0.34 was measured at the slow headless frame rate, where the controller's
// fixed 1/60 against the 2x world step lets the springs sag twice as far: at 60 fps every vehicle
// then rode 0.18 m above its model, the wheels hanging out of the arches and the bumper over the
// football. (Faster screens sag less: 120 Hz rides ~0.08 m high, still on the ground.)
const SAG = 0.16;
// Wheel visuals stay within this of their resting height, whatever the raycast says
// (a ray starting inside a wall or post reports a wild suspension length).
const WHEEL_REST = SUSPENSION.restLength - SAG;
const WHEEL_PLAY = 0.25;
/** The centre of mass this high above the ground at rest: where the original's -0.5 below the
 * chassis put it at the old ride height, so lowering the body to its model changed no handling. */
const COM_HEIGHT = 0.11;
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
export { VEHICLE_SCALE };
/** The bike rides on two pairs of wheels this far either side of its centre line (hidden), and stays upright. */
const BIKE_TRACK = 0.28;
const BIKE_UPRIGHT = 10; // roll rate (rad/s) per rad of roll that brings the bike back up
const BIKE_LEAN_MAX = 0.7;
/**
 * The bumper rides 0.46 m up so a vehicle never beaches on a crest, which is over a football's head:
 * the car drove over the ball, pressed it into the grass and bounced on it. The sweeper is a second,
 * kinematic box on the bumper's footprint that follows the chassis every step. Kinematic bodies never
 * touch the fixed world, and a contact filter lets it push only the balls (carState `sweepable`), so
 * it changes nothing else the car meets. It reaches SWEEP_CLEAR into the ground: with its bottom face
 * above the grass, a bounce of the car let that face catch a ball's top and press it into the ground.
 */
const SWEEP_CLEAR = -0.25;

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
function tuneOf(def: VehicleDef, S: number) {
  const [speed, grip, handling] = def.stats;
  const k = (speed / 90) ** 1.5;
  const fz = Math.max(...def.wheels.map((w) => w.z)) * S;
  const rz = Math.min(...def.wheels.map((w) => w.z)) * S;
  const wheelbase = fz - rz;
  const track = Math.max(0.6, 2 * S * Math.max(...def.wheels.map((w) => Math.abs(w.x))));
  // A vehicle drawn bigger than the rest (vehicles/scale.ts) keeps the inertia of its usual size times
  // the factor: its tyres' longer lever arms then turn it as quickly as before.
  const f = VEHICLE_DISPLAY[def.code];
  const L = ((wheelbase / f / BASE_WHEELBASE) ** 2) * f;
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
  const S = vehicleScale(def.code);
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
    /** world metres per model metre (vehicles/scale.ts) */
    scale: S,
    bike,
    wheels,
    /** the physics wheels behind each visible wheel (two for each bike wheel) */
    slots: def.wheels.map((_, i) => wheels.flatMap((w, j) => (w.slot === i ? [j] : []))),
    /** the mass box: between the axles, so a crest meets the tyres first */
    chassis: { half: [(fz - rz) / 2, 0.19, bike ? BIKE_TRACK : Math.max(0.3, halfW - 0.1)] as const, x: (fz + rz) / 2 },
    /** the massless bumper round the whole body */
    bumper: { half: [(max[2] - min[2]) / 2, (top - 0.03) / 2, Math.max(max[0], -min[0], bike ? BIKE_TRACK + 0.05 : 0)] as const, x: (max[2] + min[2]) / 2, y: (top + 0.03) / 2 },
    /** the ball sweeper (SWEEP_CLEAR): the bumper's footprint, from under the ground to the bumper's top */
    sweep: { half: [(max[2] - min[2]) / 2, (top + RIDE - SWEEP_CLEAR) / 2, Math.max(max[0], -min[0], bike ? BIKE_TRACK + 0.05 : 0)] as const, x: (max[2] + min[2]) / 2, y: (top - RIDE + SWEEP_CLEAR) / 2 },
    steerAxis: new THREE.Vector3(...def.steerAxis),
    /** the wheels' contact points (chassis frame), for the powers' dust */
    dust: wheels.map((w) => ({ x: w.pos.x, z: w.pos.z })),
    tune: tuneOf(def, S),
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
const sweepP = new THREE.Vector3();
const sweepQ = new THREE.Quaternion();
/** The wheels' rays ignore balls (they're kicked by the sweeper, not driven over). */
const notBall = (c: { handle: number }) => !sweepable.has(c.handle);

/**
 * Against a wall the car used to climb it: the drive pushes at the tyres, under the centre of mass,
 * and the wall pushes back on the bumper, 0.3-0.5 m above it, so pressing on tipped the nose up the
 * wall (a door at 15 km/h stood the Atlas 40-50 degrees up; OVERTAKE rode the TH-18 3 m up the pit
 * building). wall.n is the wall the chassis or bumper touches (the last step's contacts with
 * anything that isn't a knock-about prop, floors left out), flat, pointing from the car into it.
 * While it touches, the drive into it is cut, and after the powers have moved the body nothing is
 * left going into the wall nor turning to lift the end against it. A wall the bumper will meet
 * during this step (a shape cast along the velocity) takes the speed into it away at the centre of
 * mass, so the car arrives against it flat instead of being kicked up by the impact. So the car
 * just stops there, at any speed and with any power.
 */
const wall = { on: false, n: new THREE.Vector3(), /** last step's shape cast met a wall (its normal) */ cast: false, cn: new THREE.Vector3() };
/** Nose up past this with both front wheels off and the rear still on: a wheelie (see Drive's guard). */
const WHEELIE = 0.14;
const _cast = new THREE.Vector3();
/** The last bumper cast, for window.__wallLog: time of impact over the step (-1: none), the wall normal's y. */
const castDbg = { toi: -1, ny: 0 };
/** Dev A/B checks: window.__noWallGuard = true turns the wall guard and the wheelie limit off. */
const noGuard = () => process.env.NODE_ENV !== "production" && !!(window as unknown as { __noWallGuard?: boolean }).__noWallGuard;
const _castN = new THREE.Vector3();
/** Both front wheels off the ground and a rear one on it. */
function wheelie(v: VehicleController, wheels: { front: boolean }[]) {
  let front = false;
  let rear = false;
  for (let i = 0; i < wheels.length; i++) {
    if (!v.wheelIsInContact(i)) continue;
    if (wheels[i].front) front = true;
    else rear = true;
  }
  return rear && !front;
}
/** Spin about axis (n x up) lifts the end of the car that faces flat direction n: take it away. */
function dropLift(b: RapierRigidBody, nx: number, nz: number) {
  const av = b.angvel();
  const lift = av.x * -nz + av.z * nx;
  if (lift > 0) b.setAngvel({ x: av.x + nz * lift, y: av.y, z: av.z - nx * lift }, true);
}
function wallTouch(world: ReturnType<typeof useRapier>["world"], colliders: (RapierCollider | null)[]) {
  wall.on = false;
  wall.n.set(0, 0, 0);
  for (const c of colliders) {
    if (!c) continue;
    world.contactPairsWith(c, (other) => {
      if (other.parent()?.isDynamic()) return;
      world.contactPair(c, other, (m, flipped) => {
        if (m.numSolverContacts() === 0) return;
        const n = m.normal();
        if (Math.abs(n.y) > 0.7) return;
        const k = flipped ? -1 : 1;
        wall.n.x += n.x * k;
        wall.n.z += n.z * k;
      });
    });
  }
  if (wall.n.lengthSq() > 1e-6) {
    wall.n.normalize();
    wall.on = true;
  } else if (wall.cast) {
    // not touching yet, but last step's cast arrived at it: count it, so the drive stays off
    wall.n.copy(wall.cn);
    wall.on = true;
  }
  wall.cast = false;
}
let snapWheels = true; // set by place(): put the wheel visuals straight at rest
// carState.pos holds a real pose once a vehicle has run a frame. Before that (StrictMode's dev
// remount runs the mount effect twice before any frame) it is still the origin.
let posLive = false;
/** The player's model group, by name (bloom/Opening.tsx finds it this way). */
export const PLAYER_MODEL = "player-vehicle";
/** The last teleport a vehicle carried out (store `teleport.id`). */
let teleported = -1;
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
  const { wheels: WHEELS, tune, chassis, bumper, scale: S } = spec;
  const liveryName = useWorld((s) => s.livery);
  const livery = liveryOf(def.code, liveryName);
  const body = useRef<RapierRigidBody>(null);
  const model = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const controller = useRef<VehicleController | null>(null);
  const sweeper = useRef<RapierRigidBody>(null);
  const sweepCollider = useRef<RapierCollider | null>(null);
  // the chassis and bumper colliders, for the wall contacts (wallTouch)
  const shell = useRef<(RapierCollider | null)[]>([null, null]);
  const bumperShape = useRef<InstanceType<ReturnType<typeof useRapier>["rapier"]["Cuboid"]> | null>(null);
  // the model's wheel groups, per visible wheel (WheelSlot), and the TH-18's DRS flap
  const parts = useRef({ steer: [] as (THREE.Group | null)[], swap: [] as (THREE.Group | null)[], spin: [] as (THREE.Group | null)[], drs: null as THREE.Group | null });
  const lamps = useRef<{ mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; base: number }[]>([]);
  const bands = useRef<THREE.Mesh[][]>([]);
  // Tyres: slicks in the dry, wets in the rain. `t` runs 0..1 through a swap.
  const tyres = useRef({ wet: null as boolean | null, to: false, t: 1 });
  const flipped = useRef(0);
  const heading = useRef(SPAWN[2]); // the way it was going while upright (a flip rights it facing that way)
  const wet = useRef(0);
  const buried = useRef(0);
  const hung = useRef(0);
  const hungAt = useRef(new THREE.Vector3());
  const lastHud = useRef(0);
  const goingForward = useRef(true);
  const speed = useRef(0); // simulation units per second, like the original's
  const brakeHeld = useRef(0); // seconds the brake has been held
  // The original stuck test: on the throttle, but under 0.5 m covered in the last 3 s.
  const stuck = useRef({ items: [] as [number, number][], told: false });
  const { world, rapier } = useRapier();

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
    if (posLive) {
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

  // Few draw calls for the vehicle (vehicles/merge.ts): once it has settled (mounted, the swap
  // done, driving), the parts that move together are baked into one mesh per material on their
  // own group. A new vehicle or livery puts them back first, before the swap reads them.
  // Dev: window.__bakeOff = true keeps the parts as they are.
  const bodyRoot = useRef<THREE.Group>(null);
  const baked = useRef<{ b: Baked | null; wait: number; off: boolean; tick: number }>({ b: null, wait: 0, off: false, tick: 0 });
  useLayoutEffect(() => {
    const st = baked.current;
    st.wait = 0;
    return () => {
      unmerge(st.b);
      st.b = null;
    };
  }, [def.code, livery]);
  useFrame(() => {
    const st = baked.current;
    const root = bodyRoot.current;
    const devOff = process.env.NODE_ENV !== "production" && (window as unknown as { __bakeOff?: boolean }).__bakeOff;
    if (st.off || devOff || !root) {
      if (st.b) {
        unmerge(st.b);
        st.b = null;
      }
      return;
    }
    if (!st.b) {
      if (swapping() || getState().phase !== "world" || ++st.wait < 45) return;
      const P = parts.current;
      const anchors = new Set<THREE.Object3D>([...P.steer, ...P.swap, ...P.spin, P.drs].filter((x): x is THREE.Group => !!x));
      st.b = merge(root, anchors);
      return;
    }
    // a hidden part that moved on its own: this vehicle keeps its parts as they are
    if (++st.tick % 30 === 0 && !check(st.b)) {
      unmerge(st.b);
      st.b = null;
      st.off = true;
    }
  });

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

  // Teleports from the map menu and the race engineer. One asked for before the vehicle has run
  // a frame is carried out as it mounts (it used to be dropped): the mount has just put it at the
  // spawn, so even one already carried out goes again (StrictMode mounts twice). After that only
  // new ones: `teleported` outlives each vehicle, so a swap doesn't repeat the last.
  useEffect(() => {
    const go = (mount: boolean) => {
      const tp = getState().teleport;
      if (!tp || !body.current || (tp.id === teleported && !(mount && !posLive))) return;
      teleported = tp.id;
      const z = zoneById[tp.zone];
      place(body.current, z.spawn[0], z.spawn[1], z.spawn[2]);
      prevPos.copy(body.current.translation() as THREE.Vector3);
    };
    go(true);
    return subscribe(() => go(false));
  }, []);

  // Dev and headless checks: window.__placeT(t) drops the car on the track at t;
  // window.__placeXZ(x, z, heading) drops it anywhere on the ground; window.__car is carState.
  useEffect(() => {
    const w = window as unknown as { __placeT: (t: number) => void; __placeXZ: (x: number, z: number, h?: number) => void; __car: typeof carState; __track: object };
    w.__car = carState;
    // the lap for scripted drives in headless checks: nearest t (3D) and a point and tangent at t
    w.__track = { nearestT3, trackPoint, trackTangent, pitRoads: () => pitRoadCurves().map((c) => c.getSpacedPoints(120)), PIT };
    (window as unknown as { __wall: typeof wall }).__wall = wall;
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
    // window.__flip() turns the car onto its roof where it stands (checks the flip recovery)
    (window as unknown as { __flip: () => void }).__flip = () => {
      const b = body.current;
      if (!b) return;
      const t = b.translation();
      const r = b.rotation();
      const q = new THREE.Quaternion(r.x, r.y, r.z, r.w).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI));
      parked.on = false;
      b.setTranslation({ x: t.x, y: t.y + 0.8, z: t.z }, true);
      b.setRotation(q, true);
    };
  }, []);

  // Dev and headless checks: window.__wheels() measures each visible wheel: the tyre's lowest point
  // (the drawn mesh), the drawn surface under it (a ray down onto the scene, the car left out) and
  // the physics wheels behind it (contact point, suspension length, what the ray hit).
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const ray = new THREE.Raycaster();
    const box = new THREE.Box3();
    const c = new THREE.Vector3();
    const mine = (o: THREE.Object3D | null) => {
      for (; o; o = o.parent) if (o === model.current) return true;
      return false;
    };
    (window as unknown as { __wheels: () => unknown }).__wheels = () => {
      const v = controller.current;
      if (!v) return null;
      const ground: THREE.Object3D[] = [];
      scene.traverseVisible((o) => {
        if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh) && !mine(o)) ground.push(o);
      });
      return spec.slots.map((slots, i) => {
        const s = parts.current.spin[i];
        if (!s) return null;
        box.setFromObject(s, true);
        box.getCenter(c);
        ray.set(new THREE.Vector3(c.x, c.y + 0.5, c.z), new THREE.Vector3(0, -1, 0));
        ray.far = 3;
        const hit = ray.intersectObjects(ground, false)[0];
        const r3 = (x: number | undefined) => (x === undefined ? null : +x.toFixed(3));
        const mat = hit && (hit.object as THREE.Mesh).material;
        const col = mat && !Array.isArray(mat) && "color" in mat ? `#${(mat.color as THREE.Color).getHexString()}` : "";
        return {
          x: r3(c.x),
          z: r3(c.z),
          tyre: r3(box.min.y),
          surface: r3(hit?.point.y),
          on: hit ? `${(hit.object as THREE.Mesh).geometry?.type ?? ""}${col}${hit.object.name ? ":" + hit.object.name : ""}` : "",
          physics: slots.map((j) => ({
            contact: v.wheelIsInContact(j),
            len: r3(v.wheelSuspensionLength(j) ?? undefined),
            y: r3(v.wheelContactPoint(j)?.y),
            ground: v.wheelGroundObject(j)?.shape.type ?? null,
          })),
        };
      });
    };
  }, [scene, spec]);

  // Dev and headless checks: window.__groundAudit([[x, z], ...]) compares, at each point, the drawn
  // ground (a ray down onto the scene's meshes, the car and instanced meshes left out) with the
  // physics ground (a ray down onto the fixed colliders): [x, z, drawn y, physics y, what was drawn].
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    // the drawn land: Island.tsx's terrain mesh, its cells split on the (i+1, j)-(i, j+1) diagonal
    // (too many triangles to raycast, so it is evaluated here instead)
    const landY = (x: number, z: number) => {
      const h = heightGrid();
      const n = GRID + 1;
      const fx = (x / EXTENT + 0.5) * GRID;
      const fz = (z / EXTENT + 0.5) * GRID;
      const i = THREE.MathUtils.clamp(Math.floor(fx), 0, GRID - 1);
      const j = THREE.MathUtils.clamp(Math.floor(fz), 0, GRID - 1);
      const u = fx - i;
      const v = fz - j;
      const h00 = h[j * n + i], h10 = h[j * n + i + 1], h01 = h[(j + 1) * n + i], h11 = h[(j + 1) * n + i + 1];
      return u + v <= 1 ? h00 + u * (h10 - h00) + v * (h01 - h00) : h11 + (1 - u) * (h01 - h11) + (1 - v) * (h10 - h11);
    };
    // window.__castRay(origin, dir, max): the first fixed collider along a ray [distance, its shape type]
    (window as unknown as { __castRay: (o: number[], d: number[], max: number) => unknown }).__castRay = (o, d, max) => {
      const hit = world.castRay(new rapier.Ray({ x: o[0], y: o[1], z: o[2] }, { x: d[0], y: d[1], z: d[2] }), max, true, rapier.QueryFilterFlags.ONLY_FIXED);
      return hit ? [+hit.timeOfImpact.toFixed(3), hit.collider.shape.type] : null;
    };
    (window as unknown as { __groundAudit: (pts: [number, number][]) => unknown }).__groundAudit = (pts) => {
      const meshes: THREE.Object3D[] = [];
      scene.traverseVisible((o) => {
        if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh) return;
        const pos = (o.geometry as THREE.BufferGeometry).getAttribute("position");
        if (pos && pos.count > 60000) return; // the land (evaluated by landY)
        for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === model.current) return;
        meshes.push(o);
      });
      return pts.map(([x, z]) => {
        const top = heightAt(x, z) + 6;
        const hit = world.castRay(new rapier.Ray({ x, y: top, z }, { x: 0, y: -1, z: 0 }), 20, true, rapier.QueryFilterFlags.ONLY_FIXED);
        const py = hit ? top - hit.timeOfImpact : NaN;
        ray.set(new THREE.Vector3(x, py + 0.6, z), down);
        ray.far = 2;
        const h = ray.intersectObjects(meshes, false)[0];
        const land = landY(x, z);
        const mat = h && (h.object as THREE.Mesh).material;
        const col = mat && !Array.isArray(mat) && "color" in mat ? `#${(mat.color as THREE.Color).getHexString()}` : "";
        const drawn = h && h.point.y > land ? h.point.y : land;
        return [+x.toFixed(2), +z.toFixed(2), +drawn.toFixed(3), +py.toFixed(3), h && h.point.y > land ? `${(h.object as THREE.Mesh).geometry.type}${col}` : "land", hit?.collider.shape.type ?? null];
      });
    };
  }, [scene, world, rapier]);

  // Pre-physics: the original PhysicsVehicle.updatePrePhysics.
  useBeforePhysicsStep(() => {
    const v = controller.current;
    if (!v) return;
    // a garage holds the car still while its stand-in drives in and out (garage/GarageShow.tsx)
    const driving = getState().phase === "world" && !garageBusy(getState().zone);
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
    // pressing on into a wall drives nothing (the tyres would only spin): see `wall`. Nor does the
    // throttle in a wheelie: the rear tyres alone would lift the nose further.
    wallTouch(world, shell.current);
    if (b && accelerating !== 0 && !noGuard()) {
      const r = b.rotation();
      const f = tmpF.set(1, 0, 0).applyQuaternion(tmpQ.set(r.x, r.y, r.z, r.w));
      if (wall.on && (f.x * wall.n.x + f.z * wall.n.z) * Math.sign(accelerating) > 0.3) engine = 0;
      // (reverse still drives: it is how you back down off whatever lifted the nose)
      if (accelerating > 0 && f.y > Math.sin(WHEELIE) && wheelie(v, WHEELS)) engine = 0;
    }

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
    // The wheels' rays carry the car's groups: they skip the sweeper, and in SPLIT the props it's
    // passing through, so it doesn't ride up on them; and they never climb onto a ball.
    v.updateVehicle(1 / 60, undefined, CAR_GROUPS, notBall);

    // The sweeper goes where the chassis will be at the end of this step (its kinematic velocity is
    // what kicks the ball); after a teleport it jumps there.
    const sw = sweeper.current;
    if (sw && b) {
      const t = b.translation();
      const r = b.rotation();
      const lv = b.linvel();
      const av = b.angvel();
      sweepP.set(t.x + lv.x * dts, t.y + lv.y * dts, t.z + lv.z * dts);
      sweepQ.set(r.x, r.y, r.z, r.w);
      const w = Math.hypot(av.x, av.y, av.z);
      if (w > 1e-6) sweepQ.premultiply(tmpQ.setFromAxisAngle(tmpV.set(av.x / w, av.y / w, av.z / w), w * dts));
      const st = sw.translation();
      if ((st.x - t.x) ** 2 + (st.y - t.y) ** 2 + (st.z - t.z) ** 2 > 4) {
        sw.setTranslation(t, false);
        sw.setRotation(r, false);
      }
      sw.setNextKinematicTranslation(sweepP);
      sw.setNextKinematicRotation(sweepQ);
    }
  });
  // Only balls get the sweeper's contacts (impulses); everything else passes through it.
  useFilterContactPair((c1, c2) => {
    const me = sweepCollider.current?.handle;
    if (me === undefined || (c1 !== me && c2 !== me)) return null;
    return sweepable.has(c1 === me ? c2 : c1) ? rapier.SolverFlags.COMPUTE_IMPULSE : rapier.SolverFlags.EMPTY;
  });
  // the powers move the body after the controller (this registers its step second)
  usePowers({ code: def.code, body, model, lean, box: bumper, wheels: spec.dust, grounded: () => WHEELS.some((_, i) => !!controller.current?.wheelIsInContact(i)) });
  // After the powers (registered after them): against a wall, nothing goes into it and nothing turns
  // to lift the end touching it (see `wall`).
  useBeforePhysicsStep(() => {
    const b = body.current;
    if (b && !noGuard()) {
      // the bumper swept along this step's velocity: a wall it meets takes the speed into it away
      const lv = b.linvel();
      const r = b.rotation();
      const t = b.translation();
      tmpQ.set(r.x, r.y, r.z, r.w);
      const pos = _cast.set(bumper.x, bumper.y, 0).applyQuaternion(tmpQ).add(tmpP.set(t.x, t.y, t.z));
      bumperShape.current ??= new rapier.Cuboid(bumper.half[0], bumper.half[1], bumper.half[2]);
      const dts = ticker.deltaScaled;
      const hit = world.castShape(pos, r, lv, bumperShape.current, 0, dts, false, rapier.QueryFilterFlags.ONLY_FIXED | rapier.QueryFilterFlags.EXCLUDE_SENSORS);
      castDbg.toi = hit ? hit.time_of_impact / dts : -1;
      castDbg.ny = hit ? hit.normal2.y : 0;
      if (hit) {
        // normal2 is on the cast shape (the bumper), in its own frame, pointing out of it at the wall
        const n = _castN.set(hit.normal2.x, hit.normal2.y, hit.normal2.z).applyQuaternion(tmpQ);
        const flat = Math.hypot(n.x, n.z);
        if (Math.abs(n.y) < 0.7 && flat > 1e-3) {
          const nx = n.x / flat;
          const nz = n.z / flat;
          const into = lv.x * nx + lv.z * nz;
          // keep just enough to arrive at the wall by the end of the step
          const cut = into - into * Math.min(1, hit.time_of_impact / dts);
          if (into > 0 && cut > 0) b.setLinvel({ x: lv.x - nx * cut, y: lv.y, z: lv.z - nz * cut }, true);
          dropLift(b, nx, nz);
          wall.cast = true;
          wall.cn.set(nx, 0, nz);
        }
      }
    }
    // Dev and headless checks: window.__wallLog = [] records every step [pitch (deg), height, forward
    // speed, vertical speed, touching a wall, spin lifting its end, wheels down, bumper cast time of
    // impact / step (-1 none), its normal's y, front wheels down].
    const wlog = process.env.NODE_ENV !== "production" ? (window as unknown as { __wallLog?: number[][] }).__wallLog : undefined;
    if (wlog && b && wlog.length < 5000) {
      const r = b.rotation();
      const f = tmpF.set(1, 0, 0).applyQuaternion(tmpQ.set(r.x, r.y, r.z, r.w));
      const lv = b.linvel();
      const av = b.angvel();
      wlog.push([+(Math.asin(f.y) * 57.3).toFixed(1), +b.translation().y.toFixed(2), +(lv.x * f.x + lv.z * f.z).toFixed(2), +lv.y.toFixed(2), wall.on ? 1 : 0, +(av.x * -wall.n.z + av.z * wall.n.x).toFixed(2), WHEELS.filter((_, i) => controller.current?.wheelIsInContact(i)).length, +castDbg.toi.toFixed(2), +castDbg.ny.toFixed(2), WHEELS.filter((w, i) => w.front && controller.current?.wheelIsInContact(i)).length]);
    }
    if (!b || noGuard()) return;
    // a wheelie (both front wheels off, nose up, a rear wheel on) stops rising: gravity brings it down
    const v = controller.current;
    if (v) {
      const r = b.rotation();
      const f = tmpF.set(1, 0, 0).applyQuaternion(tmpQ.set(r.x, r.y, r.z, r.w));
      const flat = Math.hypot(f.x, f.z);
      if (f.y > Math.sin(WHEELIE) && flat > 1e-3 && wheelie(v, WHEELS)) dropLift(b, f.x / flat, f.z / flat);
    }
    if (!wall.on) return;
    const lv = b.linvel();
    const into = lv.x * wall.n.x + lv.z * wall.n.z;
    if (into > 0) b.setLinvel({ x: lv.x - wall.n.x * into, y: lv.y, z: lv.z - wall.n.z * into }, true);
    dropLift(b, wall.n.x, wall.n.z);
  });

  useFrame((_, dt) => {
    const v = controller.current;
    const b = body.current;
    if (!v || !b) return;
    if (model.current) model.current.visible = !garageView.car;

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
    posLive = true;
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
      g.position.y = snapWheels ? ty : g.position.y + (ty - g.position.y) * ease(50, dt);
      const ud = g.userData as { steer?: number };
      const was = ud.steer ?? 0;
      // the bike's bars turn less than the physics wheels: it leans into the corner instead
      const steerVis = (spec.bike ? 0.5 : 1) * steerNow;
      ud.steer = was + (steerVis - was) * ease(32, dt);
      g.quaternion.setFromAxisAngle(spec.steerAxis, ud.steer);
      const s = P.spin[i];
      if (s && !input.handbrake) s.rotation.x += (carState.speed / (def.wheels[i].r * S)) * dt;
    }
    snapWheels = false;

    // The bike leans into corners (the chassis stays upright): lean from the sideways pull.
    if (lean.current) {
      const want = spec.bike ? THREE.MathUtils.clamp(-Math.atan((speed.current * b.angvel().y) / 9.81), -BIKE_LEAN_MAX, BIKE_LEAN_MAX) : 0;
      lean.current.rotation.x += (want - lean.current.rotation.x) * ease(6, dt);
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
      P.drs.rotation.x += (want - P.drs.rotation.x) * ease(12, dt);
    }

    // Recover from flips and falls.
    tmpV.set(0, 1, 0).applyQuaternion(tmpQ);
    if (tmpV.y > 0.7) heading.current = Math.atan2(-carState.forward.z, carState.forward.x);
    flipped.current = tmpV.y < 0.25 ? flipped.current + dt : 0;
    // In deep water (past the shallows) for a second: back onto the road, like the original respawn.
    wet.current = SEA_Y - heightAt(t.x, t.z) > 0.7 && t.y < SEA_Y + 0.4 ? wet.current + dt : 0;
    buried.current = t.y < heightAt(t.x, t.z) - BURIED ? buried.current + dt : 0;
    // Stuck: pressing to go and not moving, hung up on something (a bike nose-up on the rocks):
    // after 2.5 s it rights itself like a flip.
    {
      const vc = controller.current;
      let down = 0;
      if (vc) for (let i = 0; i < WHEELS.length; i++) if (vc.wheelIsInContact(i)) down++;
      const pressing = getState().phase === "world" && !garageBusy(getState().zone) && (input.forward > 0 || input.back > 0);
      // hung: a wheel off the ground, or tipped past 12 degrees (pressing flat into a wall is neither)
      // (by where it is, not its speed: a bike hung on rocks rocks back and forth on the spot)
      const hangs = pressing && (down < WHEELS.length || tmpV.y < 0.978);
      if (!hangs || hungAt.current.distanceTo(carState.pos) > 0.6) {
        hungAt.current.copy(carState.pos);
        hung.current = 0;
      } else hung.current += dt;
    }
    if (input.reset || flipped.current > 1.6 || hung.current > 2.5 || wet.current > 1 || buried.current > 0.1 || t.y < heightAt(t.x, t.z) - 4) {
      const flip = !input.reset && (flipped.current > 1.6 || hung.current > 2.5) && wet.current <= 1 && buried.current <= 0.1;
      input.reset = false;
      flipped.current = 0;
      hung.current = 0;
      wet.current = 0;
      buried.current = 0;
      if (t.y < heightAt(t.x, t.z) - 4) place(b, SPAWN[0], SPAWN[1], SPAWN[2]);
      else if (flip) {
        // A flip rights the vehicle where it lies: upright on the same spot, backed a metre off the
        // wall it was against, facing the way it was going, on whatever is under it (road, deck or
        // ground). It used to go back to the nearest bit of road, which could be across the island.
        const x = t.x - (wall.on ? wall.n.x * 1.2 : 0);
        const z = t.z - (wall.on ? wall.n.z * 1.2 : 0);
        const top = t.y + 0.6;
        const hit = world.castRay(new rapier.Ray({ x, y: top, z }, { x: 0, y: -1, z: 0 }), 8, true, rapier.QueryFilterFlags.ONLY_FIXED);
        place(b, x, z, heading.current, Math.max(hit ? top - hit.timeOfImpact : -Infinity, heightAt(x, z)) + REST_Y);
      } else {
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
      <PowerTrail code={def.code} scale={S} ride={RIDE} />
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
          ref={(c) => {
            shell.current[0] = c;
          }}
          args={[...chassis.half]}
          position={[chassis.x, 0.19, 0]}
          collisionGroups={CAR_GROUPS}
          friction={0.4}
          massProperties={{
            mass: 2.5,
            centerOfMass: { x: chassis.x, y: COM_HEIGHT - RIDE, z: 0 },
            principalAngularInertia: { x: inertia[0], y: inertia[1], z: inertia[2] },
            angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 },
          }}
        />
        {/* The original bumper: a massless, frictionless box round the whole body,
            so walls push the vehicle along instead of catching a tyre, and no wheel
            ever pokes into a wall or a building. */}
        <CuboidCollider
          ref={(c) => {
            shell.current[1] = c;
          }}
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
          <group ref={model} name={PLAYER_MODEL} rotation={[0, Math.PI / 2, 0]} scale={S}>
            <RigContext.Provider value={rig}>
              <group ref={bodyRoot} name="vehicle-body">
                <def.Model livery={livery} />
              </group>
            </RigContext.Provider>
            {def.code === "V03" && <Thrusters />}
          </group>
        </group>
      </RigidBody>
      {/* soft CCD: predictive contacts along its path, so at speed it meets a ball instead of
          stepping 0.2 m into it (the overlap shot the ball 15 m up) */}
      <RigidBody ref={sweeper} type="kinematicPosition" colliders={false} softCcdPrediction={1} position={[SPAWN[0], heightAt(SPAWN[0], SPAWN[1]) + REST_Y, SPAWN[1]]}>
        <CuboidCollider
          ref={(c) => {
            sweepCollider.current = c;
            c?.setActiveHooks(rapier.ActiveHooks.FILTER_CONTACT_PAIRS);
          }}
          args={[...spec.sweep.half]}
          position={[spec.sweep.x, spec.sweep.y, 0]}
          collisionGroups={SWEEP_GROUPS}
          friction={0.3}
          restitution={0.3}
        />
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
