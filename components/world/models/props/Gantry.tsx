// Static. Start/finish gantry, 8 m clear span between the pillars, ~5.6 m tall. Faces +Z
// (the road runs along Z, through the arch).
// Colliders: pillars at x = +-4.35, cuboid 0.7 x 5.6 x 0.9 centered at (+-4.35, 2.8, 0).
// The beam is at y = 4.6..5.6 (overhead, no collider needed).
"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { C } from "../../palette";
import { Label } from "./Label";
import { mat, unitBox, unitCyl, type GroupProps } from "./shared";

const SPAN = 8;
const PX = SPAN / 2 + 0.35;
const BEAM_Y = 5.1;

function useChequer(cols: number, rows: number) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = cols * 16;
    c.height = rows * 16;
    const g = c.getContext("2d")!;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        g.fillStyle = (x + y) % 2 ? C.ink : C.white;
        g.fillRect(x * 16, y * 16, 16, 16);
      }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
  }, [cols, rows]);
}

/** Broadcast banner face: white panel, chequer + red block at the ends, Racero headline. */
function Banner({ text, sub }: { text: string; sub: string }) {
  const chequer = useChequer(4, 4);
  const w = SPAN - 0.3; // fits between the pylons
  return (
    <group>
      <mesh geometry={unitBox()} scale={[w, 0.78, 0.02]} material={mat(C.white, { r: 0.3 })} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={unitBox()} scale={[0.7, 0.78, 0.022]} position={[s * (w / 2 - 0.35), 0, 0.001]} material={mat(C.red, { r: 0.35 })} />
          <mesh position={[s * (w / 2 - 0.35), 0, 0.013]} material={chequer}>
            <planeGeometry args={[0.48, 0.48]} />
          </mesh>
        </group>
      ))}
      <Label position={[0, 0.06, 0.015]} fontSize={0.36} color={C.ink} letterSpacing={0.08}>
        {text}
      </Label>
      <Label position={[0, -0.24, 0.015]} fontSize={0.1} color={C.greyDark} letterSpacing={0.4}>
        {sub}
      </Label>
    </group>
  );
}

/** Modern F1 start gantry: white pylons, charcoal beam, 5 pairs of start lights on a black panel (`lights` = columns lit). */
export function Gantry({ lights = 0, ...props }: GroupProps & { lights?: number }) {
  const white = mat(C.white, { r: 0.3 });
  const red = mat(C.red, { r: 0.35 });
  const ink = mat(C.ink, { r: 0.45, m: 0.15 });
  const black = mat(C.black, { r: 0.35, m: 0.2 });
  const lit = mat(C.black, { e: C.red, glow: 2.4, r: 0.3 }); // dark base so only the emissive red shows
  const off = mat("#24262a", { r: 0.12, m: 0.3 });
  const bezel = mat(C.charcoal, { r: 0.3, m: 0.4 });
  return (
    <group {...props}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * PX, 0, 0]}>
          {/* plinth + white pylon with a red inset stripe facing the road */}
          <RoundedBox args={[0.9, 0.2, 1.1]} radius={0.03} smoothness={2} position={[0, 0.1, 0]} material={ink} castShadow receiveShadow />
          <RoundedBox args={[0.62, BEAM_Y + 0.4, 0.82]} radius={0.05} smoothness={3} position={[0, (BEAM_Y + 0.4) / 2 + 0.1, 0]} material={white} castShadow receiveShadow />
          {[-1, 1].map((f) => (
            <mesh key={f} geometry={unitBox()} scale={[0.14, BEAM_Y - 0.9, 0.02]} position={[-s * 0.12, (BEAM_Y - 0.9) / 2 + 0.4, f * 0.415]} material={red} />
          ))}
          <mesh geometry={unitBox()} scale={[0.02, BEAM_Y - 0.9, 0.12]} position={[-s * 0.315, (BEAM_Y - 0.9) / 2 + 0.4, 0]} material={red} />
        </group>
      ))}
      {/* main beam: charcoal box section, banners front and back */}
      <RoundedBox args={[SPAN + 1.5, 0.95, 0.7]} radius={0.04} smoothness={2} position={[0, BEAM_Y + 0.05, 0]} material={ink} castShadow receiveShadow />
      <group position={[0, BEAM_Y + 0.05, 0.36]}>
        <Banner text="START · FINISH" sub="HG RACING · GRAND PRIX" />
      </group>
      <group position={[0, BEAM_Y + 0.05, -0.36]} rotation={[0, Math.PI, 0]}>
        <Banner text="HG RACING" sub="LIGHTS OUT AND AWAY WE GO" />
      </group>

      {/* start light panel hanging under the beam: 5 columns x 2 lights */}
      <group position={[0, BEAM_Y - 1.0, 0.05]}>
        {[-1.5, 1.5].map((x) => (
          <mesh key={x} geometry={unitBox()} scale={[0.05, 0.4, 0.05]} position={[x, 0.55, -0.05]} material={ink} />
        ))}
        <RoundedBox args={[3.9, 0.9, 0.32]} radius={0.03} smoothness={2} material={black} castShadow receiveShadow />
        <mesh geometry={unitBox()} scale={[3.9, 0.04, 0.33]} position={[0, 0.43, 0]} material={red} />
        {Array.from({ length: 5 }, (_, i) => {
          const on = i < lights;
          return (
            <group key={i} position={[(i - 2) * 0.72, 0, 0.165]}>
              <mesh geometry={unitBox()} scale={[0.56, 0.78, 0.02]} material={bezel} />
              {[0.18, -0.18].map((y) => (
                <group key={y} position={[0, y, 0]}>
                  <mesh geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.15, 0.03, 0.15]} position={[0, 0, 0.012]} material={on ? lit : off} />
                  {/* visor */}
                  <mesh geometry={unitBox()} scale={[0.34, 0.025, 0.08]} position={[0, 0.17, 0.05]} material={black} />
                </group>
              ))}
            </group>
          );
        })}
        {/* always mounted so toggling lights never recompiles shaders */}
        <pointLight color={C.red} intensity={Math.max(0, Math.min(5, lights)) * 1.5} distance={6} position={[0, -0.6, 1]} />
      </group>
      {/* roof graphic for the high camera */}
      <Label position={[0, BEAM_Y + 0.53, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color={C.white} letterSpacing={0.12}>
        START · FINISH
      </Label>
    </group>
  );
}
