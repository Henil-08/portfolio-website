"use client";

// V01 TH-18, the open-wheeler. Nose toward +z, wheels on y = 0.
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Box, K, M, SIDES, Strip, Tube, WheelSlot, aerofoil, loft, mirrorRing, plate, tyreGeo, useLabel, useMats, useRig, type P2, type Sec, type V3, type WheelSpec } from "./kit";
import { LIVERIES, type Livery } from "./liveries";

const F = { fz: 1.78, rz: -1.82, r: 0.36 };
/** Wheel centres for the game, in WheelSlot order: front right, front left, rear right, rear left. */
export const FORMULA_WHEELS: WheelSpec[] = [
  { x: 0.8, z: F.fz, r: F.r, front: true },
  { x: -0.8, z: F.fz, r: F.r, front: true },
  { x: 0.78, z: F.rz, r: F.r, front: false },
  { x: -0.78, z: F.rz, r: F.r, front: false },
];
// The nose ridge (the tub's top centre line), a touch proud, tip to cockpit.
const NOSE_RIDGE: V3[] = [
  [0, 0.296, 2.62],
  [0, 0.362, 2.4],
  [0, 0.498, 1.9],
  [0, 0.617, 1.35],
  [0, 0.684, 0.8],
];

function FormulaWheel({ i, w }: { i: number; w: number }) {
  const geo = useMemo(() => tyreGeo(F.r, w, 0.24, 0.3), [w]);
  const { x, z } = FORMULA_WHEELS[i];
  const s = Math.sign(x);
  return (
    <WheelSlot i={i} p={[x, F.r, z]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh geometry={geo} material={M.tyre} castShadow />
        {/* paper sidewall band (blue on wets in the game), the wheel cover and the nut */}
        <mesh name="band" position={[0, -s * (w / 2 + 0.002), 0]} rotation={[s * Math.PI / 2, 0, 0]} material={K.paperLine}>
          <ringGeometry args={[0.265, 0.29, 40]} />
        </mesh>
        <mesh position={[0, -s * (w / 2 - 0.02), 0]} material={M.graphite}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, 32]} />
        </mesh>
        <mesh position={[0, -s * (w / 2 + 0.005), 0]} material={M.ink}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 6]} />
        </mesh>
      </group>
    </WheelSlot>
  );
}

export function Formula({ livery = LIVERIES.V01[0] }: { livery?: Livery }) {
  const mt = useMats(livery);
  const rig = useRig();
  const geo = useMemo(() => {
    // nose and survival cell: half profiles, bottom centre → out → top centre
    const cell = (z: number, yb: number, yt: number, w: number): Sec => ({
      z,
      p: [
        [0, yb],
        [w * 0.8, yb],
        [w, (yb + yt) / 2],
        [w * 0.82, yt],
        [0, yt + w * 0.12],
      ],
    });
    const tub = loft([
      cell(2.72, 0.17, 0.25, 0.07),
      cell(2.4, 0.17, 0.34, 0.12),
      cell(1.9, 0.19, 0.47, 0.17),
      cell(1.35, 0.17, 0.58, 0.24),
      cell(0.75, 0.1, 0.64, 0.3),
      cell(0.2, 0.1, 0.63, 0.4),
      cell(-0.45, 0.1, 0.62, 0.4),
      cell(-0.9, 0.1, 0.56, 0.32),
    ]);
    // sidepods with a deep undercut, the widest point up high
    const pod = (z: number, xo: number, yt: number, yb = 0.1): P2[] => [
      [0.3, yb],
      [xo - 0.24, yb + 0.03],
      [xo - 0.02, yt - 0.2],
      [xo, yt - 0.08],
      [xo - 0.14, yt],
      [0.3, yt + 0.02],
    ];
    const podR: Sec[] = [
      { z: 0.6, p: pod(0.6, 0.66, 0.6) },
      { z: 0.3, p: pod(0.3, 0.72, 0.62) },
      { z: -0.4, p: pod(-0.4, 0.68, 0.6) },
      { z: -1.0, p: pod(-1.0, 0.54, 0.5) },
      { z: -1.55, p: pod(-1.55, 0.38, 0.36) },
    ];
    const lower = podR.map(({ z, p }) => ({ z, p: [p[0], p[1], p[2], p[3], [0.3, p[3][1]]] as P2[] }));
    const upper = podR.map(({ z, p }) => ({ z, p: [[0.3, p[3][1] - 0.001], p[3], p[4], p[5]] as P2[] }));
    const pair = (secs: Sec[]) => mergeGeometries([loft(secs, { mirror: false }), loft(secs.map(({ z, p }) => ({ z, p: mirrorRing(p) })), { mirror: false })]);
    const pods = pair(lower);
    const podTops = pair(upper);
    // paper engine cover from the airbox to the rear crash structure
    const cv = (z: number, yb: number, yt: number, wb: number, wm: number, ym: number, wt: number): Sec => ({
      z,
      p: [
        [0, yb],
        [wb, yb],
        [wm, ym],
        [wt, yt],
        [0, yt + 0.01],
      ],
    });
    const cover = loft([
      cv(-0.32, 0.52, 0.99, 0.3, 0.2, 0.86, 0.1),
      cv(-0.7, 0.45, 0.94, 0.38, 0.3, 0.76, 0.13),
      cv(-1.2, 0.34, 0.8, 0.33, 0.24, 0.62, 0.1),
      cv(-1.7, 0.3, 0.6, 0.22, 0.16, 0.5, 0.07),
      cv(-2.18, 0.3, 0.44, 0.1, 0.08, 0.4, 0.04),
    ]);
    // floor in plan, extruded down
    const fs = new THREE.Shape(
      ([
        [0.3, 1.35],
        [0.82, 0.75],
        [0.86, -1.1],
        [0.62, -1.45],
        [0.5, -2.15],
        [-0.5, -2.15],
        [-0.62, -1.45],
        [-0.86, -1.1],
        [-0.82, 0.75],
        [-0.3, 1.35],
      ] as P2[]).map(([x, z]) => new THREE.Vector2(x, z)),
    );
    const floor = new THREE.ExtrudeGeometry(fs, { depth: 0.035, bevelEnabled: false });
    floor.rotateX(Math.PI / 2);
    floor.translate(0, 0.1, 0);
    const fin = plate(
      [
        [-0.55, 0.9],
        [-0.62, 0.99],
        [-1.95, 0.9],
        [-1.95, 0.5],
      ],
      0.016,
    );
    const fEnd = plate(
      [
        [2.86, 0.06],
        [2.86, 0.27],
        [2.6, 0.33],
        [2.24, 0.31],
        [2.2, 0.06],
      ],
      0.025,
    );
    const rEnd = plate(
      [
        [-2.0, 0.44],
        [-2.04, 1.0],
        [-2.62, 1.0],
        [-2.62, 0.72],
        [-2.44, 0.44],
      ],
      0.03,
    );
    const pylon = plate(
      [
        [-2.05, 0.4],
        [-2.2, 0.84],
        [-2.32, 0.84],
        [-2.2, 0.4],
      ],
      0.04,
    );
    return {
      tub,
      pods,
      podTops,
      cover,
      floor,
      fin,
      fEnd,
      rEnd,
      pylon,
      main: aerofoil(0.34, 0.05, 1.9),
      el2: aerofoil(0.22, 0.04, 1.72),
      el3: aerofoil(0.17, 0.035, 1.6),
      rMain: aerofoil(0.38, 0.06, 1.02),
      rFlap: aerofoil(0.24, 0.04, 1.02),
      beam: aerofoil(0.2, 0.035, 0.9),
    };
  }, []);
  const num = useLabel("18", { fg: livery.body, bg: livery.trim, w: 256, h: 128, size: 104 });
  const halo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(
      ([
        [-0.3, 0.64, -0.5],
        [-0.31, 0.82, -0.32],
        [-0.22, 0.88, -0.02],
        [0, 0.9, 0.08],
        [0.22, 0.88, -0.02],
        [0.31, 0.82, -0.32],
        [0.3, 0.64, -0.5],
      ] as V3[]).map((p) => new THREE.Vector3(...p)),
    );
    return new THREE.TubeGeometry(c, 40, 0.032, 8);
  }, []);
  const { fz, rz } = F;
  return (
    <group>
      <mesh geometry={geo.floor} material={M.inkMatte} castShadow receiveShadow />
      <mesh geometry={geo.tub} material={mt.body} castShadow />
      <mesh geometry={geo.pods} material={mt.body} castShadow />
      <mesh geometry={geo.podTops} material={mt.trim} castShadow />
      <mesh geometry={geo.cover} material={mt.trim} castShadow />
      <mesh geometry={geo.fin} material={mt.trim} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} position={[s * 0.01, 0.84, -1.28]} rotation={[0, (s * Math.PI) / 2, 0]} material={num}>
          <planeGeometry args={[0.4, 0.2]} />
        </mesh>
      ))}
      {/* the accent: a broad stripe down the nose ridge to the cockpit */}
      {NOSE_RIDGE.slice(1).map((b, i) => (
        <Strip key={i} a={NOSE_RIDGE[i]} b={b} w={0.085} m={mt.accent} />
      ))}
      {/* cockpit opening, headrest, airbox mouth, halo */}
      <Box s={[0.46, 0.03, 0.95]} p={[0, 0.655, 0.0]} m={K.canopy} />
      <Box s={[0.5, 0.08, 0.22]} p={[0, 0.69, -0.42]} m={M.graphite} />
      <Box s={[0.18, 0.13, 0.02]} p={[0, 0.9, -0.31]} m={K.canopy} />
      <mesh geometry={halo} material={mt.body} castShadow />
      <Tube a={[0, 0.66, 0.38]} b={[0, 0.9, 0.08]} r={0.03} />
      {/* sidepod inlets */}
      {SIDES.map((s) => (
        <Box key={s} s={[0.3, 0.2, 0.02]} p={[s * 0.5, 0.48, 0.61]} m={K.canopy} />
      ))}
      {/* mirrors */}
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.36, 0.62, 0.42]} b={[s * 0.5, 0.74, 0.42]} r={0.012} />
          <Box s={[0.14, 0.06, 0.04]} p={[s * 0.53, 0.76, 0.42]} m={mt.body} />
        </group>
      ))}
      {/* front wing: three elements and endplates */}
      <mesh geometry={geo.main} position={[0, 0.09, 2.62]} material={mt.body} castShadow />
      <mesh geometry={geo.el2} position={[0, 0.15, 2.4]} rotation={[-0.32, 0, 0]} material={mt.body} castShadow />
      <mesh geometry={geo.el3} position={[0, 0.22, 2.3]} rotation={[-0.55, 0, 0]} material={mt.trim} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} geometry={geo.fEnd} position={[s * 0.95, 0, 0]} material={mt.accent} castShadow />
      ))}
      {/* rear wing: main plane, paper flap, beam wing, endplates, pylon, diffuser */}
      <mesh geometry={geo.rMain} position={[0, 0.8, -2.3]} rotation={[0.12, 0, 0]} material={mt.body} castShadow />
      {/* the flap is the DRS: the game opens it with OVERTAKE */}
      <group ref={rig?.drs} position={[0, 0.9, -2.46]}>
        <mesh geometry={geo.rFlap} rotation={[0.5, 0, 0]} material={mt.trim} castShadow />
      </group>
      <mesh geometry={geo.beam} position={[0, 0.46, -2.3]} rotation={[0.2, 0, 0]} material={mt.body} castShadow />
      {SIDES.map((s) => (
        <mesh key={s} geometry={geo.rEnd} position={[s * 0.52, 0, 0]} material={mt.accent} castShadow />
      ))}
      <mesh geometry={geo.pylon} material={mt.body} castShadow />
      <Box s={[0.96, 0.03, 0.5]} p={[0, 0.16, -2.02]} r={[-0.3, 0, 0]} m={M.inkMatte} />
      <Box s={[0.14, 0.14, 0.3]} p={[0, 0.36, -2.24]} m={M.graphite} />
      {/* the rain light, square in the back of the crash structure */}
      <Box name="lamp" s={[0.075, 0.075, 0.02]} p={[0, 0.36, -2.395]} m={livery.lamp ? mt.lamp : K.lampOrange} />
      {/* suspension: wishbones and pushrods to the uprights */}
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.18, 0.3, fz + 0.2]} b={[s * 0.66, 0.3, fz]} r={0.015} />
          <Tube a={[s * 0.18, 0.3, fz - 0.25]} b={[s * 0.66, 0.3, fz]} r={0.015} />
          <Tube a={[s * 0.2, 0.46, fz + 0.15]} b={[s * 0.64, 0.5, fz]} r={0.015} />
          <Tube a={[s * 0.2, 0.46, fz - 0.25]} b={[s * 0.64, 0.5, fz]} r={0.015} />
          <Tube a={[s * 0.6, 0.3, fz]} b={[s * 0.22, 0.56, fz - 0.15]} r={0.013} m={M.graphite} />
          <Tube a={[s * 0.16, 0.28, rz + 0.3]} b={[s * 0.6, 0.3, rz]} r={0.015} />
          <Tube a={[s * 0.16, 0.28, rz - 0.25]} b={[s * 0.6, 0.3, rz]} r={0.015} />
          <Tube a={[s * 0.14, 0.5, rz + 0.2]} b={[s * 0.6, 0.52, rz]} r={0.015} />
          <Tube a={[s * 0.14, 0.5, rz - 0.2]} b={[s * 0.6, 0.52, rz]} r={0.015} />
          <FormulaWheel i={s > 0 ? 0 : 1} w={0.3} />
          <FormulaWheel i={s > 0 ? 2 : 3} w={0.4} />
        </group>
      ))}
    </group>
  );
}

