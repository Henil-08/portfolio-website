"use client";

// World model proposals in the Datasheet language ("Concrete & Ink"): modern circuit
// architecture, matte materials, ink steel, paper paint, one orange. Procedural three.js,
// sized in metres like the real world (car ~5.2 m, garage bays 5 m).
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const W = {
  concrete: "#d9d6ce",
  concreteDark: "#b8b4a9",
  asphalt: "#3a3b3e",
  grass: "#7a8462",
  grassDark: "#5f6a4c",
  gravel: "#cdc4b0",
  water: "#3e5a63",
  ink: "#151515",
  graphite: "#2b2c2e",
  paper: "#f3f2ed",
  orange: "#ff4f00",
  glass: "#1f262b",
  leaf: "#5c6a4b",
  leafLight: "#73805c",
};

type Night = { night?: boolean };
const std = (color: string, rough = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
export const M = {
  concrete: std(W.concrete, 0.95),
  concreteDark: std(W.concreteDark, 0.95),
  asphalt: std(W.asphalt, 0.95),
  ink: std(W.ink, 0.55, 0.2),
  inkMatte: std(W.ink, 0.8),
  graphite: std(W.graphite, 0.6, 0.3),
  paper: std(W.paper, 0.6),
  orange: std(W.orange, 0.55),
  glass: std(W.glass, 0.15, 0.4),
  gravel: std(W.gravel, 1),
  grass: std(W.grass, 1),
  leaf: new THREE.MeshStandardMaterial({ color: W.leaf, roughness: 0.9, flatShading: true }),
  leafLight: new THREE.MeshStandardMaterial({ color: W.leafLight, roughness: 0.9, flatShading: true }),
  tyre: std("#101010", 0.9),
};
const lampOn = new THREE.MeshStandardMaterial({ color: W.paper, emissive: "#fff3dc", emissiveIntensity: 2.4, toneMapped: false });
const lampOff = new THREE.MeshStandardMaterial({ color: "#d9d6ce", emissive: "#fff3dc", emissiveIntensity: 0.15 });
const ledOn = new THREE.MeshStandardMaterial({ color: W.orange, emissive: W.orange, emissiveIntensity: 2, toneMapped: false });

/** A box along z that tapers from (w0, h0) at the back to (w1, h1) at the front, centre heights y0 → y1. */
export function tapered(w0: number, h0: number, w1: number, h1: number, len: number, y0 = 0, y1 = 0) {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getZ(i) + 0.5;
    p.setXYZ(i, p.getX(i) * THREE.MathUtils.lerp(w0, w1, t), p.getY(i) * THREE.MathUtils.lerp(h0, h1, t) + THREE.MathUtils.lerp(y0, y1, t), p.getZ(i) * len);
  }
  g.computeVertexNormals();
  return g;
}

export function Box({ s, p, m, r }: { s: [number, number, number]; p: [number, number, number]; m: THREE.Material; r?: [number, number, number] }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

/** Text on a plane (codes, numbers), drawn to a canvas once. */
export function useLabel(text: string, { fg = W.ink, bg = W.paper, w = 256, h = 128, size = 72 } = {}) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    const fam = getComputedStyle(document.body).getPropertyValue("--font-plex-mono").trim() || "monospace";
    g.font = `600 ${size}px ${fam}, monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 4);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
  }, [text, fg, bg, w, h, size]);
}

/** Day or night key light with a shadow box of ±size metres. */
export function Lights({ night = false, size = 30 }: { night?: boolean; size?: number }) {
  return (
    <>
      <hemisphereLight args={[night ? "#3a4552" : "#ffffff", night ? "#111" : "#b8b4a9", night ? 0.55 : 1.0]} />
      <directionalLight
        position={night ? [-10, 18, 8] : [14, 22, 10]}
        intensity={night ? 0.5 : 2.4}
        color={night ? "#9fb4d0" : "#fff6ea"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
        shadow-camera-far={120}
      />
    </>
  );
}

/* ------------------------------------------------------------------ W01 car */

function Wheel({ x, z, r, w }: { x: number; z: number; r: number; w: number }) {
  const side = Math.sign(x);
  return (
    <group position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={M.tyre} castShadow>
        <cylinderGeometry args={[r, r, w, 32]} />
      </mesh>
      {/* paper sidewall band and a graphite rim on the outside */}
      <mesh position={[side * (w / 2 + 0.001), 0, 0]} rotation={[0, 0, 0]} material={M.paper}>
        <cylinderGeometry args={[r * 0.82, r * 0.82, 0.004, 32]} />
      </mesh>
      <mesh position={[side * (w / 2 + 0.004), 0, 0]} material={M.graphite}>
        <cylinderGeometry args={[r * 0.68, r * 0.68, 0.006, 24]} />
      </mesh>
    </group>
  );
}

export function Car() {
  const nose = useMemo(() => tapered(0.78, 0.5, 0.2, 0.16, 2.3, 0.44, 0.24), []);
  const pod = useMemo(() => tapered(0.32, 0.26, 0.5, 0.5, 1.6, 0.3, 0.38), []);
  const cover = useMemo(() => tapered(0.26, 0.24, 0.62, 0.62, 1.9, 0.5, 0.62), []);
  const num = useLabel("08", { fg: W.ink, bg: W.paper, w: 256, h: 160, size: 120 });
  return (
    <group>
      {/* floor and plank */}
      <Box s={[1.7, 0.05, 3.7]} p={[0, 0.07, -0.2]} m={M.inkMatte} />
      {/* nose and survival cell */}
      <mesh geometry={nose} position={[0, 0, 1.35]} material={M.ink} castShadow />
      <Box s={[0.82, 0.58, 1.15]} p={[0, 0.44, -0.37]} m={M.ink} />
      {/* the orange line along the top of the nose */}
      <Box s={[0.07, 0.012, 2.25]} p={[0, 0.55, 1.3]} r={[0.087, 0, 0]} m={M.orange} />
      {/* cockpit opening */}
      <Box s={[0.5, 0.06, 0.72]} p={[0, 0.74, -0.15]} m={M.glass} />
      {/* sidepods in paper, so the silhouette reads from any angle */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} geometry={pod} position={[sx * 0.62, 0, -0.55]} material={M.paper} castShadow />
      ))}
      {/* engine cover in paper, with the number on both sides */}
      <mesh geometry={cover} position={[0, 0, -1.4]} material={M.paper} castShadow />
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.215, 0.62, -1.05]} rotation={[0, (sx * Math.PI) / 2 - 0.03 * sx, 0]} material={num}>
          <planeGeometry args={[0.46, 0.29]} />
        </mesh>
      ))}
      <Box s={[0.03, 0.42, 1.2]} p={[0, 0.98, -1.6]} m={M.paper} />
      <Box s={[0.34, 0.2, 0.26]} p={[0, 0.98, -0.62]} m={M.ink} />
      {/* halo */}
      <mesh position={[0, 0.82, -0.25]} rotation={[Math.PI / 2, 0, 0]} material={M.ink} castShadow>
        <torusGeometry args={[0.36, 0.035, 8, 24, Math.PI]} />
      </mesh>
      <Box s={[0.05, 0.2, 0.05]} p={[0, 0.88, 0.1]} r={[-0.5, 0, 0]} m={M.ink} />
      {/* front wing: two elements and endplates, paper upper element */}
      <Box s={[1.9, 0.035, 0.42]} p={[0, 0.1, 2.48]} m={M.ink} />
      <Box s={[1.7, 0.03, 0.2]} p={[0, 0.17, 2.36]} r={[-0.3, 0, 0]} m={M.paper} />
      {[-1, 1].map((sx) => (
        <Box key={sx} s={[0.03, 0.24, 0.52]} p={[sx * 0.95, 0.17, 2.46]} m={M.ink} />
      ))}
      {/* rear wing: main plane, paper flap, endplates and the pylon */}
      <Box s={[1.0, 0.04, 0.32]} p={[0, 0.93, -2.32]} m={M.ink} />
      <Box s={[1.0, 0.03, 0.2]} p={[0, 1.04, -2.42]} r={[0.45, 0, 0]} m={M.paper} />
      {[-1, 1].map((sx) => (
        <Box key={sx} s={[0.03, 0.56, 0.55]} p={[sx * 0.51, 0.82, -2.35]} m={M.ink} />
      ))}
      <Box s={[0.05, 0.5, 0.12]} p={[0, 0.66, -2.25]} m={M.ink} />
      <Box s={[1.0, 0.04, 0.3]} p={[0, 0.3, -2.4]} m={M.ink} />
      {/* wheels */}
      <Wheel x={0.84} z={1.62} r={0.36} w={0.32} />
      <Wheel x={-0.84} z={1.62} r={0.36} w={0.32} />
      <Wheel x={0.8} z={-1.55} r={0.37} w={0.4} />
      <Wheel x={-0.8} z={-1.55} r={0.37} w={0.4} />
      {/* suspension arms */}
      {[-1, 1].flatMap((sx) => [
        <Box key={`f${sx}`} s={[0.62, 0.025, 0.04]} p={[sx * 0.48, 0.38, 1.62]} r={[0, 0, sx * 0.12]} m={M.ink} />,
        <Box key={`r${sx}`} s={[0.5, 0.025, 0.04]} p={[sx * 0.52, 0.4, -1.55]} m={M.ink} />,
      ])}
    </group>
  );
}

/* ------------------------------------------------------------------ W02 garage */

export function Garage({ night }: Night) {
  const codes = ["Z05", "Z06", "Z07", "Z08", "Z09"];
  return (
    <group>
      <Box s={[32, 0.15, 16]} p={[0, 0.075, 1]} m={M.concreteDark} />
      {/* ground floor block with five bays */}
      <Box s={[30, 4.4, 10]} p={[0, 2.35, -1]} m={M.concrete} />
      {codes.map((c, i) => (
        <Bay key={c} x={-12 + i * 6} code={c} night={night} />
      ))}
      {/* upper floor, set back, with a full-width dark glass band */}
      <Box s={[30, 2.6, 8.5]} p={[0, 5.85, -1.75]} m={M.concrete} />
      <Box s={[29.6, 1.5, 0.08]} p={[0, 5.9, 2.52]} m={night ? lampOn : M.glass} />
      {/* thin cantilevered roof, ink */}
      <Box s={[32, 0.32, 13]} p={[0, 7.32, -0.3]} m={M.ink} />
      {/* columns under the overhang */}
      {[-15, -9, -3, 3, 9, 15].map((x) => (
        <Box key={x} s={[0.22, 3, 0.22]} p={[x, 5.65, 5.8]} m={M.ink} />
      ))}
    </group>
  );
}

function Bay({ x, code, night }: { x: number; code: string; night?: boolean }) {
  const plate = useLabel(code, { fg: W.paper, bg: W.ink, w: 256, h: 96, size: 64 });
  return (
    <group position={[x, 0, 4.02]}>
      <Box s={[5, 3.5, 0.1]} p={[0, 1.9, 0]} m={night ? lampOff : M.glass} />
      <Box s={[5.3, 0.16, 0.16]} p={[0, 3.72, 0.02]} m={M.ink} />
      {[-1, 1].map((s) => (
        <Box key={s} s={[0.16, 3.6, 0.16]} p={[s * 2.62, 1.95, 0.02]} m={M.ink} />
      ))}
      <mesh position={[0, 4.15, 0.1]} material={plate}>
        <planeGeometry args={[1.6, 0.6]} />
      </mesh>
      <Box s={[0.18, 0.18, 0.05]} p={[1, 4.15, 0.12]} m={M.orange} />
    </group>
  );
}

/* ------------------------------------------------------------------ W03 barriers */

export function TecPro({ n = 10 }: { n?: number }) {
  const geo = useMemo(() => new RoundedBoxGeometry(1.0, 0.8, 0.8, 2, 0.12), []);
  return (
    <group position={[-(n - 1) / 2, 0, 0]}>
      {Array.from({ length: n }, (_, i) =>
        [0, 1].map((row) => (
          <mesh
            key={`${i}${row}`}
            geometry={geo}
            position={[i + (row ? 0.5 : 0), 0.4 + row * 0.8, 0]}
            material={i === 6 && row === 1 ? M.orange : (i + row) % 2 ? M.paper : M.ink}
            castShadow
            receiveShadow
          />
        )),
      )}
      {/* the strap running along each row */}
      {[0.4, 1.2].map((y) => (
        <Box key={y} s={[n - 0.2, 0.06, 0.81]} p={[(n - 1) / 2 + 0.25, y, 0]} m={M.graphite} />
      ))}
    </group>
  );
}

const fenceMat = (() => {
  if (typeof document === "undefined") return M.ink;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.strokeStyle = "#151515";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(64, 64);
  g.moveTo(64, 0);
  g.lineTo(0, 64);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(24, 8);
  return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6 });
})();

/** Concrete wall with a tall debris fence on ink posts. */
export function WallFence({ len = 12 }: { len?: number }) {
  const wall = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.3, 0);
    s.lineTo(0.3, 0);
    s.lineTo(0.12, 0.25);
    s.lineTo(0.1, 1.0);
    s.lineTo(-0.1, 1.0);
    s.lineTo(-0.12, 0.25);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    g.translate(0, 0, -len / 2);
    g.rotateY(Math.PI / 2);
    return g;
  }, [len]);
  const posts = Math.round(len / 2.5) + 1;
  return (
    <group>
      <mesh geometry={wall} material={M.concrete} castShadow receiveShadow />
      {/* the paper stripe along the top edge */}
      <Box s={[len, 0.06, 0.205]} p={[0, 1.0, 0]} m={M.paper} />
      {Array.from({ length: posts }, (_, i) => (
        <Box key={i} s={[0.08, 3.4, 0.08]} p={[-len / 2 + (i * len) / (posts - 1), 2.7, 0]} m={M.ink} />
      ))}
      <mesh position={[0, 2.7, 0]} material={fenceMat}>
        <planeGeometry args={[len, 3.2]} />
      </mesh>
      <Box s={[len, 0.05, 0.05]} p={[0, 4.4, 0]} m={M.ink} />
    </group>
  );
}

/* ------------------------------------------------------------------ W04 kerb and track edge */

export function KerbEdge({ len = 12 }: { len?: number }) {
  const n = Math.round(len / 0.9);
  const seg = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(1.2, 0);
    s.lineTo(1.2, 0.06);
    s.lineTo(0, 0.1);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false });
    return g;
  }, []);
  return (
    <group>
      <Box s={[len, 0.05, 5]} p={[0, 0.025, 2.5]} m={M.asphalt} />
      {/* paper edge line on the asphalt */}
      <Box s={[len, 0.052, 0.18]} p={[0, 0.03, 0.2]} m={M.paper} />
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} geometry={seg} position={[-len / 2 + i * 0.9 + 0.9, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={i % 2 ? M.paper : M.ink} castShadow receiveShadow />
      ))}
      <Box s={[len, 0.04, 2.4]} p={[0, 0.02, -2.4]} m={M.gravel} />
      <Box s={[len, 0.03, 3]} p={[0, 0.015, -5.1]} m={M.grass} />
    </group>
  );
}

/* ------------------------------------------------------------------ W05 grandstand */

export function Grandstand({ len = 16 }: { len?: number }) {
  const tiers = 7;
  return (
    <group>
      {Array.from({ length: tiers }, (_, i) => (
        <group key={i}>
          <Box s={[len, 0.5 + i * 0.5, 0.9]} p={[0, (0.5 + i * 0.5) / 2, -i * 0.9]} m={M.concrete} />
          {/* a row of seats, graphite with one paper row in the middle */}
          <Box s={[len - 0.6, 0.32, 0.4]} p={[0, 0.5 + i * 0.5 + 0.16, -i * 0.9 - 0.15]} m={i === 3 ? M.paper : M.graphite} />
        </group>
      ))}
      {/* steel frame and the cantilever roof */}
      {[-len / 2 + 0.3, 0, len / 2 - 0.3].map((x) => (
        <group key={x}>
          <Box s={[0.25, 7.6, 0.25]} p={[x, 3.8, -tiers * 0.9 - 0.2]} m={M.ink} />
          <Box s={[0.2, 0.25, 7.2]} p={[x, 7.4, -tiers * 0.9 + 3.2]} r={[0.12, 0, 0]} m={M.ink} />
        </group>
      ))}
      <Box s={[len + 0.6, 0.18, 7.6]} p={[0, 7.65, -tiers * 0.9 + 3.1]} r={[0.12, 0, 0]} m={M.ink} />
      <Box s={[len + 0.6, 0.6, 0.1]} p={[0, 7.0, 0.7]} m={M.paper} />
      <Box s={[len, 7.4, 0.2]} p={[0, 3.7, -tiers * 0.9 - 0.4]} m={M.concreteDark} />
    </group>
  );
}

/* ------------------------------------------------------------------ W06 floodlight */

/** At night each mast throws a warm cone onto whatever is in front of it. */
function Beam() {
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <primitive object={target} position={[0, 0, 13]} />
      <spotLight position={[0, 11, 0.6]} target={target} angle={0.75} penumbra={0.7} intensity={220} distance={50} decay={1.5} color="#fff0d8" />
    </>
  );
}

export function Floodlight({ night }: Night) {
  return (
    <group>
      {night && <Beam />}
      <Box s={[1.2, 0.3, 1.2]} p={[0, 0.15, 0]} m={M.concrete} />
      <mesh position={[0, 5.5, 0]} material={M.ink} castShadow>
        <cylinderGeometry args={[0.1, 0.18, 11, 12]} />
      </mesh>
      <group position={[0, 11.2, 0.3]} rotation={[0.35, 0, 0]}>
        <Box s={[2.6, 1.4, 0.3]} p={[0, 0, 0]} m={M.ink} />
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[-0.95 + (i % 4) * 0.63, i < 4 ? 0.3 : -0.3, 0.16]} material={night ? lampOn : lampOff}>
            <boxGeometry args={[0.5, 0.45, 0.04]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ W07 gantry */

export function Gantry({ night }: Night) {
  const board = useLabel("HG-08  LAP 1", { fg: W.orange, bg: "#0c0c0c", w: 512, h: 96, size: 56 });
  return (
    <group>
      {[-6.5, 6.5].map((x) => (
        <group key={x}>
          <Box s={[0.6, 6.4, 0.6]} p={[x, 3.2, 0]} m={M.ink} />
          <Box s={[1.2, 0.3, 1.2]} p={[x, 0.15, 0]} m={M.concrete} />
        </group>
      ))}
      <Box s={[14, 1.6, 0.7]} p={[0, 6.2, 0]} m={M.ink} />
      <mesh position={[-2.6, 6.2, 0.36]} material={board}>
        <planeGeometry args={[6.4, 1.2]} />
      </mesh>
      {/* five start lights, orange when lit */}
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} position={[1.6 + i * 1.0, 6.2, 0.36]}>
          <Box s={[0.7, 1.2, 0.1]} p={[0, 0, 0]} m={M.graphite} />
          <mesh position={[0, 0.25, 0.06]} material={night || i < 3 ? ledOn : M.ink}>
            <circleGeometry args={[0.2, 16]} />
          </mesh>
          <mesh position={[0, -0.25, 0.06]} material={M.ink}>
            <circleGeometry args={[0.2, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ W08 town */

function Block({ w, d, floors, x = 0, z = 0, accent }: { w: number; d: number; floors: number; x?: number; z?: number; accent?: boolean }) {
  const fh = 3.2;
  const h = floors * fh;
  const cols = Math.max(2, Math.round(w / 2.4));
  return (
    <group position={[x, 0, z]}>
      <Box s={[w, h, d]} p={[0, h / 2, 0]} m={M.concrete} />
      {/* ground floor glazing, then a grid of recessed windows on the street face */}
      <Box s={[w - 0.8, 2.4, 0.06]} p={[0, 1.4, d / 2 + 0.01]} m={M.glass} />
      {Array.from({ length: floors - 1 }, (_, f) =>
        Array.from({ length: cols }, (_, c) => (
          <Box key={`${f}${c}`} s={[1.3, 1.7, 0.06]} p={[-w / 2 + (w / cols) * (c + 0.5), fh * (f + 1) + 1.5, d / 2 + 0.01]} m={M.glass} />
        )),
      )}
      {/* parapet and an ink roof line */}
      <Box s={[w + 0.2, 0.5, d + 0.2]} p={[0, h + 0.25, 0]} m={M.concreteDark} />
      <Box s={[w + 0.22, 0.08, d + 0.22]} p={[0, h + 0.5, 0]} m={M.ink} />
      {accent && <Box s={[1.1, 2.4, 0.08]} p={[w / 2 - 1.2, 1.4, d / 2 + 0.03]} m={M.orange} />}
    </group>
  );
}

export function Town() {
  return (
    <group>
      <Box s={[26, 0.12, 14]} p={[0, 0.06, 0]} m={M.concreteDark} />
      <Block w={8} d={8} floors={5} x={-8} />
      <Block w={7} d={8} floors={3} x={0} z={1} accent />
      <Block w={8} d={9} floors={7} x={8} z={-0.5} />
    </group>
  );
}

/* ------------------------------------------------------------------ W09 trees */

function Cypress({ x, z, h = 7 }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box s={[0.25, 1.2, 0.25]} p={[0, 0.6, 0]} m={M.ink} />
      <mesh position={[0, 1 + h / 2, 0]} material={M.leaf} castShadow>
        <coneGeometry args={[h * 0.17, h, 6]} />
      </mesh>
    </group>
  );
}
function Round({ x, z, r = 2.2 }: { x: number; z: number; r?: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box s={[0.28, 2.2, 0.28]} p={[0, 1.1, 0]} m={M.ink} />
      <mesh position={[0, 2.2 + r * 0.8, 0]} material={M.leafLight} castShadow>
        <icosahedronGeometry args={[r, 0]} />
      </mesh>
    </group>
  );
}

export function Trees() {
  return (
    <group>
      <Box s={[14, 0.1, 8]} p={[0, 0.05, 0]} m={M.grass} />
      <Cypress x={-4.5} z={-1} h={7.5} />
      <Cypress x={-2.6} z={1.5} h={6} />
      <Round x={1} z={-1.2} r={2.3} />
      <Round x={4.6} z={1.2} r={1.7} />
      <Cypress x={5.6} z={-2} h={8} />
    </group>
  );
}

/* ------------------------------------------------------------------ diorama */

/** A stretch of the main straight with everything above in place. */
export function Diorama({ night }: Night) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={M.grass} receiveShadow>
        <planeGeometry args={[140, 110]} />
      </mesh>
      {/* the straight: asphalt, paper edge lines, kerbs at the start of the corner */}
      <Box s={[90, 0.05, 12]} p={[0, 0.025, 0]} m={M.asphalt} />
      {[-5.6, 5.6].map((z) => (
        <Box key={z} s={[90, 0.053, 0.2]} p={[0, 0.03, z]} m={M.paper} />
      ))}
      <group position={[30, 0, -6]}>
        <KerbEdge len={14} />
      </group>
      {/* pit side: wall and fence, the garages behind */}
      <group position={[0, 0, 7.4]}>
        <WallFence len={60} />
      </group>
      <Box s={[64, 0.05, 6]} p={[0, 0.025, 11.5]} m={M.asphalt} />
      <group position={[-4, 0, 22]} rotation={[0, Math.PI, 0]}>
        <Garage night={night} />
      </group>
      {/* far side: gravel, TecPro, the grandstand */}
      <Box s={[70, 0.04, 6]} p={[0, 0.02, -9.5]} m={M.gravel} />
      <group position={[-2, 0, -13.2]}>
        <TecPro n={22} />
      </group>
      <group position={[-2, 0, -17]} rotation={[0, 0, 0]}>
        <Grandstand len={26} />
      </group>
      {/* gantry over the start line, floodlights along the far side */}
      <group position={[-22, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Gantry night={night} />
      </group>
      {[-30, -10, 22, 40].map((x) => (
        <group key={x} position={[x, 0, -12]} rotation={[0, 0, 0]}>
          <Floodlight night={night} />
        </group>
      ))}
      {/* the car on the straight, town and trees beyond */}
      <group position={[6, 0, -1.8]} rotation={[0, -Math.PI / 2, 0]}>
        <Car />
      </group>
      <group position={[40, 0, -34]} scale={1}>
        <Town />
      </group>
      <group position={[-40, 0, -30]}>
        <Trees />
      </group>
      <group position={[52, 0, 28]}>
        <Trees />
      </group>
    </group>
  );
}
