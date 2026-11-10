// Journey C, "The datasheet": the career as one Gantt table cast into a concrete slab, read like
// the resume (docs/BRAND.md, Datasheet). Rows are the roles and degrees, earliest at the top; the
// columns are the years, west to east (left to right under the chase camera); each role is an
// ink bar from its start to its end. There is no road: drive anywhere on it.
//
// The car is the cursor. Its x is a playhead, an orange line across every row with the month in
// the header, and every bar that is going on at that date lights orange up to it, so what ran in
// parallel reads at a glance. The row under the car inverts its label (I05) and a datasheet card
// with a hard ink shadow stands up beside the car with that role's details.
//
// Footprint: a 15.8 x 15.2 m slab on the current terrace's site (about 0.6 m wider on each side).
"use client";

import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { carState } from "../carState";
import { FONT_MONO } from "../models/props/Label";
import { cardItem, glyphItem, rowItem, type Item } from "./atlas";
import { ROLES, T_END, activeAt, monthLabel } from "./data";
import { FLAT, MAT, cardMaterial, dirty, flatAt, glyphMaterial, merge, nightGlow, quadGeometry, setBox, setQuad, setRect, useAtlas } from "./gl";
import { FOOT_C } from "./footprint";

// ---------------------------------------------------------------- layout

const F = FOOT_C;
const TOP = 0.05; // slab top, the collider's too
const PAINT = TOP + 0.006; // year columns
// layers stand 2 mm or more apart, top of the stack last: band, rules, labels, playhead
const BAND_Y = PAINT + 0.002;
const RULE_Y = PAINT + 0.004;
const LABEL_Y = PAINT + 0.006;
const PLAY_Y = PAINT + 0.008;
const LABEL_X0 = F.minX + 0.3; // the label column
const LABEL_W = 4.4;
const TX0 = F.minX + 5.0; // the time area
const TX1 = F.maxX - 0.3;
const Y0 = 2019; // columns: 2019 to 2027
const Y1 = 2027;
const PER = (TX1 - TX0) / (Y1 - Y0);
const xOfC = (t: number) => TX0 + (t - Y0) * PER;
const tOfC = (x: number) => Y0 + (x - TX0) / PER;
const HEAD = { z0: F.minZ + 0.25, z1: F.minZ + 1.35 };
const ROW_Z0 = HEAD.z1 + 0.1;
const RH = (F.maxZ - 0.35 - ROW_Z0) / ROLES.length; // row height
const rowZ = (i: number) => ROW_Z0 + (i + 0.5) * RH;
const BAR = { d: 0.34, h: 0.03 };
const CARD = { w: 1.9, h: 0.95 };
const CAM = new THREE.Vector2(-10.5, -14).normalize();
const FACE_YAW = Math.atan2(-CAM.x, -CAM.y);
const LEAN = -0.62;
const COLS = Array.from({ length: Y1 - Y0 + 1 }, (_, i) => Y0 + i);

function onSlab(x: number, z: number) {
  return x > F.minX - 0.5 && x < F.maxX + 0.5 && z > F.minZ - 0.5 && z < F.maxZ + 0.5;
}
const rowAt = (z: number) => {
  const i = Math.floor((z - ROW_Z0) / RH);
  return i >= 0 && i < ROLES.length ? i : -1;
};

// ---------------------------------------------------------------- slab

function Slab() {
  const rules = useMemo(() => {
    const g: THREE.BufferGeometry[] = [];
    const w = F.maxX - F.minX - 0.6;
    const cx = (F.minX + F.maxX) / 2;
    // the table's frame and row rules (ink), heavier under the header
    g.push(flatAt(w, 0.06, cx, RULE_Y, HEAD.z1 + 0.05));
    for (let i = 1; i < ROLES.length; i++) g.push(flatAt(w, 0.02, cx, RULE_Y, ROW_Z0 + i * RH));
    g.push(flatAt(w, 0.06, cx, RULE_Y, ROW_Z0 + ROLES.length * RH));
    // the label column's edge
    g.push(flatAt(0.04, ROW_Z0 + ROLES.length * RH - HEAD.z0, TX0 - 0.25, RULE_Y, (HEAD.z0 + ROW_Z0 + ROLES.length * RH) / 2));
    return merge(g);
  }, []);
  // year columns, lighter (concrete dark)
  const cols = useMemo(() => merge(COLS.map((y) => flatAt(0.035, ROW_Z0 + ROLES.length * RH - HEAD.z0, xOfC(y), PAINT, (HEAD.z0 + ROW_Z0 + ROLES.length * RH) / 2))), []);
  const w = F.maxX - F.minX;
  const d = F.maxZ - F.minZ;
  return (
    <group>
      <mesh position={[(F.minX + F.maxX) / 2, TOP - 0.2, (F.minZ + F.maxZ) / 2]} material={MAT.concrete} receiveShadow>
        <boxGeometry args={[w, 0.4, d]} />
      </mesh>
      <mesh geometry={cols} material={MAT.concreteDark} receiveShadow />
      <mesh geometry={rules} material={MAT.inkPaint} receiveShadow />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, 0.2, d / 2]} position={[(F.minX + F.maxX) / 2, TOP - 0.2, (F.minZ + F.maxZ) / 2]} />
      </RigidBody>
    </group>
  );
}

// ---------------------------------------------------------------- table contents

function markColors(m: THREE.InstancedMesh) {
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
}

const INK = new THREE.Color("#151515");
const PAPER = new THREE.Color("#f3f2ed");

function Table({ map, rect, aspect }: { map: THREE.Texture; rect: (id: string) => [number, number, number, number]; aspect: (id: string) => number }) {
  const n = ROLES.length;
  const labels = useMemo(() => {
    const m = new THREE.InstancedMesh(quadGeometry(n + COLS.length), glyphMaterial(map, "#ffffff"), n + COLS.length);
    ROLES.forEach((r, i) => {
      const h = Math.min(RH * 0.86, LABEL_W / aspect(`l${i}`));
      const w = h * aspect(`l${i}`);
      setQuad(m, i, [LABEL_X0 + w / 2, LABEL_Y, rowZ(i)], FLAT, w, h);
      setRect(m, i, rect(`l${i}`));
      m.setColorAt(i, INK);
    });
    COLS.forEach((y, j) => {
      const h = 0.62;
      const w = h * aspect(`y${y}`);
      setQuad(m, n + j, [xOfC(y) + 0.06 + w / 2, LABEL_Y, (HEAD.z0 + HEAD.z1) / 2], FLAT, w, h);
      setRect(m, n + j, rect(`y${y}`));
      m.setColorAt(n + j, INK);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.receiveShadow = true;
    return m;
  }, [map, rect, aspect, n]);
  const bars = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.ink, n);
    m.receiveShadow = true;
    m.frustumCulled = false;
    return m;
  }, [n]);
  const lit = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.orange, n);
    m.frustumCulled = false;
    return m;
  }, [n]);
  const band = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Mesh>(null);
  const labelsR = useRef<THREE.InstancedMesh>(null);
  const barsR = useRef<THREE.InstancedMesh>(null);
  const litR = useRef<THREE.InstancedMesh>(null);
  const play = useRef<THREE.Group>(null);
  const readout = useRef<THREE.Mesh & { text?: string }>(null);
  const st = useRef({ row: -1, lift: ROLES.map(() => 0), px: TX0, month: "" });

  useFrame((_, dt) => {
    const labels = labelsR.current;
    const bars = barsR.current;
    const lit = litR.current;
    if (!labels || !bars || !lit) return;
    const d = Math.min(dt, 0.1);
    const p = carState.pos;
    const on = onSlab(p.x, p.z) && p.y < 4;
    const s = st.current;
    const row = on ? rowAt(p.z) : -1;
    // the playhead follows the car's x inside the time area; off the slab it rests at today
    const px = on ? THREE.MathUtils.clamp(p.x, TX0, xOfC(T_END)) : xOfC(T_END);
    s.px += (px - s.px) * Math.min(1, d * 14);
    const t = tOfC(s.px);
    ROLES.forEach((r, i) => {
      const x0 = xOfC(r.start);
      const x1 = xOfC(r.ongoing ? T_END : r.end);
      s.lift[i] += ((i === row ? 1 : 0) - s.lift[i]) * Math.min(1, d * 8);
      const h = BAR.h + s.lift[i] * 0.05;
      setBox(bars, i, [(x0 + x1) / 2, TOP + h / 2, rowZ(i)], 0, [x1 - x0, h, BAR.d]);
      // lit from the start up to the playhead while the role is going on there (and fully once past it)
      const xe = Math.min(x1, s.px);
      const show = t >= r.start && (on || r.ongoing);
      const lw = show ? Math.max(0.001, xe - x0) : 0.001;
      setBox(lit, i, [x0 + lw / 2, TOP + h + 0.004, rowZ(i)], 0, [lw, 0.008, show ? BAR.d * (activeAt(r, t) ? 1 : 0.4) : 0.001]);
    });
    dirty(bars, lit);
    // the row under the car: its label inverts on an ink band
    if (row !== s.row) {
      if (s.row >= 0) labels.setColorAt(s.row, INK);
      if (row >= 0) labels.setColorAt(row, PAPER);
      markColors(labels);
      s.row = row;
    }
    if (band.current) {
      band.current.visible = row >= 0;
      if (row >= 0) band.current.position.z = rowZ(row);
    }
    if (play.current) {
      play.current.visible = on && p.x > TX0 - 1;
      play.current.position.x = s.px;
    }
    const m = t >= T_END - 0.02 ? "TODAY" : monthLabel(t);
    if (m !== s.month && readout.current) {
      s.month = m;
      (readout.current as unknown as { text: string }).text = m;
    }
    if (head.current) head.current.visible = !!play.current?.visible;
  });
  const rowsZ = ROLES.length * RH;
  return (
    <group>
      <primitive ref={barsR} object={bars} />
      <primitive ref={litR} object={lit} />
      {/* the active row's ink band, under its label (the label turns paper) */}
      <mesh ref={band} material={MAT.inkPaint} position={[LABEL_X0 + LABEL_W / 2 - 0.05, BAND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[LABEL_W + 0.3, RH - 0.06]} />
      </mesh>
      <primitive ref={labelsR} object={labels} />
      <group ref={play} visible={false}>
        <mesh material={MAT.orange} position={[0, PLAY_Y, ROW_Z0 + rowsZ / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, rowsZ]} />
        </mesh>
        {/* the month in an ink chip at the head of the line */}
        <mesh ref={head} material={MAT.ink} position={[0, PAINT + 0.02, (HEAD.z0 + HEAD.z1) / 2]}>
          <boxGeometry args={[1.9, 0.04, 0.62]} />
        </mesh>
        <Suspense fallback={null}>
          <Text ref={readout} font={FONT_MONO} fontSize={0.36} anchorX="center" anchorY="middle" position={[0, PAINT + 0.045, (HEAD.z0 + HEAD.z1) / 2 + 0.02]} rotation={[-Math.PI / 2, 0, 0]} color="#ff4f00">
            MAR 2022
          </Text>
        </Suspense>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- the card beside the car

function Card({ map, rect }: { map: THREE.Texture; rect: (id: string) => [number, number, number, number] }) {
  const mat = useMemo(() => cardMaterial(map), [map]);
  const quad = useMemo(() => {
    const m = new THREE.InstancedMesh(quadGeometry(1), mat, 1);
    m.frustumCulled = false;
    return m;
  }, [mat]);
  const g = useRef<THREE.Group>(null);
  const quadR = useRef<THREE.InstancedMesh>(null);
  const st = useRef({ row: -1, shown: -1, up: 0, x: 0, z: 0, init: false });
  useFrame((_, dt) => {
    const quad = quadR.current;
    if (!quad) return;
    const d = Math.min(dt, 0.1);
    nightGlow(quad);
    const p = carState.pos;
    const on = onSlab(p.x, p.z) && p.y < 4;
    const row = on ? rowAt(p.z) : -1;
    const s = st.current;
    // a new row: the card drops and comes back up with the new sheet
    if (row !== s.row) s.row = row;
    const want = row >= 0 && s.shown === row ? 1 : 0;
    s.up += (want - s.up) * Math.min(1, d * (want ? 9 : 14));
    if (s.up < 0.04 && s.shown !== row) {
      s.shown = row;
      if (row >= 0) {
        setRect(quad, 0, rect(`r${row}`));
        s.x = p.x;
        s.z = p.z;
      }
    }
    // beside the car, on its far side from the camera, following it
    const tx = p.x + 0.4;
    const tz = p.z - 2.1;
    if (!s.init) {
      s.x = tx;
      s.z = tz;
      s.init = true;
    }
    s.x += (tx - s.x) * Math.min(1, d * 6);
    s.z += (tz - s.z) * Math.min(1, d * 6);
    const k = s.up;
    if (g.current) {
      g.current.visible = k > 0.02;
      g.current.position.set(s.x, TOP, s.z);
      g.current.scale.set(1, Math.max(0.001, k), 1);
    }
    setQuad(quad, 0, [0, 0, 0.026], [0, 0, 0], CARD.w, CARD.h);
    dirty(quad);
  });
  return (
    <group ref={g} visible={false}>
      {/* a thin ink stand, the card leaning back on it square to the camera, a hard ink shadow behind */}
      <mesh material={MAT.ink} position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.05, 0.6, 0.05]} />
      </mesh>
      <group position={[0, 0.6, 0]} rotation={[LEAN, FACE_YAW, 0, "YXZ"]}>
        <group position={[0, CARD.h / 2, 0]}>
          <mesh material={MAT.ink} position={[0.07, -0.07, -0.01]}>
            <planeGeometry args={[CARD.w, CARD.h]} />
          </mesh>
          <primitive ref={quadR} object={quad} />
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- root

const items = (): Item[] => [
  ...ROLES.map((r, i) => cardItem(`r${i}`, r)),
  ...ROLES.map((r, i) => rowItem(`l${i}`, r)),
  ...COLS.map((y) => glyphItem(`y${y}`, String(y), { w: 300, h: 128, align: "left" })),
];

export default function JourneyC() {
  const atlas = useAtlas(items);
  return (
    <group>
      <Slab />
      {atlas && (
        <>
          <Table map={atlas.texture} rect={atlas.rect} aspect={atlas.aspect} />
          <Card map={atlas.texture} rect={atlas.rect} />
        </>
      )}
    </group>
  );
}
