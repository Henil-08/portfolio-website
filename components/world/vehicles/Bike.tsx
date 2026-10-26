"use client";

// V04 Apollo, the sport bike. Nose toward +z, wheels on y = 0.
import { useMemo, type ReactNode } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Box, K, M, SIDES, Tube, WheelSlot, loft, springGeo, tyreGeo, useMats, type P2, type Sec, type WheelSpec } from "./kit";
import { LIVERIES, type Livery } from "./liveries";

const B = { fz: 0.72, rz: -0.7, r: 0.31 };
/** Wheel centres for the game, in WheelSlot order: front, rear. */
export const BIKE_WHEELS: WheelSpec[] = [
  { x: 0, z: B.fz, r: B.r, front: true },
  { x: 0, z: B.rz, r: B.r, front: false },
];
// fork axis: from the front axle up and back at 24 degrees
const RAKE = Math.tan((24 * Math.PI) / 180);
/** The steering axis in model space (the fork's rake), for the game's steering. */
export const BIKE_STEER_AXIS: [number, number, number] = [0, 1 / Math.hypot(1, RAKE), -RAKE / Math.hypot(1, RAKE)];

function BikeWheel({ i, w, front, fixed }: { i: number; w: number; front?: boolean; fixed?: ReactNode }) {
  const geo = useMemo(() => tyreGeo(B.r, w, 0.22, 0.5), [w]);
  return (
    <WheelSlot i={i} p={[0, B.r, BIKE_WHEELS[i].z]} fixed={fixed}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh geometry={geo} material={M.tyre} castShadow />
        <mesh material={M.graphite}>
          <cylinderGeometry args={[0.215, 0.215, 0.05, 28]} />
        </mesh>
        {/* split five-spoke wheel, the hub, and the brake discs */}
        {SIDES.map((s) => (
          <group key={s}>
            {Array.from({ length: 5 }, (_, i) => (
              <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.1, s * 0.03, Math.sin((i / 5) * Math.PI * 2) * 0.1]} rotation={[0, -(i / 5) * Math.PI * 2, 0]} material={K.spoke}>
                <boxGeometry args={[0.2, 0.012, 0.028]} />
              </mesh>
            ))}
            {(front || s > 0) && (
              <mesh position={[0, s * (front ? 0.065 : 0.05), 0]} material={K.silver}>
                <cylinderGeometry args={[front ? 0.16 : 0.11, front ? 0.16 : 0.11, 0.008, 28]} />
              </mesh>
            )}
          </group>
        ))}
        <mesh material={M.ink}>
          <cylinderGeometry args={[0.045, 0.045, 0.16, 10]} />
        </mesh>
      </group>
    </WheelSlot>
  );
}

export function Bike({ livery = LIVERIES.V04[0] }: { livery?: Livery }) {
  const { fz, rz, r } = B;
  const mt = useMats(livery, [0.5, 0.15]);
  const geo = useMemo(() => {
    // the fairing: a sharp nose with the twin-light face, flaring to wide flanks
    const fr = (z: number, yb: number, yt: number, wb: number, wm: number, ym: number, wt: number): Sec => ({
      z,
      p: [
        [0, yb],
        [wb, yb + 0.02],
        [wm, ym],
        [wt, yt - 0.04],
        [wt * 0.45, yt],
        [0, yt + 0.01],
      ],
    });
    const mask = loft([fr(0.9, 0.8, 0.86, 0.02, 0.04, 0.83, 0.03), fr(0.8, 0.71, 0.95, 0.055, 0.14, 0.83, 0.105)]);
    const fairing = loft([
      fr(0.8, 0.71, 0.95, 0.055, 0.14, 0.83, 0.105),
      fr(0.7, 0.63, 0.99, 0.07, 0.18, 0.8, 0.13),
      fr(0.58, 0.5, 1.0, 0.08, 0.2, 0.72, 0.14),
      fr(0.44, 0.33, 0.96, 0.09, 0.2, 0.6, 0.15),
      fr(0.3, 0.24, 0.88, 0.09, 0.19, 0.52, 0.15),
      fr(0.08, 0.23, 0.78, 0.09, 0.18, 0.48, 0.14),
      fr(-0.12, 0.3, 0.66, 0.07, 0.14, 0.46, 0.1),
    ]);
    const tank = loft([
      fr(0.42, 0.82, 0.98, 0.1, 0.13, 0.9, 0.11),
      fr(0.28, 0.78, 1.02, 0.12, 0.17, 0.92, 0.13),
      fr(0.06, 0.76, 0.99, 0.12, 0.16, 0.88, 0.12),
      fr(-0.16, 0.76, 0.86, 0.1, 0.12, 0.81, 0.1),
    ]);
    // tail cowl: wide under the seat, kicking up to a short blunt tail with the lamp in its face
    const tail = loft([
      fr(-0.1, 0.66, 0.84, 0.1, 0.125, 0.76, 0.1),
      fr(-0.28, 0.7, 0.9, 0.1, 0.125, 0.8, 0.1),
      fr(-0.44, 0.76, 0.96, 0.085, 0.11, 0.86, 0.085),
      fr(-0.56, 0.83, 0.99, 0.06, 0.08, 0.91, 0.06),
      fr(-0.6, 0.86, 0.985, 0.05, 0.065, 0.925, 0.05),
    ]);
    const seat = loft([
      fr(-0.12, 0.8, 0.87, 0.11, 0.12, 0.84, 0.1),
      fr(-0.36, 0.84, 0.92, 0.085, 0.095, 0.885, 0.075),
    ]);
    const screen = loft([
      { z: 0.6, p: [[0, 0.98], [0.15, 0.97], [0.13, 1.0], [0, 1.01]] },
      { z: 0.42, p: [[0, 1.1], [0.11, 1.08], [0.09, 1.105], [0, 1.115]] },
    ]);
    // twin-spar frame from the headstock round the engine to the swingarm pivot
    const frame = loft(
      [
        { z: 0.42, p: [[0.1, 0.88], [0.125, 0.88], [0.125, 0.97], [0.1, 0.97]] as P2[] },
        { z: 0.12, p: [[0.14, 0.66], [0.17, 0.66], [0.17, 0.78], [0.14, 0.78]] as P2[] },
        { z: -0.12, p: [[0.14, 0.42], [0.17, 0.42], [0.17, 0.6], [0.14, 0.6]] as P2[] },
      ],
      { mirror: false },
    );
    const frameL = frame.clone();
    frameL.scale(-1, 1, 1);
    const swing = loft(
      [
        { z: -0.1, p: [[0.11, 0.4], [0.15, 0.4], [0.15, 0.5], [0.11, 0.5]] as P2[] },
        { z: rz, p: [[0.1, r - 0.035], [0.13, r - 0.035], [0.13, r + 0.035], [0.1, r + 0.035]] as P2[] },
      ],
      { mirror: false },
    );
    const swingL = swing.clone();
    swingL.scale(-1, 1, 1);
    // a negative scale flips winding: rebuild the triangles the other way round
    for (const g of [frameL, swingL]) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        const x = p.getX(i + 1);
        const y = p.getY(i + 1);
        const z = p.getZ(i + 1);
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, x, y, z);
      }
      g.computeVertexNormals();
    }
    return { mask, fairing, tank, tail, seat, screen, frame: mergeGeometries([frame, frameL]), swing: mergeGeometries([swing, swingL]) };
  }, [rz, r]);
  const fk = (y: number): number => fz - (y - r) * RAKE;
  // the front end turns with the bars: forks, triple clamp, clip-ons, mudguard (wheel-centre space)
  const front = (
    <group position={[0, -r, -fz]}>
      {/* USD forks: thick tubes up top, silver legs at the axle; the triple clamp and clip-ons */}
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.09, r, fz]} b={[s * 0.09, 0.62, fk(0.62)]} r={0.022} m={K.silver} />
          <Tube a={[s * 0.09, 0.56, fk(0.56)]} b={[s * 0.09, 0.97, fk(0.97)]} r={0.034} m={M.graphite} />
          <Tube a={[s * 0.09, 0.93, fk(0.93)]} b={[s * 0.27, 0.9, fk(0.93) - 0.1]} r={0.013} m={M.ink} />
          <Box s={[0.03, 0.12, 0.06]} p={[s * 0.085, r + 0.12, fz - 0.08]} r={[0.6, 0, 0]} m={M.ink} />
          <Tube a={[s * 0.14, 0.95, 0.62]} b={[s * 0.24, 0.99, 0.6]} r={0.01} m={M.ink} />
          <Box s={[0.11, 0.05, 0.03]} p={[s * 0.27, 1.0, 0.6]} r={[0, s * 0.2, 0]} m={M.ink} />
        </group>
      ))}
      <Box s={[0.24, 0.04, 0.08]} p={[0, 0.96, fk(0.96)]} m={M.graphite} />
      <Box s={[0.12, 0.02, 0.36]} p={[0, r + 0.33, fz - 0.02]} r={[0.2, 0, 0]} m={mt.body} />
    </group>
  );
  return (
    <group>
      <BikeWheel i={0} w={0.12} front fixed={front} />
      <BikeWheel i={1} w={0.19} />
      {SIDES.map((s) => (
        <group key={s}>
          {/* rearsets and their hangers */}
          <Tube a={[s * 0.12, 0.5, -0.24]} b={[s * 0.2, 0.5, -0.26]} r={0.012} m={M.graphite} />
          <Tube a={[s * 0.14, 0.56, -0.14]} b={[s * 0.13, 0.48, -0.26]} r={0.012} m={K.steel} />
          {/* the subframe under the tail: an upper rail and a stay down to the frame */}
          <Tube a={[s * 0.12, 0.76, -0.08]} b={[s * 0.07, 0.86, -0.54]} r={0.012} m={K.steel} />
          <Tube a={[s * 0.14, 0.52, -0.12]} b={[s * 0.08, 0.84, -0.5]} r={0.011} m={K.steel} />
        </group>
      ))}
      {/* frame, swingarm */}
      <mesh geometry={geo.frame} material={M.graphite} castShadow />
      <mesh geometry={geo.swing} material={M.graphite} castShadow />
      {/* engine: crankcase, the cylinder block leaning forward, the head and its cover */}
      <Box s={[0.24, 0.18, 0.34]} p={[0, 0.36, 0.02]} m={M.graphite} />
      <Box s={[0.22, 0.2, 0.2]} p={[0, 0.54, 0.14]} r={[0.35, 0, 0]} m={K.steel} />
      <Box s={[0.24, 0.07, 0.2]} p={[0, 0.67, 0.2]} r={[0.35, 0, 0]} m={M.ink} />
      <mesh position={[0.125, 0.36, -0.02]} rotation={[0, 0, Math.PI / 2]} material={K.silver}>
        <cylinderGeometry args={[0.08, 0.08, 0.012, 20]} />
      </mesh>
      {/* under the seat: the rear shock, the battery box behind it */}
      <Tube a={[0, 0.44, -0.24]} b={[0, 0.7, -0.14]} r={0.018} m={K.silver} />
      <mesh geometry={springGeo} position={[0, 0.6, -0.18]} rotation={[-0.37, 0, 0]} scale={[0.75, 0.2, 0.75]} material={mt.accent} />
      <Box s={[0.05, 0.05, 0.05]} p={[0, 0.72, -0.13]} m={M.ink} />
      <Box s={[0.15, 0.12, 0.17]} p={[0, 0.72, -0.34]} m={M.inkMatte} />
      {/* chain side (left): sprockets and the two runs of chain */}
      <mesh position={[-0.14, 0.46, -0.08]} rotation={[0, 0, Math.PI / 2]} material={K.steel}>
        <cylinderGeometry args={[0.05, 0.05, 0.012, 14]} />
      </mesh>
      <mesh position={[-0.14, r, rz]} rotation={[0, 0, Math.PI / 2]} material={K.steel}>
        <cylinderGeometry args={[0.12, 0.12, 0.012, 24]} />
      </mesh>
      <Tube a={[-0.14, 0.51, -0.08]} b={[-0.14, r + 0.12, rz]} r={0.008} m={K.steel} />
      <Tube a={[-0.14, 0.41, -0.08]} b={[-0.14, r - 0.12, rz]} r={0.008} m={K.steel} />
      {/* bodywork: body fairing and tail, trim tank, graphite seat, dark screen */}
      <mesh geometry={geo.fairing} material={mt.body} castShadow />
      <mesh geometry={geo.mask} material={mt.trim} castShadow />
      <mesh geometry={geo.tank} material={mt.trim} castShadow />
      <mesh geometry={geo.tail} material={mt.body} castShadow />
      <mesh geometry={geo.seat} material={M.graphite} castShadow />
      <mesh geometry={geo.screen} material={K.canopy} castShadow />
      {SIDES.map((s) => (
        <Box key={s} s={[0.09, 0.024, 0.012]} p={[s * 0.075, 0.855, 0.848]} r={[0.1, s * 0.84, s * -0.2]} m={K.lampWhite} />
      ))}
      {/* winglets on the flanks */}
      {SIDES.map((s) => (
        <Box key={s} s={[0.12, 0.018, 0.16]} p={[s * 0.24, 0.8, 0.6]} r={[-0.12, 0, s * -0.12]} m={mt.trim} />
      ))}
      {/* the accent: a line along each flank of the fairing */}
      {SIDES.map((s) => (
        <Tube key={s} a={[s * 0.203, 0.74, 0.56]} b={[s * 0.195, 0.5, 0.22]} r={0.009} m={mt.accent} />
      ))}
      {/* tail lamp in the tail's face, hugger (the front mudguard turns with the fork) */}
      <Box name="lamp" s={[0.09, 0.03, 0.012]} p={[0, 0.925, -0.606]} m={K.lampOrange} />
      <Box s={[0.12, 0.02, 0.3]} p={[0, r + 0.34, rz + 0.12]} r={[-0.25, 0, 0]} m={M.ink} />
      {/* exhaust: header under the engine to a short can on the right */}
      <Tube a={[0.1, 0.5, 0.3]} b={[0.12, 0.26, 0.1]} r={0.025} m={K.steel} />
      <Tube a={[0.12, 0.26, 0.1]} b={[0.16, 0.3, -0.16]} r={0.03} m={K.steel} />
      <Tube a={[0.17, 0.3, -0.12]} b={[0.21, 0.44, -0.46]} r={0.055} m={M.graphite} />
      <Tube a={[0.21, 0.44, -0.46]} b={[0.215, 0.455, -0.5]} r={0.04} m={M.ink} />
    </group>
  );
}
