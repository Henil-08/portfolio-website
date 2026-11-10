// Journey B, "The road so far": the career as a short road with a hairpin. The first leg runs east
// along the garden's spine through the Ahmedabad years; the hairpin is the move to Boston (its apex
// is the MS, content/profile.ts lap 3, "Moved countries, then GenAI happened"); the back leg runs
// west through Boston and Waters to a chequered line at today.
//
// Every role is a painted line on the road, from the day it started to the day it ended, side by
// side with whatever else was going on: school and work run as parallel lanes, and they light
// orange behind the car. At each start a station stands beside the road, a low concrete plinth
// with its card folded shut; as the car arrives the card lifts like a lectern, square to the
// chase camera, and its datasheet wipes in. Stations alternate sides, so the lecterns stay low
// enough on the near side not to hide the car. The four chapters are painted on the near verge, years on
// the road. Kerbs (W05, ink and paper) only in the hairpin.
//
// Spacing is half true time, half one step per milestone, so the busy 2021-22 and 2024 stretches
// still have room for a station each; the years on the road show the real scale.
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { carState } from "../carState";
import { cardItem, glyphItem, type Item } from "./atlas";
import { ROAD, ROAD_LEN, S_TURN0, S_TURN1, nearestOnRoad, roadAt, roadSamples } from "./bRoad";
import { CHAPTERS, ROLES, T_END, YEARS } from "./data";
import { FLAT, MAT, cardMaterial, dirty, glowGlyphMaterial, glyphMaterial, merge, nightGlow, progressMaterial, quadGeometry, ribbon, setBox, setQuad, setRect, useAtlas, withS } from "./gl";

// ---------------------------------------------------------------- layout

const VERGE_Y = 0.05;
const ROAD_Y = 0.065; // the colliders' top too
const PAINT_Y = 0.073;
const LIT_Y = 0.077;
const PATH = roadSamples(0.25);
const S0 = 2; // first date
const S1 = ROAD_LEN - 2; // today
/** Horizontal direction the default chase camera looks (Rig.tsx OFFSET 10.5, 12.5, 14, reversed). */
const CAM = new THREE.Vector2(-10.5, -14).normalize();
const CARD = { w: 1.9, h: 0.95 };
const PLINTH = { w: 2.05, h: 0.22, d: 0.55, off: ROAD.half + ROAD.verge - 0.4 };
/** An open card leans back like a lectern, square to the chase camera (35 degrees down). */
const LEAN = -0.62;
const FACE_YAW = Math.atan2(-CAM.x, -CAM.y); // cards face the camera

// time -> s: halfway between true time and one even step per distinct start date
const STARTS = [...new Set(ROLES.map((r) => r.start))].sort((a, b) => a - b);
const KNOTS: [number, number][] = (() => {
  const ts = [...STARTS, T_END];
  const n = ts.length;
  return ts.map((t, i) => [t, S0 + (S1 - S0) * 0.5 * (i / (n - 1) + (t - ts[0]) / (ts[n - 1] - ts[0]))]);
})();
export function sOfB(t: number) {
  if (t <= KNOTS[0][0]) return KNOTS[0][1];
  for (let i = 1; i < KNOTS.length; i++) {
    const [ta, sa] = KNOTS[i - 1];
    const [tb, sb] = KNOTS[i];
    if (t <= tb) return sa + ((t - ta) / (tb - ta)) * (sb - sa);
  }
  return KNOTS[KNOTS.length - 1][1];
}

/** Lanes on the road: a role takes the first free one (left of centre outward). */
const SLOTS = (() => {
  const end: number[] = [];
  return ROLES.map((r) => {
    const a = sOfB(r.start);
    let k = end.findIndex((e) => a > e + 0.4);
    if (k < 0) k = end.length;
    end[k] = sOfB(r.ongoing ? T_END : r.end);
    return k;
  });
})();
const laneOff = (k: number) => 1.12 - k * 0.27;

/** Left of travel unless that side faces the camera: stations stand on the far side. */
function farSide(s: number) {
  const p = roadAt(s);
  return p.tz * CAM.x + -p.tx * CAM.y > 0 ? 1 : -1;
}

type Station = { i: number; s: number; x: number; z: number; side: number };
// One station per role, alternating far side and near side by start date (two that start the same
// day take one side each), so each side has a station every other step.
const STATIONS: Station[] = (() => {
  const seen = new Map<number, number>();
  return ROLES.map((r, i) => {
    const j = seen.get(r.start) ?? 0;
    seen.set(r.start, j + 1);
    const g = STARTS.indexOf(r.start);
    const s = sOfB(r.start);
    const p = roadAt(s);
    const far = farSide(s);
    const side = (g + j) % 2 === 0 ? far : -far;
    const off = PLINTH.off + (side === far ? 0 : 0.15);
    return { i, s, x: p.x + p.tz * side * off, z: p.z - p.tx * side * off, side };
  });
})();

/** A short paint bar across the road at s, from lateral a to b (left positive). */
function cross(s: number, a: number, b: number, w: number, y: number) {
  return ribbon(
    PATH.map((p) => p),
    Math.max(0, s - w / 2),
    Math.min(ROAD_LEN, s + w / 2),
    (a + b) / 2,
    Math.abs(a - b),
    y,
  );
}

// ---------------------------------------------------------------- ground

/** The role lanes light up to the car's distance along the road. */
const LIT = { value: -1 };
const LIT_MAT = progressMaterial(LIT);

function Ground() {
  const geos = useMemo(() => {
    const verge = ribbon(PATH, 0, ROAD_LEN, 0, (ROAD.half + ROAD.verge) * 2, VERGE_Y);
    const road = ribbon(PATH, 0, ROAD_LEN, 0, ROAD.half * 2, ROAD_Y);
    const paint: THREE.BufferGeometry[] = [];
    for (const o of [-1, 1]) paint.push(ribbon(PATH, 0, ROAD_LEN, o * (ROAD.half - 0.22), 0.08, PAINT_Y));
    // start line, year ticks (right half), today: a chequer of paper squares
    paint.push(cross(S0, ROAD.half - 0.22, -ROAD.half + 0.22, 0.12, PAINT_Y));
    for (const y of YEARS) paint.push(cross(sOfB(y), -0.15, -ROAD.half + 0.22, 0.07, PAINT_Y));
    const q = (ROAD.half * 2) / 10;
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) paint.push(cross(S1 + (j - 0.5) * q, ROAD.half - q * i, ROAD.half - q * (i + 1), q, PAINT_Y));
    // kerbs in the hairpin only: ink and paper stripes just outside both edges
    const kInk: THREE.BufferGeometry[] = [];
    const STRIPE = 0.6;
    for (let s = S_TURN0 - 0.6, k = 0; s < S_TURN1 + 0.6; s += STRIPE, k++)
      for (const o of [-1, 1]) (k % 2 ? kInk : paint).push(ribbon(PATH, s, s + STRIPE, o * (ROAD.half + 0.22), 0.44, ROAD_Y - 0.004));
    // each role's lane, from its start to its end, with a square at the start
    const lanes: THREE.BufferGeometry[] = [];
    ROLES.forEach((r, i) => {
      const a = sOfB(r.start);
      const b = sOfB(r.ongoing ? T_END : r.end);
      const o = laneOff(SLOTS[i]);
      lanes.push(ribbon(PATH, a, b, o, 0.07, PAINT_Y));
      lanes.push(withS(cross(a + 0.09, o + 0.1, o - 0.1, 0.18, PAINT_Y), a));
    });
    return { verge, road, paint: merge(paint), ink: merge(kInk), lanes: merge(lanes) };
  }, []);
  useFrame(() => {
    const n = nearestOnRoad(carState.pos.x, carState.pos.z);
    LIT.value = n.d < ROAD.half + ROAD.verge + 1 ? n.s : -1;
  });
  // colliders: flat boxes along the road, top at the asphalt
  const boxes = useMemo(() => {
    const out: { p: [number, number, number]; yaw: number; len: number }[] = [];
    for (let s = 0; s < ROAD_LEN; s += 0.8) {
      const len = Math.min(0.8, ROAD_LEN - s);
      const p = roadAt(s + len / 2);
      out.push({ p: [p.x, ROAD_Y - 0.1, p.z], yaw: Math.atan2(-p.tz, p.tx), len: len + 0.25 });
    }
    return out;
  }, []);
  return (
    <group>
      <mesh geometry={geos.verge} material={MAT.concrete} receiveShadow />
      <mesh geometry={geos.road} material={MAT.asphalt} receiveShadow />
      <mesh geometry={geos.paint} material={MAT.paint} receiveShadow />
      <mesh geometry={geos.ink} material={MAT.inkPaint} receiveShadow />
      <mesh geometry={geos.lanes} material={MAT.paint} receiveShadow />
      <mesh geometry={geos.lanes} material={LIT_MAT} position={[0, LIT_Y - PAINT_Y, 0]} />
      <RigidBody type="fixed" colliders={false}>
        {boxes.map((b, i) => (
          <CuboidCollider key={i} args={[b.len / 2, 0.1, ROAD.half + ROAD.verge]} position={b.p} rotation={[0, b.yaw, 0]} />
        ))}
        {STATIONS.map((st) => (
          <CuboidCollider key={`p${st.i}`} args={[PLINTH.w / 2, PLINTH.h / 2 + 0.03, PLINTH.d / 2]} position={[st.x, VERGE_Y + PLINTH.h / 2, st.z]} rotation={[0, FACE_YAW, 0]} />
        ))}
      </RigidBody>
    </group>
  );
}

// ---------------------------------------------------------------- painted labels

function Labels({ map, rect, aspect }: { map: THREE.Texture; rect: (id: string) => [number, number, number, number]; aspect: (id: string) => number }) {
  const meshes = useMemo(() => {
    const paper: { id: string; x: number; z: number; h: number }[] = [];
    const ink: typeof paper = [];
    const glow: typeof paper = [];
    for (const y of YEARS) {
      const p = roadAt(sOfB(y));
      const o = -(ROAD.half - 0.62);
      paper.push({ id: `y${y}`, x: p.x + p.tz * o, z: p.z - p.tx * o, h: 0.4 });
    }
    CHAPTERS.forEach((c, i) => {
      const p = roadAt(sOfB(c.start));
      const o = -(ROAD.half + ROAD.verge / 2 + 0.1);
      const x = p.x + p.tz * o;
      const z = p.z - p.tx * o;
      const h = 0.42;
      const wc = h * aspect(`cc${i}`);
      const wp = h * aspect(`cp${i}`);
      glow.push({ id: `cc${i}`, x: x - wp / 2, z, h });
      ink.push({ id: `cp${i}`, x: x + wc / 2 - 0.05, z, h });
    });
    const build = (list: typeof paper, mat: THREE.Material, y: number) => {
      const m = new THREE.InstancedMesh(quadGeometry(list.length), mat, list.length);
      list.forEach((g, i) => {
        setQuad(m, i, [g.x, y, g.z], FLAT, g.h * aspect(g.id), g.h);
        setRect(m, i, rect(g.id));
      });
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.receiveShadow = true;
      return m;
    };
    return [build(paper, glyphMaterial(map), PAINT_Y + 0.004), build(ink, glyphMaterial(map, "#151515"), VERGE_Y + 0.004), build(glow, glowGlyphMaterial(map), VERGE_Y + 0.004)];
  }, [map, rect, aspect]);
  return (
    <group>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- stations

function Stations({ map, rect }: { map: THREE.Texture; rect: (id: string) => [number, number, number, number] }) {
  const n = STATIONS.length;
  const mat = useMemo(() => cardMaterial(map), [map]);
  const cards = useMemo(() => {
    const m = new THREE.InstancedMesh(quadGeometry(n), mat, n);
    STATIONS.forEach((st, i) => setRect(m, i, rect(`r${st.i}`)));
    m.frustumCulled = false;
    return m;
  }, [mat, n, rect]);
  const backs = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.ink, n);
    m.frustumCulled = false;
    m.castShadow = true;
    return m;
  }, [n]);
  const plinths = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), MAT.concreteDark, n);
    STATIONS.forEach((st, i) => setBox(m, i, [st.x, VERGE_Y + PLINTH.h / 2, st.z], FACE_YAW, [PLINTH.w, PLINTH.h, PLINTH.d]));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }, [n]);
  const frame = useRef<THREE.Mesh>(null);
  const cardsR = useRef<THREE.InstancedMesh>(null);
  const backsR = useRef<THREE.InstancedMesh>(null);
  const st = useRef(STATIONS.map(() => ({ open: 0, wipe: 0 })));

  useFrame((_, dt) => {
    const cards = cardsR.current;
    const backs = backsR.current;
    if (!cards || !backs) return;
    const d = Math.min(dt, 0.1);
    nightGlow(cards);
    const near = nearestOnRoad(carState.pos.x, carState.pos.z);
    const on = near.d < ROAD.half + ROAD.verge + 2.5;
    const wipeA = cards.geometry.getAttribute("aWipe") as THREE.InstancedBufferAttribute;
    STATIONS.forEach((sta, i) => {
      const r = ROLES[sta.i];
      const want = on ? (near.s > sta.s - 5.5 ? 1 : 0) : r.ongoing ? 1 : 0;
      const b = st.current[i];
      b.open += (want - b.open) * Math.min(1, d * (want ? 5 : 3));
      // the card stands up first, then its sheet wipes in from the left
      const up = THREE.MathUtils.smoothstep(b.open, 0, 0.75);
      const target = want && up > 0.92 ? 1 : 0;
      b.wipe = THREE.MathUtils.clamp(b.wipe + Math.sign(target - b.wipe) * d * (target ? 1.8 : 4), 0, 1);
      const th = -Math.PI / 2 + (Math.PI / 2 + LEAN) * up + Math.sin(up * Math.PI) * 0.06; // a little overshoot as it lifts
      const hy = VERGE_Y + PLINTH.h;
      // hinged on the plinth's top near its front edge, so the leaning card sits over the plinth
      tmp.q.setFromEuler(tmp.e.set(th, FACE_YAW, 0, "YXZ"));
      tmp.c.set(0, CARD.h / 2, 0).applyQuaternion(tmp.q);
      tmp.n.set(0, 0, 1).applyQuaternion(tmp.q);
      const bx = sta.x + Math.sin(FACE_YAW) * 0.2;
      const bz = sta.z + Math.cos(FACE_YAW) * 0.2;
      const cx = bx + tmp.c.x;
      const cy = hy + 0.025 + tmp.c.y;
      const cz = bz + tmp.c.z;
      setQuad(cards, i, [cx + tmp.n.x * 0.026, cy + tmp.n.y * 0.026, cz + tmp.n.z * 0.026], [th, FACE_YAW, 0], CARD.w, CARD.h);
      const w = b.wipe < 0.5 ? 2 * b.wipe * b.wipe : 1 - (-2 * b.wipe + 2) ** 2 / 2;
      wipeA.setX(i, w);
      setBoxRot(backs, i, [cx, cy, cz], tmp.q, [CARD.w + 0.06, CARD.h + 0.06, 0.045]);
      if (r.ongoing && frame.current) {
        frame.current.position.set(cx - tmp.n.x * 0.006, cy - tmp.n.y * 0.006, cz - tmp.n.z * 0.006);
        frame.current.quaternion.copy(tmp.q);
        frame.current.visible = up > 0.6;
      }
    });
    dirty(cards, backs);
  });

  return (
    <group>
      <primitive object={plinths} />
      <primitive ref={backsR} object={backs} />
      <primitive ref={cardsR} object={cards} />
      <mesh ref={frame} material={MAT.orange} visible={false}>
        <boxGeometry args={[CARD.w + 0.2, CARD.h + 0.2, 0.04]} />
      </mesh>
    </group>
  );
}

const tmp = { c: new THREE.Vector3(), n: new THREE.Vector3(), e: new THREE.Euler(), q: new THREE.Quaternion() };
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
function setBoxRot(mesh: THREE.InstancedMesh, i: number, pos: [number, number, number], q: THREE.Quaternion, size: [number, number, number]) {
  mesh.setMatrixAt(i, _m.compose(_p.set(...pos), q, _s.set(...size)));
}

// ---------------------------------------------------------------- root

const items = (): Item[] => [
  ...ROLES.map((r, i) => cardItem(`r${i}`, r)),
  ...YEARS.map((y) => glyphItem(`y${y}`, String(y), { w: 332, h: 128 })),
  ...CHAPTERS.map((c, i) => glyphItem(`cc${i}`, c.code, { w: 140, h: 128 })),
  ...CHAPTERS.map((c, i) => glyphItem(`cp${i}`, c.place, { mono: false, w: Math.ceil(c.place.length * 78 + 40), h: 128, spacing: 0.04 })),
];

export default function JourneyB() {
  const atlas = useAtlas(items);
  return (
    <group>
      <Ground />
      {atlas && (
        <>
          <Labels map={atlas.texture} rect={atlas.rect} aspect={atlas.aspect} />
          <Stations map={atlas.texture} rect={atlas.rect} />
        </>
      )}
    </group>
  );
}
