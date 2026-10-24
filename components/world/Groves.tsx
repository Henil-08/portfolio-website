"use client";

// Clusters of trees and bushes on the outside of the circuit, in the gaps
// between the track, the street and the skyline: green where the camera looks.
import { useMemo } from "react";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { Bush, Tree } from "./models/props";
import { MAX_R, PIT, inLand, SECTORS, TRACK_WIDTH, nearestT, trackPoint } from "./layout";
import { heightAt } from "./terrain";
import { BUILDINGS } from "./street/Skyline";
import { STAND_SPOTS } from "./street/standSpots";
import { FLOODS } from "./street/layoutStreet";
import { inSectorScene } from "./street/common";
import { nearPromenade } from "./waterfront/layout";

type Item = { kind: "round" | "pine" | "bush"; x: number; z: number; s: number; rot: number; seed: number };

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function free(x: number, z: number, pad: number, out: Item[]) {
  if (!inLand(x, z, 4)) return false;
  if (nearPromenade(x, z, 2)) return false;
  const n = nearestT(x, z);
  if (n.dist < TRACK_WIDTH / 2 + 6) return false;
  // outside the loop only: further from the centre than the nearest stretch of track
  const p = trackPoint(n.t);
  if (Math.hypot(x, z) < Math.hypot(p.x, p.z)) return false;
  if (inSectorScene(x, z, 4, 13)) return false;
  if (z > PIT.garageZ - 10 && z < 46 && x > PIT.from - 30 && x < PIT.to + 28) return false;
  if (BUILDINGS.some((b) => Math.hypot(b.x - x, b.z - z) < Math.hypot(b.w, b.d) / 2 + pad)) return false;
  if (STAND_SPOTS.some((s) => Math.hypot(s.x - x, s.z - z) < 9)) return false;
  if (FLOODS.some((l) => Math.hypot(l.x - x, l.z - z) < 2)) return false;
  if (SECTORS.some((s) => Math.hypot(s.scene[0] - x, s.scene[1] - z) < 16)) return false;
  return !out.some((o) => Math.hypot(o.x - x, o.z - z) < 2.4);
}

export default function Groves() {
  const items = useMemo(() => {
    const r = rng(7331);
    const out: Item[] = [];
    let groves = 0;
    for (let tries = 0; tries < 3000 && groves < 26; tries++) {
      const a = r() * Math.PI * 2;
      const rad = 40 + r() * (MAX_R - 44);
      const cx = Math.cos(a) * rad;
      const cz = Math.sin(a) * rad;
      if (!free(cx, cz, 3, out)) continue;
      groves++;
      const n = 4 + Math.floor(r() * 5);
      for (let k = 0; k < n * 3 && k < 30; k++) {
        const ang = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 6;
        const x = cx + Math.cos(ang) * d;
        const z = cz + Math.sin(ang) * d;
        if (!free(x, z, 1.5, out)) continue;
        const roll = r();
        out.push({ kind: roll < 0.45 ? "round" : roll < 0.75 ? "pine" : "bush", x, z, s: 0.8 + r() * 0.6, rot: r() * Math.PI * 2, seed: Math.floor(r() * 1000) });
        if (out.filter((o) => Math.hypot(o.x - cx, o.z - cz) < 7).length >= n) break;
      }
    }
    return out;
  }, []);

  return (
    <>
      {items.map((it, i) => {
        const y = heightAt(it.x, it.z);
        if (it.kind === "bush")
          return (
            <group key={i} position={[it.x, y, it.z]} rotation={[0, it.rot, 0]} scale={it.s}>
              <Bush seed={it.seed} />
            </group>
          );
        return (
          <RigidBody key={i} type="fixed" colliders={false} position={[it.x, y, it.z]}>
            <CylinderCollider args={[1, 0.3 * it.s]} position={[0, 1, 0]} />
            <group rotation={[0, it.rot, 0]} scale={it.s}>
              <Tree variant={it.kind} seed={it.seed} />
            </group>
          </RigidBody>
        );
      })}
    </>
  );
}
