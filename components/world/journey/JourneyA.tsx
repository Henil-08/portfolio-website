// Journey A, "Pit straight": the career as one timed straight, west to east (left to right under
// the chase camera). A start line at the first date, a chequered line at today, the years as
// distance marks along the lane's near edge. Every role is a timing line across the lane with its
// code; cross it and the line lights orange and the role's pit board comes up over the pit wall
// on the far side, and it goes back down when the role ends (an ongoing role's board stays out,
// framed in orange). So the boards that are out are always the roles going on at that date.
// The four chapters (content/profile.ts story, the circuit's sectors S1 to S4) are gantries over
// the lane. A split sticker over the car says the date and the last line crossed.
//
// Footprint: lane x -17 to 4.2 along z = 3 (the garden's east-west spine), pit wall and boards
// to z = -2.4, apron to z = 5.4. 3.6 m longer at the west and 2.8 m at the east than the
// current terrace pad, over the garden path.
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { carState } from "../carState";
import { cardItem, chapterItem, glyphItem, type Item } from "./atlas";
import { CHAPTERS, ROLES, T_END, T_START, YEARS, activeAt, monthLabel, type Role } from "./data";
import { FLAT, MAT, boxAt, cardMaterial, dirty, flatAt, glyphMaterial, merge, nightGlow, progressMaterial, quadGeometry, setBox, setBoxEuler, setQuad, setRect, useAtlas, withS } from "./gl";
import { FOOT_A } from "./footprint";
import { STICKER_CSS } from "./sticker";

// ---------------------------------------------------------------- layout (world metres)

const Z = 3; // lane centre
const HALF = 1.8; // lane half width (3.6 m: 5.4 m real)
const X0 = -17; // lane ends
const X1 = 4.2;
const XT0 = -15.4; // first date (start line)
const XT1 = 2.4; // today (chequered line)
const PER = (XT1 - XT0) / (T_END - T_START); // metres a year
export const xOfA = (t: number) => XT0 + (t - T_START) * PER;
const tOfA = (x: number) => T_START + (x - XT0) / PER;

const APRON = FOOT_A;
const TOP = 0.055; // apron top
const LANE_TOP = 0.07; // asphalt top; the colliders' top too
const PAINT = 0.078; // paint on the asphalt
const WALL = { z: Z - HALF - 0.55, d: 0.3, h: 0.55 }; // pit wall: centre z, depth, height over the apron
// leaning back a little toward the chase camera (it looks down about 35 degrees)
const BOARD = { w: 1.8, h: 0.9, yaw: 0.12, lean: -0.42, z: WALL.z - 0.5 };
const ROWS = 4; // boards that would overlap stack up, like a timing tower
const ROW_LIFT = BOARD.h * Math.cos(BOARD.lean) + 0.08;
const GANTRY = { h: 3.0, zN: Z - HALF - 0.25, zS: Z + HALF + 0.3, boardH: 0.7 };

/** Rows: a board takes the first row whose last board ends before it starts. */
const EUL = new THREE.Euler(BOARD.lean, BOARD.yaw, 0, "YXZ");
/** From a board's bottom edge to its centre, and its facing. */
const UP = new THREE.Vector3(0, BOARD.h / 2, 0).applyEuler(EUL);
const NRM = new THREE.Vector3(0, 0, 1).applyEuler(EUL);

function rowsOf(roles: Role[]) {
  const end = Array.from({ length: ROWS }, () => -Infinity);
  return roles.map((r) => {
    const x = xOfA(r.start);
    let k = end.findIndex((e) => x > e + 0.08);
    if (k < 0) k = ROWS - 1;
    end[k] = x + BOARD.w;
    return k;
  });
}

// ---------------------------------------------------------------- static ground

/** The timing lines light up to the car's x. */
const LIT = { value: -1e3 };
const LIT_MAT = progressMaterial(LIT);

function Ground() {
  const paint = useMemo(() => {
    const g: THREE.BufferGeometry[] = [];
    // edge lines
    for (const s of [-1, 1]) g.push(flatAt(X1 - X0, 0.09, (X0 + X1) / 2, PAINT, Z + s * (HALF - 0.22)));
    // start line and today's line: two rows of paper squares (the ink is the asphalt)
    for (const x of [XT0, XT1]) {
      const n = 12;
      const q = (HALF * 2) / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) g.push(flatAt(q, q, x - q / 2 + (j - 0.5) * q, PAINT, Z - HALF + q * (i + 0.5)));
    }
    // year marks: a tick in from the near edge
    for (const y of YEARS) g.push(flatAt(0.07, 0.75, xOfA(y), PAINT, Z + HALF - 0.6));
    return merge(g);
  }, []);
  // timing lines, one per distinct start date; the lit copy shows behind the car
  const lines = useMemo(() => {
    const xs = [...new Set(ROLES.map((r) => xOfA(r.start).toFixed(3)))].map(Number);
    return merge(xs.map((x) => withS(flatAt(0.06, HALF * 2 - 0.9, x, PAINT, Z - 0.45), x)));
  }, []);
  useFrame(() => {
    const on = Math.abs(carState.pos.z - Z) < 8 && carState.pos.x > X0 - 4 && carState.pos.x < X1 + 4;
    LIT.value = on ? carState.pos.x : -1e3;
  });
  const wall = useMemo(() => merge([boxAt(X1 - X0, WALL.h, WALL.d, (X0 + X1) / 2, TOP + WALL.h / 2, WALL.z)]), []);
  // the wall's ink cap, and the slot behind it the boards come up out of
  const cap = useMemo(() => merge([boxAt(X1 - X0 + 0.02, 0.05, WALL.d + 0.02, (X0 + X1) / 2, TOP + WALL.h + 0.025, WALL.z), flatAt(X1 - X0, 0.16, (X0 + X1) / 2, TOP + 0.003, BOARD.z + 0.03)]), []);
  const w = APRON.maxX - APRON.minX;
  const d = APRON.maxZ - APRON.minZ;
  return (
    <group>
      <mesh position={[(APRON.minX + APRON.maxX) / 2, TOP - 0.2, (APRON.minZ + APRON.maxZ) / 2]} material={MAT.concrete} receiveShadow>
        <boxGeometry args={[w, 0.4, d]} />
      </mesh>
      <mesh position={[(X0 + X1) / 2, LANE_TOP - 0.01, Z]} material={MAT.asphalt} receiveShadow>
        <boxGeometry args={[X1 - X0, 0.02, HALF * 2]} />
      </mesh>
      <mesh geometry={paint} material={MAT.paint} receiveShadow />
      <mesh geometry={lines} material={MAT.paint} receiveShadow />
      <mesh geometry={lines} material={LIT_MAT} position={[0, 0.004, 0]} />
      <mesh geometry={wall} material={MAT.concrete} castShadow receiveShadow />
      <mesh geometry={cap} material={MAT.ink} castShadow />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, 0.2, d / 2]} position={[(APRON.minX + APRON.maxX) / 2, LANE_TOP - 0.2, (APRON.minZ + APRON.maxZ) / 2]} />
        <CuboidCollider args={[(X1 - X0) / 2, WALL.h / 2, WALL.d / 2]} position={[(X0 + X1) / 2, TOP + WALL.h / 2, WALL.z]} />
        {CHAPTERS.map((c) =>
          [GANTRY.zN, GANTRY.zS].map((z) => <CuboidCollider key={`${c.code}${z}`} args={[0.07, GANTRY.h / 2, 0.07]} position={[xOfA(c.start), TOP + GANTRY.h / 2, z]} />),
        )}
      </RigidBody>
    </group>
  );
}

// ---------------------------------------------------------------- gantries

function Gantries({ map, rect }: { map: THREE.Texture; rect: (id: string) => [number, number, number, number] }) {
  const frame = useMemo(() => {
    const g: THREE.BufferGeometry[] = [];
    for (const c of CHAPTERS) {
      const x = xOfA(c.start);
      for (const z of [GANTRY.zN, GANTRY.zS]) g.push(boxAt(0.14, GANTRY.h, 0.14, x, TOP + GANTRY.h / 2, z));
      g.push(boxAt(0.18, 0.2, GANTRY.zS - GANTRY.zN + 0.3, x, TOP + GANTRY.h - 0.1, (GANTRY.zN + GANTRY.zS) / 2));
    }
    return merge(g);
  }, []);
  const mat = useMemo(() => cardMaterial(map), [map]);
  const n = CHAPTERS.length * 2;
  const quads = useMemo(() => {
    const geo = quadGeometry(n);
    const m = new THREE.InstancedMesh(geo, mat, n);
    const bw = GANTRY.boardH * 4.57;
    CHAPTERS.forEach((c, i) => {
      const x = xOfA(c.start);
      const y = TOP + GANTRY.h - 0.2 - GANTRY.boardH / 2;
      // both faces: east (the default chase camera sees it) and west (a camera behind the car)
      setQuad(m, i * 2, [x + 0.1, y, Z], [0, Math.PI / 2, 0], bw, GANTRY.boardH);
      setQuad(m, i * 2 + 1, [x - 0.1, y, Z], [0, -Math.PI / 2, 0], bw, GANTRY.boardH);
      setRect(m, i * 2, rect(`ch${i}`));
      setRect(m, i * 2 + 1, rect(`ch${i}`));
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    return m;
  }, [mat, n, rect]);
  // the chapter you are in is lit: an orange strip under its board
  const strip = useRef<THREE.Mesh>(null);
  const boards = useRef<THREE.InstancedMesh>(null);
  useFrame(() => {
    nightGlow(boards.current);
    const s = strip.current;
    if (!s) return;
    const t = tOfA(carState.pos.x);
    const on = Math.abs(carState.pos.z - Z) < 8 && carState.pos.x > X0 - 2 && carState.pos.x < X1 + 2;
    // the chapter the car is in; before the start and past today, the current one (the last)
    const c = on ? CHAPTERS.reduce((a, x) => (t >= x.start - 0.05 ? x : a), CHAPTERS[0]) : CHAPTERS[CHAPTERS.length - 1];
    s.position.x = xOfA(c.start);
  });
  const bw = GANTRY.boardH * 4.57;
  return (
    <group>
      <mesh geometry={frame} material={MAT.ink} castShadow />
      <primitive ref={boards} object={quads} />
      <mesh ref={strip} material={MAT.orange} position={[xOfA(CHAPTERS[CHAPTERS.length - 1].start), TOP + GANTRY.h - 0.2 - GANTRY.boardH - 0.05, Z]}>
        <boxGeometry args={[0.22, 0.07, bw]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- pit boards and painted labels

function Boards({ map, rect }: { map: THREE.Texture; rect: (id: string) => [number, number, number, number] }) {
  const rows = useMemo(() => rowsOf(ROLES), []);
  const n = ROLES.length;
  const mat = useMemo(() => cardMaterial(map), [map]);
  const glyphMat = useMemo(() => glyphMaterial(map), [map]);
  const cards = useMemo(() => {
    const m = new THREE.InstancedMesh(quadGeometry(n), mat, n);
    ROLES.forEach((r, i) => setRect(m, i, rect(`r${i}`)));
    m.frustumCulled = false;
    return m;
  }, [mat, n, rect]);
  const backs = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.ink, n);
    m.frustumCulled = false;
    m.castShadow = true;
    return m;
  }, [n]);
  const posts = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.ink, n);
    m.frustumCulled = false;
    m.castShadow = true;
    return m;
  }, [n]);
  // painted: years by their ticks, role codes by their timing lines
  const glyphs = useMemo(() => {
    const ids: { id: string; pos: [number, number, number]; h: number }[] = [];
    YEARS.forEach((y) => ids.push({ id: `y${y}`, pos: [xOfA(y) + 0.1, PAINT + 0.004, Z + HALF - 0.62], h: 0.46 }));
    const seen = new Map<string, number>();
    ROLES.forEach((r, i) => {
      const k = xOfA(r.start).toFixed(3);
      const j = seen.get(k) ?? 0;
      seen.set(k, j + 1);
      ids.push({ id: `c${i}`, pos: [xOfA(r.start) + 0.08, PAINT + 0.004, Z - HALF + 0.55 + j * 0.42], h: 0.36 });
    });
    const m = new THREE.InstancedMesh(quadGeometry(ids.length), glyphMat, ids.length);
    ids.forEach((g, i) => {
      const a = g.id.startsWith("y") ? 2.6 : 1.4; // the cells' aspect (atlas items below)
      // anchored at the left: the cell starts at the mark
      setQuad(m, i, [g.pos[0] + (g.h * a) / 2, g.pos[1], g.pos[2]], FLAT, g.h * a, g.h);
      setRect(m, i, rect(g.id));
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.receiveShadow = true;
    return m;
  }, [glyphMat, rect]);
  const frame = useRef<THREE.Mesh>(null);
  const cardsR = useRef<THREE.InstancedMesh>(null);
  const backsR = useRef<THREE.InstancedMesh>(null);
  const postsR = useRef<THREE.InstancedMesh>(null);
  const st = useRef(ROLES.map(() => ({ up: 0 })));

  useFrame((_, dt) => {
    const cards = cardsR.current;
    const backs = backsR.current;
    const posts = postsR.current;
    if (!cards || !backs || !posts) return;
    const d = Math.min(dt, 0.1);
    nightGlow(cards);
    const onStrip = Math.abs(carState.pos.z - Z) < 9 && carState.pos.x > X0 - 6 && carState.pos.x < X1 + 6;
    // the board wakes up as the car's nose reaches its line
    const t = onStrip ? tOfA(carState.pos.x + 0.8) : -Infinity;
    const up = UP;
    const nrm = NRM;
    ROLES.forEach((r, i) => {
      const want = (onStrip && activeAt(r, t)) || (!onStrip && r.ongoing) ? 1 : 0;
      const b = st.current[i];
      // up fast, down a touch slower
      b.up += (want - b.up) * Math.min(1, d * (want ? 7 : 4));
      const row = rows[i];
      const x0 = xOfA(r.start) + BOARD.w / 2;
      const z0 = BOARD.z;
      // the board's bottom edge: down in its slot in the apron behind the wall, or out over the wall (stacked by row)
      const bOut = TOP + WALL.h + 0.12 + row * ROW_LIFT;
      const bIn = TOP - BOARD.h - 0.06;
      const e = b.up < 0.5 ? 2 * b.up * b.up : 1 - (-2 * b.up + 2) ** 2 / 2;
      const yb = bIn + (bOut - bIn) * e;
      const cx = x0 + up.x;
      const cy = yb + up.y;
      const cz = z0 + up.z;
      setQuad(cards, i, [cx + nrm.x * 0.026, cy + nrm.y * 0.026, cz + nrm.z * 0.026], [BOARD.lean, BOARD.yaw, 0], BOARD.w, BOARD.h);
      setBoxEuler(backs, i, [cx, cy, cz], [BOARD.lean, BOARD.yaw, 0], [BOARD.w + 0.05, BOARD.h + 0.05, 0.045]);
      const ph = Math.max(0.001, yb - TOP);
      setBox(posts, i, [x0, TOP + ph / 2, z0 - 0.06], 0, [0.05, ph, 0.05]);
      if (r.ongoing && frame.current) {
        frame.current.position.set(cx - nrm.x * 0.006, cy - nrm.y * 0.006, cz - nrm.z * 0.006);
        frame.current.visible = b.up > 0.05;
      }
    });
    dirty(cards, backs, posts);
  });

  return (
    <group>
      <primitive ref={cardsR} object={cards} />
      <primitive ref={backsR} object={backs} />
      <primitive ref={postsR} object={posts} />
      <primitive object={glyphs} />
      {/* the ongoing role's board, framed in orange */}
      <mesh ref={frame} material={MAT.orange} rotation={[BOARD.lean, BOARD.yaw, 0, "YXZ"]} visible={false}>
        <boxGeometry args={[BOARD.w + 0.16, BOARD.h + 0.16, 0.04]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- split sticker

function Split() {
  const box = useRef<HTMLDivElement>(null);
  const date = useRef<HTMLSpanElement>(null);
  const code = useRef<HTMLSpanElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const anchor = useRef<THREE.Group>(null);
  const last = useRef({ month: "", role: -2, on: false });
  useFrame(() => {
    const p = carState.pos;
    anchor.current?.position.set(p.x, p.y, p.z);
    const on = Math.abs(p.z - Z) < 4 && p.x > XT0 - 1.5 && p.x < X1 + 0.5;
    const l = last.current;
    if (on !== l.on && box.current) {
      box.current.style.opacity = on ? "1" : "0";
      l.on = on;
    }
    if (!on) return;
    const t = Math.min(T_END, Math.max(T_START, tOfA(p.x)));
    const month = p.x >= XT1 ? "TODAY" : monthLabel(t);
    if (month !== l.month && date.current) {
      date.current.textContent = month;
      l.month = month;
    }
    // the last timing line behind the car
    let k = -1;
    ROLES.forEach((r, i) => {
      if (xOfA(r.start) <= p.x && (k < 0 || r.start >= ROLES[k].start)) k = i;
    });
    if (k !== l.role) {
      l.role = k;
      const r = ROLES[k];
      if (code.current) code.current.textContent = r ? r.code : "S1";
      if (title.current) title.current.textContent = r ? r.title : "START";
      if (line.current) line.current.textContent = r ? (r.lines[0] ?? "") : "";
      if (box.current) {
        box.current.classList.remove("jx-flick");
        void box.current.offsetWidth;
        box.current.classList.add("jx-flick");
      }
    }
  });
  return (
    <group ref={anchor}>
      <Html zIndexRange={[5, 0]} pointerEvents="none">
        <style>{STICKER_CSS}</style>
        <div ref={box} className="jx-sticker" style={{ opacity: 0 }}>
          <div className="jx-head">
            <span ref={code} className="jx-code">
              S1
            </span>
            <span ref={date} className="jx-date" />
          </div>
          <div ref={title} className="jx-title">
            START
          </div>
          <div ref={line} className="jx-line" />
        </div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------- root

const items = (): Item[] => [
  ...ROLES.map((r, i) => cardItem(`r${i}`, r)),
  ...CHAPTERS.map((c, i) => chapterItem(`ch${i}`, c)),
  ...YEARS.map((y) => glyphItem(`y${y}`, String(y), { w: 332, h: 128, align: "left" })),
  ...ROLES.map((r, i) => glyphItem(`c${i}`, r.code, { w: 180, h: 128, align: "left" })),
];

export default function JourneyA({ y = 0 }: { y?: number }) {
  const atlas = useAtlas(items);
  return (
    <>
      <group position={[0, y, 0]}>
        <Ground />
        {atlas && (
          <>
            <Gantries map={atlas.texture} rect={atlas.rect} />
            <Boards map={atlas.texture} rect={atlas.rect} />
          </>
        )}
      </group>
      <Split />
    </>
  );
}
