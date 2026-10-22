"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { CarBody, CarWheel } from "./models/Car";
import { Driver } from "./models/Avatar";
import { input } from "./input";
import { carState } from "./carState";
import { getState, setState, subscribe } from "./store";
import { SPAWN, zoneById } from "./layout";
import { honk } from "./sound";

type VehicleController = ReturnType<ReturnType<typeof useRapier>["world"]["createVehicleController"]>;

// Connection points sit a little above the wheel centres so the car settles
// with the body's ground line (y = -0.46) just touching the road.
const WHEELS = [
  { pos: new THREE.Vector3(0.78, 0.14, 0.66), front: true },
  { pos: new THREE.Vector3(0.78, 0.14, -0.66), front: true },
  { pos: new THREE.Vector3(-0.72, 0.14, 0.66), front: false },
  { pos: new THREE.Vector3(-0.72, 0.14, -0.66), front: false },
];
const RADIUS = 0.34;
const REST = 0.32;
const ENGINE = 34;
const BOOST = 1.7;
const TOP = 24; // m/s, about 86 km/h. Toy fast, still steerable.
const BRAKE = 0.5;

const up = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();

export default function Vehicle() {
  const body = useRef<RapierRigidBody>(null);
  const controller = useRef<VehicleController | null>(null);
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);
  const steer = useRef(0);
  const flipped = useRef(0);
  const lastHud = useRef(0);
  const { world } = useRapier();

  useEffect(() => {
    const b = body.current;
    if (!b) return;
    const v = world.createVehicleController(b);
    for (const w of WHEELS) {
      v.addWheel(w.pos, { x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }, REST, RADIUS);
    }
    for (let i = 0; i < WHEELS.length; i++) {
      v.setWheelSuspensionStiffness(i, 90);
      v.setWheelSuspensionCompression(i, 4.2);
      v.setWheelSuspensionRelaxation(i, 3.4);
      v.setWheelMaxSuspensionTravel(i, 0.3);
      v.setWheelMaxSuspensionForce(i, 100000);
      v.setWheelFrictionSlip(i, 2.4);
      v.setWheelSideFrictionStiffness(i, 1);
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
      const taper = Math.max(0, 1 - Math.max(speed, 0) / limit);
      engine = ENGINE * (input.boost ? BOOST : 1) * taper;
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
  });

  useFrame((_, dt) => {
    const v = controller.current;
    const b = body.current;
    if (!v || !b) return;

    const t = b.translation();
    const r = b.rotation();
    carState.pos.set(t.x, t.y, t.z);
    tmpQ.set(r.x, r.y, r.z, r.w);
    carState.forward.set(1, 0, 0).applyQuaternion(tmpQ);
    const lv = b.linvel();
    carState.vel.set(lv.x, lv.y, lv.z);
    carState.speed = v.currentVehicleSpeed();
    carState.grounded = [0, 1, 2, 3].some((i) => v.wheelIsInContact(i));

    // Wheels follow the suspension.
    for (let i = 0; i < WHEELS.length; i++) {
      const g = wheelRefs.current[i];
      if (!g) continue;
      const len = v.wheelSuspensionLength(i) ?? REST;
      g.position.set(WHEELS[i].pos.x, WHEELS[i].pos.y - len, WHEELS[i].pos.z);
      g.rotation.set(0, v.wheelSteering(i) ?? 0, 0);
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

    // Light boost: small extra push for that toy-car feel when airborne.
    if (!carState.grounded && input.forward && getState().phase === "world") {
      b.applyImpulse({ x: carState.forward.x * 0.05, y: 0, z: carState.forward.z * 0.05 }, true);
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
      position={[SPAWN[0], 1.2, SPAWN[1]]}
      linearDamping={0.25}
      angularDamping={1.6}
      canSleep={false}
      ccd
    >
      {/* Light chassis and a heavy low ballast so it bounces but rarely tips. */}
      <CuboidCollider args={[1.1, 0.22, 0.55]} mass={4} friction={0.3} />
      <BallCollider args={[0.15]} position={[0, -0.05, 0]} mass={8} friction={0} frictionCombineRule={1} />
      <CarBody brakeLight={false} />
      <group position={[-0.15, 0.05, 0]}>
        <Driver />
      </group>
      {WHEELS.map((w, i) => (
        <group
          key={i}
          ref={(el) => {
            wheelRefs.current[i] = el;
          }}
          position={[w.pos.x, w.pos.y - REST, w.pos.z]}
        >
          <group>
            <CarWheel scale={w.front ? 1 : 1.06} />
          </group>
        </group>
      ))}
    </RigidBody>
  );
}

function place(b: RapierRigidBody, x: number, z: number, heading: number) {
  const q = new THREE.Quaternion().setFromAxisAngle(up, heading);
  b.setTranslation({ x, y: 1.2, z }, true);
  b.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
  b.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.setAngvel({ x: 0, y: 0, z: 0 }, true);
}
