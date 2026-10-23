"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { CarBody, CarWheel, CHASSIS_HALF, REAR_WHEEL_SCALE, WHEEL_POSITIONS, WHEEL_RADIUS } from "./models/Car";
import { Driver, DRIVER_SEAT } from "./models/Avatar";
import { input } from "./input";
import { carState } from "./carState";
import { getState, setState, subscribe } from "./store";
import { SPAWN, zoneById } from "./layout";
import { honk } from "./sound";

type VehicleController = ReturnType<ReturnType<typeof useRapier>["world"]["createVehicleController"]>;

// Suspension: rest length and the sag the springs settle at (measured in the headless check).
const REST = 0.2;
const SAG = 0.04;

// Each wheel's suspension mounts above its rest-position centre, so the car
// settles with the tyres on the ground and the body at the model's ride height.
const WHEELS = WHEEL_POSITIONS.map((w) => ({
  pos: new THREE.Vector3(w.x, w.y + REST - SAG, w.z),
  front: w.front,
  radius: w.front ? WHEEL_RADIUS : WHEEL_RADIUS * REAR_WHEEL_SCALE,
}));
const ENGINE = 34;
const BOOST = 1.7;
const TOP = 24; // m/s, about 86 km/h. Toy fast, still steerable.
const BRAKE = 0.5;

const up = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpP = new THREE.Vector3();

export default function Vehicle() {
  const body = useRef<RapierRigidBody>(null);
  const controller = useRef<VehicleController | null>(null);
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);
  const steer = useRef(0);
  const flipped = useRef(0);
  const lastHud = useRef(0);
  const chassis = useRef<THREE.Group>(null);
  const visSteer = useRef(0);
  const primed = useRef(false);
  const { world } = useRapier();

  useEffect(() => {
    const b = body.current;
    if (!b) return;
    const v = world.createVehicleController(b);
    for (const w of WHEELS) {
      v.addWheel(w.pos, { x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }, REST, w.radius);
    }
    for (let i = 0; i < WHEELS.length; i++) {
      // Damping ratios follow Bruno Simon's folio-2025 car (MIT): overdamped
      // compression, softer rebound, so bumps settle instead of oscillating.
      v.setWheelSuspensionStiffness(i, 80);
      v.setWheelSuspensionCompression(i, 18);
      v.setWheelSuspensionRelaxation(i, 5.5);
      v.setWheelMaxSuspensionTravel(i, 0.3);
      v.setWheelMaxSuspensionForce(i, 3000);
      v.setWheelFrictionSlip(i, 2.4);
      v.setWheelSideFrictionStiffness(i, 3);
    }
    controller.current = v;
    place(b, SPAWN[0], SPAWN[1], SPAWN[2]);
    setState({ ready: true });
    return () => {
      world.removeVehicleController(v);
      controller.current = null;
    };
  }, [world]);

  // Teleports from the map menu.
  useEffect(() => {
    let last = getState().teleport?.id;
    return subscribe(() => {
      const tp = getState().teleport;
      if (!tp || tp.id === last || !body.current) return;
      last = tp.id;
      const z = zoneById[tp.zone];
      place(body.current, z.spawn[0], z.spawn[1], z.spawn[2]);
    });
  }, []);

  useBeforePhysicsStep((w) => {
    const v = controller.current;
    const b = body.current;
    if (!v || !b) return;
    const driving = getState().phase === "world";

    const speed = v.currentVehicleSpeed();
    const fwd = driving ? input.forward : 0;
    const back = driving ? input.back : 0;

    // Steering eases in and gets tighter at speed.
    const maxSteer = THREE.MathUtils.lerp(0.55, 0.22, Math.min(Math.abs(speed) / TOP, 1));
    const target = (driving ? -input.steer : 0) * maxSteer;
    steer.current += (target - steer.current) * 0.18;

    let engine = 0;
    let brake = 0;
    const limit = TOP * (input.boost ? 1.35 : 1);
    if (fwd) {
      // Soft top speed, Bruno style: force fades as we pass the limit.
      engine = (ENGINE * (input.boost ? BOOST : 1)) / (1 + Math.max(0, speed - limit));
      if (speed < -1) brake = BRAKE;
    } else if (back) {
      if (speed > 1) brake = BRAKE;
      else engine = -ENGINE * 0.6 * Math.max(0, 1 - Math.abs(speed) / 9);
    } else {
      brake = 0.05; // gentle rolling resistance
    }

    for (let i = 0; i < WHEELS.length; i++) {
      const front = WHEELS[i].front;
      v.setWheelSteering(i, front ? steer.current : 0);
      v.setWheelEngineForce(i, front ? 0 : engine);
      v.setWheelBrake(i, brake);
      // Handbrake: rear wheels lose grip so the tail steps out.
      v.setWheelFrictionSlip(i, !front && input.handbrake && driving ? 0.9 : 2.4);
      if (!front && input.handbrake && driving) v.setWheelBrake(i, 0.15);
    }
    v.updateVehicle(w.timestep);

    // Small extra push when airborne, per physics step so it doesn't depend on frame rate.
    const grounded = [0, 1, 2, 3].some((i) => v.wheelIsInContact(i));
    if (!grounded && fwd) {
      const r = b.rotation();
      tmpV.set(1, 0, 0).applyQuaternion(tmpQ.set(r.x, r.y, r.z, r.w));
      b.applyImpulse({ x: tmpV.x * 0.05, y: 0, z: tmpV.z * 0.05 }, true);
    }
  });

  useFrame((_, dt) => {
    const v = controller.current;
    const b = body.current;
    if (!v || !b) return;

    // Everything visual reads the interpolated pose that rapier writes to the
    // RigidBody's group, so camera, car and HUD always agree on the same frame.
    const c = chassis.current;
    if (!c) return;
    c.getWorldPosition(tmpP);
    c.getWorldQuaternion(tmpQ);
    if (primed.current) carState.vel.copy(tmpP).sub(carState.pos).divideScalar(Math.max(dt, 1e-4));
    primed.current = true;
    carState.pos.copy(tmpP);
    carState.forward.set(1, 0, 0).applyQuaternion(tmpQ);
    carState.speed = v.currentVehicleSpeed();
    const t = b.translation();
    carState.grounded = [0, 1, 2, 3].some((i) => v.wheelIsInContact(i));

    // Wheels follow the suspension, smoothed so per-step noise doesn't show.
    visSteer.current += (steer.current - visSteer.current) * (1 - Math.exp(-32 * dt));
    for (let i = 0; i < WHEELS.length; i++) {
      const g = wheelRefs.current[i];
      if (!g) continue;
      const len = v.wheelSuspensionLength(i) ?? REST;
      const ty = WHEELS[i].pos.y - len;
      g.position.y += (ty - g.position.y) * (1 - Math.exp(-50 * dt));
      if (WHEELS[i].front) g.rotation.y = visSteer.current;
      const spin = g.children[0];
      if (spin) spin.rotation.z = -(v.wheelRotation(i) ?? 0);
    }

    // Recover from flips and falls.
    tmpV.copy(up).applyQuaternion(tmpQ);
    flipped.current = tmpV.y < 0.25 ? flipped.current + dt : 0;
    if (input.reset || flipped.current > 1.4 || t.y < -4) {
      input.reset = false;
      flipped.current = 0;
      const heading = Math.atan2(-carState.forward.z, carState.forward.x);
      if (t.y < -4) place(b, SPAWN[0], SPAWN[1], SPAWN[2]);
      else place(b, t.x, t.z, heading);
    }
    if (input.honk) {
      input.honk = false;
      honk();
    }

    lastHud.current += dt;
    if (lastHud.current > 0.1) {
      lastHud.current = 0;
      const kmh = Math.round(Math.abs(carState.speed) * 3.6);
      if (kmh !== getState().speed) setState({ speed: kmh });
    }
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[SPAWN[0], 0.9, SPAWN[1]]}
      linearDamping={0.25}
      angularDamping={1.6}
      canSleep={false}
      ccd
    >
      {/* One collider carries all the mass, with the centre of mass low near the
          road (Bruno's trick) so the car is stable without a ballast touching the ground. */}
      <CuboidCollider
        args={[CHASSIS_HALF[0], 0.17, CHASSIS_HALF[2]]}
        position={[0, 0.05, 0]}
        friction={0.4}
        massProperties={{
          mass: 12,
          centerOfMass: { x: 0, y: -0.3, z: 0 },
          principalAngularInertia: { x: 1.2, y: 5.8, z: 5.1 },
          angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 },
        }}
      />
      <group ref={chassis} />
      <CarBody brakeLight={false}>
        <Driver position={DRIVER_SEAT} />
      </CarBody>
      {WHEELS.map((w, i) => (
        <group
          key={i}
          ref={(el) => {
            wheelRefs.current[i] = el;
          }}
          position={[w.pos.x, w.pos.y - REST, w.pos.z]}
        >
          <group>
            <CarWheel scale={w.front ? 1 : REAR_WHEEL_SCALE} />
          </group>
        </group>
      ))}
    </RigidBody>
  );
}

function place(b: RapierRigidBody, x: number, z: number, heading: number) {
  const q = new THREE.Quaternion().setFromAxisAngle(up, heading);
  b.setTranslation({ x, y: 0.9, z }, true);
  b.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
  b.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.setAngvel({ x: 0, y: 0, z: 0 }, true);
}
