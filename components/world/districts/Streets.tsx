"use client";

// Draws the town streets (./townStreets.ts): pavement slabs and kerbs, planters with street
// trees, and the loose furniture (bollards, café tables and chairs) as knock-about
// props; one bus stop and one kiosk stand fixed.
import { useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CI } from "../buildings/concrete";
import { geo, mat, unitBox, unitCyl } from "../models/props/shared";
import { Tree } from "../models/props/Tree";
import { Instances } from "../street/Instances";
import { Movables, kindFromMatrices } from "../Movables";
import { STREETS } from "./townStreets";

const cyl = (r: number, h: number, y: number, seg = 16) => new THREE.CylinderGeometry(r, r, h, seg).translate(0, y, 0);

/** Bollard: an ink post with a paper band and a rounded cap (origin at its centre). */
const bollardGeo = () =>
  geo("street-bollard", () => mergeGeometries([cyl(0.11, 0.84, 0), new THREE.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.42, 0)]));
const bandGeo = () => geo("street-bollard-band", () => cyl(0.115, 0.1, 0.22));

/** Café table: round top on a stem and foot (origin on the ground). */
const tableGeo = () => geo("street-table", () => mergeGeometries([cyl(0.42, 0.05, 0.74, 24), cyl(0.04, 0.72, 0.37), cyl(0.24, 0.04, 0.02, 20)]));
/** Café chair: seat, back, four legs (origin on the ground, back toward -x). */
const chairGeo = () =>
  geo("street-chair", () =>
    mergeGeometries([
      new THREE.BoxGeometry(0.42, 0.05, 0.42).translate(0, 0.46, 0),
      new THREE.BoxGeometry(0.05, 0.42, 0.42).translate(-0.19, 0.7, 0),
      ...[
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ].map(([x, z]) => new THREE.BoxGeometry(0.04, 0.46, 0.04).translate(x, 0.23, z)),
    ]),
  );

function BusStop({ x, y, z, yaw }: { x: number; y: number; z: number; yaw: number }) {
  const steel = mat(CI.ink, { r: 0.45, m: 0.3 });
  const glass = mat("#cfd6d8", { r: 0.1, o: 0.4 });
  return (
    <RigidBody type="fixed" colliders={false} position={[x, y, z]} rotation={[0, yaw, 0]}>
      {/* back panel away from the road, roof, two posts, a bench */}
      <mesh geometry={unitBox()} scale={[3.2, 2.1, 0.06]} position={[0, 1.15, -0.65]} material={glass} />
      <mesh geometry={unitBox()} scale={[3.5, 0.12, 1.6]} position={[0, 2.3, -0.2]} material={mat(CI.ink, { r: 0.55 })} castShadow />
      <mesh geometry={unitBox()} scale={[3.52, 0.04, 1.62]} position={[0, 2.37, -0.2]} material={mat(CI.paper, { r: 0.6 })} />
      {[-1.6, 1.6].map((px) => (
        <mesh key={px} geometry={unitBox()} scale={[0.1, 2.3, 0.1]} position={[px, 1.15, -0.65]} material={steel} castShadow />
      ))}
      <mesh geometry={unitBox()} scale={[2.4, 0.08, 0.42]} position={[0, 0.48, -0.4]} material={mat(CI.concrete, { r: 0.9 })} castShadow />
      <mesh geometry={unitBox()} scale={[0.08, 0.46, 0.3]} position={[-1.0, 0.24, -0.42]} material={steel} />
      <mesh geometry={unitBox()} scale={[0.08, 0.46, 0.3]} position={[1.0, 0.24, -0.42]} material={steel} />
      {/* the stop's flag on a pole at the kerb end */}
      <mesh geometry={unitCyl()} scale={[0.05, 2.6, 0.05]} position={[1.9, 1.3, 0.35]} material={steel} />
      <mesh geometry={unitBox()} scale={[0.5, 0.5, 0.04]} position={[1.9, 2.45, 0.35]} material={mat(CI.orange, { r: 0.55 })} />
      <mesh geometry={unitBox()} scale={[0.3, 0.06, 0.045]} position={[1.9, 2.45, 0.35]} material={mat(CI.paper, { r: 0.6 })} />
      <CuboidCollider args={[1.75, 1.2, 0.5]} position={[0, 1.2, -0.45]} />
    </RigidBody>
  );
}

function Kiosk({ x, y, z, yaw }: { x: number; y: number; z: number; yaw: number }) {
  const body = mat(CI.graphite, { r: 0.7 });
  return (
    <RigidBody type="fixed" colliders={false} position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh geometry={geo("kiosk-body", () => new RoundedBoxGeometry(1.8, 2.1, 1.5, 2, 0.08))} position={[0, 1.05, -0.2]} material={body} castShadow receiveShadow />
      {/* counter window, striped awning, roof */}
      <mesh geometry={unitBox()} scale={[1.3, 0.75, 0.04]} position={[0, 1.35, 0.56]} material={mat(CI.glass, { r: 0.2 })} />
      <mesh geometry={unitBox()} scale={[1.6, 0.06, 0.3]} position={[0, 0.95, 0.68]} material={mat(CI.paper, { r: 0.6 })} castShadow />
      {[-0.6, -0.2, 0.2, 0.6].map((ax, i) => (
        <mesh key={ax} geometry={unitBox()} scale={[0.4, 0.05, 0.62]} position={[ax, 1.85, 0.78]} rotation={[0.35, 0, 0]} material={mat(i === 3 ? CI.orange : i % 2 ? CI.paper : CI.ink, { r: 0.55 })} castShadow />
      ))}
      <mesh geometry={unitBox()} scale={[2.0, 0.14, 1.7]} position={[0, 2.18, -0.2]} material={mat(CI.ink, { r: 0.55 })} castShadow />
      <CuboidCollider args={[0.95, 1.1, 0.8]} position={[0, 1.1, -0.2]} />
    </RigidBody>
  );
}

export default function Streets() {
  const loose = useMemo(() => {
    const ink = mat(CI.ink, { r: 0.5, m: 0.2 });
    const paper = mat(CI.paper, { r: 0.6 });
    // bollards: the post, plus its band riding along as a second part
    const bollards = kindFromMatrices(STREETS.bollards, [{ geometry: bollardGeo(), material: ink }, { geometry: bandGeo(), material: paper, shadow: false }], { mass: 0.5, shape: "box", shrink: 0.9 });
    const tables = kindFromMatrices(STREETS.tables, [{ geometry: tableGeo(), material: mat(CI.paper, { r: 0.55 }) }], { mass: 0.2, shrink: 0.9 });
    const chairs = kindFromMatrices(STREETS.chairs, [{ geometry: chairGeo(), material: mat(CI.ink, { r: 0.55 }) }], { mass: 0.12, shrink: 0.9 });
    return [bollards, tables, chairs];
  }, []);
  const planterGeo = useMemo(() => geo("street-planter", () => new RoundedBoxGeometry(1, 1, 1, 2, 0.08)), []);
  const planters = useMemo(() => ({ m: STREETS.planters }), []);
  return (
    <group name="streets">
      <Instances geometry={unitBox()} material={mat("#ffffff", { r: 0.9 })} batch={STREETS.slabs} />
      <Instances geometry={unitBox()} material={mat(CI.concreteDark, { r: 0.9 })} batch={STREETS.kerbs} />
      <Instances geometry={planterGeo} material={mat(CI.concreteDark, { r: 0.9 })} batch={planters} />
      {loose.map((k, i) => (
        <Movables key={i} kind={k} />
      ))}
      <RigidBody type="fixed" colliders={false}>
        {STREETS.trees.map((t, i) => (
          <CylinderCollider key={i} args={[0.6, 0.55]} position={[t.x, t.y, t.z]} />
        ))}
      </RigidBody>
      {STREETS.trees.map((t, i) => (
        <group key={i} position={[t.x, t.y, t.z]} rotation={[0, t.rot, 0]} scale={0.62}>
          <Tree variant="round" seed={t.seed} />
        </group>
      ))}
      {STREETS.busStop && <BusStop {...STREETS.busStop} />}
      {STREETS.kiosk && <Kiosk {...STREETS.kiosk} />}
    </group>
  );
}
