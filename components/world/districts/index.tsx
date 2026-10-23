"use client";

// District identity (layout v4 step g): paving, planting and props that tell you
// which part of the island you are in. Bruno Simon's props (MIT) where he has one.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayNight } from "../daynight";
import { mat } from "../models/props/shared";
import { propGeometry } from "../models/props/bruno";
import { BENCH, LANTERN, LANTERN_LIGHT } from "../models/props/brunoProps";
import { Instances } from "../street/Instances";
import { OLD_TOWN } from "./oldTown";

/** Lantern glass: a soft glow by day, blooming at night. Owned here so it's safe to animate. */
const glass = new THREE.MeshStandardMaterial({ color: "#ffd9a8", emissive: new THREE.Color("#ff9440"), emissiveIntensity: 0.1, roughness: 0.4, toneMapped: false });

export default function Districts() {
  const props = useMemo(() => ({ lantern: propGeometry(LANTERN), light: propGeometry(LANTERN_LIGHT), bench: propGeometry(BENCH) }), []);
  const lanterns = useMemo(() => ({ m: OLD_TOWN.lanterns }), []);
  const benches = useMemo(() => ({ m: OLD_TOWN.benches }), []);
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
    </group>
  );
}
