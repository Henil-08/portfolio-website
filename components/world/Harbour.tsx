"use client";

// The low bridge where the west sweepers cross the harbour inlet. The road runs
// on a causeway (terrain.ts stops the inlet short of it); here are its stone
// faces on both sides, each with a dark arch at the waterline so the water reads
// as running under the road, and a coping along the top.
import { useMemo } from "react";
import { CANALS, LAKES, SEA_Y, TRACK_WIDTH, lakeDepthDist, nearestT, trackPoint, trackTangent } from "./layout";
import { C } from "./palette";
import { mat } from "./models/props/shared";
import { heightAt } from "./terrain";

const EDGE = TRACK_WIDTH / 2 + 2.2; // where the inlet stops, either side of the road centre

function crossings() {
  const out: { x: number; z: number; y: number; yaw: number; nx: number; nz: number; w: number; tx: number; tz: number }[] = [];
  for (const cn of CANALS) {
    let best = { d: Infinity, x: 0, z: 0, t: 0, seg: 0 };
    for (let i = 0; i < cn.pts.length - 1; i++)
      for (let k = 0; k <= 40; k++) {
        const x = cn.pts[i][0] + (cn.pts[i + 1][0] - cn.pts[i][0]) * (k / 40);
        const z = cn.pts[i][1] + (cn.pts[i + 1][1] - cn.pts[i][1]) * (k / 40);
        const n = nearestT(x, z);
        if (n.dist < best.d) best = { d: n.dist, x, z, t: n.t, seg: i };
      }
    if (best.d > 3) continue;
    const p = trackPoint(best.t);
    const tan = trackTangent(best.t);
    const nx = -tan.z;
    const nz = tan.x;
    const l = Math.hypot(nx, nz) || 1;
    // The inlet meets the road at an angle: each face sits where the inlet's
    // centreline reaches the causeway edge, and spans the inlet's width across it.
    const [ax, az] = cn.pts[best.seg];
    const [bx, bz] = cn.pts[best.seg + 1];
    const dl = Math.hypot(bx - ax, bz - az) || 1;
    const dx = (bx - ax) / dl;
    const dz = (bz - az) / dl;
    const sin = Math.max(0.35, Math.abs(dx * (nx / l) + dz * (nz / l)));
    out.push({ x: p.x, z: p.z, y: p.y, yaw: Math.atan2(-tan.z, tan.x), nx: dx / sin, nz: dz / sin, w: cn.w / sin, tx: tan.x / Math.hypot(tan.x, tan.z), tz: tan.z / Math.hypot(tan.x, tan.z) });
  }
  return out;
}

export default function Harbour() {
  const parts = useMemo(() => crossings(), []);
  const bottom = SEA_Y - 0.6;
  return (
    <>
      {parts.map((c, i) =>
        [-1, 1].map((side) => {
          const top = c.y + 0.02;
          const h = top - bottom;
          // the face covers the stretch of causeway edge that borders water (the inlet, or the lake)
          const px = c.x + c.nx * EDGE * side;
          const pz = c.z + c.nz * EDGE * side;
          const wetAt = (k: number) => heightAt(px + c.tx * k + c.nx * side * 0.9, pz + c.tz * k + c.nz * side * 0.9) < SEA_Y + 0.05;
          let lo = 0;
          let hi = 0;
          while (lo > -14 && wetAt(lo - 0.25)) lo -= 0.25;
          while (hi < 14 && wetAt(hi + 0.25)) hi += 0.25;
          const len = Math.max(2, hi - lo) + 1.6;
          const mid = (lo + hi) / 2;
          const archR = Math.max(0.2, Math.min(1.5, len / 2 - 0.8, top - SEA_Y - 0.14));
          // only where the inlet itself meets the causeway; a lake just meets it with a bank
          if (LAKES.some((l) => lakeDepthDist(l, px, pz) > -2)) return null;
          return (
            <group key={`${i}${side}`} position={[px + c.tx * mid, 0, pz + c.tz * mid]} rotation={[0, c.yaw + (side * Math.sign(c.nx * -Math.sin(c.yaw) + c.nz * Math.cos(c.yaw)) < 0 ? Math.PI : 0), 0]}>
              {/* the stone face, its outside toward local +z */}
              <mesh position={[0, bottom + h / 2, -0.3]} material={mat(C.rock, { r: 0.9 })} castShadow receiveShadow>
                <boxGeometry args={[len, h, 0.6]} />
              </mesh>
              {/* a dark arch at the waterline */}
              <mesh position={[0, SEA_Y, 0.005]} material={mat("#2a3236", { r: 1 })}>
                <circleGeometry args={[archR, 28, 0, Math.PI]} />
              </mesh>
              {/* voussoir ring and coping */}
              <mesh position={[0, SEA_Y, 0.01]} material={mat(C.sand, { r: 0.85 })}>
                <ringGeometry args={[archR, archR + 0.22, 28, 1, 0, Math.PI]} />
              </mesh>
              <mesh position={[0, top + 0.06, -0.25]} material={mat(C.sand, { r: 0.85 })} castShadow receiveShadow>
                <boxGeometry args={[len + 0.3, 0.14, 0.8]} />
              </mesh>
            </group>
          );
        }),
      )}
    </>
  );
}
