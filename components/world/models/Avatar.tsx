"use client";

// Chibi Henil as a designer-vinyl racing figure.
// Avatar: standing, origin at feet, faces +Z, ~1.3 m tall.

import { useMemo, useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

type GroupProps = ThreeElements["group"];
const PI = Math.PI;


/* ------------------------------------------------------------------ */
/* Material helpers                                                    */
/* ------------------------------------------------------------------ */

/** Hex -> GLSL vec3 in linear space. */
function glslColor(hex: string) {
  const c = new THREE.Color(hex);
  return `vec3(${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)})`;
}

const GLSL_HELPERS = /* glsl */ `
float lvAA(float d) { float w = fwidth(d) * 0.8 + 1e-5; return smoothstep(-w, w, d); }
float lvBand(float v, float a, float b) { return lvAA(v - a) * lvAA(b - v); }
float lvCat(float a, float b, float c, float d, float t) {
  float t2 = t * t; float t3 = t2 * t;
  return 0.5 * (2.0 * b + (-a + c) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t2 + (-a + 3.0 * b - 3.0 * c + d) * t3);
}
`;

/**
 * MeshPhysicalMaterial whose colour and roughness come from
 * `vec4 livery(vec3 p, vec3 n)` (geometry-space position and normal,
 * returns rgb + roughness).
 */
function liveryMaterial(key: string, glsl: string, params: THREE.MeshPhysicalMaterialParameters = {}) {
  const m = new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, ...params });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLvP;\nvarying vec3 vLvN;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLvP = position;\nvLvN = normal;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vLvP;\nvarying vec3 vLvN;\n${GLSL_HELPERS}\n${glsl}`)
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nvec4 lvOut = livery(vLvP, normalize(vLvN));\ndiffuseColor.rgb = lvOut.rgb;",
      )
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = lvOut.a;");
  };
  m.customProgramCacheKey = () => "livery-" + key;
  return m;
}

function physical(color: string, roughness = 0.3, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, ...extra });
}

const COL = {
  suit: "#f4f3ef",
  red: "#e0111f",
  blue: "#1f4fd1",
  black: "#1b1b1f",
  skin: "#b27650",
  skinShade: "#9a5f3d",
  hair: "#1a120e",
  eye: "#120b08",
  mouth: "#5b2219",
  blush: "#e2737a",
  rim: "#17171a",
};

/* ------------------------------------------------------------------ */
/* Materials + geometry                                                */
/* ------------------------------------------------------------------ */

const SW = glslColor(COL.suit);
const SR = glslColor(COL.red);

// Helmet shell in unit-sphere space: two bold red stripes front to back over the top.
const HELMET_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float ax = abs(p.x);
  float stripe = lvBand(ax, 0.09, 0.22) * lvAA(p.y + 0.6);
  float pin = lvBand(ax, 0.25, 0.275) * lvAA(p.y + 0.6);
  // red lower edge band at the back/neck
  float hem = lvAA(-0.78 - p.y);
  vec3 col = mix(${SW}, ${SR}, max(max(stripe, pin), hem));
  return vec4(col, 0.22);
}
`;

// Race suit legs (unit capsule): red stripe down the outer and inner side.
const LEG_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float s = lvAA(abs(p.x) - 0.82) * lvBand(p.z, -0.42, 0.42) * lvAA(p.y + 0.95);
  return vec4(mix(${SW}, ${SR}, s), 0.42);
}
`;

// Torso (metres, lathe space): red side panels, red collar.
const TORSO_GLSL = /* glsl */ `
vec4 livery(vec3 p, vec3 n) {
  float side = lvAA(abs(n.x) - 0.9) * lvAA(0.3 - p.y);
  float collar = lvAA(p.y - 0.315);
  return vec4(mix(${SW}, ${SR}, max(side, collar)), 0.42);
}
`;

let KIT: ReturnType<typeof makeKit> | null = null;
function makeKit() {
  const satin = { clearcoat: 0.45, clearcoatRoughness: 0.35 };
  const m = {
    helmet: liveryMaterial("helmet", HELMET_GLSL),
    rim: physical(COL.rim, 0.6, { clearcoat: 0.2 }),
    liner: physical("#2a2a2e", 0.8, { side: THREE.BackSide }),
    red: physical(COL.red, 0.28, { clearcoat: 1, clearcoatRoughness: 0.15 }),
    redSatin: physical(COL.red, 0.42, satin),
    suit: physical(COL.suit, 0.42, satin),
    leg: liveryMaterial("leg", LEG_GLSL, satin),
    torso: liveryMaterial("torso", TORSO_GLSL, satin),
    blue: physical(COL.blue, 0.38, satin),
    black: physical(COL.black, 0.48, satin),
    buckle: physical("#d9dadf", 0.25, { metalness: 0.9 }),
    skin: physical(COL.skin, 0.5, { clearcoat: 0.15, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color("#f0b38f") }),
    skinShade: physical(COL.skinShade, 0.55),
    hair: physical(COL.hair, 0.42, { clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    eye: physical(COL.eye, 0.08, { clearcoat: 1, clearcoatRoughness: 0.02 }),
    iris: physical("#3d2014", 0.15, { clearcoat: 1, clearcoatRoughness: 0.05 }),
    shine: new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    mouth: physical(COL.mouth, 0.4),
    blush: new THREE.MeshStandardMaterial({ color: COL.blush, roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false }),
  };

  // helmet: unit sphere with a round face opening facing forward-down
  const TILT = 0.42; // opening axis tilted down
  const OPEN = 0.86; // opening half-angle
  const shell = new THREE.SphereGeometry(1, 72, 48, 0, PI * 2, OPEN, PI - OPEN).rotateX(PI / 2 + TILT);
  const rim = new THREE.TorusGeometry(Math.sin(OPEN), 0.072, 16, 72)
    .rotateX(TILT)
    .translate(0, -Math.sin(TILT) * Math.cos(OPEN), Math.cos(TILT) * Math.cos(OPEN));
  const linerG = shell.clone().scale(0.97, 0.97, 0.97);
  const pod = new THREE.SphereGeometry(1, 32, 20);

  // torso: smooth chibi bean, lathe
  const prof = new THREE.SplineCurve(
    [
      [0.0, -0.07],
      [0.12, -0.06],
      [0.168, 0.0],
      [0.178, 0.1],
      [0.172, 0.2],
      [0.152, 0.28],
      [0.112, 0.325],
      [0.07, 0.345],
      [0.0, 0.35],
    ].map(([a, b]) => new THREE.Vector2(a, b)),
  ).getPoints(40);
  prof[0].x = 0;
  prof[prof.length - 1].x = 0;
  const torso = new THREE.LatheGeometry(prof, 56).scale(1, 1, 0.82);
  // belt: a slice of the torso profile pushed outward so it hugs the body
  const beltProf = prof
    .filter((p) => p.y > 0.005 && p.y < 0.085)
    .map((p) => new THREE.Vector2(p.x + 0.009, p.y));
  beltProf.unshift(new THREE.Vector2(beltProf[0].x - 0.009, beltProf[0].y - 0.002));
  beltProf.push(new THREE.Vector2(beltProf[beltProf.length - 1].x - 0.009, beltProf[beltProf.length - 1].y + 0.002));
  const belt = new THREE.LatheGeometry(beltProf, 56).scale(1, 1, 0.82);

  const g = {
    shell,
    rim,
    liner: linerG,
    pod,
    torso,
    sphere: new THREE.SphereGeometry(1, 32, 24),
    // teardrop strand, point down
    strand: new THREE.LatheGeometry(
      Array.from({ length: 25 }, (_, i) => {
        const t = i / 24;
        return new THREE.Vector2(Math.pow(Math.sin(PI * t), 0.7) * (1 - 0.5 * t) + 1e-4, 1 - 2 * t);
      }),
      24,
    ),
    // hair cap: crown of the head, tilted so it frames the forehead
    hairCap: new THREE.SphereGeometry(1, 40, 16, 0, PI * 2, 0, 1.25).rotateX(0.1),
    lowSphere: new THREE.SphereGeometry(1, 18, 12),
    capsule: new THREE.CapsuleGeometry(1, 1, 8, 20),
    smile: new THREE.TorusGeometry(1, 0.22, 10, 32, PI * 0.62).rotateZ(PI * 1.5 - PI * 0.31),
    belt,
    cyl: new THREE.CylinderGeometry(1, 1, 1, 28),
    chevron: (() => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.lineTo(0.5, 0.5);
      s.lineTo(0, 1);
      s.lineTo(0.38, 1);
      s.lineTo(0.88, 0.5);
      s.lineTo(0.38, 0);
      s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false }).translate(-0.44, -0.5, 0);
    })(),
  };
  return { m, g, TILT, OPEN };
}
type Kit = ReturnType<typeof makeKit>;
function useKit() {
  return useMemo(() => (KIT ??= makeKit()), []);
}

/** Point + orientation on a sphere (centre c, radius r) at yaw/pitch, facing outward. */
function onSphere(c: [number, number, number], r: number, yaw: number, pitch: number) {
  const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const pos = new THREE.Vector3(...c).addScaledVector(d, r);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
  return { position: pos.toArray() as [number, number, number], quaternion: q };
}

/* ------------------------------------------------------------------ */
/* Head + helmet (centre origin, faces +Z, unit space x HEAD_R)        */
/* ------------------------------------------------------------------ */

const HEAD_R = 0.28;
const FACE_C: [number, number, number] = [0, -0.03, 0.055];
const FACE_R = 0.93;

function Face({ kit }: { kit: Kit }) {
  const { m, g } = kit;
  const f = useMemo(() => {
    const eye = (s: number) => onSphere(FACE_C, FACE_R, s * 0.34, -0.2);
    const brow = (s: number) => onSphere(FACE_C, FACE_R, s * 0.36, 0.05);
    const blush = (s: number) => onSphere(FACE_C, FACE_R, s * 0.58, -0.44);
    const fringe = [-0.56, -0.34, -0.12, 0.1, 0.32, 0.54].map((yaw, i) =>
      onSphere(FACE_C, FACE_R + 0.03, yaw, 0.3 - Math.abs(yaw) * 0.12 + (i % 2) * 0.025),
    );
    return {
      eyes: [1, -1].map(eye),
      brows: [1, -1].map(brow),
      blush: [1, -1].map(blush),
      nose: onSphere(FACE_C, FACE_R, 0, -0.4),
      mouth: onSphere(FACE_C, FACE_R, 0, -0.6),
      fringe,
    };
  }, []);
  return (
    <group>
      {/* skin */}
      <mesh geometry={g.sphere} material={m.skin} position={FACE_C} scale={FACE_R} castShadow receiveShadow />
      {/* eyes: glossy dark, iris ring, two highlights */}
      {f.eyes.map((e, i) => (
        <group key={i} position={e.position} quaternion={e.quaternion}>
          <mesh geometry={g.sphere} material={m.eye} scale={[0.13, 0.165, 0.05]} />
          <mesh geometry={g.sphere} material={m.iris} position={[0, -0.035, 0.014]} scale={[0.095, 0.1, 0.042]} />
          <mesh geometry={g.sphere} material={m.eye} position={[0, -0.03, 0.022]} scale={[0.06, 0.065, 0.038]} />
          <mesh geometry={g.lowSphere} material={m.shine} position={[0.045, 0.06, 0.045]} scale={[0.038, 0.044, 0.01]} />
          <mesh geometry={g.lowSphere} material={m.shine} position={[-0.05, -0.075, 0.04]} scale={0.016} />
        </group>
      ))}
      {/* brows */}
      {f.brows.map((b, i) => (
        <group key={i} position={b.position} quaternion={b.quaternion}>
          <mesh geometry={g.capsule} material={m.hair} rotation={[0, 0, PI / 2 + (i === 0 ? -0.12 : 0.12)]} scale={[0.026, 0.06, 0.018]} />
        </group>
      ))}
      {/* blush */}
      {f.blush.map((b, i) => (
        <group key={i} position={b.position} quaternion={b.quaternion}>
          <mesh geometry={g.lowSphere} material={m.blush} scale={[0.1, 0.06, 0.02]} />
        </group>
      ))}
      {/* nose + smile */}
      <group position={f.nose.position} quaternion={f.nose.quaternion}>
        <mesh geometry={g.sphere} material={m.skinShade} scale={[0.045, 0.035, 0.03]} />
      </group>
      <group position={f.mouth.position} quaternion={f.mouth.quaternion}>
        <mesh geometry={g.smile} material={m.mouth} scale={[0.11, 0.085, 0.08]} />
      </group>
      {/* hair fringe peeking out under the helmet */}
      <mesh geometry={g.hairCap} material={m.hair} position={FACE_C} scale={FACE_R + 0.008} />
      {f.fringe.map((h, i) => (
        <group key={i} position={h.position} quaternion={h.quaternion}>
          <mesh
            geometry={g.strand}
            material={m.hair}
            rotation={[0.2, 0, 0.38 + (i % 2) * 0.1]}
            position={[0, -0.03, -0.012]}
            scale={[0.155, 0.22, 0.05]}
            castShadow
          />
        </group>
      ))}
    </group>
  );
}

function Helmet({ kit }: { kit: Kit }) {
  const { m, g } = kit;
  const logo = useMemo(() => onSphere([0, 0, 0], 1.0, 0, 0.68), []);
  return (
    <group>
      <mesh geometry={g.shell} material={m.helmet} castShadow receiveShadow />
      <mesh geometry={g.liner} material={m.liner} />
      <mesh geometry={g.rim} material={m.rim} castShadow />
      {/* ear pods */}
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.975, -0.12, -0.04]}>
          <mesh geometry={g.pod} material={m.red} scale={[0.09, 0.23, 0.23]} castShadow />
          <mesh geometry={g.cyl} material={m.rim} position={[s * 0.07, 0, 0]} rotation={[0, 0, PI / 2]} scale={[0.12, 0.04, 0.12]} />
        </group>
      ))}
      {/* forehead logo: red chevron + HG */}
      <group position={logo.position} quaternion={logo.quaternion}>
        <mesh geometry={g.chevron} material={m.red} position={[-0.17, 0, -0.03]} scale={[0.12, 0.12, 0.2]} />
        <Text font="/fonts/racero.otf" position={[0.06, 0, 0.012]} fontSize={0.15} material={m.red} anchorX="center" anchorY="middle">
          HG
        </Text>
      </group>
    </group>
  );
}

function Head({ kit }: { kit: Kit }) {
  return (
    <group scale={[HEAD_R, HEAD_R * 0.97, HEAD_R * 1.03]}>
      <Face kit={kit} />
      <Helmet kit={kit} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Torso (origin at hip, faces +Z)                                     */
/* ------------------------------------------------------------------ */

function Torso({ kit }: { kit: Kit }) {
  const { m, g } = kit;
  return (
    <group>
      <mesh geometry={g.torso} material={m.torso} castShadow receiveShadow />
      {/* belt + buckle */}
      <mesh geometry={g.belt} material={m.blue} castShadow />
      <RoundedBox args={[0.075, 0.05, 0.03]} radius={0.012} smoothness={3} position={[0, 0.045, 0.142]} material={m.buckle} castShadow />
      <RoundedBox args={[0.05, 0.026, 0.03]} radius={0.008} smoothness={2} position={[0, 0.045, 0.148]} material={m.blue} />
      {/* chest patches */}
      <group position={[0.07, 0.21, 0.13]} rotation={[-0.15, 0.42, 0]}>
        <RoundedBox args={[0.07, 0.04, 0.012]} radius={0.005} smoothness={2} material={m.red} castShadow />
      </group>
      <group position={[-0.07, 0.21, 0.13]} rotation={[-0.15 + PI / 2, 0, 0.42]}>
        <mesh geometry={g.cyl} material={m.blue} scale={[0.025, 0.012, 0.025]} rotation={[0, 0, 0]} />
      </group>
    </group>
  );
}

const SHOULDER_Y = 0.27;

function Arm({ kit, side }: { kit: Kit; side: 1 | -1 }) {
  // hangs from its pivot
  const { m, g } = kit;
  return (
    <group>
      <mesh geometry={g.capsule} material={m.leg} position={[0, -0.1, 0]} rotation={[0, PI / 2, 0]} scale={[0.052, 0.08, 0.052]} castShadow />
      <mesh geometry={g.cyl} material={m.redSatin} position={[0, -0.2, 0]} scale={[0.056, 0.04, 0.056]} castShadow />
      <mesh geometry={g.sphere} material={m.black} position={[side * 0.004, -0.255, 0.004]} scale={[0.056, 0.062, 0.056]} castShadow />
      <mesh geometry={g.sphere} material={m.black} position={[-side * 0.03, -0.235, 0.03]} scale={[0.022, 0.03, 0.022]} castShadow />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar (standing)                                                   */
/* ------------------------------------------------------------------ */

export type AvatarProps = GroupProps & { wave?: boolean; look?: [number, number, number] };

const _v = new THREE.Vector3();
const HIP_Y = 0.42;

export function Avatar({ wave = false, look, ...props }: AvatarProps) {
  const kit = useKit();
  const { m, g } = kit;
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const waveAmt = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const b = Math.sin(t * 2.2);
    if (body.current) {
      body.current.position.y = HIP_Y + b * 0.006;
      body.current.scale.set(1 - b * 0.006, 1 + b * 0.01, 1 - b * 0.006);
    }
    waveAmt.current = THREE.MathUtils.damp(waveAmt.current, wave ? 1 : 0, 6, dt);
    const w = waveAmt.current;
    if (rArm.current) {
      rArm.current.rotation.z = THREE.MathUtils.lerp(-0.2, -2.45 + Math.sin(t * 9) * 0.3, w);
      rArm.current.rotation.x = Math.sin(t * 2.2 + 1) * 0.03 * (1 - w);
    }
    if (lArm.current) lArm.current.rotation.z = 0.2 + Math.sin(t * 2.2) * 0.02;
    if (head.current) {
      let yaw = Math.sin(t * 0.7) * 0.05;
      let pitch = 0;
      if (look && head.current.parent) {
        _v.set(look[0], look[1], look[2]);
        head.current.parent.worldToLocal(_v);
        _v.sub(head.current.position);
        yaw = THREE.MathUtils.clamp(Math.atan2(_v.x, _v.z), -0.6, 0.6);
        pitch = THREE.MathUtils.clamp(-Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), -0.3, 0.3);
      }
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, yaw, 5, dt);
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, pitch, 5, dt);
      head.current.rotation.z = w * Math.sin(t * 4.5) * 0.05;
    }
  });

  return (
    <group {...props}>
      {/* legs + boots */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh geometry={g.capsule} material={m.leg} position={[s * 0.085, 0.27, 0]} rotation={[0, s > 0 ? 0 : PI, 0]} scale={[0.074, 0.1, 0.074]} castShadow receiveShadow />
          <mesh geometry={g.cyl} material={m.redSatin} position={[s * 0.085, 0.135, 0]} scale={[0.077, 0.03, 0.077]} castShadow />
          <RoundedBox args={[0.135, 0.11, 0.22]} radius={0.05} smoothness={4} position={[s * 0.088, 0.068, 0.025]} material={m.black} castShadow receiveShadow />
          <RoundedBox args={[0.136, 0.026, 0.216]} radius={0.012} smoothness={3} position={[s * 0.088, 0.013, 0.025]} material={m.red} castShadow />
        </group>
      ))}
      <group ref={body} position={[0, HIP_Y, 0]}>
        <Torso kit={kit} />
        <group ref={rArm} position={[-0.17, SHOULDER_Y, 0]}>
          <Arm kit={kit} side={-1} />
        </group>
        <group ref={lArm} position={[0.17, SHOULDER_Y, 0]}>
          <Arm kit={kit} side={1} />
        </group>
        <group ref={head} position={[0, 0.6, 0]}>
          <Head kit={kit} />
        </group>
      </group>
    </group>
  );
}
