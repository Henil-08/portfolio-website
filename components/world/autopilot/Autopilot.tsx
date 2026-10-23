"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Population } from "./sim";
import { getState, setState, useWorld } from "../store";
import { START_T } from "../layout";
import { ghostLeader } from "../carState";

const SIZE = 40;
const SIM_DT = 1 / 30;
const STEPS_PER_FRAME = 8; // about 4x real time at 60 fps

// A low-poly F1 silhouette for the ghosts: nose, tub, sidepods, wings, wheels.
function ghostGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    parts.push(g);
  };
  box(1.5, 0.22, 0.42, 0.25, 0.2, 0); // tub
  box(0.9, 0.12, 0.22, 1.25, 0.14, 0); // nose
  box(0.9, 0.18, 0.86, -0.2, 0.18, 0); // sidepods
  box(0.22, 0.05, 1.2, 1.65, 0.06, 0); // front wing
  box(0.25, 0.28, 1.0, -0.95, 0.42, 0); // rear wing
  box(0.4, 0.2, 0.18, 0.05, 0.38, 0); // airbox
  for (const [x, z] of [
    [0.95, 0.55],
    [0.95, -0.55],
    [-0.8, 0.56],
    [-0.8, -0.56],
  ]) {
    const w = new THREE.CylinderGeometry(0.24, 0.24, 0.26, 12);
    w.rotateX(Math.PI / 2);
    w.translate(x, 0.24, z);
    parts.push(w);
  }
  const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  parts.forEach((p) => p.dispose());
  return merged;
}

// Ghost cars that learn to drive the circuit by neuroevolution, live in the browser.
export default function Autopilot() {
  const on = useWorld((s) => s.autopilot.on);
  return on ? <Ghosts /> : null;
}

function Ghosts() {
  const pop = useMemo(() => new Population(SIZE, START_T), []);
  const geo = useMemo(() => ghostGeometry(), []);
  useLayoutEffect(
    () => () => {
      ghostLeader.active = false;
    },
    []
  );
  const body = useRef<THREE.InstancedMesh>(null);
  const lead = useRef<THREE.Group>(null);
  const m = useMemo(() => new THREE.Object3D(), []);
  const hud = useRef(0);

  useLayoutEffect(() => {
    setState((s) => ({ autopilot: { ...s.autopilot, gen: 1, alive: SIZE, best: 0, history: [] } }));
  }, []);

  useFrame((_, dt) => {
    for (let i = 0; i < STEPS_PER_FRAME; i++) pop.step(SIM_DT);
    const b = body.current;
    if (!b) return;
    let alive = 0;
    pop.cars.forEach((c, i) => {
      if (c.alive) alive++;
      m.position.set(c.x, c.alive ? 0.02 : -5, c.z);
      m.rotation.set(0, c.h, 0);
      m.updateMatrix();
      b.setMatrixAt(i, m.matrix);
    });
    b.instanceMatrix.needsUpdate = true;

    const L = pop.leader();
    ghostLeader.pos.set(L.x, 0, L.z);
    ghostLeader.active = true;
    if (lead.current) {
      lead.current.position.set(L.x, 0.02, L.z);
      lead.current.rotation.set(0, L.h, 0);
    }

    hud.current += dt;
    if (hud.current > 0.25) {
      hud.current = 0;
      const a = getState().autopilot;
      if (a.gen !== pop.gen || a.alive !== alive) {
        setState({ autopilot: { on: true, gen: pop.gen, alive, best: pop.best, history: pop.history.slice(-40) } });
      }
    }
  });

  return (
    <group>
      {/* Holographic ghosts: additive teal, so they read as AI drivers, not real cars */}
      <instancedMesh ref={body} args={[geo, undefined, SIZE]} frustumCulled={false}>
        <meshBasicMaterial color="#2ad4c4" transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </instancedMesh>
      {/* The current leader glows purple, like the fastest sector */}
      <group ref={lead}>
        <mesh geometry={geo}>
          <meshBasicMaterial color="#b14cff" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.03, 0]}>
          <ringGeometry args={[1.7, 1.85, 40]} />
          <meshBasicMaterial color="#b14cff" transparent opacity={0.7} />
        </mesh>
      </group>
    </group>
  );
}
