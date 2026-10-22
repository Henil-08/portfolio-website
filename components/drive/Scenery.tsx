"use client";

import { useMemo } from "react";
import { APRON, CRICKET, FOOTBALL, GARAGE, HALF_WIDTH, PIT_BOX } from "./circuit";
import { pitBoxTexture, pitchTexture, signTexture } from "./textures";

const flat = [-Math.PI / 2, 0, 0] as const;

/** Concrete apron, pit box and the garage building beside the start straight. */
function Garage() {
  const box = useMemo(() => pitBoxTexture(), []);
  const sign = useMemo(() => signTexture("GARAGE · PROJECTS", "#e10600", "#ffffff"), []);
  // stop the apron short of the track edge so it never fights the asphalt
  const top = Math.min(APRON.maxZ, -120 - HALF_WIDTH - 1);
  const depth = top - APRON.minZ;
  const front = GARAGE.z + GARAGE.d / 2;
  return (
    <group>
      <mesh rotation={flat} position={[(APRON.minX + APRON.maxX) / 2, 0.012, APRON.minZ + depth / 2]}>
        <planeGeometry args={[APRON.maxX - APRON.minX, depth]} />
        <meshLambertMaterial color="#3a3d43" polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh rotation={flat} position={[PIT_BOX.x, 0.03, PIT_BOX.z]}>
        <planeGeometry args={[PIT_BOX.w, PIT_BOX.l]} />
        <meshBasicMaterial map={box} transparent polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {/* building */}
      <mesh position={[GARAGE.x, GARAGE.h / 2, GARAGE.z]}>
        <boxGeometry args={[GARAGE.w, GARAGE.h, GARAGE.d]} />
        <meshLambertMaterial color="#2a2e36" />
      </mesh>
      {/* three open bays */}
      {[-14, 0, 14].map((x) => (
        <mesh key={x} position={[GARAGE.x + x, 2.6, front + 0.02]}>
          <planeGeometry args={[11, 5.2]} />
          <meshBasicMaterial color={x === 0 ? "#14171c" : "#0b0d10"} />
        </mesh>
      ))}
      <mesh position={[GARAGE.x, 7, front + 0.03]}>
        <planeGeometry args={[24, 2.4]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* a spare front wing on a stand in the middle bay, for flavour */}
      <mesh position={[GARAGE.x, 1, front - 1.5]}>
        <boxGeometry args={[4, 0.1, 1]} />
        <meshLambertMaterial color="#e10600" />
      </mesh>
    </group>
  );
}

function Stumps({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      {[-0.11, 0, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.36, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.72, 5]} />
          <meshLambertMaterial color="#efe6cf" />
        </mesh>
      ))}
    </group>
  );
}

function CricketGround() {
  return (
    <group position={[CRICKET.x, 0, CRICKET.z]}>
      <mesh rotation={flat} position={[0, 0.01, 0]}>
        <circleGeometry args={[CRICKET.radius, 28]} />
        <meshLambertMaterial color="#3a6a33" polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh rotation={flat} position={[0, 0.02, 0]}>
        <ringGeometry args={[CRICKET.radius - 0.5, CRICKET.radius, 40]} />
        <meshBasicMaterial color="#e8e8e8" polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {/* 22 yard strip */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[3, 0.04, 20.1]} />
        <meshLambertMaterial color="#c8b27c" />
      </mesh>
      <Stumps z={10} />
      <Stumps z={-10} />
      {/* sight screen */}
      <mesh position={[0, 2.5, CRICKET.radius + 3]}>
        <boxGeometry args={[10, 5, 0.4]} />
        <meshLambertMaterial color="#f2f2f2" />
      </mesh>
      {/* a red ball near the crease */}
      <mesh position={[0.6, 0.12, 8.4]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshLambertMaterial color="#b3120c" />
      </mesh>
    </group>
  );
}

function Goal({ x, dir }: { x: number; dir: 1 | -1 }) {
  const w = 7.32;
  const h = 2.44;
  return (
    <group position={[x, 0, 0]}>
      {[-w / 2, w / 2].map((z) => (
        <mesh key={z} position={[0, h / 2, z]}>
          <boxGeometry args={[0.12, h, 0.12]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[0.12, 0.12, w + 0.12]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <mesh position={[dir * 1, h / 2, 0]}>
        <boxGeometry args={[2, h, w]} />
        <meshBasicMaterial color="#dfe3ea" wireframe transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function FootballPitch() {
  const tex = useMemo(() => pitchTexture(), []);
  return (
    <group position={[FOOTBALL.x, 0, FOOTBALL.z]}>
      <mesh rotation={flat} position={[0, 0.015, 0]}>
        <planeGeometry args={[FOOTBALL.w, FOOTBALL.l]} />
        <meshLambertMaterial map={tex} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <Goal x={-FOOTBALL.w / 2 + 0.6} dir={-1} />
      <Goal x={FOOTBALL.w / 2 - 0.6} dir={1} />
      <mesh position={[3, 0.22, 2]}>
        <icosahedronGeometry args={[0.22, 1]} />
        <meshLambertMaterial color="#f4f4f4" flatShading />
      </mesh>
    </group>
  );
}

export function Scenery() {
  return (
    <group>
      <Garage />
      <CricketGround />
      <FootballPitch />
    </group>
  );
}
