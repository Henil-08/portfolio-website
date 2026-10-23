// AI-for-hardware showcase objects: RTL verification agents and the Verilog coder.
"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "../props/Label";
import { mat, unitBox, unitCyl, unitSphere } from "../props/shared";
import { Bars, Bone, M, setGlow, useGlowMat, useLive, type BarSpec, type ObjProps } from "./common";

/** Silver gull-wing pins around a square package, one instanced mesh. */
function Pins({ size, n, y }: { size: number; n: number; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let k = 0;
    const len = size * 0.09;
    for (let side = 0; side < 4; side++) {
      const ry = (side * Math.PI) / 2;
      const c = Math.cos(ry);
      const s = Math.sin(ry);
      for (let i = 0; i < n; i++) {
        const t = ((i + 0.5) / n - 0.5) * size * 0.8;
        const out = size / 2 + len / 2 - 0.005;
        o.rotation.set(0, ry, 0);
        o.position.set(t * c + out * s, y, -t * s + out * c);
        o.scale.set(size * 0.035, size * 0.02, len);
        o.updateMatrix();
        m.setMatrixAt(k++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [size, n, y]);
  return <instancedMesh ref={ref} args={[unitBox(), mat(C.silver, { r: 0.22, m: 0.7 }), n * 4]} castShadow />;
}

/** Charcoal QFP package, origin at its bottom centre, top surface at y = size * 0.12. */
function Package({ size }: { size: number }) {
  const h = size * 0.12;
  return (
    <>
      <RoundedBox args={[size, h, size]} radius={Math.min(0.03 * size, h / 2 - 0.001)} smoothness={3} position={[0, h / 2, 0]} material={M.charcoal()} castShadow receiveShadow />
      <Pins size={size} n={7} y={h * 0.3} />
      <mesh geometry={unitCyl()} scale={[size * 0.03, 0.004, size * 0.03]} position={[-size * 0.4, h, size * 0.4]} material={M.white()} />
    </>
  );
}

/** Microchip seated in a test socket, seven glowing agent nodes orbiting it. */
export function RtlCoverageAgents({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const orbit = useRef<THREE.Group>(null);
  const node = useGlowMat(C.white, 1.3);
  const lead = useGlowMat(C.red, 1.8);
  const seam = useGlowMat(C.teal, 1.8);
  useFrame(() => {
    const { a, t } = live.current;
    if (orbit.current) orbit.current.rotation.y = t * 0.45;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    setGlow(node, 1.1 + a * 1.4 + pulse * 0.3);
    setGlow(lead, 1.6 + a * 1.8 + pulse * 0.6);
    setGlow(seam, 1.4 + a * 1.6);
  });
  const S = 0.4; // chip size
  return (
    <group {...props}>
      {/* white test fixture with a charcoal socket and a red ZIF lever */}
      <RoundedBox args={[0.7, 0.13, 0.7]} radius={0.03} smoothness={3} position={[0, 0.065, 0]} material={M.white()} castShadow receiveShadow />
      <RoundedBox args={[0.54, 0.05, 0.54]} radius={0.015} smoothness={2} position={[0, 0.15, 0]} material={M.ink()} castShadow receiveShadow />
      <mesh geometry={unitBox()} scale={[0.46, 0.006, 0.46]} position={[0, 0.176, 0]} material={M.greyLight()} />
      <Bone a={[0.3, 0.16, 0.24]} b={[0.3, 0.16, -0.22]} r={0.016} material={M.red()} />
      <mesh geometry={unitSphere()} scale={0.03} position={[0.3, 0.16, 0.26]} material={M.red()} castShadow />
      <Label position={[-0.18, 0.065, 0.351]} anchorX="left" fontSize={0.042} color={C.greyDark} letterSpacing={0.12}>
        UVM · DUT
      </Label>
      <mesh geometry={unitBox()} scale={[0.08, 0.012, 0.004]} position={[0.22, 0.065, 0.352]} material={seam} />
      {/* the chip */}
      <group position={[0, 0.18, 0]}>
        <Package size={S} />
        <mesh geometry={unitBox()} scale={[S * 0.66, 0.006, S * 0.66]} position={[0, S * 0.12 + 0.003, 0]} material={seam} />
        <RoundedBox args={[S * 0.6, 0.016, S * 0.6]} radius={0.006} smoothness={2} position={[0, S * 0.12 + 0.012, 0]} material={M.alu()} castShadow receiveShadow />
        <Label position={[0, S * 0.12 + 0.021, 0.01]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.06} color={C.ink}>
          100%
        </Label>
      </group>
      {/* agent orbit */}
      <group position={[0, 0.5, 0]} rotation={[0.38, 0, 0.12]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mat(C.greyLight, { r: 0.3, o: 0.7 })}>
          <torusGeometry args={[0.44, 0.005, 8, 96]} />
        </mesh>
        <group ref={orbit}>
          {Array.from({ length: 7 }, (_, i) => {
            const th = (i / 7) * Math.PI * 2;
            return (
              <mesh
                key={i}
                geometry={unitSphere()}
                scale={i === 0 ? 0.06 : 0.042}
                position={[Math.cos(th) * 0.44, 0, Math.sin(th) * 0.44]}
                material={i === 0 ? lead : node}
                castShadow
              />
            );
          })}
        </group>
      </group>
    </group>
  );
}

const CODE: [number, number, "r" | "w" | "t"][] = [
  // indent, width, colour (in lid units, lid is 1 x 1)
  [0, 0.46, "r"],
  [0.1, 0.62, "w"],
  [0.1, 0.38, "t"],
  [0.2, 0.5, "w"],
  [0.2, 0.3, "w"],
  [0.1, 0.44, "t"],
  [0, 0.28, "r"],
];

/** A chip whose lid is a code screen, with a pass@1 bar chart rising beside it. */
export function VerilogCoder({ active, ...props }: ObjProps) {
  const live = useLive(active);
  const bar = useRef<THREE.Mesh>(null);
  const cursor = useRef<THREE.Mesh>(null);
  const glow = useGlowMat(C.red, 1.4);
  const L = 0.4; // lid size
  const bars = useMemo(() => {
    const out: Record<string, BarSpec[]> = { r: [], w: [], t: [] };
    CODE.forEach(([ind, w, c], i) => {
      out[c].push([-0.4 * L + ind * L + (w * L) / 2, 0.0, -0.38 * L + i * 0.12 * L, w * L, 0.004, 0.045 * L]);
    });
    return out;
  }, []);
  useFrame(() => {
    const { a, t } = live.current;
    // red bar climbs 17.3 -> 44.9 and holds, then resets
    const cyc = (t * 0.25) % 1;
    const k = THREE.MathUtils.smoothstep(cyc, 0.05, 0.55);
    const h = 0.17 + (0.449 - 0.17) * k;
    if (bar.current) {
      bar.current.scale.y = h * 0.9;
      bar.current.position.y = 0.04 + (h * 0.9) / 2;
    }
    if (cursor.current) cursor.current.visible = Math.sin(t * 7) > -0.2;
    setGlow(glow, 1.2 + a * 1.6);
  });
  return (
    <group {...props}>
      {/* chip on a slim aluminium stand, tilted so its code lid faces the viewer */}
      <group position={[-0.16, 0, 0]}>
        <mesh geometry={unitCyl()} scale={[0.17, 0.02, 0.17]} position={[0, 0.01, 0]} material={M.alu()} castShadow receiveShadow />
        <mesh geometry={unitCyl()} scale={[0.024, 0.3, 0.024]} position={[0, 0.16, 0]} material={M.alu()} castShadow />
        <group position={[0, 0.36, 0.02]} rotation={[0.95, 0, 0]}>
          <group position={[0, -0.03, 0]}>
            <Package size={0.6} />
            <RoundedBox args={[L + 0.02, 0.014, L + 0.02]} radius={0.005} smoothness={2} position={[0, 0.079, 0]} material={M.ink()} />
            <mesh geometry={unitBox()} scale={[L, 0.004, L]} position={[0, 0.087, 0]} material={M.screen()} />
            {/* gutter */}
            <mesh geometry={unitBox()} scale={[0.05, 0.004, L * 0.9]} position={[-L / 2 + 0.03, 0.089, 0]} material={mat("#28313b", { glow: 0.9 })} />
            <group position={[0.012, 0.091, 0]}>
              <Bars items={bars.r} material={M.glowRed(1.5)} />
              <Bars items={bars.w} material={M.glowWhite(0.9)} />
              <Bars items={bars.t} material={M.glowTeal(1.4)} />
              <mesh ref={cursor} geometry={unitBox()} scale={[0.022, 0.006, 0.03]} position={[-0.4 * L + 0.012 + 0.28 * L + 0.02, 0, -0.38 * L + 6 * 0.12 * L]} material={M.glowWhite(1.6)} />
            </group>
          </group>
        </group>
      </group>
      {/* pass@1 chart: base, a grey "before" bar and a red "after" bar that climbs */}
      <group position={[0.38, 0, 0.08]}>
        <RoundedBox args={[0.3, 0.04, 0.2]} radius={0.012} smoothness={2} position={[0, 0.02, 0]} material={M.white()} castShadow receiveShadow />
        <RoundedBox args={[0.08, 0.17 * 0.9, 0.08]} radius={0.01} smoothness={2} position={[-0.065, 0.04 + 0.0765, 0]} material={M.greyLight()} castShadow />
        <mesh ref={bar} geometry={unitBox()} scale={[0.08, 0.4, 0.08]} position={[0.065, 0.24, 0]} material={M.red()} castShadow />
        <mesh geometry={unitBox()} scale={[0.3, 0.004, 0.004]} position={[0, 0.044 + 0.449 * 0.9, 0]} material={glow} />
        <Label position={[0, 0.02, 0.102]} fontSize={0.03} color={C.ink} letterSpacing={0.08}>
          PASS@1
        </Label>
        <Label position={[0.065, 0.044 + 0.449 * 0.9 + 0.04, 0]} fontSize={0.04} color={C.red}>
          44.9
        </Label>
        <Label position={[-0.065, 0.04 + 0.153 + 0.035, 0]} fontSize={0.032} color={C.grey}>
          17.3
        </Label>
      </group>
    </group>
  );
}
