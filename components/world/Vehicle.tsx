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
  CHASSIS_HALF,
  REAR_WHEEL_SCALE,
  WHEEL_POSITIONS,
  WHEEL_RADIUS,
  WING_TIPS,
} from "./models/Car";
import { Driver, DRIVER_SEAT } from "./models/Avatar";
import { input } from "./input";
import { carState, ticker } from "./carState";
import { getState, setState, subscribe, toast, useWorld } from "./store";
import { BoostTrail } from "./BoostTrail";
import { dayNight } from "./daynight";
import { heightAt } from "./terrain";
import { SPAWN, headingFromTangent, nearestT3, trackPoint, trackTangent, zoneById } from "./layout";
import { engineIdle, engineUpdate, honk } from "./sound";

// Driving model ported from Bruno Simon's folio-2025 (MIT, (c) 2025 Bruno Simon),
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
const BRAKE_AMPLITUDE = 35; // Bruno's value, used for the idle and reverse brake
// Space brake: Bruno's full 35 on every wheel stops the car dead. Ours ramps in
// and is gentler, and the rear lets go a little, so it slides down to a stop.
const HANDBRAKE_AMPLITUDE = 4;
const HANDBRAKE_RAMP = 0.4; // seconds to full brake
const HANDBRAKE_REAR_GRIP = 1.6; // rear side friction while braking (normal: SIDE_FRICTION)
const IDLE_BRAKE = 0.06;
const REVERSE_BRAKE = 0.4;

const SUSPENSION = {
  restLength: 0.7,
  stiffness: 20,
  compression: 10,
  relaxation: 2.7,
  maxTravel: 2,
  maxForce: 150,
};
const FRICTION_SLIP = 0.9;
const SIDE_FRICTION = 3;
// Static compression the springs settle at, measured in the headless check.
const SAG = 0.34;

// Mount each wheel's suspension so the car settles with the tyres on the road.
const WHEELS = WHEEL_POSITIONS.map((w) => ({
  pos: new THREE.Vector3(w.x, w.y + SUSPENSION.restLength - SAG, w.z),
  front: w.front,
  radius: w.front ? WHEEL_RADIUS : WHEEL_RADIUS * REAR_WHEEL_SCALE,
}));

const up = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const prevPos = new THREE.Vector3();

export default function Vehicle() {
  const livery = useWorld((s) => s.livery);
  const body = useRef<RapierRigidBody>(null);
  const controller = useRef<VehicleController | null>(null);
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);
  const spinRefs = useRef<(THREE.Group | null)[]>([]);
  const drs = useRef<THREE.Group>(null);
  const tipRefs = useRef<(THREE.Group | null)[]>([]);
  const tipA = useRef<THREE.Group | null>(null);
  const tipB = useRef<THREE.Group | null>(null);
  const rain = useRef<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>(null);
  const flipped = useRef(0);
  const lastHud = useRef(0);
  const goingForward = useRef(true);
  const speed = useRef(0); // simulation units per second, like Bruno's
  const boosting = useRef(false);
  const brakeHeld = useRef(0); // seconds the brake has been held
  // Bruno's stuck test: on the throttle, but under 0.5 m covered in the last 3 s.
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
  // window.__placeXZ(x, z, heading) drops it anywhere on the ground.
  useEffect(() => {
    const w = window as unknown as { __placeT: (t: number) => void; __placeXZ: (x: number, z: number, h?: number) => void };
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

  // Pre-physics: Bruno's PhysicsVehicle.updatePrePhysics.
  useBeforePhysicsStep(() => {
    const v = controller.current;
    if (!v) return;
    const driving = getState().phase === "world";
    const dts = ticker.deltaScaled;

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
      // (Bruno lets the car coast down from boost speed, which feels like boost lingers).
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

    // Post-physics measures, Bruno style: speed from how far the body moved this step.
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
      const len = v.wheelSuspensionLength(i) ?? SUSPENSION.restLength;
      const ty = WHEELS[i].pos.y - len;
      g.position.y += (ty - g.position.y) * Math.min(1, dt * 50);
      if (WHEELS[i].front)
        g.rotation.y +=
          ((v.wheelSteering(i) ?? 0) - g.rotation.y) * Math.min(1, dt * 32);
      const s = spinRefs.current[i];
      if (s && !input.handbrake)
        s.rotation.z -= (carState.speed / WHEELS[i].radius) * dt;
    }

    // The rain light glows a little at night; no headlights, it's a race car.
    if (rain.current) rain.current.material.emissiveIntensity = 0.4 + dayNight.night * 1.2;

    // DRS: the flap opens while boosting.
    if (drs.current) {
      const want = boosting.current ? 0.75 : 0;
      drs.current.rotation.z +=
        (want - drs.current.rotation.z) * Math.min(1, dt * 12);
    }

    // Recover from flips and falls.
    tmpV.set(0, 1, 0).applyQuaternion(tmpQ);
    flipped.current = tmpV.y < 0.25 ? flipped.current + dt : 0;
    if (input.reset || flipped.current > 1.6 || t.y < heightAt(t.x, t.z) - 4) {
      input.reset = false;
      flipped.current = 0;
      if (t.y < heightAt(t.x, t.z) - 4) place(b, SPAWN[0], SPAWN[1], SPAWN[2]);
      else {
        // Back onto the nearest bit of road, facing the way you were going (Bruno's R).
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
        position={[SPAWN[0], heightAt(SPAWN[0], SPAWN[1]) + 0.45, SPAWN[1]]}
        linearDamping={0.1}
        angularDamping={0.1}
        canSleep={false}
      >
        {/* Bruno's chassis: mass 2.5 with the centre of mass well below the body. */}
        <CuboidCollider
          args={[CHASSIS_HALF[0], 0.17, CHASSIS_HALF[2]]}
          position={[0, 0.05, 0]}
          friction={0.4}
          massProperties={{
            mass: 2.5,
            centerOfMass: { x: 0, y: -0.5, z: 0 },
            principalAngularInertia: { x: 1, y: 1, z: 1 },
            angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 },
          }}
        />
        {/* Bruno's bumper: a massless, frictionless box around the wheels and wings,
            so walls push the car along instead of catching a tyre, and no wheel
            ever pokes into a wall or a building. */}
        <CuboidCollider
          args={[1.5, 0.22, 0.74]}
          position={[0.02, 0.1, 0]}
          density={0}
          friction={0}
          frictionCombineRule={CoefficientCombineRule.Min}
          restitution={0.05}
        />
        <mesh ref={rain} position={[-1.5, -0.05, 0]}>
        <boxGeometry args={[0.04, 0.07, 0.16]} />
        <meshStandardMaterial color="#ff2a1f" emissive="#ff2a1f" emissiveIntensity={0.4} />
      </mesh>
      <CarBody brakeLight={false} drsRef={drs} livery={livery}>
          <Driver position={DRIVER_SEAT} />
        </CarBody>
        {WING_TIPS.map((p, i) => (
          <group
            key={i}
            position={p}
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
                spinRefs.current[i] = el;
              }}
            >
              <CarWheel scale={w.front ? 1 : REAR_WHEEL_SCALE} livery={livery} />
            </group>
          </group>
        ))}
      </RigidBody>
    </>
  );
}

function place(b: RapierRigidBody, x: number, z: number, heading: number, y = heightAt(x, z) + 0.45) {
  const q = new THREE.Quaternion().setFromAxisAngle(up, heading);
  b.setTranslation({ x, y, z }, true);
  b.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
  b.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.setAngvel({ x: 0, y: 0, z: 0 }, true);
}
