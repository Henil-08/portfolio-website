// Sector 1 · 2021 · Ahmedabad engineering school. Static.
// Footprint 26 x 18 (x -13..13, z -9..9). Everything sits in z -9..-0.6; the 9 m band
// z 0..9 along the +Z edge is left clear for the track.
// Colliders (cuboids, centre + full size):
//   university block:  (-5.5, 4.0, -6.5)    15.0 x 8.0 x 5.0
//   courtyard wall:    (8.0, 0.45, -8.75)   10.4 x 0.9 x 0.5
//   courtyard wall R:  (12.95, 0.45, -6.0)  0.5 x 0.9 x 6.0
//   neem otla + trunk: (7.8, 1.5, -6.0)     3.2 x 3.0 x 3.2
//   banner poles:      (4.3, 1.7, -3.1)  and (11.3, 1.7, -3.1)   0.3 x 3.4 x 0.3 each
//   solar car Mercury: (-6.0, 0.6, -1.9)    4.4 x 1.2 x 1.9
//   cones: cylinder r 0.2 h 0.55 at (x, -1.9 +/- 0.35) for x = 0.6, 2.4 ... 9.6 (or skip: knock-down props)
"use client";

import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../../palette";
import { Cone } from "../props/Cone";
import { Label } from "../props/Label";
import { geo, mat, unitBox, unitCyl, unitSphere, type GroupProps } from "../props/shared";
import { Inst, dome, halfCyl, mix, type T9 } from "./kit";

// ---- palette (derived only from the world palette) ----
const STONE = mix(C.sand, C.wood, 0.55); // warm Gujarati sandstone
const STONE_DEEP = mix(C.sand, C.woodDark, 0.5);
const STONE_SHADE = mix(C.sand, C.woodDark, 0.62);
const TRIM = C.cream;

// ---- university block ----
const BW = 15; // width
const BD = 5; // depth
const BX = -5.5; // centre x
const ZF = -4; // facade front
const FD = 0.45; // facade thickness
const H1 = 3.6; // ground floor (arcade) height
const HT = 7; // roof level
const N = 7; // bays
const BAY = BW / N;

/** Pointed (Mughal-style) arch from (xr, y) over to (xl, y). */
function arch(p: THREE.Path, xr: number, xl: number, y: number, rise: number) {
  const xc = (xr + xl) / 2;
  p.quadraticCurveTo(xr, y + rise * 0.55, xc, y + rise);
  p.quadraticCurveTo(xl, y + rise * 0.55, xl, y);
}

function facadeGeo() {
  return geo("ahd-facade", () => {
    const s = new THREE.Shape();
    const L = -BW / 2;
    const R = BW / 2;
    s.moveTo(L, 0);
    s.lineTo(L, HT);
    s.lineTo(R, HT);
    s.lineTo(R, 0);
    // arcade: arched openings cut up from the ground, right to left
    for (let i = N - 1; i >= 0; i--) {
      const pier = i === 0 || i === N - 1 ? 0.62 : 0.5;
      const xr = L + (i + 1) * BAY - (i === N - 1 ? 0.75 : pier / 2);
      const xl = L + i * BAY + (i === 0 ? 0.75 : pier / 2);
      const spring = i === 3 ? 2.35 : 2.0;
      const rise = i === 3 ? 1.0 : 0.82;
      s.lineTo(xr, 0);
      s.lineTo(xr, spring);
      arch(s, xr, xl, spring, rise);
      s.lineTo(xl, 0);
    }
    s.lineTo(L, 0);
    // upper floor: arched windows
    for (let i = 0; i < N; i++) {
      const xc = L + (i + 0.5) * BAY;
      const hw = 0.42;
      const h = new THREE.Path();
      h.moveTo(xc - hw, 4.45);
      h.lineTo(xc + hw, 4.45);
      h.lineTo(xc + hw, 5.55);
      arch(h, xc + hw, xc - hw, 5.55, 0.55);
      h.lineTo(xc - hw, 4.45);
      s.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: FD, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 10 });
    g.translate(0, 0, -FD);
    return g;
  });
}

// Jharokha (projecting balcony) parts, origin at the facade face at balcony floor level.
const JH_SLAB: T9[] = [[0, 0, 0.42, 1.7, 0.16, 0.9]];
const JH_CORBEL: T9[] = [
  [-0.55, -0.28, 0.2, 0.22, 0.4, 0.4],
  [0.55, -0.28, 0.2, 0.22, 0.4, 0.4],
  [0, -0.16, 0.25, 0.9, 0.16, 0.5],
];
const JH_PANEL: T9[] = [
  [0, 0.4, 0.8, 1.6, 0.66, 0.08],
  [-0.78, 0.4, 0.42, 0.08, 0.66, 0.76],
  [0.78, 0.4, 0.42, 0.08, 0.66, 0.76],
];
const JH_POST: T9[] = [
  [-0.74, 1.2, 0.78, 0.09, 0.95, 0.09],
  [0.74, 1.2, 0.78, 0.09, 0.95, 0.09],
  [-0.74, 1.2, 0.1, 0.09, 0.95, 0.09],
  [0.74, 1.2, 0.1, 0.09, 0.95, 0.09],
];
const JH_EAVE: T9[] = [[0, 1.72, 0.45, 1.9, 0.08, 1.05]];
const JH_ROOF: T9[] = [[0, 1.76, 0.45, 0.36, 1.66, 0.46, 0, 0, Math.PI / 2]];
const JH_BACK: T9[] = [[0, 0.95, 0.03, 1.3, 1.5, 0.04]];
const JH_AT: T9[] = [1, 3, 5].map((i) => [BX - BW / 2 + (i + 0.5) * BAY, 4.2, ZF, 1, 1, 1, 0, 0, 0]);

// Chhatri (domed rooftop kiosk), origin at roof level.
const CH_BASE: T9[] = [[0, 0.15, 0, 1.4, 0.3, 1.4]];
const CH_POST: T9[] = [
  [-0.5, 0.85, -0.5, 0.11, 1.1, 0.11],
  [0.5, 0.85, -0.5, 0.11, 1.1, 0.11],
  [-0.5, 0.85, 0.5, 0.11, 1.1, 0.11],
  [0.5, 0.85, 0.5, 0.11, 1.1, 0.11],
];
const CH_SLAB: T9[] = [[0, 1.47, 0, 1.55, 0.14, 1.55]];
const CH_DOME: T9[] = [[0, 1.54, 0, 0.62, 0.66, 0.62]];
const CH_FIN: T9[] = [[0, 2.28, 0, 0.07, 0.2, 0.07]];
const CH_AT: T9[] = [-1, 1].map((s) => [BX + s * (BW / 2 - 0.9), HT, ZF - 0.95, 1, 1, 1, 0, 0, 0]);

// Parapet merlons (kangura) along the front.
const MERLONS: T9[] = Array.from({ length: 22 }, (_, i) => [BX - BW / 2 + 0.55 + (i * (BW - 1.1)) / 21, HT + 0.92, ZF - 0.16, 0.26, 0.2, 0.26]);
// Doors in the recessed arcade wall.
const DOORS: T9[] = [0, 2, 4, 6].map((i) => [BX - BW / 2 + (i + 0.5) * BAY, 1.1, ZF - 2.18, 1.0, 2.2, 0.06]);

// ---- courtyard + neem ----
const TX = 7.8;
const TZ = -6.0;
const CANOPY: T9[] = [
  [0, 4.6, 0, 2.0, 1.25, 1.9],
  [-1.5, 4.1, 0.5, 1.4, 0.95, 1.3],
  [1.6, 4.2, -0.3, 1.45, 1.0, 1.35],
  [0.4, 4.0, 1.4, 1.3, 0.9, 1.2],
  [-0.4, 4.3, -1.4, 1.35, 0.95, 1.25],
  [0.3, 5.5, 0.1, 1.3, 0.9, 1.2],
];
const CANOPY_DARK: T9[] = [
  [-1.0, 3.6, -0.6, 1.2, 0.75, 1.1],
  [1.1, 3.55, 0.9, 1.1, 0.7, 1.0],
  [-1.2, 5.0, 1.0, 1.0, 0.75, 0.95],
  [1.3, 5.1, -1.0, 1.0, 0.7, 0.95],
];
const TRUNK: T9[] = [
  [0, 1.2, 0, 0.22, 2.4, 0.22],
  [-0.45, 2.75, 0.1, 0.12, 1.3, 0.12, 0, 0, 0.6],
  [0.45, 2.8, -0.15, 0.13, 1.35, 0.13, 0.2, 0, -0.55],
  [0.1, 2.9, 0.5, 0.1, 1.1, 0.1, 0.55, 0, 0],
];
const CONES = [0.6, 2.4, 4.2, 6.0, 7.8, 9.6].map((x, i) => [x, -1.9 + (i % 2 ? 0.38 : -0.38)] as const);

// ---- solar car Mercury (forward = +X, origin at ground centre) ----
function mercuryBodyGeo() {
  return geo("mercury-body", () => {
    // side profile: low flat tub, rounded tail, long tapered nose
    const s = new THREE.Shape();
    s.moveTo(-1.95, 0.22);
    s.lineTo(1.55, 0.22);
    s.quadraticCurveTo(2.05, 0.22, 2.12, 0.3);
    s.quadraticCurveTo(2.14, 0.38, 1.9, 0.44);
    s.lineTo(0.9, 0.58);
    s.lineTo(-1.8, 0.62);
    s.quadraticCurveTo(-2.05, 0.6, -2.05, 0.42);
    s.quadraticCurveTo(-2.05, 0.24, -1.95, 0.22);
    const W = 0.96;
    const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -W / 2);
    return g;
  });
}
const WHEEL_AT: T9[] = [
  [1.42, 0.27, 0.8],
  [1.42, 0.27, -0.8],
  [-1.42, 0.27, 0.8],
  [-1.42, 0.27, -0.8],
];
const TYRES: T9[] = WHEEL_AT.map(([x, y, z]) => [x, y, z, 0.27, 0.1, 0.27, Math.PI / 2, 0, 0]);
const HUBS: T9[] = WHEEL_AT.map(([x, y, z]) => [x, y, z + Math.sign(z) * 0.035, 0.15, 0.05, 0.15, Math.PI / 2, 0, 0]);
const ARMS: T9[] = WHEEL_AT.flatMap(([x, y, z]) => [
  [x - 0.12, y + 0.07, z * 0.78, 0.022, Math.abs(z) * 0.5, 0.022, Math.PI / 2, 0, 0],
  [x + 0.12, y - 0.03, z * 0.78, 0.022, Math.abs(z) * 0.5, 0.022, Math.PI / 2, 0, 0],
]);
const STRUTS: T9[] = [
  [1.2, 0.75, 0.42, 0.05, 0.36, 0.05],
  [1.2, 0.75, -0.42, 0.05, 0.36, 0.05],
  [-1.6, 0.78, 0.42, 0.05, 0.3, 0.05],
  [-1.6, 0.78, -0.42, 0.05, 0.3, 0.05],
];
// solar deck in two pieces with the open cockpit between them
const DECK_Y = 0.94;
const DECKS = [
  { x: 0.55, l: 2.15 },
  { x: -1.62, l: 0.86 },
];
const CELL_LINES: T9[] = [
  ...Array.from({ length: 7 }, (_, i) => [-0.35 + i * 0.3, DECK_Y + 0.031, 0, 0.012, 0.004, 1.66] as T9),
  ...Array.from({ length: 3 }, (_, i) => [-1.95 + i * 0.3, DECK_Y + 0.031, 0, 0.012, 0.004, 1.66] as T9),
  [0.55, DECK_Y + 0.031, -0.42, 2.1, 0.004, 0.012],
  [0.55, DECK_Y + 0.031, 0.42, 2.1, 0.004, 0.012],
  [-1.62, DECK_Y + 0.031, -0.42, 0.82, 0.004, 0.012],
  [-1.62, DECK_Y + 0.031, 0.42, 0.82, 0.004, 0.012],
];

function Mercury(props: GroupProps) {
  const white = mat(C.white, { r: 0.22 });
  const teal = mat(C.teal, { r: 0.35 });
  const panel = mat(mix(C.blue, C.ink, 0.62), { r: 0.14, m: 0.35 });
  const frame = mat(C.metal, { r: 0.3, m: 0.6 });
  const rubber = mat(C.black, { r: 0.65 });
  const ink = mat(C.charcoal, { r: 0.45 });
  const hoopGeo = geo("mercury-hoop", () => new THREE.TorusGeometry(0.34, 0.035, 10, 28, Math.PI));
  return (
    <group {...props}>
      <mesh geometry={mercuryBodyGeo()} material={white} castShadow receiveShadow />
      {/* teal belt line and nose tip */}
      <mesh geometry={unitBox()} scale={[3.5, 0.06, 1.07]} position={[-0.2, 0.3, 0]} material={teal} castShadow />
      <RoundedBox args={[2.5, 0.2, 1.1]} radius={0.05} smoothness={2} position={[-0.55, 0.5, 0]} material={teal} castShadow />
      <mesh geometry={unitBox()} scale={[0.5, 0.05, 0.6]} position={[1.75, 0.47, 0]} rotation={[0, 0, -0.14]} material={teal} castShadow />
      <Inst geometry={unitCyl()} material={frame} items={STRUTS} />
      {/* solar array: dark blue cells in a silver frame */}
      {DECKS.map(({ x, l }) => (
        <group key={x} position={[x, DECK_Y, 0]}>
          <RoundedBox args={[l + 0.06, 0.04, 1.8]} radius={0.015} smoothness={2} position={[0, -0.012, 0]} material={frame} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[l, 0.05, 1.72]} material={panel} castShadow receiveShadow />
        </group>
      ))}
      <Inst geometry={unitBox()} material={mat(C.silver, { r: 0.4, m: 0.4 })} items={CELL_LINES} cast={false} />
      {/* cockpit: seat, wheel, screen, roll hoop */}
      <RoundedBox args={[0.42, 0.5, 0.5]} radius={0.06} smoothness={2} position={[-1.0, 0.78, 0]} rotation={[0, 0, 0.35]} material={ink} castShadow />
      <mesh geometry={geo("mercury-wheel", () => new THREE.TorusGeometry(0.11, 0.018, 8, 20))} position={[-0.4, 0.86, 0]} rotation={[0, Math.PI / 2, -0.3]} material={ink} />
      <mesh geometry={unitBox()} scale={[0.04, 0.22, 0.6]} position={[-0.47, 1.05, 0]} rotation={[0, 0, -0.45]} material={mat("#a9c4cc", { r: 0.05, m: 0.2, o: 0.45 })} />
      <mesh geometry={hoopGeo} position={[-1.2, 0.95, 0]} rotation={[0, Math.PI / 2, 0]} material={mat(C.red, { r: 0.3 })} castShadow />
      <Inst geometry={unitCyl()} material={frame} items={ARMS} />
      <Inst geometry={unitCyl()} material={rubber} items={TYRES} />
      <Inst geometry={unitCyl()} material={white} items={HUBS} cast={false} />
      {/* livery */}
      <Label position={[-0.55, 0.5, 0.56]} fontSize={0.15} color={C.white} letterSpacing={0.1}>
        MERCURY
      </Label>
      <Label position={[1.2, 0.36, 0.54]} fontSize={0.18} color={C.ink}>
        21
      </Label>
      <Label position={[-0.55, 0.5, -0.56]} rotation={[0, Math.PI, 0]} fontSize={0.15} color={C.white} letterSpacing={0.1}>
        MERCURY
      </Label>
    </group>
  );
}

/** Sector 1: sandstone engineering school with arcade, jharokhas and chhatris; neem courtyard; solar car Mercury at a cone slalom. Faces +Z. */
export function AhmedabadSector(props: GroupProps) {
  const stone = mat(STONE, { r: 0.7 });
  const stoneDeep = mat(STONE_DEEP, { r: 0.72 });
  const shade = mat(STONE_SHADE, { r: 0.8 });
  const trim = mat(TRIM, { r: 0.55 });
  const wood = mat(C.woodDark, { r: 0.6 });
  const dark = mat(mix(C.ink, C.woodDark, 0.25), { r: 0.4, m: 0.1 });
  return (
    <group {...props}>
      {/* stone forecourt and courtyard paving */}
      <RoundedBox args={[25.6, 0.06, 8.6]} radius={0.025} smoothness={2} position={[0, 0.03, -4.7]} material={mat(mix(C.sand, C.cream, 0.35), { r: 0.85 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[10, 0.03, 5.6]} position={[TX, 0.07, -6.0]} material={mat(mix(C.sand, C.wood, 0.2), { r: 0.85 })} receiveShadow />

      {/* ===== university block ===== */}
      <group position={[BX, 0, 0]}>
        {/* body: upper storey full depth, ground floor recessed behind the arcade */}
        <mesh geometry={unitBox()} scale={[BW - 0.1, HT - H1, BD - FD]} position={[0, H1 + (HT - H1) / 2, ZF - FD - (BD - FD) / 2]} material={stone} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[BW - 0.1, H1, BD - 2.2]} position={[0, H1 / 2, ZF - 2.2 - (BD - 2.2) / 2]} material={shade} castShadow receiveShadow />
        {/* window backs behind the arched upper openings */}
        <mesh geometry={unitBox()} scale={[BW - 0.6, 1.8, 0.04]} position={[0, 5.0, ZF - FD + 0.03]} material={dark} />
        {/* arcade floor plinth and ceiling shade */}
        <mesh geometry={unitBox()} scale={[BW, 0.16, 2.4]} position={[0, 0.08, ZF - 1.0]} material={stoneDeep} receiveShadow />
        <mesh geometry={unitBox()} scale={[BW + 0.3, 0.12, 0.5]} position={[0, 0.06, ZF + 0.22]} material={trim} receiveShadow castShadow />
      </group>
      <mesh geometry={facadeGeo()} position={[BX, 0, ZF]} material={stone} castShadow receiveShadow />
      <Inst geometry={unitBox()} material={wood} items={DOORS} cast={false} />
      <group position={[BX, 0, 0]}>
        {/* chhajja (stone eave) over the arcade, string course, cornice */}
        <mesh geometry={unitBox()} scale={[BW + 0.4, 0.14, 0.75]} position={[0, H1 + 0.05, ZF + 0.3]} rotation={[0.08, 0, 0]} material={trim} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[BW + 0.2, 0.1, 0.18]} position={[0, 4.25, ZF + 0.07]} material={stoneDeep} castShadow />
        <mesh geometry={unitBox()} scale={[BW + 0.5, 0.22, BD + 0.5]} position={[0, HT + 0.08, ZF - BD / 2 + 0.05]} material={trim} castShadow receiveShadow />
        {/* parapet walls round the flat roof */}
        <mesh geometry={unitBox()} scale={[BW + 0.2, 0.7, 0.3]} position={[0, HT + 0.52, ZF - 0.16]} material={stone} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[BW + 0.2, 0.7, 0.3]} position={[0, HT + 0.52, ZF - BD + 0.2]} material={stone} castShadow receiveShadow />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={unitBox()} scale={[0.3, 0.7, BD - 0.6]} position={[s * (BW / 2 - 0.05), HT + 0.52, ZF - BD / 2 + 0.02]} material={stone} castShadow receiveShadow />
        ))}
        {/* sign plate on the parapet */}
        <RoundedBox args={[6.4, 0.56, 0.06]} radius={0.02} smoothness={2} position={[0, HT + 0.52, ZF + 0.02]} material={trim} />
        <Label position={[0, HT + 0.52, ZF + 0.06]} fontSize={0.34} color={C.ink} letterSpacing={0.1}>
          SCHOOL OF ENGINEERING
        </Label>
        {/* roof: water tank and a small solar rig, readable from above */}
        <mesh geometry={unitBox()} scale={[BW - 0.4, 0.04, BD - 0.8]} position={[0, HT + 0.2, ZF - BD / 2 - 0.05]} material={stoneDeep} receiveShadow />
        <RoundedBox args={[1.4, 0.9, 1.2]} radius={0.05} smoothness={2} position={[-3.4, HT + 0.65, ZF - 3.3]} material={mat(C.greyLight, { r: 0.5 })} castShadow receiveShadow />
        {[0.8, 2.6].map((x) => (
          <mesh key={x} geometry={unitBox()} scale={[1.6, 0.05, 1.1]} position={[x, HT + 0.6, ZF - 3.0]} rotation={[0.35, 0, 0]} material={mat(mix(C.blue, C.ink, 0.62), { r: 0.15, m: 0.35 })} castShadow />
        ))}
      </group>
      <Inst geometry={unitBox()} material={stoneDeep} items={MERLONS} />
      {/* jharokhas */}
      <Inst geometry={unitBox()} material={trim} items={JH_SLAB} at={JH_AT} />
      <Inst geometry={unitBox()} material={stoneDeep} items={JH_CORBEL} at={JH_AT} />
      <Inst geometry={unitBox()} material={stone} items={JH_PANEL} at={JH_AT} />
      <Inst geometry={unitBox()} material={trim} items={JH_POST} at={JH_AT} />
      <Inst geometry={unitBox()} material={trim} items={JH_EAVE} at={JH_AT} />
      <Inst geometry={halfCyl()} material={stoneDeep} items={JH_ROOF} at={JH_AT} />
      <Inst geometry={unitBox()} material={dark} items={JH_BACK} at={JH_AT} cast={false} />
      {/* chhatris on the roof corners */}
      <Inst geometry={unitBox()} material={stoneDeep} items={CH_BASE} at={CH_AT} />
      <Inst geometry={unitBox()} material={trim} items={CH_POST} at={CH_AT} />
      <Inst geometry={unitBox()} material={trim} items={CH_SLAB} at={CH_AT} />
      <Inst geometry={dome()} material={stone} items={CH_DOME} at={CH_AT} />
      <Inst geometry={unitCyl()} material={mat(C.gold, { r: 0.3, m: 0.6 })} items={CH_FIN} at={CH_AT} />

      {/* ===== courtyard ===== */}
      <mesh geometry={unitBox()} scale={[10.4, 0.8, 0.45]} position={[TX, 0.4, -8.75]} material={stone} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[0.45, 0.8, 6.0]} position={[12.95, 0.4, -6.0]} material={stone} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[10.6, 0.08, 0.55]} position={[TX, 0.84, -8.75]} material={trim} castShadow />
      <mesh geometry={unitBox()} scale={[0.55, 0.08, 6.1]} position={[12.95, 0.84, -6.0]} material={trim} castShadow />
      {/* neem on its otla (round stone platform) */}
      <group position={[TX, 0, TZ]}>
        <mesh geometry={geo("otla", () => new THREE.CylinderGeometry(1.6, 1.7, 0.45, 8))} position={[0, 0.3, 0]} material={stone} castShadow receiveShadow />
        <mesh geometry={geo("otla-top", () => new THREE.CylinderGeometry(1.66, 1.66, 0.07, 8))} position={[0, 0.55, 0]} material={trim} castShadow receiveShadow />
        <group position={[0, 0.55, 0]}>
          <Inst geometry={unitCyl()} material={wood} items={TRUNK} />
          <Inst geometry={unitSphere()} material={mat(C.leaf, { r: 0.6 })} items={CANOPY} />
          <Inst geometry={unitSphere()} material={mat(C.leafDark, { r: 0.6 })} items={CANOPY_DARK} />
        </group>
      </group>
      {/* TEAM STALLIONS banner on two poles */}
      {[4.3, 11.3].map((x) => (
        <group key={x}>
          <mesh geometry={unitCyl()} scale={[0.06, 3.4, 0.06]} position={[x, 1.7, -3.1]} material={mat(C.charcoal, { r: 0.4, m: 0.3 })} castShadow />
          <mesh geometry={unitSphere()} scale={0.1} position={[x, 3.42, -3.1]} material={mat(C.charcoal, { r: 0.4, m: 0.3 })} />
        </group>
      ))}
      <RoundedBox args={[6.7, 1.05, 0.05]} radius={0.02} smoothness={2} position={[7.8, 2.7, -3.1]} material={mat(C.red, { r: 0.55 })} castShadow />
      <mesh geometry={unitBox()} scale={[6.7, 0.06, 0.06]} position={[7.8, 2.17, -3.08]} material={mat(C.ink, { r: 0.5 })} />
      <Label position={[7.8, 2.75, -3.07]} fontSize={0.5} color={C.white} letterSpacing={0.08}>
        TEAM STALLIONS
      </Label>
      <Label position={[7.8, 2.75, -3.13]} rotation={[0, Math.PI, 0]} fontSize={0.5} color={C.white} letterSpacing={0.08}>
        TEAM STALLIONS
      </Label>

      {/* ===== solar car + slalom ===== */}
      <RoundedBox args={[5.4, 0.05, 2.7]} radius={0.02} smoothness={2} position={[-6.0, 0.075, -1.9]} material={mat(C.charcoal, { r: 0.5 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[5.0, 0.012, 0.05]} position={[-6.0, 0.105, -0.75]} material={mat(C.teal, { r: 0.4 })} />
      <Label position={[-8.0, 0.106, -0.95]} rotation={[-Math.PI / 2, 0, 0]} anchorX="left" fontSize={0.16} color={C.white} letterSpacing={0.18}>
        MERCURY · SOLAR EV · 2021
      </Label>
      <Mercury position={[-6.0, 0.1, -1.95]} />
      {CONES.map(([x, z]) => (
        <Cone key={x} position={[x, 0.06, z]} />
      ))}
    </group>
  );
}
