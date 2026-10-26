// Static. Start/finish gantry (W08 in the approved world, docs/BRAND.md): ink pillars on
// concrete feet, an ink beam with an LED board and five start lights that glow orange.
// 8 m clear span between the pillars, ~7 m tall. Faces +Z (the road runs along Z, through the arch).
// The beam is at y = 5.4..7.0 (overhead, no collider needed).
"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { K, km } from "../../street/ink";
import { loadBoardFonts } from "../../street/boardArt";
import { mat, unitBox, unitCyl, type GroupProps } from "./shared";

const SPAN = 8;
const PX = SPAN / 2 + 0.35;
const PILLAR_H = 6.4;
const BEAM_Y = 6.2;
const BEAM_H = 1.6;
const BEAM_L = SPAN + 1.7;
const BOARD = { x: -2.25, w: 4.6, h: 1.2 };
const LIGHT_X = 0.6;

const Part = ({ s, p, m, shadow = true }: { s: [number, number, number]; p: [number, number, number]; m: THREE.Material; shadow?: boolean }) => (
  <mesh geometry={unitBox()} scale={s} position={p} material={m} castShadow={shadow} receiveShadow />
);

/** The LED board: orange mono text on near-black, drawn once the fonts are in. */
function useBoard(text: string) {
  const [m, setM] = useState<THREE.MeshStandardMaterial | null>(null);
  useEffect(() => {
    let dead = false;
    let made: THREE.MeshStandardMaterial | null = null;
    void loadBoardFonts().then((fonts) => {
      if (dead) return;
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = Math.round((512 * BOARD.h) / BOARD.w);
      const g = c.getContext("2d")!;
      g.fillStyle = "#0c0c0c";
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = K.orange;
      g.font = `600 ${Math.round(c.height * 0.46)}px ${fonts.mono}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, c.width / 2, c.height / 2 + 2);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      made = new THREE.MeshStandardMaterial({ color: "#000000", emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 1.4, roughness: 0.4, toneMapped: false });
      setM(made);
    });
    return () => {
      dead = true;
      made?.emissiveMap?.dispose();
      made?.dispose();
    };
  }, [text]);
  return m;
}

/** Start gantry (W08): `lights` = how many of the five start lights are lit. */
export function Gantry({ lights = 0, ...props }: GroupProps & { lights?: number }) {
  const ink = km.ink();
  const lit = mat(K.ink, { e: K.orange, glow: 2.4, r: 0.3 }); // dark base so only the emissive orange shows
  const board = useBoard("HG-08  LAP 1");
  return (
    <group {...props}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * PX, 0, 0]}>
          <Part s={[1.2, 0.3, 1.2]} p={[0, 0.15, 0]} m={km.concrete()} />
          <Part s={[0.6, PILLAR_H, 0.6]} p={[0, PILLAR_H / 2, 0]} m={ink} />
        </group>
      ))}
      <Part s={[BEAM_L, BEAM_H, 0.7]} p={[0, BEAM_Y, 0]} m={ink} />
      {/* both faces: the LED board on the left and five start lights on the right */}
      {[1, -1].map((f) => (
        <group key={f} position={[0, BEAM_Y, f * 0.36]} rotation={[0, f > 0 ? 0 : Math.PI, 0]}>
          {board && (
            <mesh position={[BOARD.x, 0, 0]} material={board}>
              <planeGeometry args={[BOARD.w, BOARD.h]} />
            </mesh>
          )}
          {Array.from({ length: 5 }, (_, i) => (
            <group key={i} position={[LIGHT_X + i * 0.9, 0, 0]}>
              <Part s={[0.7, 1.2, 0.1]} p={[0, 0, 0]} m={km.graphite()} shadow={false} />
              {[0.25, -0.25].map((y) => (
                <mesh key={y} geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.2, 0.03, 0.2]} position={[0, y, 0.06]} material={y > 0 && i < lights ? lit : km.inkMatte()} />
              ))}
            </group>
          ))}
        </group>
      ))}
      {/* always mounted so toggling lights never recompiles shaders */}
      <pointLight color={K.orange} intensity={Math.max(0, Math.min(5, lights)) * 1.5} distance={8} position={[2.4, BEAM_Y - 1, 1.2]} />
    </group>
  );
}
