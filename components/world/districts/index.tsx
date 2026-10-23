"use client";

// District identity (layout v4 step g): paving, planting and props that tell you
// which part of the island you are in. Bruno Simon's props (MIT) where he has one.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayNight } from "../daynight";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { lowSphere, mat, unitCyl } from "../models/props/shared";
import { C } from "../palette";
import { propGeometry } from "../models/props/bruno";
import { withWind } from "../alive/sway";
import { BENCH, FENCE, LANTERN, LANTERN_LIGHT } from "../models/props/brunoProps";
import { Instances } from "../street/Instances";
import { DUNES, tuftGeometry } from "./dunes";
import { HARBOUR } from "./harbour";
import { HILLS, flowerGeometry } from "./hills";
import { OLD_TOWN } from "./oldTown";
import { WATERSIDE, padGeometry, reedGeometry } from "./waterside";

/** Lantern glass: a soft glow by day, blooming at night. Owned here so it's safe to animate. */
const glass = new THREE.MeshStandardMaterial({ color: "#ffd9a8", emissive: new THREE.Color("#ff9440"), emissiveIntensity: 0.1, roughness: 0.4, toneMapped: false });

export default function Districts() {
  const props = useMemo(() => ({ lantern: propGeometry(LANTERN), light: propGeometry(LANTERN_LIGHT), bench: propGeometry(BENCH), crate: new RoundedBoxGeometry(1, 1, 1, 2, 0.08), flower: flowerGeometry(), rock: new THREE.IcosahedronGeometry(1, 0), fence: propGeometry(FENCE), tuft: tuftGeometry(), reed: reedGeometry(), pad: padGeometry() }), []);
  const lilies = useMemo(() => ({ m: WATERSIDE.flowers }), []);
  const fences = useMemo(() => ({ m: DUNES.fences }), []);
  const lanterns = useMemo(() => ({ m: [...OLD_TOWN.lanterns, ...HARBOUR.lanterns] }), []);
  const benches = useMemo(() => ({ m: [...OLD_TOWN.benches, ...HARBOUR.benches] }), []);
  useFrame(() => {
    glass.emissiveIntensity = 0.1 + dayNight.night * 1.7;
  });
  const vc = mat("#ffffff", { r: 0.8, vc: true });
  return (
    <group name="districts">
      <mesh geometry={OLD_TOWN.paving} material={mat("#ffffff", { r: 0.9, vc: true, flat: true })} receiveShadow />
      <Instances geometry={props.lantern} material={vc} batch={lanterns} />
      <Instances geometry={props.light} material={glass} batch={lanterns} shadow={false} />
      <Instances geometry={props.bench} material={vc} batch={benches} />
      <Instances geometry={props.crate} material={mat("#ffffff", { r: 0.85 })} batch={HARBOUR.crates} />
      <Instances geometry={unitCyl()} material={mat("#ffffff", { r: 0.6 })} batch={HARBOUR.barrels} />
      <Instances geometry={props.flower} material={withWind(mat("#ffffff", { r: 0.7, side: THREE.DoubleSide }), { amount: 0.25, maxHeight: 0.4 })} batch={HILLS.flowers} shadow={false} />
      <Instances geometry={props.rock} material={mat("#ffffff", { r: 0.95, flat: true })} batch={HILLS.rocks} />
      <Instances geometry={props.fence} material={vc} batch={fences} />
      <Instances geometry={props.tuft} material={withWind(mat("#ffffff", { r: 0.9, flat: true }), { amount: 0.3, maxHeight: 0.7 })} batch={DUNES.tufts} shadow={false} />
      <Instances geometry={props.reed} material={withWind(mat("#ffffff", { r: 0.85, vc: true, flat: true }), { amount: 0.22, maxHeight: 1.4 })} batch={WATERSIDE.reeds} shadow={false} />
      <Instances geometry={props.rock} material={mat("#ffffff", { r: 0.95, flat: true })} batch={WATERSIDE.rocks} />
      <Instances geometry={props.pad} material={mat("#ffffff", { r: 0.6, side: THREE.DoubleSide })} batch={WATERSIDE.pads} shadow={false} />
      <Instances geometry={lowSphere()} material={mat(C.pink, { r: 0.5 })} batch={lilies} shadow={false} />
    </group>
  );
}
