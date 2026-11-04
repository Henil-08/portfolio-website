"use client";

// The studio product-render look of the approved concept images (public/models/concepts):
// a seamless warm-grey cyclorama, a soft environment of large light panels (no HDR files),
// one big soft key with soft shadows, area-light shadows on the floor that fade with distance,
// and filmic tone mapping that keeps the palette true. Built for /docs/brand/models; each part
// stands alone so the world can take the ones that keep frame rate.
import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { EffectComposer, N8AO, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * Tone mapping for the studio: Khronos PBR Neutral, which is filmic in the highlights but
 * leaves base colours alone below them, so paper stays paper, ink ink and orange orange (AgX
 * greys and desaturates the orange; ACES shifts it to red and crushes ink).
 */
export const STUDIO_TONE = { toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0 } as const;
export const STUDIO_TONE_MODE = ToneMappingMode.NEUTRAL;

/** Key light direction (from the model toward the light): high on the right of the default view, as in the concepts (shadows fall left). */
export const KEY_DIR = new THREE.Vector3(0.75, 1.4, -0.15).normalize();

/** Concept backdrop: near-white grey at the top, warm grey floor, a soft fall-off between. */
const CYC = { top: "#cdc9c0", wall: "#d6d2c9", floor: "#ddd9d0", centre: "#d8d4cb" };

/** Seamless sweep: floor, a curved cove, a wall all round. Unlit, vertex-graded, so it never banding-steps under the lights. */
export function Cyclorama({ radius }: { radius: number }) {
  const geo = useMemo(() => {
    const R = radius;
    const cove = R * 0.45;
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector2(((R - cove) * i) / 12, 0));
    for (let i = 1; i <= 16; i++) {
      const a = (i / 16) * (Math.PI / 2);
      pts.push(new THREE.Vector2(R - cove + Math.sin(a) * cove, cove - Math.cos(a) * cove));
    }
    for (let i = 1; i <= 8; i++) pts.push(new THREE.Vector2(R, cove + (i / 8) * R * 1.6));
    const g = new THREE.LatheGeometry(pts, 96);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const top = new THREE.Color(CYC.top);
    const wall = new THREE.Color(CYC.wall);
    const floor = new THREE.Color(CYC.floor);
    const centre = new THREE.Color(CYC.centre);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (y < 1e-4) c.copy(centre).lerp(floor, THREE.MathUtils.smoothstep(r / (R - cove), 0, 1));
      else if (y < cove) c.copy(floor).lerp(wall, THREE.MathUtils.smoothstep(y / cove, 0, 1));
      else c.copy(wall).lerp(top, THREE.MathUtils.smoothstep((y - cove) / (R * 1.2), 0, 1));
      c.toArray(col, i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [radius]);
  return (
    <mesh geometry={geo} renderOrder={-1}>
      <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} fog={false} />
    </mesh>
  );
}

/** Image-based light from soft panels: a big overhead box, a front-left key panel, a cool fill and a rim. */
export function StudioEnvironment({ intensity = 1.2 }: { intensity?: number }) {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={intensity}>
      <color attach="background" args={["#8c8984"]} />
      {/* overhead softbox */}
      <Lightformer form="rect" intensity={1.8} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      {/* key panel, with the key light */}
      <Lightformer form="rect" intensity={1.8} color="#fff8ee" position={[KEY_DIR.x * 6, KEY_DIR.y * 6, KEY_DIR.z * 6]} scale={[5, 5, 1]} target={[0, 0, 0]} />
      {/* fill from the front-left, cooler and weaker */}
      <Lightformer form="rect" intensity={0.8} color="#eef1f4" position={[-4, 2, 5]} scale={[6, 4, 1]} target={[0, 0, 0]} />
      {/* rim strip behind */}
      <Lightformer form="rect" intensity={1.2} position={[0, 3, -6]} scale={[10, 1.5, 1]} target={[0, 0, 0]} />
      {/* floor bounce */}
      <Lightformer form="rect" intensity={0.55} color="#e2dfd8" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
    </Environment>
  );
}

/** The key: a directional light with a soft (wide PCF) shadow for self-shadowing on the model. */
export function StudioKey({ size, intensity = 1.4 }: { size: number; intensity?: number }) {
  const d = size * 3;
  return (
    <directionalLight
      position={[KEY_DIR.x * d, KEY_DIR.y * d, KEY_DIR.z * d]}
      intensity={intensity}
      color="#fff6ea"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-radius={10}
      shadow-blurSamples={16}
      shadow-bias={-0.0003}
      shadow-normalBias={size * 0.004}
      shadow-camera-left={-size}
      shadow-camera-right={size}
      shadow-camera-top={size}
      shadow-camera-bottom={-size}
      shadow-camera-near={0.1}
      shadow-camera-far={d * 2.5}
    />
  );
}

/**
 * Floor shadows: a soft contact shadow that fades with distance from the floor (ContactShadows,
 * rendered once), and the key's soft shadow caught on an invisible plane over the backdrop.
 */
export function StudioFloorShadow({ size, frames = 1 }: { size: number; frames?: number }) {
  return (
    <>
      <ContactShadows frames={frames} position={[0, 0.003, 0]} scale={size * 3.2} resolution={512} blur={2.4} far={size * 0.4} opacity={0.85} color="#2a2520" />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[size * 8, size * 8]} />
        <shadowMaterial transparent opacity={0.2} color="#2a2520" />
      </mesh>
    </>
  );
}

/** Screen-space AO (N8AO) and the tone mapping (the composer renders linear, so it maps at the end). */
export function StudioPost({ radius }: { radius: number }) {
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={radius} distanceFalloff={0.6} intensity={1.8} quality="high" halfRes={false} color="#2a2620" />
      <ToneMapping mode={STUDIO_TONE_MODE} />
    </EffectComposer>
  );
}

/** The whole studio set around a model `size` metres across. */
export function StudioSet({ size, camDistance, post, children }: { size: number; camDistance: number; post?: boolean; children?: ReactNode }) {
  return (
    <>
      <Cyclorama radius={Math.max(camDistance * 1.8, size * 3)} />
      <StudioEnvironment />
      <StudioKey size={size} />
      <StudioFloorShadow size={size} />
      {children}
      {post && <StudioPost radius={size * 0.12} />}
    </>
  );
}
