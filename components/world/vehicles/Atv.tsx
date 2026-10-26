"use client";

// V02 E14, the electric Baja ATV. Nose toward +z, wheels on y = 0.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { Box, K, M, SIDES, Tube, UP, WheelSlot, faceQuat, mx, springGeo, tyreGeo, useLabel, useMats, type V3, type WheelSpec } from "./kit";
import { LIVERIES, type Livery } from "./liveries";

/** A knobby off-road tyre: a round-shouldered carcass with big blocks in a staggered chevron. */
function knobbyGeo(r: number, w: number) {
  const parts: THREE.BufferGeometry[] = [tyreGeo(r - 0.035, w, r * 0.5, 0.35)];
  const n = 20;
  for (let i = 0; i < n; i++) {
    for (const row of [-1, 1]) {
      const a = ((i + (row > 0 ? 0.5 : 0)) / n) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.05, w * 0.4, 0.07);
      g.rotateX(row * 0.3);
      g.translate(r - 0.035, row * w * 0.24, 0);
      g.rotateY(-a);
      parts.push(g);
    }
    // shoulder lugs so the sidewall reads knobby in profile
    const g = new THREE.BoxGeometry(0.07, 0.05, 0.07);
    g.translate(r - 0.07, (i % 2 ? 1 : -1) * (w / 2 - 0.01), 0);
    g.rotateY(-((i + 0.25) / n) * Math.PI * 2);
    parts.push(g);
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

/** Big knobby on a silver dished rim: a star-cut centre with four lugs. */
function OffroadWheel({ i, geo, w }: { i: number; geo: THREE.BufferGeometry; w: number }) {
  const { x, z, r } = ATV_WHEELS[i];
  const s = Math.sign(x);
  const face = -s * (w / 2 - 0.03);
  return (
    <WheelSlot i={i} p={[x, r, z]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh geometry={geo} material={M.tyre} castShadow />
        <mesh position={[0, face, 0]} material={K.silver}>
          <cylinderGeometry args={[r * 0.55, r * 0.55, 0.05, 28]} />
        </mesh>
        <mesh position={[0, face - s * 0.026, 0]} rotation={[s * Math.PI / 2, 0, 0]} material={K.steel}>
          <ringGeometry args={[r * 0.46, r * 0.5, 28]} />
        </mesh>
        {/* four cut-outs round the hub, four lug nuts between them */}
        {Array.from({ length: 4 }, (_, i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const b = a + Math.PI / 4;
          return (
            <group key={i}>
              <mesh position={[Math.cos(a) * r * 0.3, face - s * 0.027, Math.sin(a) * r * 0.3]} material={M.inkMatte}>
                <cylinderGeometry args={[r * 0.1, r * 0.1, 0.004, 12]} />
              </mesh>
              <mesh position={[Math.cos(b) * r * 0.2, face - s * 0.032, Math.sin(b) * r * 0.2]} material={K.steel}>
                <cylinderGeometry args={[0.014, 0.014, 0.016, 6]} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, face - s * 0.03, 0]} material={K.steel}>
          <cylinderGeometry args={[r * 0.12, r * 0.12, 0.03, 12]} />
        </mesh>
      </group>
    </WheelSlot>
  );
}

/** Long-travel coilover from the arm (a) to the frame (b): shaft, body and the coil round it. */
function Coilover({ a, b, body, coil }: { a: V3; b: V3; body: THREE.Material; coil: THREE.Material }) {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const at = (k: number) => va.clone().addScaledVector(dir, k).toArray() as V3;
  return (
    <>
      <Tube a={a} b={at(0.45)} r={0.013} m={K.silver} />
      <Tube a={at(0.4)} b={b} r={0.028} m={body} />
      <Tube a={at(0.86)} b={at(0.93)} r={0.05} m={body} />
      <mesh geometry={springGeo} position={at(0.5)} quaternion={q} scale={[1.05, len * 0.62, 1.05]} material={coil} castShadow />
    </>
  );
}

/** Air shock (the front pair): a dark body over a bare silver shaft, no coil. */
function Shock({ a, b }: { a: V3; b: V3 }) {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const at = (k: number) => va.clone().addScaledVector(dir, k).toArray() as V3;
  return (
    <>
      <Tube a={a} b={at(0.45)} r={0.012} m={K.silver} />
      <Tube a={at(0.38)} b={b} r={0.032} m={M.graphite} />
    </>
  );
}

const E = { fz: 0.74, rz: -0.74, r: 0.32, fx: 0.7, rx: 0.68 };
/** Wheel centres for the game, in WheelSlot order: front right, front left, rear right, rear left. */
export const ATV_WHEELS: WheelSpec[] = [
  { x: E.fx, z: E.fz, r: E.r, front: true },
  { x: -E.fx, z: E.fz, r: E.r, front: true },
  { x: E.rx, z: E.rz, r: E.r, front: false },
  { x: -E.rx, z: E.rz, r: E.r, front: false },
];

// Space frame nodes, right side (x mirrors). The rear roll hoop narrows to the top, the roof runs
// forward level, the front bracing drops to the bumper; a rear bay carries the motor.
const EN: Record<string, V3> = {
  hb: [0.4, 0.34, -0.46],
  hm: [0.4, 0.8, -0.46],
  ht: [0.19, 1.5, -0.5],
  rf: [0.24, 1.5, 0.2],
  bu: [0.3, 0.8, 0.88],
  bl: [0.24, 0.36, 0.86],
  sf: [0.4, 0.8, 0.55],
  lf: [0.4, 0.34, 0.5],
  rt: [0.37, 0.84, -0.98],
  rb: [0.32, 0.36, -0.98],
};
const E_EDGES: [string, string][] = [
  ["hb", "hm"],
  ["hm", "ht"],
  ["ht", "rf"],
  ["rf", "bu"],
  ["rf", "sf"],
  ["hm", "sf"],
  ["sf", "bu"],
  ["bu", "bl"],
  ["hb", "lf"],
  ["lf", "bl"],
  ["lf", "sf"],
  ["hm", "rt"],
  ["hb", "rb"],
  ["rt", "rb"],
  ["hb", "rt"],
];
const E_TUBES: [V3, V3][] = [];
for (const s of SIDES) for (const [a, b] of E_EDGES) E_TUBES.push([mx(EN[a], s), mx(EN[b], s)]);
for (const k of ["hb", "ht", "rf", "bl", "rt", "rb"]) E_TUBES.push([EN[k], mx(EN[k], -1)]);
// a diagonal across the roof
E_TUBES.push([EN.ht, mx(EN.rf, -1)]);

// The firewall "tent" behind the seat: a ridge on the hoop top, down to the rear of the bay.
const TENT: V3[] = [
  [0.17, 1.49, -0.5],
  [0.39, 0.8, -0.45],
  [0.37, 0.84, -0.97],
];
const tentN = {
  rear: new THREE.Vector3(0, 0.66, 0.48).normalize().cross(new THREE.Vector3(-1, 0, 0)).negate().normalize(),
  side: (() => {
    const [a, b, c] = TENT.map((p) => new THREE.Vector3(...p));
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    return n.x < 0 ? n.negate() : n;
  })(),
};

export function Atv({ livery = LIVERIES.V02[0] }: { livery?: Livery }) {
  const { fz, rz, r, rx } = E;
  const mt = useMats(livery, [0.62, 0.15]);
  const tyre = useMemo(() => knobbyGeo(r, 0.24), [r]);
  const tyreR = useMemo(() => knobbyGeo(r, 0.27), [r]);
  const num = useLabel("E14", { fg: livery.trim, bg: livery.body, w: 256, h: 128, size: 98 });
  const plate = useLabel("E14", { fg: livery.trim, bg: livery.body, w: 256, h: 300, size: 118 });
  // plain panels in the body colour, seen from both sides
  const panel = useMemo(() => {
    const m = mt.body.clone();
    m.side = THREE.DoubleSide;
    return m;
  }, [mt]);
  useEffect(() => () => panel.dispose(), [panel]);
  const tent = useMemo(() => new ConvexGeometry(TENT.flatMap((p) => SIDES.map((s) => new THREE.Vector3(...mx(p, s))))), []);
  const q = useMemo(() => ({ rear: faceQuat(tentN.rear), side: faceQuat(tentN.side), sideL: faceQuat(tentN.side.clone().setX(-tentN.side.x)) }), []);
  const sideC = new THREE.Vector3(...TENT.reduce((a, p) => [a[0] + p[0] / 3, a[1] + p[1] / 3, a[2] + p[2] / 3], [0, 0, 0] as V3));
  const rearAt = (k: number, off = 0.006) => new THREE.Vector3(0, 0.84 + 0.66 * k, -0.98 + 0.48 * k).addScaledVector(tentN.rear, off).toArray() as V3;
  const hoodTilt = -Math.PI / 2 + Math.atan2(0.17, 0.46);
  const cornerN = new THREE.Vector3(0.33, 0, 0.1).normalize();
  return (
    <group>
      {E_TUBES.map(([a, b], i) => (
        <Tube key={i} a={a} b={b} r={0.02} m={mt.frame} />
      ))}
      {/* front bumper bar, proud of the body */}
      <Tube a={[-0.38, 0.8, 0.9]} b={[0.38, 0.8, 0.9]} r={0.02} m={mt.frame} />

      {/* body: plain side panels, the angled corners with the plate, the nose, the hood */}
      {SIDES.map((s) => (
        <group key={s}>
          <mesh position={[s * 0.405, 0.575, 0.045]} rotation={[0, (s * Math.PI) / 2, 0]} material={panel} castShadow>
            <planeGeometry args={[1.01, 0.43]} />
          </mesh>
          <mesh position={[s * 0.352, 0.575, 0.715]} quaternion={faceQuat(cornerN.clone().setX(s * cornerN.x))} material={plate} castShadow>
            <planeGeometry args={[0.345, 0.43]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.58, 0.885]} material={panel} castShadow>
        <planeGeometry args={[0.6, 0.44]} />
      </mesh>
      <mesh position={[0, 0.885, 0.65]} rotation={[hoodTilt, 0, 0]} material={panel} castShadow>
        <planeGeometry args={[0.62, 0.49]} />
      </mesh>
      {/* floor pan */}
      <Box s={[0.8, 0.02, 1.0]} p={[0, 0.34, 0.02]} m={M.graphite} />
      <Box s={[0.5, 0.02, 0.36]} p={[0, 0.35, 0.68]} m={M.graphite} />

      {/* the firewall tent: E14 on the back and both flanks, the brake light */}
      <mesh geometry={tent} material={mt.body} castShadow />
      <mesh position={rearAt(0.42)} quaternion={q.rear} material={num}>
        <planeGeometry args={[0.4, 0.2]} />
      </mesh>
      <mesh name="lamp" position={rearAt(0.8, 0.02)} quaternion={q.rear} material={mt.lamp}>
        <boxGeometry args={[0.24, 0.045, 0.03]} />
      </mesh>
      {SIDES.map((s) => (
        <mesh key={s} position={sideC.clone().setX(s * sideC.x).addScaledVector(s > 0 ? tentN.side : tentN.side.clone().setX(-tentN.side.x), 0.006).toArray()} quaternion={s > 0 ? q.side : q.sideL} material={num}>
          <planeGeometry args={[0.24, 0.12]} />
        </mesh>
      ))}

      {/* cockpit: seat, steering, fire extinguisher */}
      <Box s={[0.4, 0.08, 0.42]} p={[0, 0.4, -0.18]} m={mt.accent} />
      <Box s={[0.4, 0.56, 0.07]} p={[0, 0.7, -0.4]} r={[-0.14, 0, 0]} m={mt.accent} />
      <Tube a={[0, 0.74, 0.66]} b={[0, 0.88, 0.32]} r={0.016} m={M.graphite} />
      <mesh position={[0, 0.9, 0.3]} rotation={[1.0, 0, 0]} material={M.ink}>
        <torusGeometry args={[0.13, 0.017, 6, 22]} />
      </mesh>
      <mesh position={[-0.3, 0.62, -0.36]} material={mt.accent} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.26, 14]} />
      </mesh>
      <mesh position={[-0.3, 0.77, -0.36]} material={K.silver}>
        <cylinderGeometry args={[0.02, 0.03, 0.05, 10]} />
      </mesh>

      {/* the bay: motor, gearbox, battery, the HV runs in the accent, half shafts */}
      <mesh position={[0, 0.5, -0.8]} rotation={[0, 0, Math.PI / 2]} material={K.silver} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.28, 18]} />
      </mesh>
      <Box s={[0.32, 0.2, 0.18]} p={[0, 0.42, -0.64]} m={M.graphite} />
      <Box s={[0.5, 0.2, 0.28]} p={[0, 0.7, -0.66]} m={M.inkMatte} />
      {SIDES.map((s) => (
        <group key={s}>
          <Tube a={[s * 0.06, 0.62, -0.84]} b={[s * 0.16, 0.72, -0.9]} r={0.012} m={mt.accent} />
          <Tube a={[s * 0.16, 0.72, -0.9]} b={[s * 0.22, 0.66, -0.56]} r={0.012} m={mt.accent} />
          <Tube a={[s * 0.14, 0.42, -0.72]} b={[s * (rx - 0.1), r, rz]} r={0.018} m={K.steel} />
        </group>
      ))}

      {/* front: double A-arms, air shocks, uprights, wheels */}
      {SIDES.map((s) => (
        <group key={`f${s}`}>
          <Tube a={[s * 0.24, 0.37, fz + 0.12]} b={[s * 0.56, 0.25, fz]} r={0.016} m={mt.accent} />
          <Tube a={[s * 0.36, 0.36, fz - 0.22]} b={[s * 0.56, 0.25, fz]} r={0.016} m={mt.accent} />
          <Tube a={[s * 0.25, 0.6, fz + 0.1]} b={[s * 0.54, 0.43, fz]} r={0.016} m={mt.accent} />
          <Tube a={[s * 0.36, 0.6, fz - 0.18]} b={[s * 0.54, 0.43, fz]} r={0.016} m={mt.accent} />
          <Box s={[0.05, 0.24, 0.06]} p={[s * 0.57, 0.34, fz]} m={M.graphite} />
          <Shock a={[s * 0.47, 0.28, fz - 0.02]} b={[s * 0.38, 0.86, 0.56]} />
          <OffroadWheel i={s > 0 ? 0 : 1} geo={tyre} w={0.24} />
        </group>
      ))}
      {/* rear: trailing arms and toe links, the long coilovers, wheels */}
      {SIDES.map((s) => (
        <group key={`r${s}`}>
          <Tube a={[s * 0.4, 0.4, -0.18]} b={[s * 0.54, 0.3, rz]} r={0.022} m={mt.accent} />
          <Tube a={[s * 0.3, 0.38, -0.92]} b={[s * 0.53, 0.26, rz]} r={0.015} m={mt.accent} />
          <Tube a={[s * 0.32, 0.58, -0.94]} b={[s * 0.52, 0.42, rz]} r={0.015} m={mt.accent} />
          <Box s={[0.05, 0.24, 0.06]} p={[s * 0.53, 0.33, rz]} m={M.graphite} />
          <Coilover a={[s * 0.5, 0.36, rz + 0.1]} b={[s * 0.41, 0.98, -0.6]} body={mt.spring} coil={mt.spring} />
          <OffroadWheel i={s > 0 ? 2 : 3} geo={tyreR} w={0.27} />
        </group>
      ))}
    </group>
  );
}

