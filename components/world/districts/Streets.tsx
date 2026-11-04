"use client";

// Draws the town streets (./townStreets.ts): pavement slabs and kerbs, planters with street
// trees, and the loose furniture (the kit's bollards, café tables and chairs) as knock-about
// props; one kit bus stop and one kit kiosk stand fixed.
import { useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CI } from "../buildings/concrete";
import { geo, mat, unitBox } from "../models/props/shared";
import { KitModel } from "../kit/KitModel";
import { bake } from "../kit/shared";
import { bollardModel, busStopModel, cafeChairModel, cafeTableModel, kioskModel } from "../kit/street";
import { Tree } from "../models/props/Tree";
import { Instances } from "../street/Instances";
import { Movables, kindFromMatrices } from "../Movables";
import { STREETS } from "./townStreets";

const vc = () => mat("#ffffff", { r: 0.75, vc: true, flat: true });

/** Bollards are placed at their middle (0.42 m up); the kit bollard stands on its foot. */
const BOLLARD_MID = 0.42;
const bollardGeo = (band: boolean) => geo(`kit-street-bollard-${band}`, () => bake(bollardModel(band), { xf: { p: [0, -BOLLARD_MID, 0] } }));
/** The kit café table, and its chair turned so its back is toward -x like the placements expect. */
const tableGeo = () => geo("kit-street-table", () => bake(cafeTableModel()));
const chairGeo = () => geo("kit-street-chair", () => bake(cafeChairModel(), { xf: { r: [0, Math.PI / 2, 0] } }));

/** The kit bus stop (the approved concept): glass back away from the road (-z). */
function BusStop({ x, y, z, yaw }: { x: number; y: number; z: number; yaw: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[x, y, z]} rotation={[0, yaw, 0]}>
      <KitModel model={busStopModel()} />
      <CuboidCollider args={[1.75, 1.3, 0.75]} position={[0, 1.3, 0]} />
    </RigidBody>
  );
}

/** The kit kiosk (the approved concept), serving window toward +z. */
function Kiosk({ x, y, z, yaw }: { x: number; y: number; z: number; yaw: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[x, y, z]} rotation={[0, yaw, 0]}>
      <KitModel model={kioskModel()} />
      <CuboidCollider args={[1.1, 1.25, 1.2]} position={[0, 1.25, 0.1]} />
    </RigidBody>
  );
}

export default function Streets() {
  const loose = useMemo(() => {
    // the kit bollards; every third wears the orange collar, like the concept's middle one
    const plain = kindFromMatrices(STREETS.bollards.filter((_, i) => i % 3 !== 1), [{ geometry: bollardGeo(false), material: vc() }], { mass: 0.5, shape: "box", shrink: 0.9 });
    const banded = kindFromMatrices(STREETS.bollards.filter((_, i) => i % 3 === 1), [{ geometry: bollardGeo(true), material: vc() }], { mass: 0.5, shape: "box", shrink: 0.9 });
    const tables = kindFromMatrices(STREETS.tables, [{ geometry: tableGeo(), material: vc() }], { mass: 0.2, shrink: 0.9 });
    const chairs = kindFromMatrices(STREETS.chairs, [{ geometry: chairGeo(), material: vc() }], { mass: 0.12, shrink: 0.9 });
    return [plain, banded, tables, chairs];
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
