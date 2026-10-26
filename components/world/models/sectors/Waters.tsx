// Sector 4 · 2026-now · Waters. Static.
// Footprint 26 x 18 (x -13..13, z -9..9). Everything sits in z -9..-0.9; the 9 m band
// z 0..9 along the +Z edge is left clear for the track.
// Colliders (cuboids, centre + full size):
//   campus building:   (-5.3, 4.1, -6.2)   15.4 x 8.2 x 6.4
//   instrument plinth: (6.0, 1.0, -3.0)    2.8 x 2.0 x 1.6
//   agent-ops base:    cylinder r 2.5 h 0.15 at (10.3, -5.6); racks: (10.3, 1.2, -5.4) 3.2 x 2.4 x 2.6
//   front planter:     (-8.8, 0.4, -1.7)   6.6 x 0.8 x 1.0
//   tree:              cylinder r 0.25 h 2 at (3.3, -7.2), behind the instrument (one in front crowded its plinth)
"use client";

import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../../palette";
import { CI } from "../../buildings/concrete";
import { Label } from "../props/Label";
import { Tree } from "../props/Tree";
import { geo, mat, unitBox, unitCyl, type GroupProps } from "../props/shared";
import { Inst, mix, plainTextMat, unitPlane, type T9 } from "./kit";

const BX = -5.3;
const BW = 15;
const ZB = -6.2; // building centre z
const BD = 6.2;
const ZF = ZB + BD / 2; // upper volume front (-3.1)
const LOBBY_F = ZF - 0.7; // recessed lobby glass line
const L1 = 3.7; // underside of the upper volume
const L2 = 7.6; // roof

const GLASS = mix(C.glass, C.ink, 0.55);

const LOBBY_FINS: T9[] = Array.from({ length: 11 }, (_, i) => [BX - 4.6 + i * 1.1, 0.3 + (L1 - 0.3) / 2, LOBBY_F + 0.04, 0.06, L1 - 0.3, 0.12]);
const RIBBON_FINS: T9[] = Array.from({ length: 12 }, (_, i) => [BX - 4.5 + i * 0.95, 5.5, ZF + 0.05, 0.05, 1.3, 0.06]);
const PILOTIS: T9[] = [-3.2, 1.4, 6.0].map((dx) => [BX + dx, 0.3 + (L1 - 0.3) / 2, ZF - 0.35, 0.16, L1 - 0.3, 0.16]);
const ROOF_PLANT: T9[] = [
  [BX - 2.6, L2 + 0.45, ZB - 1.0, 2.2, 0.7, 1.6],
  [BX + 0.4, L2 + 0.35, ZB - 1.4, 1.4, 0.5, 1.0],
];
const GREEN_ROOF: T9[] = [
  [BX + 3.6, L2 + 0.12, ZB + 0.4, 5.4, 0.1, 3.2],
];
const HEDGE: T9[] = [-11.5, -10.15, -8.8, -7.45, -6.1].map((x, i) => [x, 0.72, -1.7, 1.2, 0.42 + (i % 2) * 0.08, 0.66]);

// ---- instrument ----
function instrumentBodyGeo() {
  return geo("waters-ms-body", () => {
    // side profile (z forward, y up): box with a long chamfered front-top for the screen
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0.5, 0.78);
    s.lineTo(0.05, 1.22);
    s.lineTo(-0.5, 1.22);
    s.lineTo(-0.5, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
    // shape x -> world z, extrusion -> world x
    g.rotateY(-Math.PI / 2);
    g.translate(0.65, 0, 0);
    return g;
  });
}
const SCREEN_ANG = Math.atan2(0.45, 0.44);
const DRAWERS: T9[] = [0.35, 0.62, 0.89, 1.16].map((y) => [0, y, 0.43, 0.5, 0.012, 0.012]);
const BOTTLES: T9[] = [-0.16, 0, 0.16].map((x) => [x, 1.66, -0.05, 0.065, 0.24, 0.065]);
const CAPS: T9[] = BOTTLES.map(([x, y, z]) => [x, y + 0.14, z, 0.05, 0.04, 0.05]);

// ---- agent ops ----
const AO: [number, number] = [10.3, -5.6];
const RACKS: [number, number][] = [
  [-1.2, 0.45],
  [1.2, 0.45],
  [0, -0.95],
];
const RACK_AT: T9[] = RACKS.map(([x, z]) => [x, 0.15, z, 1, 1, 1, 0, 0, 0]);
const RACK_LINES: T9[] = Array.from({ length: 7 }, (_, i) => [0, 0.42 + i * 0.24, 0.485, 0.5, 0.025, 0.01]);
const RACK_LEDS: T9[] = Array.from({ length: 7 }, (_, i) => [0.3, 0.42 + i * 0.24, 0.485, 0.03, 0.03, 0.01]);
const RACK_H = 2.1;
const NODE_Y = 0.15 + RACK_H + 0.22;

function arcGeo(a: [number, number], b: [number, number], lift: number) {
  return geo(`waters-arc-${a}-${b}-${lift}`, () => {
    const p0 = new THREE.Vector3(a[0], NODE_Y, a[1]);
    const p2 = new THREE.Vector3(b[0], NODE_Y, b[1]);
    const p1 = p0.clone().add(p2).multiplyScalar(0.5).setY(NODE_Y + lift);
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p1, p2), 16, 0.035, 4, false);
  });
}

/** Lab instrument: a matte paper mass-spectrometer-like body with a screen, sample module and solvent tray, one orange status light. Origin at its base centre, faces +Z. */
function Instrument(props: GroupProps) {
  const white = mat(C.paper, { r: 0.6 });
  const grey = mat(C.concreteDark, { r: 0.9 });
  const screen = mat(C.glass, { glow: 0.3, e: C.glass });
  return (
    <group {...props}>
      <group position={[-0.35, 0, 0]}>
        <mesh geometry={instrumentBodyGeo()} material={white} castShadow receiveShadow />
        {/* angled screen with UI */}
        <group position={[0, 1.0, 0.28]} rotation={[-SCREEN_ANG, 0, 0]}>
          <mesh geometry={unitBox()} scale={[0.9, 0.5, 0.03]} position={[0, 0, 0.03]} material={mat(C.ink, { r: 0.6, m: 0.2 })} />
          <mesh geometry={unitBox()} scale={[0.82, 0.42, 0.01]} position={[0, 0, 0.05]} material={screen} />
          {/* spectrum peaks */}
          {[-0.28, -0.16, -0.05, 0.08, 0.2, 0.3].map((x, i) => (
            <mesh key={x} geometry={unitBox()} scale={[0.02, [0.08, 0.2, 0.1, 0.3, 0.12, 0.06][i], 0.004]} position={[x, -0.16 + [0.08, 0.2, 0.1, 0.3, 0.12, 0.06][i] / 2, 0.058]} material={mat(C.paper, { glow: 1.4 })} />
          ))}
        </group>
        {/* ion source probe and status strip */}
        <mesh geometry={octGeo()} scale={[0.13, 0.26, 0.13]} position={[-0.42, 0.55, 0.56]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.charcoal, { r: 0.5, m: 0.4 })} castShadow />
        <mesh geometry={octGeo()} scale={[0.15, 0.04, 0.15]} position={[-0.42, 0.55, 0.66]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.ink, { r: 0.6 })} />
        <mesh geometry={unitBox()} scale={[1.1, 0.025, 0.01]} position={[0, 0.16, 0.545]} material={mat(C.ink, { r: 0.6 })} />
        <mesh geometry={unitBox()} scale={[1.34, 0.06, 1.06]} position={[0, 0.03, 0]} material={grey} receiveShadow />
      </group>
      {/* sample manager tower with drawers and a solvent tray */}
      <group position={[0.72, 0, 0.05]}>
        <mesh geometry={unitBox()} scale={[0.62, 1.5, 0.86]} position={[0, 0.75, 0]} material={white} castShadow receiveShadow />
        <Inst geometry={unitBox()} material={mat(C.concreteDark, { r: 0.8 })} items={DRAWERS} cast={false} />
        <mesh geometry={unitBox()} scale={[0.5, 0.05, 0.4]} position={[0, 1.53, -0.05]} material={grey} castShadow />
        <Inst geometry={octGeo()} material={mat(C.glass, { r: 0.1, m: 0.2, o: 0.7 })} items={BOTTLES} />
        <Inst geometry={octGeo()} material={mat(C.ink, { r: 0.6 })} items={CAPS} />
        <mesh geometry={unitBox()} scale={0.05} position={[0.2, 1.35, 0.44]} material={mat(C.orange, { glow: 2.0 })} />
      </group>
    </group>
  );
}

const octGeo = () => geo("waters-oct", () => new THREE.CylinderGeometry(1, 1, 1, 8));

/** Sector 4: concrete-and-glass Waters lab campus with a single orange accent line, a mass-spec instrument on a plinth and the agent-ops (MCP) server sculpture. Faces +Z. */
export function WatersSector(props: GroupProps) {
  const white = mat(CI.concrete, { r: 0.9 });
  const glass = mat(GLASS, { r: 0.06, m: 0.45 });
  const fin = mat(CI.paper, { r: 0.6 });
  const ink = mat(C.ink, { r: 0.35, m: 0.1 });
  const blue = mat(CI.orange, { glow: 1.15 }); // the one accent line, orange in Concrete & Ink
  // agent ops: the links between the servers are its one orange, the rest ink and paper
  const linkGlow = mat(C.orange, { glow: 2.0 });
  const paperGlow = mat(C.paper, { glow: 1.4 });
  const rack = mat(C.ink, { r: 0.55, m: 0.2 });
  return (
    <group {...props}>
      {/* pale stone plaza with paving joints */}
      <RoundedBox args={[25.6, 0.06, 8.6]} radius={0.025} smoothness={2} position={[0, 0.03, -4.7]} material={mat(CI.concreteDark, { r: 0.95 })} receiveShadow />
      {[-9, -4.5, 0, 4.5, 9].map((x) => (
        <mesh key={x} geometry={unitBox()} scale={[0.03, 0.005, 8.4]} position={[x, 0.062, -4.7]} material={mat(C.greyLight, { r: 0.8 })} />
      ))}

      {/* ===== campus building ===== */}
      <RoundedBox args={[BW + 0.4, 0.3, BD + 0.2]} radius={0.04} smoothness={2} position={[BX, 0.15, ZB]} material={mat(CI.concreteDark, { r: 0.9 })} castShadow receiveShadow />
      {/* recessed glass lobby */}
      <mesh geometry={unitBox()} scale={[BW - 1.6, L1 - 0.3, BD - 1.4]} position={[BX + 0.6, 0.3 + (L1 - 0.3) / 2, ZB - 0.35 + 0.0]} material={glass} castShadow receiveShadow />
      <Inst geometry={unitBox()} material={fin} items={LOBBY_FINS} />
      <Inst geometry={unitCyl()} material={white} items={PILOTIS} />
      {/* entrance doors */}
      <mesh geometry={unitBox()} scale={[2.0, 2.4, 0.05]} position={[BX + 0.6, 0.3 + 1.2, LOBBY_F + 0.07]} material={mat(mix(C.glass, C.ink, 0.25), { r: 0.05, m: 0.4 })} />
      <mesh geometry={unitBox()} scale={[2.1, 0.08, 0.1]} position={[BX + 0.6, 0.3 + 2.44, LOBBY_F + 0.08]} material={mat(C.metal, { r: 0.3, m: 0.6 })} />
      <mesh geometry={unitBox()} scale={[0.04, 2.4, 0.08]} position={[BX + 0.6, 0.3 + 1.2, LOBBY_F + 0.1]} material={mat(C.metal, { r: 0.3, m: 0.6 })} />
      {/* solid stair core on the left */}
      <RoundedBox args={[2.4, L2 + 0.9 - 0.3, BD]} radius={0.08} smoothness={3} position={[BX - BW / 2 + 1.2, 0.3 + (L2 + 0.6) / 2, ZB]} material={white} castShadow receiveShadow />
      {/* cantilevered upper volume with ribbon window */}
      <RoundedBox args={[BW - 2.2, L2 - L1, BD]} radius={0.1} smoothness={4} position={[BX + 1.1, (L1 + L2) / 2, ZB]} material={white} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[BW - 3.2, 1.3, BD + 0.04]} position={[BX + 1.1, 5.5, ZB]} material={glass} />
      <Inst geometry={unitBox()} material={fin} items={RIBBON_FINS} cast={false} />
      {/* the single blue accent line, wrapping the soffit edge */}
      <mesh geometry={unitBox()} scale={[BW - 2.18, 0.13, BD + 0.03]} position={[BX + 1.1, L1 + 0.16, ZB]} material={blue} />
      {/* WATERS wordmark, plain type */}
      <mesh geometry={unitPlane()} scale={[3.4, 0.64, 1]} position={[BX + 4.4, 6.75, ZF + 0.012]} material={plainTextMat("WATERS", C.ink, { weight: 600, spacing: 0.22 })} />
      {/* roof: parapet line, plant, green roof */}
      <mesh geometry={unitBox()} scale={[BW - 2.2, 0.12, BD]} position={[BX + 1.1, L2 + 0.02, ZB]} material={mat(CI.ink, { r: 0.55 })} receiveShadow />
      <Inst geometry={unitBox()} material={mat(CI.graphite, { r: 0.7 })} items={ROOF_PLANT} />
      <Inst geometry={unitBox()} material={mat(C.leaf, { r: 0.8 })} items={GREEN_ROOF} />
      {/* front planter with clipped hedges */}
      <mesh geometry={unitBox()} scale={[6.6, 0.55, 1.0]} position={[-8.8, 0.3, -1.7]} material={mat(CI.concreteDark, { r: 0.9 })} castShadow receiveShadow />
      <Inst geometry={unitBox()} material={mat(C.leafDark, { r: 0.9 })} items={HEDGE} />
      <Tree variant="round" seed={4} position={[3.3, 0.06, -7.2]} />

      {/* ===== instrument on a plinth ===== */}
      <group position={[6.0, 0.06, -3.0]}>
        <mesh geometry={unitBox()} scale={[2.8, 0.7, 1.6]} position={[0, 0.35, 0]} material={ink} castShadow receiveShadow />
        <mesh geometry={unitPlane()} scale={[1.9, 0.2, 1]} position={[0, 0.36, 0.805]} material={plainTextMat("MASS SPECTROMETRY", C.paper, { weight: 500, spacing: 0.08, w: 1536, h: 160, mono: true })} />
        <Instrument position={[0, 0.7, 0]} scale={1.2} />
      </group>

      {/* ===== agent ops: three MCP server racks linked by glowing arcs ===== */}
      <group position={[AO[0], 0.06, AO[1]]}>
        <mesh geometry={geo("waters-ao-base", () => new THREE.CylinderGeometry(2.5, 2.55, 0.15, 8))} position={[0, 0.075, 0]} rotation={[0, Math.PI / 8, 0]} material={white} castShadow receiveShadow />
        <mesh geometry={geo("waters-ao-ring", () => new THREE.RingGeometry(2.0, 2.06, 8))} rotation={[-Math.PI / 2, 0, Math.PI / 8]} position={[0, 0.152, 0]} material={mat(C.ink, { r: 0.6 })} />
        <Inst geometry={geo("waters-rack", () => new THREE.BoxGeometry(0.76, RACK_H, 0.96))} material={rack} items={[[0, RACK_H / 2, 0]]} at={RACK_AT} />
        <Inst geometry={unitBox()} material={mat(C.charcoal, { r: 0.5, m: 0.4 })} items={[[0, RACK_H + 0.03, 0, 0.8, 0.06, 1.0]]} at={RACK_AT} />
        <Inst geometry={unitBox()} material={paperGlow} items={RACK_LINES} at={RACK_AT} cast={false} />
        <Inst geometry={unitBox()} material={linkGlow} items={RACK_LEDS} at={RACK_AT} cast={false} />
        <Inst geometry={unitBox()} material={paperGlow} items={RACKS.map(([x, z]) => [x, NODE_Y, z, 0.2, 0.2, 0.2, 0, Math.PI / 4, 0] as T9)} cast={false} />
        <Inst geometry={unitBox()} material={mat(C.charcoal, { r: 0.5, m: 0.4 })} items={RACKS.map(([x, z]) => [x, NODE_Y - 0.12, z, 0.04, 0.2, 0.04] as T9)} />
        <mesh geometry={arcGeo(RACKS[0], RACKS[1], 1.2)} material={linkGlow} />
        <mesh geometry={arcGeo(RACKS[1], RACKS[2], 1.0)} material={linkGlow} />
        <mesh geometry={arcGeo(RACKS[2], RACKS[0], 1.0)} material={linkGlow} />
        {/* sign plate */}
        <group position={[0, 0.15, 2.05]} rotation={[-0.5, 0, 0]}>
          <mesh geometry={unitBox()} scale={[1.7, 0.36, 0.06]} position={[0, 0.2, 0]} material={ink} castShadow />
          <Label position={[0, 0.24, 0.035]} fontSize={0.15} color={C.paper} letterSpacing={0.04}>
            AGENT OPS
          </Label>
          <Label mono position={[0, 0.1, 0.035]} fontSize={0.065} color={C.concrete} letterSpacing={0.1}>
            MCP SERVERS
          </Label>
        </group>
      </group>
    </group>
  );
}
