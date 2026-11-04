// Static. Start/finish gantry: the approved model (kit/builtTrackside.tsx, concept gantry) at
// the game's size: ink posts on concrete feet ~9 m apart, a mitred beam, the LED board under it
// and five start lights on top that glow orange. Faces +Z (the road runs along Z, through the
// arch). The beam is at y = 4..4.6 (overhead, no collider needed).
"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { K } from "../../street/ink";
import { loadBoardFonts } from "../../street/boardArt";
import { Built } from "../../kit/builtShared";
import { GANTRY_BOARD, GANTRY_LENSES, gantryParts } from "../../kit/builtTrackside";
import { mat, unitCyl, type GroupProps } from "./shared";

/** The concept's 15 m span at the world's scale. */
const S = 0.65;
const BOARD = { w: GANTRY_BOARD.w, h: GANTRY_BOARD.h };

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

/** Start gantry: `lights` = how many of the five start lights are lit. */
export function Gantry({ lights = 0, ...props }: GroupProps & { lights?: number }) {
  const lit = mat(K.ink, { e: K.orange, glow: 2.4, r: 0.3 }); // dark base so only the emissive orange shows
  const off = mat("#2b2c2e", { r: 0.6, m: 0.3 });
  const board = useBoard("HG-08  LAP 1");
  return (
    <group {...props}>
      <group scale={S}>
        <Built parts={gantryParts(false)} />
        {/* the board reads from both ways along the straight */}
        {board &&
          [1, -1].map((f) => (
            <mesh key={f} position={[0, GANTRY_BOARD.p[1], f > 0 ? GANTRY_BOARD.p[2] : -0.06]} rotation={[0, f > 0 ? 0 : Math.PI, 0]} material={board}>
              <planeGeometry args={[BOARD.w, BOARD.h]} />
            </mesh>
          ))}
        {GANTRY_LENSES.map((p, i) => (
          <mesh key={i} geometry={unitCyl()} rotation={[Math.PI / 2, 0, 0]} scale={[0.3, 0.06, 0.3]} position={p} material={i < lights ? lit : off} />
        ))}
      </group>
      {/* always mounted so toggling lights never recompiles shaders */}
      <pointLight color={K.orange} intensity={Math.max(0, Math.min(5, lights)) * 1.5} distance={8} position={[0, 4.4, 1.2]} />
    </group>
  );
}
