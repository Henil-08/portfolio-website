"use client";

// 02 · Teardown (the owner's pick, 2026-11-07): the garage is a drafting studio. One project
// stands on a drafting table in the middle of the bay; once you're in, it comes apart into its
// parts like an exploded engineering drawing (teardown/explode.ts), the parts sliding out along
// the object's axes one after another, then callouts draw in, leader line first, each with a
// part number and a line of the datasheet (hover or click one and the datasheet beside marks
// that line). ← → puts it back together, lowers it through the table's hatch, raises the next
// one and takes that apart. The walls carry the project's own drawings, made from its geometry
// (teardown/sheets.ts): the general arrangement, an exploded isometric and the parts list, wiped
// over when the project changes.
//
// One state machine drives it all (`td`, run once a frame after the objects' own animation):
// what is on the table, how far up it is (h), how far apart (e), how far the callouts are drawn
// (c). Input only moves the target; the machine reaches it in order (callouts in, together,
// down, swap, up, apart, callouts out), so nothing overlaps and nothing is left half done.
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { ShowCar } from "@/components/world/garage/ShowCar";
import { Spot } from "@/components/world/garage/Bay";
import { BACK_Z, OUT_Z, useDrive, type Item } from "@/components/world/garage/anim";
import { ProjectObject } from "@/components/world/models/projects";
import { CI } from "@/components/world/buildings/concrete";
import { BayScene, OUTSIDE } from "./common";
import { blendIn, chaseOf, inOut, overlay, pose, seg, setPose } from "./shared";
import { MAX_LABELS, analyse, applyRig, calloutsOf, partProgress, type Callout, type Rig } from "./teardown/explode";
import { drawGA, drawIso, drawParts, fonts } from "./teardown/sheets";
import type { OverlayProps, SceneProps } from "./types";

/** The drafting table: centre z, top height, half size; the object's size on it. */
const TZ = -0.95;
const TOP = 0.46;
const HALF = 0.98;
const FIT = 1.18;
/** Label width in the overlay (px), wide and on a phone. */
export const LABEL_W = { wide: 176, narrow: 66 };

/* ------------------------------------------------------------------ the state */

type TD = {
  shown: string | null;
  target: string | null;
  h: number;
  e: number;
  c: number;
  rig: Rig | null;
  callouts: Callout[];
  /** world points of the callout parts, and the camera's fit */
  anchors: THREE.Vector3[];
  centre: THREE.Vector3;
  radius: number;
  across: number;
  up: number;
  /** the wall drawings' wipe: 0..1 covering, 1..2 uncovering; redrawn at 1 */
  wipe: number;
  pending: boolean;
  focus: number;
  /** dev: what the stress test checks */
  bad: string[];
};
export const td: TD = { shown: null, target: null, h: 0, e: 0, c: 0, rig: null, callouts: [], anchors: Array.from({ length: MAX_LABELS }, () => new THREE.Vector3()), centre: new THREE.Vector3(0, 1, TZ), radius: 1, across: 1, up: 1, wipe: 2, pending: false, focus: -1, bad: [] };

declare global {
  interface Window {
    /** Dev only: the teardown's state, and holds for stills (`hold: { e, h, c }`). */
    __teardown?: { state: () => object; hold: Partial<Record<"e" | "h" | "c", number>> };
  }
}
const dev = process.env.NODE_ENV !== "production";

/* ------------------------------------------------------------------ the wall drawings */

type Sheet = { tex: THREE.CanvasTexture; c: HTMLCanvasElement };
type Sheets = { ga: Sheet; iso: Sheet; parts: Sheet };
/** The three wall drawings, made once in the browser and kept (one teardown on the page at a time). */
let SHEETS: Sheets | null = null;
const sheetsOf = () => (SHEETS ??= { ga: makeSheet(2048, 1268), iso: makeSheet(1400, 976), parts: makeSheet(720, 1020) });
/** The wipes' paper masks, one per wall drawing. */
const MASKS: (THREE.Mesh | null)[] = [];
function makeSheet(w: number, h: number): Sheet {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f6f5f0";
  g.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, c };
}

/** A pinned sheet on the back wall: an ink backing, the drawing, two clips, and its wipe. */
function WallSheet({ sheet, w, h, at, maskRef }: { sheet: Sheet; w: number; h: number; at: [number, number, number]; maskRef: (m: THREE.Mesh | null) => void }) {
  return (
    <group position={at}>
      <mesh position={[0.025, -0.025, -0.006]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={CI.ink} />
      </mesh>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={sheet.tex} roughness={0.9} emissive="#ffffff" emissiveMap={sheet.tex} emissiveIntensity={0.18} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.12), h / 2 - 0.01, 0.012]}>
          <boxGeometry args={[0.1, 0.05, 0.02]} />
          <meshStandardMaterial color={CI.ink} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* the wipe: paper sweeping across, left to right */}
      <mesh ref={maskRef} position={[0, 0, 0.004]} visible={false}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#f6f5f0" />
      </mesh>
    </group>
  );
}

/** A ruler strip's face: paper with mm ticks and a figure every 10 cm. */
function rulerTex() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f3f2ed";
  g.fillRect(0, 0, 1024, 64);
  g.fillStyle = CI.ink;
  for (let i = 0; i <= 200; i++) {
    const x = (i / 200) * 1024;
    g.fillRect(x, 0, 1.5, i % 10 === 0 ? 30 : i % 5 === 0 ? 20 : 11);
  }
  g.font = "500 18px monospace";
  for (let i = 0; i <= 20; i += 2) g.fillText(String(i * 10), (i / 20) * 1024 + 4, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A drafting lamp clamped to the table: ink arms, a lit head aimed at the object. */
function Lamp({ at, yaw }: { at: [number, number, number]; yaw: number }) {
  const ink = <meshStandardMaterial color={CI.ink} roughness={0.5} metalness={0.3} />;
  return (
    <group position={at} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.12, 0.04, 0.12]} />
        {ink}
      </mesh>
      <mesh position={[0, 0.34, -0.12]} rotation={[0.38, 0, 0]}>
        <boxGeometry args={[0.025, 0.7, 0.025]} />
        {ink}
      </mesh>
      <mesh position={[0, 0.66, 0.08]} rotation={[-1.05, 0, 0]}>
        <boxGeometry args={[0.025, 0.56, 0.025]} />
        {ink}
      </mesh>
      <group position={[0, 0.5, 0.33]} rotation={[0.9, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.12, 0.14, 12, 1, true]} />
          <meshStandardMaterial color={CI.ink} roughness={0.5} metalness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.105, 16]} />
          <meshBasicMaterial color="#fff6e6" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/** The studio round the table: the table itself, its rulers and lamps, floor tape, the drawings. */
function Studio() {
  const sheets = sheetsOf();
  const ruler = useMemo(() => rulerTex(), []);
  const z = BACK_Z + 0.04;
  return (
    <>
      {/* the table: a concrete pedestal, a paper top with an ink edge, rulers on its two front edges */}
      <mesh position={[0, (TOP - 0.04) / 2, TZ]} castShadow receiveShadow>
        <boxGeometry args={[HALF * 2 - 0.1, TOP - 0.04, HALF * 2 - 0.1]} />
        <meshStandardMaterial color={CI.concrete} roughness={0.95} />
      </mesh>
      <mesh position={[0, TOP - 0.02, TZ]} receiveShadow>
        <boxGeometry args={[HALF * 2, 0.04, HALF * 2]} />
        <meshStandardMaterial color={CI.paper} roughness={0.75} />
      </mesh>
      <mesh position={[0, TOP - 0.045, TZ]}>
        <boxGeometry args={[HALF * 2 + 0.01, 0.012, HALF * 2 + 0.01]} />
        <meshStandardMaterial color={CI.ink} roughness={0.6} />
      </mesh>
      <mesh position={[0, TOP + 0.004, TZ + HALF - 0.05]}>
        <boxGeometry args={[HALF * 2 - 0.1, 0.008, 0.07]} />
        <meshStandardMaterial map={ruler} roughness={0.7} />
      </mesh>
      <mesh position={[-HALF + 0.05, TOP + 0.004, TZ]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[HALF * 2 - 0.1, 0.008, 0.07]} />
        <meshStandardMaterial map={ruler} roughness={0.7} />
      </mesh>
      {/* the turntable's ring and its index, the datum the drawings are measured from */}
      <mesh position={[0, TOP + 0.002, TZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 0.812, 72]} />
        <meshBasicMaterial color={CI.ink} />
      </mesh>
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.835, TOP + 0.002, TZ + Math.sin(a) * 0.835]} rotation={[-Math.PI / 2, 0, -a]}>
            <planeGeometry args={[i % 9 === 0 ? 0.07 : 0.035, 0.008]} />
            <meshBasicMaterial color={i === 9 ? CI.orange : CI.ink} />
          </mesh>
        );
      })}
      <Lamp at={[HALF - 0.12, TOP, TZ - HALF + 0.12]} yaw={-Math.PI * 0.75} />
      <Lamp at={[-HALF + 0.12, TOP, TZ - HALF + 0.12]} yaw={Math.PI * 0.75} />
      {/* floor tape round the table, corner marks, a datum mark in front */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, 0.004, TZ + s * 1.75]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.5, 0.04]} />
            <meshBasicMaterial color={CI.ink} />
          </mesh>
          <mesh position={[s * 1.75, 0.004, TZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.04, 3.5]} />
            <meshBasicMaterial color={CI.ink} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.005, TZ + 2.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.025]} />
        <meshBasicMaterial color={CI.ink} />
      </mesh>
      <mesh position={[0, 0.005, TZ + 2.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.025, 0.3]} />
        <meshBasicMaterial color={CI.ink} />
      </mesh>
      <mesh position={[0, 0.006, TZ + 2.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035, 16]} />
        <meshBasicMaterial color={CI.orange} />
      </mesh>
      {/* the drawings on the back wall: exploded isometric, general arrangement, parts list */}
      <WallSheet sheet={sheets.iso} w={1.95} h={1.36} at={[-2.95, 2.45, z]} maskRef={(m) => void (MASKS[0] = m)} />
      <WallSheet sheet={sheets.ga} w={3.7} h={2.29} at={[0.15, 2.4, z]} maskRef={(m) => void (MASKS[1] = m)} />
      <WallSheet sheet={sheets.parts} w={1.2} h={1.7} at={[2.95, 2.3, z]} maskRef={(m) => void (MASKS[2] = m)} />
    </>
  );
}

/* ------------------------------------------------------------------ the machine */

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/**
 * The objects and the machine that runs them. Mounted with the garage's list (a new list mounts
 * a new set), the machine after the objects so it runs after their own animation each frame.
 */
function Table({ list, sel, inside, drive }: { list: Item[]; sel: number; inside: boolean; drive: { readonly current: number } }) {
  const roots = useRef<Map<string, THREE.Group>>(new Map());
  const rigs = useRef<Map<string, Rig>>(new Map());
  const hatch = useRef<THREE.Group>(null!);
  const hatchMat = useRef<THREE.MeshBasicMaterial>(null!);
  const [orange] = useState(() => ({ ink: new THREE.Color(CI.ink), or: new THREE.Color(CI.orange) }));

  // a fresh table when it mounts (it is keyed by the garage's projects, so a new garage mounts a
  // new one; the list array itself is new on every render and must not reset anything)
  useEffect(() => {
    td.shown = null;
    td.rig = null;
    td.h = td.e = td.c = 0;
    td.wipe = 2;
    td.pending = false;
  }, []);

  const redraw = () => {
    const it = list.find((x) => x.p.slug === td.shown);
    if (!it || !td.rig) return;
    const f = fonts();
    const sheets = sheetsOf();
    const s = rigs.current.get(it.p.slug) ? roots.current.get(it.p.slug)!.scale.x : 1;
    for (const [sh, draw] of [
      [sheets.ga, (g: CanvasRenderingContext2D) => drawGA(g, sheets.ga.c.width, sheets.ga.c.height, td.rig!, it, s, f)],
      [sheets.iso, (g: CanvasRenderingContext2D) => drawIso(g, sheets.iso.c.width, sheets.iso.c.height, td.rig!, it, f)],
      [sheets.parts, (g: CanvasRenderingContext2D) => drawParts(g, sheets.parts.c.width, sheets.parts.c.height, td.rig!, it, td.callouts, f)],
    ] as const) {
      draw(sh.c.getContext("2d")!);
      sh.tex.needsUpdate = true;
    }
  };
  // the fonts may land after the first drawing
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && redraw());
    return () => void (live = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Puts `slug` on the table: read it (once), size it, its callouts, the drawings. */
  const mountOnTable = (slug: string, wipe: boolean) => {
    const root = roots.current.get(slug);
    const it = list.find((x) => x.p.slug === slug);
    if (!root || !it) return false;
    let rig = rigs.current.get(slug);
    if (!rig) {
      root.position.set(0, TOP, TZ);
      root.scale.setScalar(1);
      root.updateWorldMatrix(true, true);
      rig = analyse(root, slug);
      rigs.current.set(slug, rig);
      const r = rig.box.getSize(new THREE.Vector3()).length() / 2 || 0.5;
      root.scale.setScalar(THREE.MathUtils.clamp(FIT / r, 1.0, 2.6));
    }
    td.shown = slug;
    td.rig = rig;
    td.callouts = calloutsOf(it, rig.labels.length);
    td.focus = -1;
    if (wipe) {
      td.wipe = 0;
      td.pending = true;
    } else redraw();
    return true;
  };

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1);
    const k = drive.current;
    const want = list[Math.min(sel, list.length - 1)]?.p.slug ?? null;
    td.target = want;
    if (!td.shown && want) mountOnTable(want, false);
    const apart = inside && k > 0.92;
    if (td.shown !== want) {
      // leave in order: callouts, together, down; then the swap
      if (td.c > 0) td.c = Math.max(0, td.c - dt * 7);
      else if (td.e > 0) td.e = Math.max(0, td.e - dt / 0.28);
      else if (td.h > 0) td.h = Math.max(0, td.h - dt / 0.2);
      else if (want) mountOnTable(want, true);
    } else if (td.h < 1) {
      td.e = 0;
      td.c = 0;
      td.h = Math.min(1, td.h + dt / 0.24);
    } else if (apart) {
      if (td.e < 1) td.e = Math.min(1, td.e + dt / 0.85);
      else td.c = Math.min(1, td.c + dt / 0.6);
    } else if (td.c > 0) td.c = Math.max(0, td.c - dt * 7);
    else td.e = Math.max(0, td.e - dt / 0.3);
    if (dev && window.__teardown) {
      const hold = window.__teardown.hold;
      if (hold.h !== undefined) td.h = hold.h;
      if (hold.e !== undefined) td.e = hold.e;
      if (hold.c !== undefined) td.c = hold.c;
    }

    // the drawings' wipe: cover, redraw, uncover
    if (td.wipe < 2) {
      td.wipe = Math.min(2, td.wipe + dt / 0.32);
      if (td.pending && td.wipe >= 1) {
        td.pending = false;
        redraw();
      }
    }
    MASKS.forEach((m) => {
      if (!m) return;
      const w = td.wipe;
      m.visible = w < 2;
      const cover = w < 1 ? ease(w) : 1 - ease(w - 1);
      const geoW = (m.geometry as THREE.PlaneGeometry).parameters.width;
      m.scale.x = Math.max(0.001, cover);
      m.position.x = w < 1 ? -geoW / 2 + (geoW * cover) / 2 : geoW / 2 - (geoW * cover) / 2;
    });

    // the objects: only the one on the table shows, at its height, apart by e
    const h = ease(td.h);
    let vis = 0;
    roots.current.forEach((obj, slug) => {
      const on = slug === td.shown;
      obj.visible = on && td.h > 0.001;
      if (obj.visible) vis++;
      if (!on) return;
      const rig = rigs.current.get(slug);
      const tall = rig ? rig.box.max.y * obj.scale.y : 1.4;
      obj.position.set(0, TOP - (1 - h) * (tall + 0.06), TZ);
      if (rig) applyRig(rig, td.e);
    });
    if (dev && vis > 1) td.bad.push(`${vis} objects on the table`);
    // the hatch: an ink square round the footprint, orange while something passes through it
    const rig = td.rig;
    const root = td.shown ? roots.current.get(td.shown) : null;
    if (rig && root) {
      const sz = rig.box.getSize(new THREE.Vector3()).multiplyScalar(root.scale.x);
      hatch.current.scale.set(Math.min(1.6, sz.x + 0.12), 1, Math.min(1.6, sz.z + 0.12));
      hatchMat.current.color.lerpColors(orange.ink, orange.or, td.h > 0 && td.h < 1 ? 1 : 0);
      // the camera's fit and the callouts' anchors, from the exploded bounds
      const s = root.scale.x;
      const b = rig.apart;
      td.centre.set(((b.min.x + b.max.x) / 2) * s, TOP + ((b.min.y + b.max.y) / 2) * s * Math.max(0.6, h), TZ + ((b.min.z + b.max.z) / 2) * s);
      // how big it looks from the drawing view: across (the plan's diagonal) and up (its height
      // plus the depth the camera sees from above), halves
      const ext = b.getSize(new THREE.Vector3()).multiplyScalar(s);
      td.across = Math.hypot(ext.x, ext.z) / 2;
      td.up = (ext.y * Math.cos(0.27) + Math.hypot(ext.x, ext.z) * Math.sin(0.27)) / 2;
      td.radius = Math.max(td.across, td.up);
      const n = rig.parts.reduce((m, p) => Math.max(m, p.order), 0);
      root.updateWorldMatrix(true, false);
      rig.labels.forEach((pi, j) => {
        const p = rig.parts[pi];
        const kk = p.order === 0 ? 0 : partProgress(td.e, p.order, n);
        root.localToWorld(td.anchors[j].copy(p.centre).addScaledVector(p.off, kk));
      });
      for (let j = rig.labels.length; j < MAX_LABELS; j++) td.anchors[j].set(0, -50, 0);
      // dev: assembled means every part home
      if (dev && td.e === 0) for (const p of rig.parts) if (p.node.position.distanceToSquared(p.base) > 1e-8) td.bad.push(`part off home ${rig.slug}`);
    }
  });

  return (
    <>
      {list.map((it) => (
        <group
          key={it.p.slug}
          ref={(g) => {
            if (g) roots.current.set(it.p.slug, g);
            else roots.current.delete(it.p.slug);
          }}
          position={[0, TOP, TZ]}
          visible={false}
        >
          <ProjectObject slug={it.p.slug} active />
        </group>
      ))}
      <group ref={hatch} position={[0, TOP + 0.003, TZ]}>
        {(
          [
            [0, 0.5],
            [0, -0.5],
            [0.5, 0],
            [-0.5, 0],
          ] as const
        ).map(([x, z], i) => (
          <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[x ? 0.012 : 1, z ? 0.012 : 1]} />
            <meshBasicMaterial ref={i === 0 ? hatchMat : undefined} color={CI.ink} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ the scene */

/** The stand-in's way in: straight through the door, then aside to park by the table. */
const WAY = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, OUT_Z), new THREE.Vector3(0, 0, 4.6), new THREE.Vector3(1.0, 0, 2.6), new THREE.Vector3(2.55, 0, 1.85));

export default function Teardown({ v, livery, list, sel, inside, domain }: SceneProps) {
  const cam = useRef<THREE.PerspectiveCamera>(null!);
  const drive = useDrive(inside);
  const car = useRef<THREE.Group>(null);
  const inCab = useRef(false);
  const size = useThree((s) => s.size);
  const t = useRef({ chase: pose([0, 0, 0], [0, 0, 0], 46), view: pose([0, 0, 0], [0, 0, 0], 36), out: pose([0, 0, 0], [0, 0, 0], 36), dist: 4, p: new THREE.Vector3(), tan: new THREE.Vector3(), look: new THREE.Vector3(0, 1, TZ) });

  useEffect(() => {
    if (!dev) return;
    window.__teardown = {
      hold: {},
      state: () => {
        const bad = td.bad.splice(0);
        return { shown: td.shown, target: td.target, h: +td.h.toFixed(3), e: +td.e.toFixed(3), c: +td.c.toFixed(3), wipe: +td.wipe.toFixed(2), parts: td.rig?.parts.length ?? 0, labels: td.rig?.labels.length ?? 0, bad: [...new Set(bad)].slice(0, 8) };
      },
    };
    return () => {
      delete window.__teardown;
      td.shown = null;
      td.c = 0;
    };
  }, []);

  useFrame((s, dt) => {
    const c = t.current;
    const k = drive.current;
    // the stand-in: in through the door, aside to park by the table, wheels turning
    const g = car.current!;
    const u = inOut(seg(k, 0, 0.78));
    WAY.getPoint(u, c.p);
    WAY.getTangent(Math.min(0.999, Math.max(0.001, u)), c.tan);
    g.position.copy(c.p);
    g.rotation.y = Math.atan2(c.tan.x, c.tan.z);
    chaseOf(g.position, g.rotation.y, c.chase);
    // the drawing view: round the table from the front left, a little above, sized to the object
    const aspect = cam.current.aspect || 1;
    const lw = size.width < 560 ? LABEL_W.narrow : LABEL_W.wide;
    // labels stand at the cell's sides over the picture; keep the parts mostly clear of them
    const room = THREE.MathUtils.clamp(1 - (1.1 * (lw + 20)) / Math.max(1, size.width), 0.62, 1);
    const tanV = Math.tan(THREE.MathUtils.degToRad(36 / 2));
    const want = Math.max((td.across * 1.08) / (tanV * aspect * room), (td.up * 1.12) / tanV);
    c.dist = Number.isFinite(want) ? THREE.MathUtils.damp(c.dist, THREE.MathUtils.clamp(want, 1.8, 6.5), 3, Math.min(dt, 0.1)) : c.dist;
    c.look.lerp(td.centre, 1 - Math.exp(-4 * Math.min(dt, 0.1)));
    const az = -0.62 + Math.sin(s.clock.elapsedTime * 0.17) * 0.07;
    const el = 0.27;
    c.view.pos.set(c.look.x + Math.sin(az) * Math.cos(el) * c.dist, c.look.y + Math.sin(el) * c.dist, c.look.z + Math.cos(az) * Math.cos(el) * c.dist);
    c.view.look.copy(c.look);
    c.view.fov = 36;
    setPose(cam.current, blendIn(k, c.chase, c.view, c.out, 0.45, 0.35));
    inCab.current = false;
    // the callouts' anchors on screen for the overlay
    cam.current.updateMatrixWorld();
    project(cam.current);
    if (dev && !Number.isFinite(cam.current.position.x)) td.bad.push("camera NaN");
  });

  return (
    <>
      <PerspectiveCamera ref={cam} makeDefault position={OUTSIDE.pos.toArray()} fov={OUTSIDE.fov} near={0.03} far={160} />
      <BayScene domain={domain} lamp={11} />
      <Spot position={[0.9, 4.2, TZ + 2.2]} target={[0, 0.9, TZ]} angle={0.55} intensity={20} />
      <Studio />
      <Table key={list.map((x) => x.p.slug).join()} list={list} sel={sel} inside={inside} drive={drive} />
      <group ref={car} position={[0, 0, OUT_Z]} rotation={[0, Math.PI, 0]}>
        <ShowCar key={`${v.code}-${livery.name}`} v={v} livery={livery} root={car} inCab={inCab} />
      </group>
    </>
  );
}

const pv = new THREE.Vector3();
/** Writes the callout anchors' screen positions (0..1 of the cell) into the shared overlay store. */
function project(cam: THREE.Camera) {
  overlay.pts.length = MAX_LABELS;
  td.anchors.forEach((a, i) => {
    pv.copy(a).project(cam);
    overlay.pts[i] = { x: (pv.x + 1) / 2, y: (1 - pv.y) / 2, on: a.y > -10 && pv.z < 1 && pv.z > -1 };
  });
  overlay.tick++;
}

/* ------------------------------------------------------------------ the callouts */

/** Marks the datasheet line a callout stands for (the sheet column is #garage-sheet). */
function markSheet(c: Callout | undefined) {
  const box = document.getElementById("garage-sheet");
  if (!box) return;
  box.querySelectorAll(".gx-focus").forEach((el) => el.classList.remove("gx-focus"));
  if (!c) return;
  const hit = [...box.querySelectorAll("span")].find((el) => el.childElementCount === 0 && el.textContent?.trim() === c.key);
  const row = c.kind === "spec" ? hit?.parentElement : hit;
  if (!row) return;
  row.classList.add("gx-focus");
  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/**
 * The callouts over the 3D cell. Each runs from its part to a label in a column on the part's
 * side; columns are kept inside the cell, labels never overlap (a column that can't fit them all
 * drops its smallest parts' labels). They draw in one after another once the parts have
 * settled: the dot, the leader, then the label wipes open. Hover or click one to mark its line
 * in the datasheet.
 */
export function TeardownOverlay({ inside }: OverlayProps) {
  const box = useRef<HTMLDivElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const tags = useRef<(HTMLButtonElement | null)[]>([]);
  const [labels, setLabels] = useState<Callout[]>([]);
  const [focus, setFocus] = useState(-1);
  useEffect(() => {
    let raf = 0;
    let last = "";
    const LH = 40;
    const run = () => {
      raf = requestAnimationFrame(run);
      const key = td.callouts.map((l) => l.code + l.text).join();
      if (key !== last) {
        last = key;
        setLabels(td.callouts);
        setFocus(-1);
      }
      const el = box.current;
      if (!el) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      const lw = W < 560 ? LABEL_W.narrow : LABEL_W.wide;
      const n = td.callouts.length;
      const top = 44, bottom = H - 62;
      const pts = overlay.pts.slice(0, n).map((p, j) => ({ ...p, j }));
      const place: ({ x: number; y: number; side: "l" | "r" } | null)[] = Array(MAX_LABELS).fill(null);
      for (const side of ["l", "r"] as const) {
        let col = pts.filter((p) => p.on && (side === "l" ? p.x < 0.5 : p.x >= 0.5)).sort((a, b) => a.y - b.y);
        // too many for the column: keep the biggest parts (lowest index)
        const fit = Math.max(1, Math.floor((bottom - top) / (LH + 6)));
        if (col.length > fit) col = col.sort((a, b) => a.j - b.j).slice(0, fit).sort((a, b) => a.y - b.y);
        // greedy down, then back up from the bottom, so the stack stays inside
        const ys = col.map((p) => Math.min(bottom - LH, Math.max(top, p.y * H - LH / 2)));
        for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + LH + 6);
        for (let i = ys.length - 1; i >= 0; i--) {
          ys[i] = Math.min(ys[i], (i === ys.length - 1 ? bottom - LH : ys[i + 1] - LH - 6));
          ys[i] = Math.max(top, ys[i]);
        }
        col.forEach((p, i) => (place[p.j] = { x: side === "l" ? 12 : W - 12 - lw, y: ys[i], side }));
      }
      const c = inside ? td.c : 0;
      for (let j = 0; j < MAX_LABELS; j++) {
        const p = pts[j];
        const q = place[j];
        const path = paths.current[j];
        const dot = dots.current[j];
        const tag = tags.current[j];
        // each callout's own window inside c: dot, leader, label
        const k = Math.min(1, Math.max(0, c * (1 + 0.18 * (n - 1)) - 0.18 * j));
        const on = !!p && !!q && k > 0;
        if (dot) {
          dot.style.opacity = on ? String(Math.min(1, k * 4)) : "0";
          if (p) {
            dot.setAttribute("cx", (p.x * W).toFixed(1));
            dot.setAttribute("cy", (p.y * H).toFixed(1));
          }
        }
        if (path) {
          if (on) {
            const ax = p.x * W, ay = p.y * H;
            const lx = q.side === "l" ? q.x + lw : q.x;
            const ly = q.y + LH / 2;
            const ex = q.side === "l" ? Math.max(lx + 14, ax - 26) : Math.min(lx - 14, ax + 26);
            path.setAttribute("d", `M${ax.toFixed(1)} ${ay.toFixed(1)}L${ex.toFixed(1)} ${ly.toFixed(1)}L${lx.toFixed(1)} ${ly.toFixed(1)}`);
            const len = Math.hypot(ex - ax, ly - ay) + Math.abs(lx - ex);
            path.style.strokeDasharray = `${len}`;
            path.style.strokeDashoffset = String(len * (1 - Math.min(1, Math.max(0, (k - 0.15) / 0.5))));
            path.style.opacity = "1";
          } else path.style.opacity = "0";
        }
        if (dev && q && on) {
          // labels stay inside the cell and apart
          if (q.x < 0 || q.x + lw > W + 0.5 || q.y < 0 || q.y + LH > H + 0.5) td.bad.push("label outside the cell");
          for (let i = 0; i < j; i++) {
            const o = place[i];
            if (o && pts[i]?.on && o.side === q.side && Math.abs(o.y - q.y) < LH - 0.5) td.bad.push("labels overlap");
          }
        }
        if (tag) {
          const t2 = Math.min(1, Math.max(0, (k - 0.6) / 0.4));
          tag.style.visibility = on && t2 > 0 ? "visible" : "hidden";
          tag.style.width = `${lw}px`;
          if (q) tag.style.transform = `translate(${q.x}px, ${q.y}px)`;
          tag.style.clipPath = q?.side === "r" ? `inset(0 0 0 ${(1 - t2) * 100}%)` : `inset(0 ${(1 - t2) * 100}% 0 0)`;
          const txt = tag.lastElementChild as HTMLElement | null;
          if (txt) txt.style.display = lw < 100 ? "none" : "";
        }
      }
    };
    run();
    return () => cancelAnimationFrame(raf);
  }, [inside]);
  useEffect(() => markSheet(labels[focus]), [focus, labels]);
  useEffect(() => () => markSheet(undefined), []);
  return (
    <div ref={box} className="pointer-events-none absolute inset-0 z-[24] overflow-hidden">
      <svg className="absolute inset-0 h-full w-full">
        {Array.from({ length: MAX_LABELS }, (_, j) => (
          <path key={j} ref={(el) => void (paths.current[j] = el)} fill="none" stroke={j === focus ? "#ff4f00" : "#111"} strokeWidth={j === focus ? 2 : 1.25} style={{ opacity: 0 }} />
        ))}
        {Array.from({ length: MAX_LABELS }, (_, j) => (
          <circle key={j} ref={(el) => void (dots.current[j] = el)} r="4" fill="#ff4f00" stroke="#111" strokeWidth="1.2" style={{ opacity: 0 }} />
        ))}
      </svg>
      {Array.from({ length: MAX_LABELS }, (_, j) => (
        <button
          key={j}
          type="button"
          ref={(el) => void (tags.current[j] = el)}
          onMouseEnter={() => setFocus(j)}
          onFocus={() => setFocus(j)}
          onClick={() => setFocus((f) => (f === j ? -1 : j))}
          className={`pointer-events-auto absolute left-0 top-0 h-10 border-2 border-[#111] px-2 text-left shadow-[3px_3px_0_#111] ${j === focus ? "bg-[#111] text-white" : "bg-white"}`}
          style={{ visibility: "hidden" }}
        >
          <span className="font-mono block text-[10.5px] leading-tight text-[#ff4f00]">{labels[j]?.code}</span>
          <span className="block truncate text-[12px] font-semibold leading-tight">{labels[j]?.text}</span>
        </button>
      ))}
    </div>
  );
}
