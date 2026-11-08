"use client";

// Garage · Teardown (the owner's pick, 2026-11-07): a bay is a drafting studio. One project
// stands on a drafting table; once you're in, it comes apart into its parts like an exploded
// engineering drawing (explode.ts), the parts sliding out along the object's axes one after
// another, then callouts draw in: a dot, a leader line, a label with a part number and a line
// of the datasheet (hover or click one and the datasheet marks that line). ← → puts it back
// together, lowers it through the table's hatch, raises the next one and takes that apart. The
// back wall carries the project's own drawings, made from its geometry (sheets.ts): the general
// arrangement, an exploded isometric and the parts list, wiped over when the project changes.
//
// One state machine runs it (`td`, stepped once a frame after the objects' own animation): what
// is on the table, how far up it is (h), how far apart (e), how far the callouts are drawn (c).
// Input only moves the target; the machine gets there in order (callouts in, together, down,
// swap, up, apart, callouts out), so nothing overlaps and nothing is left half done.
//
// Shared by the game (garage/GarageShow.tsx) and the docs mock (/docs/brand/world#garage).
// Bay frame (garage/anim.ts): x across the door, y up, +z out of the door, back wall at BACK_Z.
// The room is the world's own kit parts and materials (kit/builtShared.ts), merged per
// material: a few draw calls a bay.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Kit, partMeshes, type Parts } from "../../kit/builtShared";
import { CI } from "../../buildings/concrete";
import { ProjectObject } from "../../models/projects";
import { BACK_Z, type Item } from "../anim";
import { MAX_LABELS, analyse, applyRig, calloutsOf, partProgress, type Callout, type Rig } from "./explode";
import { drawGA, drawIso, drawParts, fonts } from "./sheets";

/** The drafting table: centre z, top height, half size; how big an object stands on it. */
export const TZ = -0.95;
export const TOP = 0.46;
const HALF = 0.92;
const FIT = 1.3;
/** The camera's angle above the table (radians) and its lens. */
export const VIEW = { el: 0.26, az: -0.62, fov: 36 };
/** Callout label width (px), wide and on a phone. */
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
  /** bay-frame points of the callout parts, and what the camera fits */
  anchors: THREE.Vector3[];
  centre: THREE.Vector3;
  across: number;
  up: number;
  /** the wall drawings' wipe: 0..1 covering, 1..2 uncovering; redrawn at 1 */
  wipe: number;
  pending: boolean;
  /** dev: what the stress test checks */
  bad: string[];
};
export const td: TD = { shown: null, target: null, h: 0, e: 0, c: 0, rig: null, callouts: [], anchors: Array.from({ length: MAX_LABELS }, () => new THREE.Vector3()), centre: new THREE.Vector3(0, 1, TZ), across: 1, up: 1, wipe: 2, pending: false, bad: [] };

declare global {
  interface Window {
    /** Dev only: the teardown's state, and holds for stills (`hold: { e, h, c }`). */
    __teardown?: { state: () => object; hold: Partial<Record<"e" | "h" | "c", number>> };
  }
}
const dev = process.env.NODE_ENV !== "production";

/* ------------------------------------------------------------------ the room */

/** The table, its datum ring and ticks, two lamps, floor tape and the sheets' backings, merged per material. */
let roomParts: Parts | null = null;
function room() {
  if (roomParts) return roomParts;
  const k = new Kit();
  // the table: a concrete pedestal, a paper top on an ink edge
  k.box("concrete", [HALF * 2 - 0.1, TOP - 0.05, HALF * 2 - 0.1], [0, (TOP - 0.05) / 2, TZ]);
  k.box("ink", [HALF * 2 + 0.012, 0.014, HALF * 2 + 0.012], [0, TOP - 0.047, TZ]);
  k.box("paper", [HALF * 2, 0.04, HALF * 2], [0, TOP - 0.02, TZ]);
  // the datum ring and its ticks, the zero tick orange
  k.add("ink", new THREE.RingGeometry(0.74, 0.752, 72), [0, TOP + 0.002, TZ], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    k.box(i === 9 ? "orange" : "ink", [i % 9 === 0 ? 0.07 : 0.035, 0.002, 0.008], [Math.cos(a) * 0.775, TOP + 0.002, TZ + Math.sin(a) * 0.775], [0, -a, 0]);
  }
  // two drafting lamps clamped to the back corners, heads aimed at the middle
  for (const s of [-1, 1]) {
    k.at([s * (HALF - 0.1), TOP, TZ - HALF + 0.1], s * Math.PI * 0.75 * -1, () => {
      k.box("ink", [0.12, 0.04, 0.12], [0, 0.02, 0]);
      k.bar("ink", [0, 0.04, 0], [0, 0.66, -0.22], 0.024);
      k.bar("ink", [0, 0.66, -0.22], [0, 0.56, 0.3], 0.024);
      k.add("ink", new THREE.CylinderGeometry(0.05, 0.12, 0.14, 12, 1, true), [0, 0.5, 0.33], [0.9, 0, 0]);
      k.add("lens", new THREE.CircleGeometry(0.104, 16), [0, 0.46, 0.37], [0.9 + Math.PI / 2, 0, 0]);
    });
  }
  // floor tape round the table, a datum cross with an orange dot in front of it
  for (const s of [-1, 1]) {
    k.box("ink", [3.4, 0.002, 0.04], [0, 0.004, TZ + s * 1.7]);
    k.box("ink", [0.04, 0.002, 3.4], [s * 1.7, 0.004, TZ]);
  }
  k.box("ink", [0.3, 0.002, 0.025], [0, 0.005, TZ + 2.0]);
  k.box("ink", [0.025, 0.002, 0.3], [0, 0.005, TZ + 2.0]);
  k.cyl("orange", 0.035, 0.035, 0.003, [0, 0.006, TZ + 2.0], 16);
  // the sheets' ink backings and clips on the back wall
  for (const [x, y, w, h] of SHEETS_AT) {
    k.box("ink", [w, h, 0.006], [x + 0.025, y - 0.025, BACK_Z + 0.03]);
    // blank paper (a shut bay's sheet; the drawn studio's drawings go just in front)
    k.box("paper", [w, h, 0.004], [x, y, BACK_Z + 0.036]);
    for (const s of [-1, 1]) k.box("ink", [0.1, 0.05, 0.02], [x + s * (w / 2 - 0.12), y + h / 2 - 0.01, BACK_Z + 0.05]);
  }
  roomParts = k.build();
  return roomParts;
}
/** The three drawings on the back wall: x, y, width, height (exploded isometric, general arrangement, parts list). */
const SHEETS_AT: [number, number, number, number][] = [
  [-2.95, 2.45, 1.95, 1.36],
  [0.15, 2.4, 3.7, 2.29],
  [2.95, 2.3, 1.2, 1.7],
];

/** A ruler strip's face: paper, mm ticks, a figure every 10 cm. */
let ruler: THREE.Texture | null = null;
function rulerTex() {
  if (ruler) return ruler;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = CI.paper;
  g.fillRect(0, 0, 1024, 64);
  g.fillStyle = CI.ink;
  for (let i = 0; i <= 200; i++) g.fillRect((i / 200) * 1024, 0, 1.5, i % 10 === 0 ? 30 : i % 5 === 0 ? 20 : 11);
  g.font = "500 18px monospace";
  for (let i = 0; i <= 20; i += 2) g.fillText(String(i * 10), (i / 20) * 1024 + 4, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return (ruler = t);
}
let rulersGeo: THREE.BufferGeometry | null = null;
function rulers() {
  if (rulersGeo) return rulersGeo;
  const a = new THREE.BoxGeometry(HALF * 2 - 0.1, 0.008, 0.07).translate(0, TOP + 0.004, TZ + HALF - 0.05);
  const b = new THREE.BoxGeometry(HALF * 2 - 0.1, 0.008, 0.07).rotateY(Math.PI / 2).translate(-HALF + 0.05, TOP + 0.004, TZ);
  return (rulersGeo = mergeGeometries([a, b])!);
}
let rulerMat: THREE.Material | null = null;
const rulerMaterial = () => (rulerMat ??= new THREE.MeshStandardMaterial({ map: rulerTex(), roughness: 0.7 }));

/* ------------------------------------------------------------------ the wall drawings */

type Sheet = { tex: THREE.CanvasTexture; c: HTMLCanvasElement; mat: THREE.MeshStandardMaterial };
type Sheets = { iso: Sheet; ga: Sheet; parts: Sheet };
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
  return { tex, c, mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.18 }) };
}
/** The drawings, made once in the browser and kept (one studio is drawn at a time). */
let SHEETS: Sheets | null = null;
const sheetsOf = () => (SHEETS ??= { iso: makeSheet(1400, 976), ga: makeSheet(2048, 1268), parts: makeSheet(720, 1020) });
/** The wipes' paper masks, one per drawing (only the drawn studio has them). */
const MASKS: (THREE.Mesh | null)[] = [];

/**
 * The studio round the table: the merged room, the rulers, and the three sheets on the back
 * wall, drawn with the project (`drawings`) or blank paper (a bay nobody is in).
 */
export function Studio({ drawings }: { drawings: boolean }) {
  const sheets = drawings ? sheetsOf() : null;
  const keys = ["iso", "ga", "parts"] as const;
  return (
    <>
      {/* under the building's roof: the room takes the light but casts no sun shadows */}
      {partMeshes(room()).map((m) => (
        <mesh key={m.key} geometry={m.geometry} material={m.material} receiveShadow />
      ))}
      <mesh geometry={rulers()} material={rulerMaterial()} receiveShadow />
      {sheets &&
        SHEETS_AT.map(([x, y, w, h], i) => (
          <group key={i} position={[x, y, BACK_Z + 0.042]}>
            <mesh material={sheets[keys[i]].mat}>
              <planeGeometry args={[w, h]} />
            </mesh>
            <mesh ref={(m) => void (MASKS[i] = m)} position={[0, 0, 0.004]} visible={false}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial color="#f6f5f0" />
            </mesh>
          </group>
        ))}
    </>
  );
}

/* ------------------------------------------------------------------ an object on the table */

const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
/** How big an object stands on the table: its assembled size fitted to FIT. */
const fitScale = (box: THREE.Box3) => THREE.MathUtils.clamp(FIT / (box.getSize(new THREE.Vector3()).length() / 2 || 0.5), 1.0, 2.8);

/** A project standing whole on the table, sized as the machine sizes it (a bay nobody is in). */
export function Standing({ item }: { item: Item }) {
  const g = useRef<THREE.Group>(null);
  useEffect(() => {
    const o = g.current;
    if (!o) return;
    o.scale.setScalar(1);
    o.updateWorldMatrix(true, true);
    const inv = o.matrixWorld.clone().invert();
    const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv);
    if (!b.isEmpty()) o.scale.setScalar(fitScale(b));
  }, [item]);
  return (
    <group ref={g} position={[0, TOP, TZ]}>
      <ProjectObject slug={item.p.slug} />
    </group>
  );
}

/**
 * The garage's projects and the machine that runs them, plus the hatch. Mounted with the
 * garage's list (key it by the projects, so a new garage mounts a new one; the list array may be
 * new every render and must not reset anything), the machine after the objects so it runs after
 * their own animation each frame. `up` starts it with the first project already standing (it was
 * on show while the bay was shut); `inside` and `drive` say whether to take it apart.
 */
export function Table({ list, sel, inside, drive, up = false }: { list: Item[]; sel: number; inside: boolean; drive: { readonly current: number }; up?: boolean }) {
  const roots = useRef<Map<string, THREE.Group>>(new Map());
  const rigs = useRef<Map<string, Rig>>(new Map());
  const hatch = useRef<THREE.Group>(null!);
  const hatchMat = useRef<THREE.MeshBasicMaterial>(null!);
  const [col] = useState(() => ({ ink: new THREE.Color(CI.ink), or: new THREE.Color(CI.orange) }));

  useEffect(() => {
    td.shown = null;
    td.rig = null;
    td.h = up ? 1 : 0;
    td.e = td.c = 0;
    td.wipe = 2;
    td.pending = false;
    if (dev)
      window.__teardown = {
        hold: {},
        state: () => {
          const bad = td.bad.splice(0);
          return { shown: td.shown, target: td.target, h: +td.h.toFixed(3), e: +td.e.toFixed(3), c: +td.c.toFixed(3), wipe: +td.wipe.toFixed(2), parts: td.rig?.parts.length ?? 0, labels: td.callouts.length, bad: [...new Set(bad)].slice(0, 8) };
        },
      };
    return () => {
      td.shown = null;
      td.rig = null;
      td.c = 0;
      td.callouts = [];
      if (dev) delete window.__teardown;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redraw = () => {
    const it = list.find((x) => x.p.slug === td.shown);
    const root = it && roots.current.get(it.p.slug);
    if (!it || !td.rig || !root) return;
    const f = fonts();
    const sh = sheetsOf();
    drawIso(sh.iso.c.getContext("2d")!, sh.iso.c.width, sh.iso.c.height, td.rig, it, f);
    drawGA(sh.ga.c.getContext("2d")!, sh.ga.c.width, sh.ga.c.height, td.rig, it, root.scale.x, f);
    drawParts(sh.parts.c.getContext("2d")!, sh.parts.c.width, sh.parts.c.height, td.rig, it, td.callouts, f);
    for (const s of [sh.iso, sh.ga, sh.parts]) s.tex.needsUpdate = true;
  };
  // the fonts may land after the first drawing
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && redraw());
    return () => void (live = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Puts `slug` on the table: read it (once), size it, its callouts, the drawings. */
  const putOn = (slug: string, wipe: boolean) => {
    const root = roots.current.get(slug);
    const it = list.find((x) => x.p.slug === slug);
    if (!root || !it) return;
    let rig = rigs.current.get(slug);
    if (!rig) {
      root.position.set(0, TOP, TZ);
      root.scale.setScalar(1);
      root.updateWorldMatrix(true, true);
      rig = analyse(root, slug);
      rigs.current.set(slug, rig);
      root.scale.setScalar(fitScale(rig.box));
    }
    td.shown = slug;
    td.rig = rig;
    td.callouts = calloutsOf(it, rig.labels.length);
    if (wipe) {
      td.wipe = 0;
      td.pending = true;
    } else redraw();
  };

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1);
    const k = drive.current;
    const want = list[Math.min(sel, list.length - 1)]?.p.slug ?? null;
    td.target = want;
    if (!td.shown && want) putOn(want, false);
    const apart = inside && k > 0.92;
    if (td.shown !== want) {
      // leave in order: callouts, together, down; then the swap
      if (td.c > 0) td.c = Math.max(0, td.c - dt * 8);
      else if (td.e > 0) td.e = Math.max(0, td.e - dt / 0.26);
      else if (td.h > 0) td.h = Math.max(0, td.h - dt / 0.2);
      else if (want) putOn(want, true);
    } else if (td.h < 1) {
      td.e = 0;
      td.c = 0;
      td.h = Math.min(1, td.h + dt / 0.24);
    } else if (apart) {
      if (td.e < 1) td.e = Math.min(1, td.e + dt / 0.8);
      else td.c = Math.min(1, td.c + dt / 0.55);
    } else if (td.c > 0) td.c = Math.max(0, td.c - dt * 8);
    else td.e = Math.max(0, td.e - dt / 0.3);
    if (dev && window.__teardown) {
      const hold = window.__teardown.hold;
      if (hold.h !== undefined) td.h = hold.h;
      if (hold.e !== undefined) td.e = hold.e;
      if (hold.c !== undefined) td.c = hold.c;
    }

    // the drawings' wipe: cover, redraw, uncover
    if (td.wipe < 2) {
      td.wipe = Math.min(2, td.wipe + dt / 0.3);
      if (td.pending && td.wipe >= 1) {
        td.pending = false;
        redraw();
      }
    }
    MASKS.forEach((m, i) => {
      if (!m) return;
      const w = td.wipe;
      m.visible = w < 2;
      const cover = w < 1 ? ease(w) : 1 - ease(w - 1);
      const geoW = SHEETS_AT[i][2];
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
    if (!rig || !root) return;
    const s = root.scale.x;
    const foot = rig.box.getSize(new THREE.Vector3()).multiplyScalar(s);
    hatch.current.scale.set(Math.min(1.5, foot.x + 0.12), 1, Math.min(1.5, foot.z + 0.12));
    hatchMat.current.color.copy(td.h > 0 && td.h < 1 ? col.or : col.ink);
    // the camera's fit and the callouts' anchors (bay frame), from the exploded bounds
    const b = rig.apart;
    td.centre.set(((b.min.x + b.max.x) / 2) * s, TOP + ((b.min.y + b.max.y) / 2) * s * Math.max(0.6, h), TZ + ((b.min.z + b.max.z) / 2) * s);
    const ext = b.getSize(new THREE.Vector3()).multiplyScalar(s);
    td.across = Math.hypot(ext.x, ext.z) / 2;
    td.up = (ext.y * Math.cos(VIEW.el) + Math.hypot(ext.x, ext.z) * Math.sin(VIEW.el)) / 2;
    const n = rig.parts.reduce((m, p) => Math.max(m, p.order), 0);
    const parentInv = root.parent ? new THREE.Matrix4().copy(root.parent.matrixWorld).invert() : null;
    root.updateWorldMatrix(true, false);
    rig.labels.forEach((pi, j) => {
      const p = rig.parts[pi];
      const kk = p.order === 0 ? 0 : partProgress(td.e, p.order, n);
      root.localToWorld(td.anchors[j].copy(p.centre).addScaledVector(p.off, kk));
      if (parentInv) td.anchors[j].applyMatrix4(parentInv);
    });
    for (let j = rig.labels.length; j < MAX_LABELS; j++) td.anchors[j].set(0, -50, 0);
    if (dev && td.e === 0) for (const p of rig.parts) if (p.node.position.distanceToSquared(p.base) > 1e-8) td.bad.push(`part off home ${rig.slug}`);
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

/* ------------------------------------------------------------------ the camera */

/**
 * The stand-in's way into the bay (mock: from the pit lane, straight through the door), ending
 * parked aside by the table, nose to the back wall, out of the drawing view.
 */
export const PARK = new THREE.Vector3(2.55, 0, 1.85);
export const PARK_WAY = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, 8.8), new THREE.Vector3(0, 0, 4.6), new THREE.Vector3(1.0, 0, 2.6), PARK.clone());

/**
 * The drawing view (bay frame), fitted to the object on the table as the camera sees it, for a
 * picture `aspect` wide and `width` px (labels take some of it). `state.dist` and `state.look`
 * ease toward the fit; `t` is the clock, for a slow walk round the table.
 */
export function teardownView(out: { pos: THREE.Vector3; look: THREE.Vector3 }, state: { dist: number; look: THREE.Vector3 }, aspect: number, width: number, t: number, dt: number) {
  const lw = width < 560 ? LABEL_W.narrow : LABEL_W.wide;
  const room = THREE.MathUtils.clamp(1 - (1.1 * (lw + 20)) / Math.max(1, width), 0.62, 1);
  const tanV = Math.tan(THREE.MathUtils.degToRad(VIEW.fov / 2));
  const want = Math.max((td.across * 1.06) / (tanV * aspect * room), (td.up * 1.1) / tanV);
  const d = Math.min(dt, 0.1);
  if (Number.isFinite(want)) state.dist = THREE.MathUtils.damp(state.dist, THREE.MathUtils.clamp(want, 1.6, 6.5), 3, d);
  state.look.lerp(td.centre, 1 - Math.exp(-4 * d));
  const az = VIEW.az + Math.sin(t * 0.17) * 0.07;
  out.pos.set(state.look.x + Math.sin(az) * Math.cos(VIEW.el) * state.dist, state.look.y + Math.sin(VIEW.el) * state.dist, state.look.z + Math.cos(az) * Math.cos(VIEW.el) * state.dist);
  out.look.copy(state.look);
  return out;
}

/** Where the callouts' parts are on screen: x, y as 0..1 of the picture, `on` if in front. */
export const screen = { pts: Array.from({ length: MAX_LABELS }, () => ({ x: 0, y: 0, on: false })) };
const pv = new THREE.Vector3();
/** Projects the anchors (bay frame, placed by `toWorld`) through the camera. */
export function projectCallouts(cam: THREE.Camera, toWorld?: THREE.Vector3) {
  td.anchors.forEach((a, i) => {
    pv.copy(a);
    if (toWorld) pv.add(toWorld);
    pv.project(cam);
    const s = screen.pts[i];
    s.x = (pv.x + 1) / 2;
    s.y = (1 - pv.y) / 2;
    s.on = a.y > -10 && pv.z < 1 && pv.z > -1;
  });
}

/* ------------------------------------------------------------------ the callouts */

/** Marks the datasheet line a callout stands for (the sheet is #garage-sheet). */
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

/** The highlight the datasheet's marked line gets. */
export const FOCUS_CSS = ".gx-focus{outline:2px solid #ff4f00;outline-offset:3px;background:#fff3ec;transition:background .2s}";

/**
 * The callouts. Each runs from its part to a label in a column on the part's side; columns stay
 * inside the picture (`region`, px in the overlay's box: the 3D cell in the mock, the part of
 * the screen the garage's sheet leaves in the game), labels never overlap (a column that can't
 * fit them all drops its smallest parts' labels). They draw in one after another once the parts
 * have settled: the dot, the leader, then the label wipes open. `screen` points are 0..1 of
 * the overlay's box. Hover or click one to mark its line in the datasheet.
 */
export function TeardownCallouts({ inside, region, fixed = false }: { inside: boolean; region?: (W: number, H: number) => { x: number; y: number; w: number; h: number }; fixed?: boolean }) {
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
      const R = region ? region(W, H) : { x: 0, y: 0, w: W, h: H };
      const lw = R.w < 560 ? LABEL_W.narrow : LABEL_W.wide;
      const n = td.callouts.length;
      const top = R.y + 44, bottom = R.y + R.h - 62;
      const pts = screen.pts.slice(0, n).map((p, j) => ({ x: p.x * W, y: p.y * H, on: p.on && p.x * W > R.x && p.x * W < R.x + R.w && p.y * H > R.y && p.y * H < R.y + R.h, j }));
      const place: ({ x: number; y: number; side: "l" | "r" } | null)[] = Array(MAX_LABELS).fill(null);
      for (const side of ["l", "r"] as const) {
        let col = pts.filter((p) => p.on && (side === "l" ? p.x < R.x + R.w / 2 : p.x >= R.x + R.w / 2)).sort((a, b) => a.y - b.y);
        const fit = Math.max(1, Math.floor((bottom - top) / (LH + 6)));
        if (col.length > fit) col = col.sort((a, b) => a.j - b.j).slice(0, fit).sort((a, b) => a.y - b.y);
        // greedy down, then back up from the bottom, so the stack stays inside
        const ys = col.map((p) => Math.min(bottom - LH, Math.max(top, p.y - LH / 2)));
        for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + LH + 6);
        for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.max(top, Math.min(ys[i], i === ys.length - 1 ? bottom - LH : ys[i + 1] - LH - 6));
        col.forEach((p, i) => (place[p.j] = { x: side === "l" ? R.x + 12 : R.x + R.w - 12 - lw, y: ys[i], side }));
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
            dot.setAttribute("cx", p.x.toFixed(1));
            dot.setAttribute("cy", p.y.toFixed(1));
          }
        }
        if (path) {
          if (on) {
            const lx = q.side === "l" ? q.x + lw : q.x;
            const ly = q.y + LH / 2;
            const ex = q.side === "l" ? Math.max(lx + 14, p.x - 26) : Math.min(lx - 14, p.x + 26);
            path.setAttribute("d", `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${ex.toFixed(1)} ${ly.toFixed(1)}L${lx.toFixed(1)} ${ly.toFixed(1)}`);
            const len = Math.hypot(ex - p.x, ly - p.y) + Math.abs(lx - ex);
            path.style.strokeDasharray = `${len}`;
            path.style.strokeDashoffset = String(len * (1 - Math.min(1, Math.max(0, (k - 0.15) / 0.5))));
            path.style.opacity = "1";
          } else path.style.opacity = "0";
        }
        if (dev && q && on) {
          if (q.x < R.x - 0.5 || q.x + lw > R.x + R.w + 0.5 || q.y < R.y - 0.5 || q.y + LH > R.y + R.h + 0.5) td.bad.push("label outside the picture");
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
  }, [inside, region]);
  useEffect(() => markSheet(labels[focus]), [focus, labels]);
  useEffect(() => () => markSheet(undefined), []);
  return (
    <div ref={box} className={`pointer-events-none ${fixed ? "fixed" : "absolute"} inset-0 z-[24] overflow-hidden`}>
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
