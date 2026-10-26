"use client";

// Shared kit for the four vehicles, in the "Concrete & Ink" language: ink, paper, one orange.
// Procedural three.js in metres, noses toward +z, wheels on y = 0.
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Livery } from "./liveries";

export type V3 = [number, number, number];
export type P2 = [number, number];

export const INK = "#151515";
export const GRAPHITE = "#2b2c2e";
export const PAPER = "#f3f2ed";
export const ORANGE = "#ff4f00";

export const std = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

export const glow = (color: string, k = 2.4) => std(color, 0.3, 0, { emissive: color, emissiveIntensity: k, toneMapped: false });

export const M = {
  ink: std(INK, 0.55, 0.2),
  inkMatte: std(INK, 0.8),
  graphite: std(GRAPHITE, 0.6, 0.3),
  tyre: std("#101010", 0.9),
};

export const K = {
  silver: std("#c9c7c0", 0.32, 0.65),
  steel: std("#8d8c87", 0.4, 0.7),
  rim: std("#26272a", 0.45, 0.55),
  spoke: std("#8b8b87", 0.35, 0.6),
  /** tinted glass, a warm smoke like the roadster's canopy */
  smoke: std("#3b302b", 0.12, 0.35),
  shell: std("#e9e8e3", 0.34, 0.22),
  canopy: std("#151a1f", 0.1, 0.6),
  /** wheel-arch liners, seen from both sides */
  liner: std("#121212", 0.9, 0, { side: THREE.DoubleSide }),
  paperLine: std(PAPER, 0.7),
  lampWhite: std("#ffffff", 0.3, 0, { emissive: "#ffffff", emissiveIntensity: 2.2, toneMapped: false }),
  lampOrange: std(ORANGE, 0.3, 0, { emissive: ORANGE, emissiveIntensity: 2.4, toneMapped: false }),
};

/** The livery's materials, rebuilt when the livery changes and freed after. */
export function useMats(l: Livery, body: [number, number] = [0.55, 0.2]) {
  const [br, bm] = l.finish ?? body;
  const m = useMemo(
    () => ({
      body: std(l.body, br, bm),
      trim: std(l.trim, 0.6, 0.1),
      accent: std(l.accent, 0.5, 0.1),
      frame: std(l.frame ?? INK, 0.5, 0.3),
      spring: std(l.spring ?? ORANGE, 0.35, 0.45),
      lamp: glow(l.lamp ?? l.accent),
    }),
    [l, br, bm],
  );
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return m;
}

/* ------------------------------------------------------------------ the game's hooks into a model */

/**
 * The game hangs its own groups on each wheel through this context: `steer` moves with the
 * suspension and turns with the steering (it also carries `fixed` parts such as a bike's fork),
 * `swap` pops the tyre off and on in a tyre change, `spin` rolls it. Without a provider (the
 * docs turntables) the wheels simply sit at rest. `drs` is the TH-18's rear flap.
 */
export type VehicleRig = {
  steer: (i: number) => (el: THREE.Group | null) => void;
  swap: (i: number) => (el: THREE.Group | null) => void;
  spin: (i: number) => (el: THREE.Group | null) => void;
  drs: (el: THREE.Group | null) => void;
};
export const RigContext = createContext<VehicleRig | null>(null);
export const useRig = () => useContext(RigContext);

/** One wheel at p (its centre). `fixed` turns with the wheel but does not roll, in wheel-centre space. */
export function WheelSlot({ i, p, children, fixed }: { i: number; p: V3; children: ReactNode; fixed?: ReactNode }) {
  const rig = useRig();
  return (
    <group position={p}>
      <group ref={rig?.steer(i)}>
        <group ref={rig?.swap(i)}>
          <group ref={rig?.spin(i)}>{children}</group>
        </group>
        {fixed}
      </group>
    </group>
  );
}

/** Wheel layout for the game: centre (x, z) in model space, radius, steered or not. */
export type WheelSpec = { x: number; z: number; r: number; front: boolean };

/* ------------------------------------------------------------------ shapes */

/** `name` tags a part the game drives: "lamp" (brake light), "band" (tyre band, blue on wets). */
export function Box({ s, p, m, r, name }: { s: V3; p: V3; m: THREE.Material; r?: V3; name?: string }) {
  return (
    <mesh name={name} position={p} rotation={r} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

/** Text on a plane (codes, numbers), drawn to a canvas once. */
export function useLabel(text: string, { fg = INK, bg = PAPER, w = 256, h = 128, size = 72 } = {}) {
  const m = useMemo(() => {
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
  useEffect(
    () => () => {
      m.map?.dispose();
      m.dispose();
    },
    [m],
  );
  return m;
}

const unitTube = new THREE.CylinderGeometry(1, 1, 1, 10);
export const UP = new THREE.Vector3(0, 1, 0);

/** A round tube from a to b (frame members, arms, forks). */
export function Tube({ a, b, r = 0.022, m = M.ink }: { a: V3; b: V3; r?: number; m?: THREE.Material }) {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const mid = va.addScaledVector(dir, 0.5);
  return <mesh geometry={unitTube} position={mid.toArray()} quaternion={q} scale={[r, len, r]} material={m} castShadow />;
}

/** A flat strip of width w lying on a line from a to b in the centre plane (nose stripes). */
export function Strip({ a, b, w, m }: { a: V3; b: V3; w: number; m: THREE.Material }) {
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return <Box s={[w, 0.012, Math.hypot(dy, dz) + 0.01]} p={[0, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} r={[-Math.atan2(dy, dz), 0, 0]} m={m} />;
}

export const mx = (p: V3, s: number): V3 => [p[0] * s, p[1], p[2]];
export const SIDES = [1, -1] as const;

/** Linear interpolation through a table of [z, value] (any order). */
export function curve(table: P2[]) {
  const t = [...table].sort((a, b) => a[0] - b[0]);
  return (z: number) => {
    if (z <= t[0][0]) return t[0][1];
    for (let i = 1; i < t.length; i++) {
      if (z <= t[i][0]) {
        const k = (z - t[i - 1][0]) / (t[i][0] - t[i - 1][0]);
        return t[i - 1][1] + (t[i][1] - t[i - 1][1]) * k;
      }
    }
    return t[t.length - 1][1];
  };
}

export type Sec = { z: number; p: P2[] };

/**
 * A solid lofted through cross-sections along z, flat shaded (one normal per facet).
 * Each section is a half profile (x >= 0) from the bottom centre, out, up and back to the top
 * centre; it is mirrored to close the ring. With mirror = false, p is the whole ring, counter-
 * clockwise seen from +z. All sections need the same number of points.
 */
export function loft(secs: Sec[], { mirror = true, caps = true }: { mirror?: boolean; caps?: boolean } = {}) {
  const rings = secs.map(({ z, p }) => {
    const r: V3[] = p.map(([x, y]) => [x, y, z]);
    if (mirror) for (let i = p.length - 1; i >= 0; i--) r.push([-p[i][0], p[i][1], z]);
    return r;
  });
  const out: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const tri = (p: V3, q: V3, r: V3, flip: boolean) => {
    a.set(...p);
    b.set(...q).sub(a);
    c.set(...r).sub(a);
    if (b.cross(c).lengthSq() < 1e-12) return;
    if (flip) out.push(...p, ...r, ...q);
    else out.push(...p, ...q, ...r);
  };
  const flip = secs[secs.length - 1].z < secs[0].z;
  for (let s = 0; s < rings.length - 1; s++) {
    const r0 = rings[s];
    const r1 = rings[s + 1];
    for (let j = 0; j < r0.length; j++) {
      const k = (j + 1) % r0.length;
      tri(r0[j], r0[k], r1[k], flip);
      tri(r0[j], r1[k], r1[j], flip);
    }
  }
  if (caps) {
    for (const [ri, back] of [
      [0, secs[0].z < secs[secs.length - 1].z],
      [rings.length - 1, secs[secs.length - 1].z < secs[0].z],
    ] as const) {
      const ring = rings[ri].filter((p, i, arr) => {
        const q = arr[(i + 1) % arr.length];
        return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
      });
      const pts = ring.map(([x, y]) => new THREE.Vector2(x, y));
      for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(pts, [])) {
        const p = ring[i];
        const q = ring[j];
        const r = ring[k];
        const nz = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
        tri(p, q, r, back ? nz > 0 : nz < 0);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

/** Mirror a right-hand ring to the left, keeping it counter-clockwise. */
export const mirrorRing = (p: P2[]): P2[] => p.map(([x, y]): P2 => [-x, y]).reverse();

/** A flat plate from a side outline in (z, y), t thick, centred on x = 0 (endplates, struts, fins). */
export function plate(pts: P2[], t: number) {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  g.translate(0, 0, -t / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

/** A wing element across x: an aerofoil of chord c (leading edge +z), span w. */
export function aerofoil(c: number, th: number, w: number) {
  const h = c / 2;
  return plate(
    [
      [h, 0],
      [h * 0.75, th * 0.75],
      [h * 0.2, th],
      [-h * 0.6, th * 0.55],
      [-h, th * 0.1],
      [-h, 0],
      [-h * 0.2, -th * 0.2],
      [h * 0.75, -th * 0.25],
    ],
    w,
  );
}

/**
 * A tyre as a lathe: rounded shoulders, axis along y (rotate the parent to put it on x). The bore
 * is closed (an inner wall at the rim radius and a web across the middle), so it reads solid from
 * the front and back instead of hollow.
 */
export function tyreGeo(r: number, w: number, rim: number, round = 0.25) {
  const sh = Math.min(w, r - rim) * round;
  const pts = [
    new THREE.Vector2(rim, -w / 2),
    new THREE.Vector2(r - sh, -w / 2),
    new THREE.Vector2(r - sh * 0.3, -w / 2 + sh * 0.3),
    new THREE.Vector2(r, -w / 2 + sh),
    new THREE.Vector2(r, w / 2 - sh),
    new THREE.Vector2(r - sh * 0.3, w / 2 - sh * 0.3),
    new THREE.Vector2(r - sh, w / 2),
    new THREE.Vector2(rim, w / 2),
  ];
  const bore = new THREE.LatheGeometry([new THREE.Vector2(rim, -w / 2), new THREE.Vector2(rim, w / 2)], 40);
  const web = (a: number) => new THREE.CircleGeometry(rim, 40).rotateX(a);
  const parts = [new THREE.LatheGeometry(pts.reverse(), 40), bore, web(-Math.PI / 2), web(Math.PI / 2)];
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

/** The rotation that lays a +z-facing plane flat on a face with normal n, its text upright. */
export function faceQuat(n: THREE.Vector3) {
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const right = new THREE.Vector3().crossVectors(up, n);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n));
}

/** One coil spring, 1 m long along y, scaled to fit. */
export const springGeo = (() => {
  const pts: THREE.Vector3[] = [];
  const turns = 10;
  for (let i = 0; i <= turns * 16; i++) {
    const t = i / (turns * 16);
    pts.push(new THREE.Vector3(Math.cos(t * turns * Math.PI * 2) * 0.042, t - 0.5, Math.sin(t * turns * Math.PI * 2) * 0.042));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, 0.009, 5);
})();
