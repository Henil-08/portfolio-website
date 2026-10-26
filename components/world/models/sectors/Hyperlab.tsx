// Sector 2 · 2022-23 · Hyperlab startup. Static.
// Footprint 26 x 18 (x -13..13, z -9..9). Everything sits in z -9..-0.9; the 9 m band
// z 0..9 along the +Z edge is left clear for the track.
// Colliders (cuboids, centre + full size):
//   warehouse HQ:      (-7.6, 3.2, -6.5)   10.4 x 6.4 x 5.0
//   studio stage:      (6.4, 0.2, -5.1)    12.8 x 0.4 x 7.4   (low; screen truss sits on it)
//   screen + truss:    (6.4, 2.8, -8.45)   8.2 x 5.6 x 0.6
//   table tennis:      (-8.2, 0.4, -2.3)   2.8 x 0.8 x 1.6
//   giant phone:       (-1.2, 1.8, -2.4)   1.8 x 3.6 x 0.9
//   spotlight stands stand on the stage corners (inside the stage cuboid, up to 3.0 m tall)
"use client";

import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { C } from "../../palette";
import { CI } from "../../buildings/concrete";
import { Label } from "../props/Label";
import { geo, mat, unitBox, unitCyl, type GroupProps } from "../props/shared";
import { Inst, at, mBox, type T9 } from "./kit";

// Concrete & Ink: a concrete sawtooth works shed with ink roofs and one orange neon
const GLASS = CI.glass;

// ---- warehouse ----
const WX = -7.6;
const WW = 10.4;
const WD = 5;
const ZF = -4;
const HW = 5.0; // eaves
const HT = 6.4; // sawtooth ridge
const TW = WW / 3;

function sawtoothGeo() {
  return geo("hyper-sawtooth", () => {
    const L = -WW / 2;
    const R = WW / 2;
    const s = new THREE.Shape();
    s.moveTo(L, 0);
    s.lineTo(R, 0);
    s.lineTo(R, HT);
    for (let i = 2; i >= 0; i--) {
      const xl = L + i * TW;
      s.lineTo(xl, HW);
      if (i > 0) s.lineTo(xl, HT);
    }
    s.lineTo(L, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
    g.translate(0, 0, -0.3);
    return g;
  });
}

const SLOPE = Math.hypot(TW, HT - HW);
const ANG = Math.atan2(HT - HW, TW);
const ROOF: T9[] = [0, 1, 2].map((i) => [WX - WW / 2 + (i + 0.5) * TW, (HW + HT) / 2 + 0.05, ZF - WD / 2, SLOPE + 0.04, 0.1, WD - 0.2, 0, 0, ANG]);
const SEAMS: T9[] = [0, 1, 2].flatMap((i) =>
  Array.from({ length: 7 }, (_, k) => [WX - WW / 2 + (i + 0.5) * TW, (HW + HT) / 2 + 0.11, ZF - 0.5 - k * 0.68, SLOPE, 0.03, 0.04, 0, 0, ANG] as T9),
);
const ROOF_GLASS: T9[] = [1, 2, 3].map((i) => [WX - WW / 2 + i * TW - 0.06, (HW + HT) / 2, ZF - WD / 2, 0.06, HT - HW - 0.1, WD - 0.5]);

// steel windows: [cx, bottom, w, h, cols, rows]
const WINS: [number, number, number, number, number, number][] = [
  [WX - TW, 0.7, 2.5, 3.0, 4, 4],
  [WX + TW, 0.7, 2.5, 3.0, 4, 4],
  [WX, 2.75, 2.3, 0.85, 4, 1],
  [WX, 0.06, 1.9, 2.5, 2, 2],
];
const WIN_GLASS: T9[] = WINS.map(([x, y, w, h]) => [x, y + h / 2, ZF + 0.02, w, h, 0.04]);
const WIN_BARS: T9[] = WINS.flatMap(([x, y, w, h, c, r]) => [
  ...Array.from({ length: c + 1 }, (_, i) => [x - w / 2 + (i * w) / c, y + h / 2, ZF + 0.05, 0.06, h + 0.06, 0.06] as T9),
  ...Array.from({ length: r + 1 }, (_, i) => [x, y + (i * h) / r, ZF + 0.05, w + 0.06, 0.06, 0.06] as T9),
]);
const SILLS: T9[] = WINS.slice(0, 2).map(([x, y, w]) => [x, y - 0.06, ZF + 0.12, w + 0.3, 0.1, 0.26]);

// ---- studio ----
const SX = 6.4;
const SZ = -5.1;
const SW = 12.8;
const SD = 7.4;
const SH = 0.4;
const POD: [number, number] = [SX, -2.5];
const CHAIR_AT: T9[] = [-44, -22, 0, 22, 44].map((d) => {
  const a = (d * Math.PI) / 180;
  return at(POD[0] + 3.9 * Math.sin(a), POD[1] - 3.9 * Math.cos(a), -a, SH);
});
const CH_BASE: T9[] = [[0, 0.03, 0, 0.32, 0.05, 0.32]];
const CH_STEM: T9[] = [[0, 0.24, 0, 0.05, 0.4, 0.05]];
const CH_SEAT: T9[] = [[0, 0.5, 0.02, 0.74, 0.18, 0.66]];
const CH_BACK: T9[] = [[0, 1.05, -0.3, 0.78, 1.2, 0.16, -0.08, 0, 0]];
const CH_ARM: T9[] = [
  [-0.38, 0.72, 0.0, 0.1, 0.3, 0.62],
  [0.38, 0.72, 0.0, 0.1, 0.3, 0.62],
];

// spotlights: aimed inward at the set
const TILT = 0.45;
const LAMP_AT: T9[] = [at(0.75, -2.15, 2.05, SH), at(12.05, -2.15, -2.05, SH), at(0.75, -7.7, 1.14, SH), at(12.05, -7.7, -1.14, SH)];
const LAMP_LEGS: T9[] = [0, 1, 2].map((k) => {
  const a = (k * Math.PI * 2) / 3;
  return [Math.sin(a) * 0.28, 0.3, Math.cos(a) * 0.28, 0.022, 0.66, 0.022, -Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42];
});
const LAMP_POLE: T9[] = [[0, 1.4, 0, 0.03, 2.2, 0.03]];
const LAMP_CAN: T9[] = [[0, 2.55, 0, 0.2, 0.46, 0.2, Math.PI / 2 + TILT, 0, 0]];
const LAMP_LENS: T9[] = [[0, 2.55 - 0.235 * Math.sin(TILT), 0.235 * Math.cos(TILT), 0.16, 0.02, 0.16, Math.PI / 2 + TILT, 0, 0]];
const LAMP_YOKE: T9[] = [[0, 2.5, 0, 0.5, 0.05, 0.05]];

// screen content: rising bars
const BARS: T9[] = [0.35, 0.55, 0.8, 1.15, 1.6].map((h, i) => [1.4 + i * 0.42, 2.2 + h / 2, 0.02, 0.26, h, 0.02]);

// ---- table tennis ----
const TT: [number, number] = [-8.2, -2.3];
const TT_LEGS: T9[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * 1.15, 0.37, sz * 0.6, 0.06, 0.72, 0.06] as T9));
const TT_LINES: T9[] = [
  [0, 0.765, 0.74, 2.74, 0.006, 0.03],
  [0, 0.765, -0.74, 2.74, 0.006, 0.03],
  [1.355, 0.765, 0, 0.03, 0.006, 1.5],
  [-1.355, 0.765, 0, 0.03, 0.006, 1.5],
  [0, 0.765, 0, 2.74, 0.006, 0.015],
];
// tracked ball trail: a glowing arc across the net
const TRAIL: T9[] = Array.from({ length: 11 }, (_, i) => {
  const t = i / 10;
  const x = -1.0 + 2.1 * t;
  const y = 0.85 + 0.75 * 4 * t * (1 - t);
  const s = 0.025 + 0.025 * t;
  return [x, y, 0.15 - 0.3 * t, s, s, s];
});

const octGeo = () => geo("hyper-oct", () => new THREE.CylinderGeometry(1, 1, 1, 8));

// ---- phone UI rows ----
const UI_ROWS: T9[] = [0, 1, 2].map((i) => [0, -0.55 - i * 0.28, 0.005, 1.1, 0.16, 0.01]);
const STARS: T9[] = Array.from({ length: 5 }, (_, i) => [-0.36 + i * 0.18, 0.02, 0.006, 0.055, 0.055, 0.01]);

/** Sector 2: converted brick-warehouse startup HQ with neon sign, a pitch-show studio set, table tennis with ball tracking and a giant phone. Faces +Z. */
export function HyperlabSector(props: GroupProps) {
  const brick = mat(CI.concrete, { r: 0.92 });
  const steel = mat(CI.ink, { r: 0.45, m: 0.3 });
  const glass = mat(GLASS, { r: 0.08, m: 0.4 });
  const ink = mat(C.ink, { r: 0.4, m: 0.1 });
  const gloss = mat(CI.graphite, { r: 0.6, m: 0.2 });
  const white = mat(CI.paper, { r: 0.6 });
  const cream = mat(CI.paper, { r: 0.6 });
  const metal = mat(CI.graphite, { r: 0.5, m: 0.4 });
  const concrete = mat(CI.concrete, { r: 0.95 });
  const neon = mat(C.red, { glow: 3.2 });
  const warm = mat("#fff2dc", { glow: 2.4 });
  return (
    <group {...props}>
      {/* polished concrete yard */}
      <RoundedBox args={[25.6, 0.06, 8.6]} radius={0.025} smoothness={2} position={[0, 0.03, -4.7]} material={mat(CI.concreteDark, { r: 0.95 })} receiveShadow />

      {/* ===== warehouse HQ ===== */}
      <mesh geometry={mBox(WW - 0.04, HW, WD - 0.5)} position={[WX, HW / 2, ZF - WD / 2]} material={brick} castShadow receiveShadow />
      <mesh geometry={sawtoothGeo()} position={[WX, 0, ZF]} material={brick} castShadow receiveShadow />
      <mesh geometry={sawtoothGeo()} position={[WX, 0, ZF - WD + 0.3]} material={brick} castShadow receiveShadow />
      <Inst geometry={unitBox()} material={mat(CI.ink, { r: 0.55, m: 0.2 })} items={ROOF} />
      <Inst geometry={unitBox()} material={mat(CI.graphite, { r: 0.6 })} items={SEAMS} cast={false} />
      <Inst geometry={unitBox()} material={glass} items={ROOF_GLASS} />
      {/* black steel factory windows, glazed door, stone sills, plinth */}
      <Inst geometry={unitBox()} material={glass} items={WIN_GLASS} cast={false} />
      <Inst geometry={unitBox()} material={steel} items={WIN_BARS} />
      <Inst geometry={unitBox()} material={cream} items={SILLS} />
      <mesh geometry={unitBox()} scale={[WW + 0.1, 0.35, 0.1]} position={[WX, 0.17, ZF + 0.05]} material={mat(CI.concreteDark, { r: 0.9 })} receiveShadow />
      {/* canopy over the door */}
      <mesh geometry={unitBox()} scale={[2.9, 0.08, 1.1]} position={[WX, 2.62, ZF + 0.55]} material={steel} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={unitCyl()} scale={[0.015, 1.3, 0.015]} position={[WX + s * 1.3, 3.15, ZF + 0.5]} rotation={[-0.75, 0, 0]} material={steel} />
      ))}
      {/* neon HYPERLAB sign on a charcoal backer */}
      <mesh geometry={unitBox()} scale={[5.6, 0.95, 0.1]} position={[WX, 4.2, ZF + 0.06]} material={ink} castShadow />
      <Label position={[WX, 4.24, ZF + 0.13]} fontSize={0.62} color={C.red} material={neon} letterSpacing={0.04}>
        HYPERLAB
      </Label>
      <mesh geometry={unitBox()} scale={[5.2, 0.03, 0.03]} position={[WX, 3.84, ZF + 0.12]} material={neon} />
      <Label mono position={[WX + TW, 5.25, ZF + 0.03]} fontSize={0.16} color={CI.ink} letterSpacing={0.1}>
        STARTUP HQ · 2022
      </Label>

      {/* ===== pitch-show studio set ===== */}
      <mesh geometry={unitBox()} scale={[SW, SH, SD]} position={[SX, SH / 2, SZ]} material={gloss} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[SW - 0.1, 0.04, 0.05]} position={[SX, SH - 0.06, SZ + SD / 2 + 0.005]} material={warm} />
      {/* floor medallion where the pitcher stands */}
      <mesh geometry={geo("hyper-ring", () => new THREE.RingGeometry(0.85, 0.95, 8))} rotation={[-Math.PI / 2, 0, 0]} position={[POD[0], SH + 0.005, POD[1] - 0.6]} material={mat(C.red, { r: 0.4 })} />
      <mesh geometry={geo("hyper-disc", () => new THREE.CircleGeometry(0.85, 8))} rotation={[-Math.PI / 2, 0, 0]} position={[POD[0], SH + 0.004, POD[1] - 0.6]} material={mat(CI.ink, { r: 0.6 })} receiveShadow />
      {/* big screen on a truss */}
      <group position={[SX, SH, -8.45]}>
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={unitBox()} scale={[0.3, 5.4, 0.3]} position={[s * 3.95, 2.7, 0]} material={metal} castShadow />
        ))}
        <mesh geometry={unitBox()} scale={[8.2, 0.3, 0.3]} position={[0, 5.4, 0]} material={metal} castShadow />
        <mesh geometry={unitBox()} scale={[7.4, 4.0, 0.22]} position={[0, 3.15, 0.05]} material={ink} castShadow />
        <mesh geometry={unitBox()} scale={[7.1, 3.7, 0.02]} position={[0, 3.15, 0.17]} material={mat(CI.glass, { glow: 0.35, e: CI.glass })} />
        <group position={[0, 0, 0.19]}>
          <Label position={[-1.2, 3.9, 0]} fontSize={0.78} color={CI.paper} material={mat(CI.paper, { glow: 1.6 })} letterSpacing={0.02}>
            THE PITCH
          </Label>
          <mesh geometry={unitBox()} scale={[2.6, 0.06, 0.01]} position={[-1.2, 3.35, 0]} material={neon} />
          <Label mono position={[-1.2, 3.05, 0]} fontSize={0.2} color={CI.concrete} material={mat(CI.concrete, { glow: 1.0 })} letterSpacing={0.1}>
            SEASON 01 · LIVE
          </Label>
          <Inst geometry={unitBox()} material={mat(CI.paper, { glow: 1.3 })} items={BARS.slice(0, 4)} cast={false} />
          <Inst geometry={unitBox()} material={neon} items={BARS.slice(4)} cast={false} />
        </group>
      </group>
      {/* five high-back chairs in an arc */}
      <Inst geometry={unitCyl()} material={metal} items={CH_BASE} at={CHAIR_AT} />
      <Inst geometry={unitCyl()} material={metal} items={CH_STEM} at={CHAIR_AT} />
      <Inst geometry={geo("hyper-seat", () => new THREE.BoxGeometry(1, 1, 1, 1, 1, 1))} material={cream} items={CH_SEAT} at={CHAIR_AT} />
      <Inst geometry={unitBox()} material={cream} items={CH_BACK} at={CHAIR_AT} />
      <Inst geometry={unitBox()} material={mat(CI.ink, { r: 0.5 })} items={CH_ARM} at={CHAIR_AT} />
      {/* pitch podium, facing the panel */}
      <group position={[POD[0], SH, POD[1]]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={unitBox()} scale={[0.8, 1.05, 0.5]} position={[0, 0.52, 0]} material={white} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[0.92, 0.06, 0.62]} position={[0, 1.08, -0.02]} rotation={[-0.2, 0, 0]} material={ink} castShadow />
        <mesh geometry={unitBox()} scale={[0.81, 0.1, 0.51]} position={[0, 0.62, 0]} material={mat(C.red, { r: 0.35 })} />
      </group>
      {/* studio spotlights on tripods */}
      <Inst geometry={unitCyl()} material={steel} items={LAMP_LEGS} at={LAMP_AT} />
      <Inst geometry={unitCyl()} material={steel} items={LAMP_POLE} at={LAMP_AT} />
      <Inst geometry={unitBox()} material={steel} items={LAMP_YOKE} at={LAMP_AT} />
      <Inst geometry={unitCyl()} material={mat(C.charcoal, { r: 0.35, m: 0.4 })} items={LAMP_CAN} at={LAMP_AT} />
      <Inst geometry={unitCyl()} material={warm} items={LAMP_LENS} at={LAMP_AT} cast={false} />

      {/* ===== table tennis with ball tracking ===== */}
      <group position={[TT[0], 0.06, TT[1]]}>
        <mesh geometry={unitBox()} scale={[2.74, 0.05, 1.525]} position={[0, 0.74, 0]} material={mat(CI.graphite, { r: 0.5 })} castShadow receiveShadow />
        <Inst geometry={unitBox()} material={mat(CI.paper, { r: 0.6 })} items={TT_LINES} cast={false} />
        <Inst geometry={unitBox()} material={ink} items={TT_LEGS} />
        <mesh geometry={unitBox()} scale={[0.02, 0.16, 1.7]} position={[0, 0.85, 0]} material={mat(CI.ink, { r: 0.6, o: 0.75 })} />
        <mesh geometry={unitBox()} scale={[0.03, 0.03, 1.72]} position={[0, 0.93, 0]} material={white} />
        {/* the tracked path as glowing paper cubes (a data trace), the ball the one orange */}
        <Inst geometry={unitBox()} material={mat(CI.paper, { glow: 1.6 })} items={TRAIL.slice(0, 10)} cast={false} />
        <mesh geometry={geo("hyper-ball", () => new THREE.IcosahedronGeometry(1, 0))} scale={0.07} position={TRAIL[10].slice(0, 3) as [number, number, number]} material={mat(C.orange, { r: 0.55, flat: true })} castShadow />
        {/* paddles */}
        <mesh geometry={octGeo()} scale={[0.14, 0.02, 0.14]} position={[-0.9, 0.785, 0.45]} material={mat(CI.ink, { r: 0.6 })} castShadow />
        <mesh geometry={octGeo()} scale={[0.14, 0.02, 0.14]} position={[0.95, 0.785, -0.4]} material={mat(CI.paper, { r: 0.6 })} castShadow />
        {/* tracking camera on a tripod */}
        <group position={[0.2, 0, 1.45]}>
          {[0, 1, 2].map((k) => {
            const a = (k * Math.PI * 2) / 3;
            return <mesh key={k} geometry={unitCyl()} scale={[0.02, 1.3, 0.02]} position={[Math.sin(a) * 0.18, 0.62, Math.cos(a) * 0.18]} rotation={[-Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28]} material={steel} castShadow />;
          })}
          <mesh geometry={unitBox()} scale={[0.3, 0.22, 0.36]} position={[0, 1.36, 0]} rotation={[-0.35, 0, 0]} material={ink} castShadow />
          <mesh geometry={octGeo()} scale={[0.08, 0.1, 0.08]} position={[0, 1.31, -0.22]} rotation={[Math.PI / 2 - 0.35, 0, 0]} material={mat(CI.glass, { r: 0.15, m: 0.4 })} />
        </group>
      </group>

      {/* ===== giant phone: 50K downloads ===== */}
      <group position={[-1.2, 0.06, -2.4]} rotation={[0, 0.3, 0]}>
        <mesh geometry={unitBox()} scale={[1.6, 0.3, 0.8]} position={[0, 0.15, 0]} material={concrete} castShadow receiveShadow />
        <group position={[0, 1.95, 0]} rotation={[-0.06, 0, 0]}>
          <mesh geometry={unitBox()} scale={[1.6, 3.2, 0.16]} material={mat(CI.ink, { r: 0.55, m: 0.2 })} castShadow receiveShadow />
          <mesh geometry={unitBox()} scale={[1.44, 3.0, 0.01]} position={[0, 0, 0.081]} material={mat(CI.glass, { glow: 0.25, e: CI.glass })} />
          <group position={[0, 0, 0.09]}>
            <mesh geometry={unitBox()} scale={[0.32, 0.06, 0.01]} position={[0, 1.38, 0]} material={ink} />
            <mesh geometry={unitBox()} scale={[0.5, 0.5, 0.02]} position={[0, 0.95, 0]} material={mat(C.red, { glow: 1.2 })} />
            <Label position={[0, 0.95, 0.015]} fontSize={0.3} color={CI.paper}>
              H
            </Label>
            <Label position={[0, 0.42, 0.01]} fontSize={0.56} color={CI.paper} material={mat(CI.paper, { glow: 1.3 })}>
              50K
            </Label>
            <Label mono position={[0, 0.14, 0.01]} fontSize={0.11} color={CI.concrete} material={mat(CI.concrete, { glow: 0.9 })} letterSpacing={0.08}>
              DOWNLOADS
            </Label>
            <group position={[0, -0.1, 0]}>
              <Inst geometry={unitBox()} material={mat(CI.paper, { glow: 1.0 })} items={STARS} cast={false} />
            </group>
            <Inst geometry={unitBox()} material={mat(CI.graphite, { glow: 0.6 })} items={UI_ROWS} cast={false} />
            <mesh geometry={unitBox()} scale={[0.6, 0.03, 0.01]} position={[0, -1.4, 0]} material={mat(CI.concrete, { glow: 0.8 })} />
          </group>
        </group>
      </group>
    </group>
  );
}
