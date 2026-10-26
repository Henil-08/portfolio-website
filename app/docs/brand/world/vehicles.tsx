"use client";

// The other three cars in the garage, in the same "Concrete & Ink" language as models.tsx:
// ink body, paper paint, one orange. Procedural, sized in metres, noses toward +z.
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Box, M, W, tapered, useLabel } from "./models";

type V3 = [number, number, number];

const silver = new THREE.MeshStandardMaterial({ color: "#c9c7c0", roughness: 0.35, metalness: 0.6 });
const unitTube = new THREE.CylinderGeometry(1, 1, 1, 8);
const UP = new THREE.Vector3(0, 1, 0);

/** A round tube from a to b (frame members, arms, forks). */
function Tube({ a, b, r = 0.022, m = M.ink }: { a: V3; b: V3; r?: number; m?: THREE.Material }) {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  const mid = va.addScaledVector(dir, len / 2);
  return <mesh geometry={unitTube} position={mid.toArray()} quaternion={q} scale={[r, len, r]} material={m} castShadow />;
}

/** Both sides at once: mirrors x. */
const both = (p: V3): [V3, V3] => [p, [-p[0], p[1], p[2]]];

/* ------------------------------------------------------------------ V02 ATV (E14) */

// A knobby off-road tyre: a drum with two staggered rows of tread blocks, merged into one mesh.
function knobbyGeo(r: number, w: number) {
  const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(r - 0.025, r - 0.025, w, 28)];
  const n = 16;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / n) * Math.PI;
    const row = i % 2 ? 1 : -1;
    const g = new THREE.BoxGeometry(0.05, w * 0.42, 0.075);
    g.translate(r - 0.03, row * w * 0.23, 0);
    g.rotateY(-a);
    parts.push(g);
  }
  // shoulder blocks so the sidewall reads knobby from the side too
  for (let i = 0; i < n; i++) {
    const g = new THREE.BoxGeometry(0.04, 0.03, 0.06);
    g.translate(r - 0.06, (i % 2 ? 1 : -1) * (w / 2), 0);
    g.rotateY(-((i + 0.5) / n) * Math.PI * 2);
    parts.push(g);
  }
  return mergeGeometries(parts.map((g) => g.toNonIndexed()));
}

function OffroadWheel({ p, geo, r, w }: { p: V3; geo: THREE.BufferGeometry; r: number; w: number }) {
  const side = Math.sign(p[0]);
  return (
    <group position={p} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={geo} material={M.tyre} castShadow />
      {/* silver rim set into the tyre, an ink hub */}
      <mesh position={[0, side * (w / 2 - 0.02), 0]} material={silver}>
        <cylinderGeometry args={[r * 0.5, r * 0.5, 0.06, 20]} />
      </mesh>
      <mesh position={[0, side * (w / 2 + 0.012), 0]} material={M.graphite}>
        <cylinderGeometry args={[r * 0.16, r * 0.16, 0.03, 10]} />
      </mesh>
    </group>
  );
}

// One coil spring, 1 m long along y, scaled to fit.
const springGeo = (() => {
  const pts: THREE.Vector3[] = [];
  const turns = 8;
  for (let i = 0; i <= turns * 16; i++) {
    const t = i / (turns * 16);
    pts.push(new THREE.Vector3(Math.cos(t * turns * Math.PI * 2) * 0.05, t - 0.5, Math.sin(t * turns * Math.PI * 2) * 0.05));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, 0.011, 5);
})();

/** Long-travel coilover: a silver damper with the orange spring round its upper part. */
function Coilover({ a, b }: { a: V3; b: V3 }) {
  const va = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(va);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const mid = va.clone().addScaledVector(dir, 0.58);
  return (
    <>
      <Tube a={a} b={b} r={0.018} m={silver} />
      <mesh geometry={springGeo} position={mid.toArray()} quaternion={q} scale={[1, len * 0.66, 1]} material={M.orange} castShadow />
    </>
  );
}

export function Atv() {
  const tyre = useMemo(() => knobbyGeo(0.29, 0.22), []);
  const num = useLabel("E14", { fg: W.paper, bg: W.ink, w: 256, h: 128, size: 92 });
  const nose = useMemo(() => tapered(0.5, 0.34, 0.36, 0.2, 0.42, 0.5, 0.42), []);
  // roll cage nodes (one side; x mirrors)
  const lr: V3 = [0.3, 0.32, -0.78]; // lower rear
  const lm: V3 = [0.37, 0.3, -0.26]; // lower, at the hoop
  const lf: V3 = [0.22, 0.32, 0.78]; // lower front
  const ht: V3 = [0.31, 1.38, -0.36]; // hoop top
  const rf: V3 = [0.27, 1.32, 0.26]; // roof front
  const uf: V3 = [0.22, 0.58, 0.8]; // upper front
  const sm: V3 = [0.36, 0.68, -0.28]; // side impact, rear
  const sf: V3 = [0.25, 0.64, 0.58]; // side impact, front
  const ur: V3 = [0.29, 0.62, -0.8]; // upper rear
  const hb: V3 = [0.36, 0.98, -0.32]; // hoop at shoulder height
  const tubes: [V3, V3][] = [];
  for (const s of [1, -1]) {
    const m = (p: V3): V3 => [p[0] * s, p[1], p[2]];
    tubes.push(
      [m(lr), m(lm)],
      [m(lm), m(lf)],
      [m(lm), m(hb)],
      [m(hb), m(ht)],
      [m(ht), m(rf)],
      [m(rf), m(uf)],
      [m(uf), m(lf)],
      [m(sm), m(sf)],
      [m(hb), m(ur)],
      [m(ur), m(lr)],
      [m(sf), m(uf)],
    );
  }
  for (const p of [lr, lf, ht, rf, uf, ur, lm]) tubes.push([p, [-p[0], p[1], p[2]]]);

  const R = 0.29;
  const front = 0.74;
  const rear = -0.7;
  return (
    <group>
      {tubes.map(([a, b], i) => (
        <Tube key={i} a={a} b={b} r={0.024} />
      ))}
      {/* floor pan, firewall, the seat */}
      <Box s={[0.66, 0.03, 1.5]} p={[0, 0.3, 0]} m={M.graphite} />
      <Box s={[0.66, 0.66, 0.03]} p={[0, 0.66, -0.34]} m={M.inkMatte} />
      <Box s={[0.42, 0.1, 0.42]} p={[0, 0.4, -0.08]} m={M.graphite} />
      <Box s={[0.42, 0.55, 0.1]} p={[0, 0.68, -0.27]} r={[-0.18, 0, 0]} m={M.graphite} />
      {/* steering column and wheel */}
      <Tube a={[0, 0.62, 0.62]} b={[0, 0.86, 0.3]} r={0.016} m={M.graphite} />
      <mesh position={[0, 0.88, 0.28]} rotation={[0.9, 0, 0]} material={M.ink}>
        <torusGeometry args={[0.13, 0.016, 6, 20]} />
      </mesh>
      {/* ink nose panel and the side panels with the number */}
      <mesh geometry={nose} position={[0, 0, 0.62]} material={M.inkMatte} castShadow />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Box s={[0.02, 0.3, 0.84]} p={[sx * 0.33, 0.48, 0.18]} m={M.inkMatte} />
          <mesh position={[sx * 0.345, 0.48, 0.18]} rotation={[0, (sx * Math.PI) / 2, 0]} material={num}>
            <planeGeometry args={[0.56, 0.28]} />
          </mesh>
        </group>
      ))}
      {/* motor and gearbox behind the firewall */}
      <Box s={[0.44, 0.3, 0.36]} p={[0, 0.5, -0.56]} m={M.graphite} />
      <mesh position={[0, 0.5, -0.56]} rotation={[0, 0, Math.PI / 2]} material={silver}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 14]} />
      </mesh>
      {/* front double wishbones and coilovers */}
      {both([0.6, R, front]).map((hub, i) => {
        const s = Math.sign(hub[0]);
        return (
          <group key={`f${i}`}>
            <Tube a={[s * 0.22, 0.34, front + 0.08]} b={[hub[0] * 0.92, R - 0.04, front]} r={0.016} />
            <Tube a={[s * 0.22, 0.34, front - 0.14]} b={[hub[0] * 0.92, R - 0.04, front]} r={0.016} />
            <Tube a={[s * 0.22, 0.52, front + 0.04]} b={[hub[0] * 0.9, R + 0.09, front]} r={0.016} />
            <Coilover a={[s * 0.48, R - 0.02, front - 0.02]} b={[s * 0.26, 0.98, front - 0.4]} />
            <OffroadWheel p={[s * 0.68, R, front]} geo={tyre} r={R} w={0.22} />
          </group>
        );
      })}
      {/* rear trailing arms and coilovers */}
      {both([0.6, R, rear]).map((hub, i) => {
        const s = Math.sign(hub[0]);
        return (
          <group key={`r${i}`}>
            <Tube a={[s * 0.36, 0.34, -0.26]} b={[s * 0.56, R, rear]} r={0.02} />
            <Tube a={[s * 0.3, 0.32, -0.78]} b={[s * 0.56, R, rear]} r={0.016} />
            <Coilover a={[s * 0.52, R + 0.02, rear + 0.04]} b={[s * 0.33, 1.02, -0.36]} />
            <OffroadWheel p={[s * 0.68, R, rear]} geo={tyre} r={R} w={0.22} />
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ V03 supercar */

function RoadWheel({ p, r, w }: { p: V3; r: number; w: number }) {
  const side = Math.sign(p[0]);
  return (
    <group position={p} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={M.tyre} castShadow>
        <cylinderGeometry args={[r, r, w, 32]} />
      </mesh>
      <mesh position={[0, side * (w / 2 + 0.002), 0]} material={M.graphite}>
        <cylinderGeometry args={[r * 0.72, r * 0.72, 0.01, 24]} />
      </mesh>
      {/* five paper spokes */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, side * (w / 2 + 0.008), 0]} rotation={[0, (i / 5) * Math.PI * 2, 0]} material={silver}>
          <boxGeometry args={[r * 1.3, 0.012, 0.045]} />
        </mesh>
      ))}
    </group>
  );
}

function sideShape(points: [number, number][], arches: [number, number, number][] = [], floor = 0.2) {
  const s = new THREE.Shape();
  s.moveTo(...points[0]);
  for (const p of points.slice(1)) s.lineTo(...p);
  // along the floor from the back to the front, cutting each wheel arch
  for (const [cz, cy, r] of arches) {
    s.lineTo(cz - r, floor);
    s.lineTo(cz - r, cy);
    s.absarc(cz, cy, r, Math.PI, 0, true);
    s.lineTo(cz + r, floor);
  }
  s.closePath();
  return s;
}

function extrudeSide(shape: THREE.Shape, width: number, bevel = 0.04) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 14 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

// supercar wheel radius and axle positions
const R = 0.34;
const fz = 1.42;
const rz = -1.38;

export function Supercar() {
  const body = useMemo(
    () =>
      extrudeSide(
        sideShape(
          [
            [2.32, 0.2],
            [2.38, 0.36],
            [2.12, 0.56],
            [1.45, 0.8],
            [0.85, 0.83],
            [-1.5, 0.96],
            [-2.12, 1.02],
            [-2.3, 0.94],
            [-2.3, 0.32],
            [-2.05, 0.2],
          ],
          [
            [rz, R, 0.42],
            [fz, R, 0.4],
          ],
        ),
        1.94,
      ),
    [],
  );
  const canopy = useMemo(
    () =>
      extrudeSide(
        sideShape([
          [0.95, 0.8],
          [0.12, 1.16],
          [-0.8, 1.19],
          [-1.62, 0.96],
          [-1.62, 0.9],
          [0.95, 0.76],
        ]),
        1.34,
        0.03,
      ),
    [],
  );
  return (
    <group>
      <mesh geometry={body} material={M.paper} castShadow receiveShadow />
      <mesh geometry={canopy} material={M.ink} castShadow />
      {/* wide rear hips over the back wheels */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * 0.98, 0.72, rz - 0.05]} rotation={[0, 0, sx * -0.12]} material={M.paper} castShadow>
            <boxGeometry args={[0.12, 0.22, 1.25]} />
          </mesh>
          {/* ink intake in front of the rear wheel */}
          <Box s={[0.02, 0.24, 0.5]} p={[sx * 0.975, 0.56, -0.66]} r={[0, 0, 0]} m={M.ink} />
          {/* the one orange line along the sill */}
          <Box s={[0.012, 0.045, 1.85]} p={[sx * 0.975, 0.3, 0.02]} m={M.orange} />
          {/* headlight and tail-light slits */}
          <Box s={[0.42, 0.05, 0.06]} p={[sx * 0.62, 0.5, 2.27]} r={[0.5, sx * 0.25, 0]} m={M.ink} />
          <RoadWheel p={[sx * 0.86, R, fz]} r={R} w={0.27} />
          <RoadWheel p={[sx * 0.9, R + 0.01, rz]} r={R + 0.01} w={0.34} />
        </group>
      ))}
      <Box s={[1.7, 0.06, 0.03]} p={[0, 0.82, -2.31]} m={M.ink} />
      {/* a small ducktail wing and a graphite diffuser */}
      <Box s={[1.7, 0.03, 0.28]} p={[0, 1.06, -2.1]} r={[0.12, 0, 0]} m={M.ink} />
      <Box s={[1.6, 0.12, 0.3]} p={[0, 0.24, -2.2]} m={M.graphite} />
      {/* ink splitter and mirrors */}
      <Box s={[1.86, 0.05, 0.3]} p={[0, 0.2, 2.2]} m={M.ink} />
      {[-1, 1].map((sx) => (
        <Box key={sx} s={[0.16, 0.07, 0.1]} p={[sx * 0.86, 0.92, 0.62]} m={M.ink} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ V04 bike */

function BikeWheel({ z, r, w }: { z: number; r: number; w: number }) {
  return (
    <group position={[0, r, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={M.tyre} castShadow>
        <cylinderGeometry args={[r, r, w, 32]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, s * (w / 2 + 0.002), 0]} material={M.graphite}>
            <cylinderGeometry args={[r * 0.74, r * 0.74, 0.008, 28]} />
          </mesh>
          {Array.from({ length: 3 }, (_, i) => (
            <mesh key={i} position={[0, s * (w / 2 + 0.006), 0]} rotation={[0, (i / 3) * Math.PI * 2, 0]} material={silver}>
              <boxGeometry args={[r * 1.45, 0.01, 0.035]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh material={M.graphite}>
        <cylinderGeometry args={[0.05, 0.05, w + 0.06, 10]} />
      </mesh>
    </group>
  );
}

export function Bike() {
  const R = 0.3;
  const fz = 0.72;
  const rz = -0.68;
  const fairing = useMemo(() => tapered(0.34, 0.44, 0.14, 0.16, 0.56, 0.84, 0.9), []);
  const belly = useMemo(() => tapered(0.24, 0.2, 0.2, 0.32, 0.66, 0.4, 0.5), []);
  const tank = useMemo(() => tapered(0.26, 0.14, 0.34, 0.24, 0.46, 1.0, 1.0), []);
  const tail = useMemo(() => tapered(0.08, 0.07, 0.24, 0.2, 0.6, 1.14, 1.0), []);
  const num = useLabel("08", { fg: W.ink, bg: W.paper, w: 192, h: 128, size: 96 });
  return (
    <group>
      <BikeWheel z={fz} r={R} w={0.12} />
      <BikeWheel z={rz} r={R} w={0.18} />
      {/* forks and swingarm */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Tube a={[s * 0.075, R, fz]} b={[s * 0.075, 1.0, fz - 0.28]} r={0.024} m={silver} />
          <Tube a={[s * 0.1, R, rz]} b={[s * 0.1, 0.46, -0.08]} r={0.032} m={M.graphite} />
          {/* clip-on bars */}
          <Tube a={[s * 0.08, 0.98, fz - 0.3]} b={[s * 0.26, 0.96, fz - 0.38]} r={0.014} m={M.ink} />
          {/* side number boards on the tail */}
          <mesh position={[s * 0.1, 1.06, -0.76]} rotation={[0, (s * Math.PI) / 2, 0]} material={num}>
            <planeGeometry args={[0.24, 0.16]} />
          </mesh>
        </group>
      ))}
      {/* engine and exhaust */}
      <Box s={[0.28, 0.36, 0.44]} p={[0, 0.6, 0.02]} m={M.graphite} />
      <Tube a={[0.14, 0.3, 0.2]} b={[0.16, 0.32, -0.38]} r={0.045} m={M.graphite} />
      <Tube a={[0.16, 0.36, -0.38]} b={[0.17, 0.6, -0.72]} r={0.06} m={silver} />
      {/* bodywork: ink fairing, tank and tail, a paper belly pan */}
      <mesh geometry={fairing} position={[0, 0, 0.46]} material={M.paper} castShadow />
      <mesh geometry={belly} position={[0, 0, 0.1]} material={M.ink} castShadow />
      <mesh geometry={tank} position={[0, 0, -0.1]} material={M.ink} castShadow />
      <mesh geometry={tail} position={[0, 0, -0.64]} material={M.paper} castShadow />
      <Box s={[0.26, 0.06, 0.44]} p={[0, 1.04, -0.42]} m={M.graphite} />
      {/* windscreen, headlight, the orange stripe over the nose */}
      <Box s={[0.24, 0.02, 0.3]} p={[0, 1.1, 0.52]} r={[0.5, 0, 0]} m={M.glass} />
      <Box s={[0.12, 0.06, 0.02]} p={[0, 0.88, 0.745]} m={M.ink} />
      {[-1, 1].map((s) => (
        <Box key={s} s={[0.012, 0.04, 0.5]} p={[s * 0.13, 0.8, 0.44]} r={[-0.12, s * 0.17, 0]} m={M.orange} />
      ))}
    </group>
  );
}
