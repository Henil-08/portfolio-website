"use client";

// District identity (layout v4 step g): paving, planting and props that tell you
// which part of the island you are in. The original props (MIT) where it has one.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayNight } from "../daynight";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { lowSphere, mat, unitCyl } from "../models/props/shared";
import { C } from "../palette";
import { propGeometry } from "../models/props/kit";
import { withWind } from "../alive/sway";
import { BENCH, FENCE, LANTERN, LANTERN_LIGHT } from "../models/props/propModels";
import { Instances } from "../street/Instances";
import { Movables, kindFromMatrices, type MovableKind } from "../Movables";
import { heightAt } from "../terrain";
import { BEACHES } from "./beaches";
import { DUNES, tuftGeometry } from "./dunes";
import { HARBOUR } from "./harbour";
import { HILLS, flowerGeometry } from "./hills";
import { OLD_TOWN } from "./oldTown";
import { PARK } from "./park";
import { WATERSIDE, padGeometry, reedGeometry } from "./waterside";

/** Lantern glass: a soft glow by day, blooming at night. Owned here so it's safe to animate. */
const glass = new THREE.MeshStandardMaterial({ color: "#ffd9a8", emissive: new THREE.Color("#ff9440"), emissiveIntensity: 0.1, roughness: 0.4, toneMapped: false });

/** Rocks sit on the ground as bodies (placed half sunk, they'd jump out when hit). */
function onGround(kind: MovableKind) {
  const sh = kind.shape;
  const hy = sh.type === "box" ? sh.hy : sh.type === "ball" ? sh.radius : sh.halfHeight;
  for (const it of kind.items) {
    const sy = typeof it.s === "object" ? it.s[1] : (it.s ?? 1);
    it.y = Math.max(it.y, heightAt(it.x, it.z) + hy * sy + 0.01);
  }
  return kind;
}

export default function Districts() {
  const vc = mat("#ffffff", { r: 0.8, vc: true });
  const props = useMemo(() => ({ lantern: propGeometry(LANTERN), light: propGeometry(LANTERN_LIGHT), bench: propGeometry(BENCH), crate: new RoundedBoxGeometry(1, 1, 1, 2, 0.08), slab: new RoundedBoxGeometry(1, 1, 1, 2, 0.3), flower: flowerGeometry(), rock: new THREE.IcosahedronGeometry(1, 0), fence: propGeometry(FENCE), tuft: tuftGeometry(), reed: reedGeometry(), pad: padGeometry() }), []);
  const lilies = useMemo(() => ({ m: WATERSIDE.flowers }), []);
  const fences = useMemo(() => ({ m: [...DUNES.fences, ...PARK.fences] }), []);
  const lanterns = useMemo(() => ({ m: [...OLD_TOWN.lanterns, ...HARBOUR.lanterns, ...PARK.lanterns] }), []);
  const benches = useMemo(() => ({ m: [...OLD_TOWN.benches, ...HARBOUR.benches, ...PARK.benches] }), []);
  // Everything loose can be knocked about (../Movables.tsx); the car is mass 2.5.
  const loose = useMemo(() => {
    const stone = mat("#ffffff", { r: 0.95, flat: true });
    const rocks = [...HILLS.rocks.m, ...WATERSIDE.rocks.m, ...BEACHES.rocks.m];
    const rockColors = [...HILLS.rocks.c, ...WATERSIDE.rocks.c, ...BEACHES.rocks.c];
    return [
      onGround(kindFromMatrices(rocks, [{ geometry: props.rock, material: stone }], { mass: 1.4, shrink: 0.7, colors: rockColors, selfCollide: false })),
      kindFromMatrices(lanterns.m, [{ geometry: props.lantern, material: vc }, { geometry: props.light, material: glass, shadow: false }], { mass: 0.3 }),
      kindFromMatrices(benches.m, [{ geometry: props.bench, material: vc }], { mass: 0.6 }),
      kindFromMatrices(HARBOUR.crates.m, [{ geometry: props.crate, material: mat("#ffffff", { r: 0.85 }) }], { mass: 0.25, shrink: 0.98, colors: HARBOUR.crates.c }),
      kindFromMatrices(HARBOUR.barrels.m, [{ geometry: unitCyl(), material: mat("#ffffff", { r: 0.6 }) }], { mass: 0.3, shrink: 0.95, colors: HARBOUR.barrels.c }),
    ];
  }, [props, lanterns, benches, vc]);
  useFrame(() => {
    glass.emissiveIntensity = 0.1 + dayNight.night * 1.7;
  });
  return (
    <group name="districts">
      {loose.map((k, i) => (
        <Movables key={i} kind={k} />
      ))}
      <mesh geometry={OLD_TOWN.paving} material={mat("#ffffff", { r: 0.9, vc: true, flat: true })} receiveShadow />
      <Instances geometry={props.flower} material={withWind(mat("#ffffff", { r: 0.7, side: THREE.DoubleSide }), { amount: 0.25, maxHeight: 0.4 })} batch={HILLS.flowers} shadow={false} />
      <Instances geometry={props.slab} material={mat("#ffffff", { r: 0.9 })} batch={PARK.slabs} shadow={false} />
      <Instances geometry={props.flower} material={withWind(mat("#ffffff", { r: 0.7, side: THREE.DoubleSide }), { amount: 0.25, maxHeight: 0.4 })} batch={PARK.flowers} shadow={false} />
      <Instances geometry={props.fence} material={vc} batch={fences} />
      <Instances geometry={props.tuft} material={withWind(mat("#ffffff", { r: 0.9, flat: true }), { amount: 0.3, maxHeight: 0.7 })} batch={DUNES.tufts} shadow={false} />
      <Instances geometry={props.reed} material={withWind(mat("#ffffff", { r: 0.85, vc: true, flat: true }), { amount: 0.22, maxHeight: 1.4 })} batch={WATERSIDE.reeds} shadow={false} />
      <Instances geometry={props.pad} material={mat("#ffffff", { r: 0.6, side: THREE.DoubleSide })} batch={WATERSIDE.pads} shadow={false} />
      <Instances geometry={lowSphere()} material={mat(C.pink, { r: 0.5 })} batch={lilies} shadow={false} />
      <Instances geometry={unitCyl()} material={mat("#ffffff", { r: 0.95, flat: true })} batch={BEACHES.wood} />
    </group>
  );
}
