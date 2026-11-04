// Sector 1 · 2021 · Ahmedabad engineering school. Static.
// Footprint 26 x 18 (x -13..13, z -9..9). Everything sits in z -9..-0.6; the 9 m band
// z 0..9 along the +Z edge is left clear for the track.
// Colliders (cuboids, centre + full size):
//   school:            (-5.5, 3.6, -6.0)    12.1 x 7.2 x 6.1
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
import { CI } from "../../buildings/concrete";
import { Cone } from "../props/Cone";
import { Label } from "../props/Label";
import { geo, mat, unitBox, unitCyl, type GroupProps } from "../props/shared";
import { Built } from "../../kit/builtShared";
import { ahmedabadParts } from "../../kit/builtSectors";
import { Inst, type T9 } from "./kit";

// ---- palette (derived only from the world palette) ----
// Concrete & Ink: the arcades and jharokhas keep it Ahmedabad, in concrete and paper
const STONE = CI.concrete;
const TRIM = CI.paper;

// ---- the school: the approved model, fitted in behind the forecourt ----
const BX = -5.5; // centre x
const ZB = -9; // back of the set
/** 10 x 5 bays (27.5 x 13.75 m) scaled to 12.1 x 6 m, clear of Mercury's pad. */
export const SCHOOL_S = 0.44;

// ---- courtyard + neem ----
const facetGeo = () => geo("ahd-facet", () => new THREE.IcosahedronGeometry(1, 0));
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
    const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 1, curveSegments: 4 });
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

/** Mercury, the 2021 solar car, in Concrete & Ink: paper body, ink belt, glass cells, the orange roll hoop. */
function Mercury(props: GroupProps) {
  const body = mat(C.paper, { r: 0.6, flat: true });
  const ink = mat(C.ink, { r: 0.6, m: 0.2 });
  const cells = mat(C.glass, { r: 0.15, m: 0.4 });
  const frame = mat(C.charcoal, { r: 0.6, m: 0.3 });
  const rubber = mat(C.black, { r: 0.9 });
  const hoopGeo = geo("mercury-hoop", () => new THREE.TorusGeometry(0.34, 0.035, 4, 8, Math.PI));
  return (
    <group {...props}>
      <mesh geometry={mercuryBodyGeo()} material={body} castShadow receiveShadow />
      {/* ink belt line and nose tip */}
      <mesh geometry={unitBox()} scale={[3.5, 0.06, 1.07]} position={[-0.2, 0.3, 0]} material={ink} castShadow />
      <mesh geometry={unitBox()} scale={[2.5, 0.2, 1.1]} position={[-0.55, 0.5, 0]} material={ink} castShadow />
      <mesh geometry={unitBox()} scale={[0.5, 0.05, 0.6]} position={[1.75, 0.47, 0]} rotation={[0, 0, -0.14]} material={ink} castShadow />
      <Inst geometry={unitCyl()} material={frame} items={STRUTS} />
      {/* solar array: glass cells in a graphite frame */}
      {DECKS.map(({ x, l }) => (
        <group key={x} position={[x, DECK_Y, 0]}>
          <mesh geometry={unitBox()} scale={[l + 0.06, 0.04, 1.8]} position={[0, -0.012, 0]} material={frame} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[l, 0.05, 1.72]} material={cells} castShadow receiveShadow />
        </group>
      ))}
      <Inst geometry={unitBox()} material={mat(C.concreteDark, { r: 0.6 })} items={CELL_LINES} cast={false} />
      {/* cockpit: seat, wheel, screen, roll hoop */}
      <mesh geometry={unitBox()} scale={[0.42, 0.5, 0.5]} position={[-1.0, 0.78, 0]} rotation={[0, 0, 0.35]} material={frame} castShadow />
      <mesh geometry={geo("mercury-wheel", () => new THREE.TorusGeometry(0.11, 0.018, 4, 8))} position={[-0.4, 0.86, 0]} rotation={[0, Math.PI / 2, -0.3]} material={ink} />
      <mesh geometry={unitBox()} scale={[0.04, 0.22, 0.6]} position={[-0.47, 1.05, 0]} rotation={[0, 0, -0.45]} material={mat(C.glass, { r: 0.1, m: 0.3, o: 0.5 })} />
      <mesh geometry={hoopGeo} position={[-1.2, 0.95, 0]} rotation={[0, Math.PI / 2, 0]} material={mat(C.orange, { r: 0.55 })} castShadow />
      <Inst geometry={unitCyl()} material={frame} items={ARMS} />
      <Inst geometry={geo("mercury-tyre", () => new THREE.CylinderGeometry(1, 1, 1, 10))} material={rubber} items={TYRES} />
      <Inst geometry={geo("mercury-hub", () => new THREE.CylinderGeometry(1, 1, 1, 6))} material={body} items={HUBS} cast={false} />
      {/* livery: the name in Plex Sans, the number in Plex Mono */}
      <Label position={[-0.55, 0.5, 0.56]} fontSize={0.15} color={C.paper} letterSpacing={0.1}>
        MERCURY
      </Label>
      <Label mono position={[1.2, 0.36, 0.54]} fontSize={0.18} color={C.ink}>
        21
      </Label>
      <Label position={[-0.55, 0.5, -0.56]} rotation={[0, Math.PI, 0]} fontSize={0.15} color={C.paper} letterSpacing={0.1}>
        MERCURY
      </Label>
    </group>
  );
}

/** Sector 1: concrete engineering school with arcade, jharokhas and chhatris; neem courtyard; solar car Mercury at a cone slalom. Faces +Z. */
export function AhmedabadSector(props: GroupProps) {
  const stone = mat(STONE, { r: 0.92 });
  const trim = mat(TRIM, { r: 0.6 });
  const wood = mat(CI.ink, { r: 0.6 });
  return (
    <group {...props}>
      {/* stone forecourt and courtyard paving */}
      <RoundedBox args={[25.6, 0.06, 8.6]} radius={0.025} smoothness={2} position={[0, 0.03, -4.7]} material={mat(CI.concreteDark, { r: 0.95 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[10, 0.03, 5.6]} position={[TX, 0.07, -6.0]} material={mat("#cdc9bf", { r: 0.95 })} receiveShadow />

      {/* ===== the school: the approved model (kit/builtSectors.tsx, concept ahmedabad), 10 x 5 bays ===== */}
      <group position={[BX, 0.06, ZB + (5 * 2.75 * SCHOOL_S) / 2]} scale={SCHOOL_S}>
        <Built parts={ahmedabadParts(10, 5)} />
      </group>

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
          {/* faceted crowns like the W10 round trees */}
          <Inst geometry={facetGeo()} material={mat(C.leaf, { r: 0.9, flat: true })} items={CANOPY} />
          <Inst geometry={facetGeo()} material={mat(C.leafDark, { r: 0.9, flat: true })} items={CANOPY_DARK} />
        </group>
      </group>
      {/* TEAM STALLIONS banner on two poles */}
      {[4.3, 11.3].map((x) => (
        <group key={x}>
          <mesh geometry={unitCyl()} scale={[0.06, 3.4, 0.06]} position={[x, 1.7, -3.1]} material={mat(C.charcoal, { r: 0.4, m: 0.3 })} castShadow />
          <mesh geometry={unitBox()} scale={[0.16, 0.06, 0.16]} position={[x, 3.42, -3.1]} material={mat(C.charcoal, { r: 0.4, m: 0.3 })} />
        </group>
      ))}
      {/* ink banner, paper type, an orange rule along the foot */}
      <mesh geometry={unitBox()} scale={[6.7, 1.05, 0.05]} position={[7.8, 2.7, -3.1]} material={mat(C.ink, { r: 0.7 })} castShadow />
      <mesh geometry={unitBox()} scale={[6.7, 0.08, 0.07]} position={[7.8, 2.2, -3.1]} material={mat(C.orange, { r: 0.55 })} />
      <Label position={[7.8, 2.78, -3.07]} fontSize={0.46} color={C.paper} letterSpacing={0.04}>
        TEAM STALLIONS
      </Label>
      <Label position={[7.8, 2.78, -3.13]} rotation={[0, Math.PI, 0]} fontSize={0.46} color={C.paper} letterSpacing={0.04}>
        TEAM STALLIONS
      </Label>

      {/* ===== solar car + slalom ===== */}
      <mesh geometry={unitBox()} scale={[5.4, 0.05, 2.7]} position={[-6.0, 0.075, -1.9]} material={mat(C.charcoal, { r: 0.7 })} receiveShadow />
      <mesh geometry={unitBox()} scale={[5.0, 0.012, 0.05]} position={[-6.0, 0.105, -0.75]} material={mat(C.paper, { r: 0.6 })} />
      <Label mono position={[-8.0, 0.106, -0.95]} rotation={[-Math.PI / 2, 0, 0]} anchorX="left" fontSize={0.15} color={C.paper} letterSpacing={0.1}>
        MERCURY · SOLAR EV · 2021
      </Label>
      <Mercury position={[-6.0, 0.1, -1.95]} />
      {CONES.map(([x, z]) => (
        <Cone key={x} position={[x, 0.06, z]} />
      ))}
    </group>
  );
}
