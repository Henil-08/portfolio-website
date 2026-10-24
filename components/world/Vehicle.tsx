"use client";

import { useEffect, useRef } from "react";
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
import {
  CarBody,
  CarWheel,
  tyreMaterials,
  CHASSIS_HALF,
  REAR_WHEEL_SCALE,
  WHEEL_POSITIONS,
  WHEEL_RADIUS,
  WING_TIPS,
  CAR_SCALE as S,
  GROUND_Y,
} from "./models/Car";
import { Driver, DRIVER_SEAT } from "./models/Avatar";
import { input } from "./input";
import { carState, ticker } from "./carState";
import { getState, setState, subscribe, toast, useWorld } from "./store";
import { BoostTrail } from "./BoostTrail";
import { dayNight } from "./daynight";
import { heightAt } from "./terrain";
import { SEA_Y, SPAWN, headingFromTangent, nearestT3, trackPoint, trackTangent, zoneById } from "./layout";
import { engineIdle, engineUpdate, honk } from "./sound";

// Driving model ported from folio-2025 (MIT, see public/vendor/LICENSE.md),
// sources/Game/Physics/PhysicsVehicle.js and Player.js: same engine, brake and
// steering formulas, same suspension and friction settings, same 2x time scale.
// Only the wheel layout comes from our F1 car model.

type VehicleController = ReturnType<
  ReturnType<typeof useRapier>["world"]["createVehicleController"]
>;

const STEERING_AMPLITUDE = 0.5;
const ENGINE_FORCE = 300;
const BOOST_MULTIPLIER = 2;
const TOP_SPEED = 5;
const TOP_SPEED_BOOST = 40;
const BRAKE_AMPLITUDE = 35; // The original value, used for the idle and reverse brake
// Space brake: the original full 35 on every wheel stops the car dead. Ours ramps in
// and is gentler, and the rear lets go a little, so it slides down to a stop.
const HANDBRAKE_AMPLITUDE = 4;
const HANDBRAKE_RAMP = 0.4; // seconds to full brake
const HANDBRAKE_REAR_GRIP = 1.6; // rear side friction while braking (normal: SIDE_FRICTION)
const IDLE_BRAKE = 0.06;
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
// The chassis centre rides ~0.4 m above the ground. Below the ground it has been
// shoved through the terrain (a post or wall at speed): respawn instead of
// leaving the body buried with the wheels sticking out.
const BURIED = 0.15;
// Half length of the chassis collider: between the axles, so a crest meets the tyres first.
const CHASSIS_CLEAR_HALF = 0.95;
// Chassis centre height above the ground at rest. Dropping the car from any
// higher (the old 0.45 m) made it bounce on its springs at every load and teleport.
const REST_Y = -GROUND_Y * S + 0.02;

// Mount each wheel's suspension so the car settles with the tyres on the road.
// The wheel layout scales with the car; the springs (and so the sag) do not.
const WHEELS = WHEEL_POSITIONS.map((w) => ({
  pos: new THREE.Vector3(w.x * S, w.y * S + SUSPENSION.restLength - SAG, w.z * S),
  front: w.front,
  radius: (w.front ? WHEEL_RADIUS : WHEEL_RADIUS * REAR_WHEEL_SCALE) * S,
}));

const up = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpP = new THREE.Vector3();
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

export default function Vehicle() {
  const livery = useWorld((s) => s.livery);
  const body = useRef<RapierRigidBody>(null);
  const controller = useRef<VehicleController | null>(null);
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);
  const spinRefs = useRef<(THREE.Group | null)[]>([]);
  const swapRefs = useRef<(THREE.Group | null)[]>([]);
  const tyreRefs = useRef<(THREE.Mesh | null)[]>([]);
  // Tyres: slicks in the dry, wets in the rain. `t` runs 0..1 through a swap.
  const tyres = useRef({ wet: null as boolean | null, to: false, t: 1 });
  const drs = useRef<THREE.Group>(null);
  const tipRefs = useRef<(THREE.Group | null)[]>([]);
  const tipA = useRef<THREE.Group | null>(null);
  const tipB = useRef<THREE.Group | null>(null);
  const rain = useRef<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>(null);
  const flipped = useRef(0);
  const wet = useRef(0);
  const buried = useRef(0);
  const lastHud = useRef(0);
  const goingForward = useRef(true);
  const speed = useRef(0); // simulation units per second, like the original's
  const boosting = useRef(false);
  const brakeHeld = useRef(0); // seconds the brake has been held
  // The original stuck test: on the throttle, but under 0.5 m covered in the last 3 s.
  const stuck = useRef({ items: [] as [number, number][], told: false });
  const { world } = useRapier();

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
      v.setWheelSideFrictionStiffness(i, SIDE_FRICTION);
      v.setWheelSuspensionCompression(i, SUSPENSION.compression);
      v.setWheelSuspensionRelaxation(i, SUSPENSION.relaxation);
      v.setWheelSuspensionStiffness(i, SUSPENSION.stiffness);
    }
    controller.current = v;
    place(b, SPAWN[0], SPAWN[1], SPAWN[2]);
    const t = b.translation();
    prevPos.set(t.x, t.y, t.z);
    setState({ ready: true });
    return () => {
      world.removeVehicleController(v);
      controller.current = null;
    };
  }, [world]);

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
    const touching = input.forward || input.back || input.steer || input.handbrake;
    if (!parked.on && b) {
      const lv = b.linvel();
      // hands off and slow: ease to a stop (no bob, no creep) instead of coasting on the springs
      const hs = Math.hypot(lv.x, lv.z);
      const ease = !touching && hs < 2.5 ? 1 - hs / 2.5 : 0;
      b.setLinearDamping(0.1 + ease * 2.5);
      b.setAngularDamping(0.1 + ease * 4);
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

    let accelerating = driving ? input.forward - input.back : 0;
    const braking = driving && input.handbrake ? 1 : 0;
    if (braking) accelerating = 0;
    const boost = driving && input.boost && accelerating > 0 ? 1 : 0;
    const steering = driving ? -input.steer : 0;

    const top = THREE.MathUtils.lerp(TOP_SPEED, TOP_SPEED_BOOST, boost);
    const overflow = Math.max(0, speed.current - top);
    let engine =
      ((accelerating * (1 + boost * BOOST_MULTIPLIER) * ENGINE_FORCE) /
        (1 + overflow)) *
      dts;

    brakeHeld.current = braking ? brakeHeld.current + dts / 2 : 0; // dts runs at 2x
    let brake = 0;
    if (braking) brake = Math.min(1, brakeHeld.current / HANDBRAKE_RAMP) ** 1.5 * HANDBRAKE_AMPLITUDE * dts;
    else {
      let b = Math.abs(accelerating) < 0.1 ? IDLE_BRAKE : 0;
      if (
        speed.current > 0.5 &&
        ((accelerating > 0 && !goingForward.current) ||
          (accelerating < 0 && goingForward.current))
      ) {
        b = REVERSE_BRAKE;
        engine = 0;
      }
      // Off the boost and over normal top speed: ease back to it in about a second
      // (the original lets the car coast down from boost speed, which feels like boost lingers).
      if (!boost && speed.current > TOP_SPEED * 1.15) b = Math.max(b, Math.min(0.35, ((speed.current - TOP_SPEED) / TOP_SPEED) * 0.12));
      brake = b * BRAKE_AMPLITUDE * dts;
    }

    const steer = steering * STEERING_AMPLITUDE;
    for (let i = 0; i < WHEELS.length; i++) {
      v.setWheelSteering(i, WHEELS[i].front ? steer : 0);
      v.setWheelBrake(i, brake);
      v.setWheelEngineForce(i, engine);
      if (!WHEELS[i].front) v.setWheelSideFrictionStiffness(i, braking ? HANDBRAKE_REAR_GRIP : SIDE_FRICTION);
    }
    v.updateVehicle(1 / 60);

    if (boosting.current !== (boost === 1)) {
      boosting.current = boost === 1;
      setState({ boosting: boosting.current });
    }
  });

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
    carState.grounded = [0, 1, 2, 3].some((i) => v.wheelIsInContact(i));

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

    // Wheels follow the suspension; spin from forward speed.
    for (let i = 0; i < WHEELS.length; i++) {
      const g = wheelRefs.current[i];
      if (!g) continue;
      const raw = v.wheelIsInContact(i) ? v.wheelSuspensionLength(i) ?? WHEEL_REST : WHEEL_REST;
      const len = THREE.MathUtils.clamp(raw, WHEEL_REST - WHEEL_PLAY, WHEEL_REST + WHEEL_PLAY);
      const ty = WHEELS[i].pos.y - len;
      g.position.y = snapWheels ? ty : g.position.y + (ty - g.position.y) * Math.min(1, dt * 50);
      if (WHEELS[i].front)
        g.rotation.y +=
          ((v.wheelSteering(i) ?? 0) - g.rotation.y) * Math.min(1, dt * 32);
      const s = spinRefs.current[i];
      if (s && !input.handbrake)
        s.rotation.z -= (carState.speed / WHEELS[i].radius) * dt;
    }
    snapWheels = false;

    // Rain starts or stops: a quick pit-stop swap, each tyre pops off sideways and the
    // new one springs on, a few hundredths apart. On load the right set is simply fitted.
    const ty = tyres.current;
    const wantWet = getState().scene.weather === "rain";
    const mats = tyreMaterials(livery);
    if (ty.wet === null) ty.wet = ty.to = wantWet;
    else if (ty.t >= 1 && wantWet !== ty.wet) {
      ty.to = wantWet;
      ty.t = 0;
    }
    if (ty.t < 1) {
      ty.t = Math.min(1, ty.t + Math.min(dt, 1 / 30) / SWAP_TIME);
      for (let i = 0; i < WHEELS.length; i++) {
        const g = swapRefs.current[i];
        const m = tyreRefs.current[i];
        if (!g || !m) continue;
        const k = THREE.MathUtils.clamp((ty.t * SWAP_TIME - i * SWAP_STAGGER) / SWAP_EACH, 0, 1);
        const side = Math.sign(WHEELS[i].pos.z) || 1;
        if (k < 0.45) {
          const out = (k / 0.45) ** 2;
          g.position.z = side * SWAP_OUT * out;
          g.scale.setScalar(1 - out);
        } else {
          m.material = ty.to ? mats.wet : mats.slick;
          const u = (k - 0.45) / 0.55;
          const c = 2.2; // back-out overshoot
          const s = 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
          g.position.z = side * SWAP_OUT * (1 - u) ** 2;
          g.scale.setScalar(Math.max(0, s));
        }
      }
      if (ty.t >= 1) {
        ty.wet = ty.to;
        for (const g of swapRefs.current) {
          g?.position.setZ(0);
          g?.scale.setScalar(1);
        }
      }
    } else for (const m of tyreRefs.current) if (m) m.material = ty.wet ? mats.wet : mats.slick; // also after a livery change
    carState.tyres.wet = ty.t < 1 ? ty.to : ty.wet;
    carState.tyres.swap = ty.t;

    // The rain light glows a little, more at night, and flares as a brake light (handbrake,
    // or S while still rolling forward); no headlights, it's a race car. Not tone mapped,
    // so the flare blooms.
    const brakeLight = input.handbrake || (input.back > 0 && carState.speed > 1);
    if (rain.current) rain.current.material.emissiveIntensity = brakeLight ? 4.5 : 0.35 + dayNight.night * 0.9;

    // DRS: the flap opens while boosting.
    if (drs.current) {
      const want = boosting.current ? 0.75 : 0;
      drs.current.rotation.z +=
        (want - drs.current.rotation.z) * Math.min(1, dt * 12);
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
      engineUpdate(Math.abs(carState.speed) * 3.6, Math.abs(input.forward - input.back), boosting.current, input.handbrake);
    } else engineIdle();

    lastHud.current += dt;
    if (lastHud.current > 0.1) {
      lastHud.current = 0;
      const kmh = Math.round(Math.abs(carState.speed) * 3.6);
      if (kmh !== getState().speed) setState({ speed: kmh });
    }
  });

  return (
    <>
      <BoostTrail anchor={tipA} />
      <BoostTrail anchor={tipB} />
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
            The colliders ride higher than the low F1 body (0.3 m off the ground, not
            0.18) and the chassis box is shorter, so the car never beaches on a crest or
            a bank; the body may dip into the grass a little, which reads as cartoony. */}
        <CuboidCollider
          args={[CHASSIS_CLEAR_HALF * S, 0.14 * S, CHASSIS_HALF[2] * S]}
          position={[0, 0.14 * S, 0]}
          friction={0.4}
          massProperties={{
            mass: 2.5,
            centerOfMass: { x: 0, y: -0.5, z: 0 },
            // grown with the car (S^2): the wheels sit further out, so with 1 the springs rock the body
            principalAngularInertia: { x: S * S, y: S * S, z: S * S },
            angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 },
          }}
        />
        {/* The original bumper: a massless, frictionless box around the wheels and wings,
            so walls push the car along instead of catching a tyre, and no wheel
            ever pokes into a wall or a building. */}
        <CuboidCollider
          args={[1.5 * S, 0.18 * S, 0.74 * S]}
          position={[0.02 * S, 0.2 * S, 0]}
          density={0}
          friction={0}
          frictionCombineRule={CoefficientCombineRule.Min}
          restitution={0.05}
        />
        <mesh ref={rain} position={[-1.5 * S, -0.05 * S, 0]} scale={S}>
        <boxGeometry args={[0.04, 0.07, 0.16]} />
        <meshStandardMaterial color="#ff2a1f" emissive="#ff2a1f" emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
        <group scale={S}>
          <CarBody brakeLight={false} drsRef={drs} livery={livery}>
            <Driver position={DRIVER_SEAT} />
          </CarBody>
        </group>
        {WING_TIPS.map((p, i) => (
          <group
            key={i}
            position={[p[0] * S, p[1] * S, p[2] * S]}
            ref={(el) => {
              tipRefs.current[i] = el;
              if (i === 0) tipA.current = el;
              else tipB.current = el;
            }}
          />
        ))}
        {WHEELS.map((w, i) => (
          <group
            key={i}
            ref={(el) => {
              wheelRefs.current[i] = el;
            }}
            position={[w.pos.x, w.pos.y - SUSPENSION.restLength, w.pos.z]}
          >
            <group
              ref={(el) => {
                swapRefs.current[i] = el;
              }}
            >
              <group
                ref={(el) => {
                  spinRefs.current[i] = el;
                }}
              >
                <CarWheel
                  scale={(w.front ? 1 : REAR_WHEEL_SCALE) * S}
                  livery={livery}
                  tyreRef={(el) => {
                    tyreRefs.current[i] = el;
                  }}
                />
              </group>
            </group>
          </group>
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
