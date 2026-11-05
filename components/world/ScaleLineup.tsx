"use client";

// The scale check (docs/research/model-fidelity.md "World scale"), dev only. In the console,
// window.__lineup() parks the car at the head of a row on the pit lane's east end and stands the
// world's own pieces beside it, each drawn exactly as the world draws it (./scale.ts): a person,
// the bench, a bush, the lamp, a bollard, a cypress and a round tree, over a 1 m grid, each with
// its real size written in front, and points the camera at it. window.__lineup(false) clears it.
// Read it like a photo: the lamp about twice the person, the bench knee-high, the bush waist-high,
// the car longer than the bench.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Avatar } from "./models/Avatar";
import { Label } from "./models/props/Label";
import { benchParts, lanternGeo, lanternLightGeo } from "./districts/furniture";
import { kindGeometry } from "./foliage/species";
import { bake } from "./kit/shared";
import { BENCH, LAMP_H, bollardModel } from "./kit/street";
import { PIT } from "./layout";
import { WORLD_SCALE } from "./scale";
import { heightAt } from "./terrain";

/** Where the row starts (the car's nose) and its line: the pit lane, east of the last garage. The
 *  row runs toward -x, so from the camera (on the garages' side, looking north) it reads left to right. */
const X0 = 39.8;
const Z = PIT.z + 0.4;
/** The car's length here (TH-18, a real 5.6 m). */
const CAR = 5.6 * WORLD_SCALE;

type Piece = { id: string; w: number; label: string; draw: () => ReactNode };
/** Upright just in front of the row, turned to the camera. */
const FACING: [number, number, number] = [0, Math.PI, 0];

function useLineup() {
  return useMemo(() => {
    const vc = new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.85, flatShading: true });
    const glow = new THREE.MeshStandardMaterial({ color: "#fbf6e8", emissive: "#fbf6e8", emissiveIntensity: 0.6, roughness: 0.5 });
    const bollard = bake(bollardModel(true), { xf: { s: WORLD_SCALE } });
    const kind = (k: "bush" | "cypress" | "round") => <mesh geometry={kindGeometry(k)} material={vc} castShadow receiveShadow />;
    const pieces: Piece[] = [
      { id: "person", w: 0.5, label: "PERSON 1.75", draw: () => <Avatar scale={WORLD_SCALE} rotation={[0, Math.PI, 0]} /> },
      {
        id: "bench",
        w: BENCH.L * WORLD_SCALE,
        label: "BENCH 2.1",
        draw: () => (
          <group rotation={[0, Math.PI, 0]}>
            {benchParts().map((b, i) => (
              <mesh key={i} geometry={b.geometry} material={b.material} castShadow receiveShadow />
            ))}
          </group>
        ),
      },
      { id: "bush", w: 1.8, label: "BUSH 1.25", draw: () => kind("bush") },
      {
        id: "lamp",
        w: 0.6,
        label: `LAMP ${LAMP_H.toFixed(1)}`,
        draw: () => (
          <>
            <mesh geometry={lanternGeo()} material={vc} castShadow />
            <mesh geometry={lanternLightGeo()} material={glow} />
          </>
        ),
      },
      { id: "bollard", w: 0.2, label: "BOLLARD 1.0", draw: () => <mesh geometry={bollard} material={vc} castShadow /> },
      { id: "cypress", w: 1.4, label: "CYPRESS 7.5", draw: () => kind("cypress") },
      { id: "round", w: 2.8, label: "TREE 6.5", draw: () => kind("round") },
    ];
    // after the car, 0.45 m apart; the labels in two staggered rows so they never run together
    let x = X0 - CAR - 0.7;
    const placed = pieces.map((p, i) => {
      const at = x - p.w / 2;
      x -= p.w + 0.45;
      return { ...p, x: at, row: i % 2 };
    });
    return { placed, end: x };
  }, []);
}

/** A 1 m grid on the ground under the row, paper lines a hair above the tarmac. */
function Grid({ x0, x1 }: { x0: number; x1: number }) {
  const g = useMemo(() => {
    const pts: number[] = [];
    const z0 = Z - 2;
    const z1 = Z + 2;
    const y = (x: number, z: number) => heightAt(x, z) + 0.035;
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) pts.push(x, y(x, z0), z0, x, y(x, z1), z1);
    for (let z = z0; z <= z1 + 1e-6; z++) pts.push(Math.floor(x0), y(x0, z), z, Math.ceil(x1), y(x1, z), z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [x0, x1]);
  return (
    <lineSegments geometry={g}>
      <lineBasicMaterial color="#f3f2ed" />
    </lineSegments>
  );
}

export default function ScaleLineup() {
  const [on, setOn] = useState(false);
  const { placed, end } = useLineup();
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __lineup?: (show?: boolean) => void; __cam?: number[] | null; __placeXZ?: (x: number, z: number, h?: number) => void };
    w.__lineup = (show = true) => {
      setOn(show);
      if (!show) {
        w.__cam = null;
        return;
      }
      // the car at the head of the row, nose out; the camera low, from the garages' side
      w.__placeXZ?.(X0 - CAR / 2, Z, 0);
      const mid = (X0 + end) / 2;
      w.__cam = [mid + 1, heightAt(mid, Z) + 3.2, Z - 15.5, mid, heightAt(mid, Z) + 1.2, Z];
    };
    return () => {
      delete w.__lineup;
    };
  }, [end]);
  if (!on) return null;
  return (
    <group name="scale-lineup">
      <Grid x0={end} x1={X0 + 0.5} />
      {placed.map((p) => {
        const y = heightAt(p.x, Z);
        return (
          <group key={p.id}>
            <group position={[p.x, y, Z]}>{p.draw()}</group>
            <Label mono position={[p.x, y + 0.12, Z - 1.4 - p.row * 0.7]} rotation={FACING} fontSize={0.17} color="#151515">
              {p.label}
            </Label>
          </group>
        );
      })}
      <Label mono position={[X0 - CAR / 2, heightAt(X0, Z) + 0.12, Z - 1.4]} rotation={FACING} fontSize={0.17} color="#151515">
        CAR 5.6
      </Label>
    </group>
  );
}
