"use client";

// Contact, the way the original does its social area: one monument per link in a half ring
// round a waving Henil, a low CONTACT sign in front. Drive up to a monument and the prompt names
// it; E (or a click on the prompt) opens the link. Links come from content/profile.ts only.
import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { profile } from "@/content/profile";
import { carState } from "../carState";
import { C } from "../palette";
import { heightAt } from "../terrain";
import { zoneById, zones } from "../layout";
import { getState, setState } from "../store";
import { mat } from "../models/props/shared";
import { Avatar } from "../models/Avatar";
import { real, WORLD_SCALE } from "../scale";
import { Label } from "../models/props/Label";

export type SocialLink = { key: string; name: string; url: string };

export const LINKS: SocialLink[] = [
  { key: "mail", name: "Email", url: `mailto:${profile.email}` },
  { key: "linkedin", name: "LinkedIn", url: profile.links.linkedin },
  { key: "github", name: "GitHub", url: profile.links.github },
  { key: "resume", name: "Résumé", url: profile.resume },
  { key: "scholar", name: "Scholar", url: profile.links.scholar },
  { key: "huggingface", name: "Hugging Face", url: profile.links.huggingface },
  { key: "medium", name: "Medium", url: profile.links.medium },
];

/** Centre of the ring: the monuments bow away from the camera (to -z), open side toward it. */
// The ring stands on its park island, 3 m behind the contact zone's hotspot.
export const SOCIAL = { center: [zoneById.contact.pos[0], zoneById.contact.pos[1] - 3] as [number, number], radius: 6.2, reach: 2.6 };

/** Where the car drives in: the contact hotspot. Every monument faces it. */
const DRIVE_IN: [number, number] = [zoneById.contact.pos[0], zoneById.contact.pos[1]];

// ------------------------------------------------------------ monuments

// The approved Meshy monuments (public/models/<key>.glb, concepts in public/models/concepts),
// each a sculpture on its own stepped plinth with a blank plaque, in its own texture with its
// one orange accent. They stand a real 3 m (docs/research/model-fidelity.md, "World scale").
const MONUMENT_H = real(3);
/** Every monument GLB is this tall in its own units (gltf-transform centre, pivot below). */
const MODEL_H = 1.903;
const K = MONUMENT_H / MODEL_H;

type Fit = {
  /** plinth footprint, half width (x) and half depth (z), model units */
  foot: [number, number];
  /** the blank plaque on the plinth's front (+z): bottom and top y, half width, face z; model units */
  plaque: [number, number, number, number];
};

// Measured on the GLBs: depth maps of the plinth's faces, the plaque being the panel set in (or
// grooved round) on the +z face; the footprint is the bottom step.
const FITS: Record<string, Fit> = {
  mail: { foot: [0.475, 0.469], plaque: [0.268, 0.754, 0.253, 0.375] },
  linkedin: { foot: [0.453, 0.453], plaque: [0.49, 0.83, 0.205, 0.295] },
  github: { foot: [0.315, 0.315], plaque: [0.208, 0.558, 0.137, 0.239] },
  resume: { foot: [0.545, 0.533], plaque: [0.288, 0.588, 0.208, 0.343] },
  scholar: { foot: [0.552, 0.55], plaque: [0.45, 0.86, 0.188, 0.273] },
  huggingface: { foot: [0.641, 0.64], plaque: [0.423, 0.7, 0.208, 0.302] },
  medium: { foot: [0.559, 0.559], plaque: [0.315, 0.915, 0.31, 0.504] },
};

const glb = (key: string) => `/models/${key}.glb`;
// start the downloads when the world's code loads (in the browser only; this module is also on server-rendered pages)
if (typeof window !== "undefined") for (const l of LINKS) useGLTF.preload(glb(l.key));

type Spot = { x: number; z: number; yaw: number; front: [number, number] };

/** Each monument on the half ring, turned to the drive-in point; `front` is just off its plinth. */
const MONUMENTS: Spot[] = LINKS.map((l, i) => {
  const a = (i * Math.PI) / (LINKS.length - 1);
  const x = SOCIAL.center[0] + Math.cos(a) * SOCIAL.radius;
  const z = SOCIAL.center[1] - Math.sin(a) * SOCIAL.radius;
  const yaw = Math.atan2(DRIVE_IN[0] - x, DRIVE_IN[1] - z);
  const d = FITS[l.key].foot[1] * K + 0.35;
  return { x, z, yaw, front: [x + Math.sin(yaw) * d, z + Math.cos(yaw) * d] };
});

/** World x, z of each link's interactable: the front of its monument (prompt sticker, nearLink). */
export const LINK_SPOTS: [number, number][] = MONUMENTS.map((m) => m.front);

/** One monument: the model at world scale, the link's name and code on its plaque. */
function Monument({ link, code, spot }: { link: SocialLink; code: string; spot: Spot }) {
  const { scene } = useGLTF(glb(link.key));
  // the one mesh, drawn with the file's own geometry and material (shared, never cloned)
  const mesh = useMemo(() => {
    scene.updateMatrixWorld(true);
    let m: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (!m && (o as THREE.Mesh).isMesh) m = o as THREE.Mesh;
    });
    const found = m as THREE.Mesh | null;
    return found && { geometry: found.geometry, material: found.material, matrix: found.matrixWorld.clone() };
  }, [scene]);
  const [y0, y1, hw, fz] = FITS[link.key].plaque;
  const w = hw * 2 * K;
  const h = (y1 - y0) * K;
  // one line each, sized to the plaque: Plex Sans SemiBold runs about 0.6 em a character
  const name = Math.min(h * 0.24, (w * 0.84) / (0.6 * link.name.length));
  const mono = Math.min(name * 0.62, h * 0.12);
  const py = ((y0 + y1) / 2) * K;
  const pz = fz * K + 0.004;
  return (
    <group position={[spot.x, heightAt(spot.x, spot.z), spot.z]} rotation={[0, spot.yaw, 0]}>
      {mesh && (
        <group scale={K}>
          <mesh geometry={mesh.geometry} material={mesh.material} matrix={mesh.matrix} matrixAutoUpdate={false} castShadow receiveShadow />
        </group>
      )}
      <Label mono position={[0, py + name * 0.62, pz]} fontSize={mono} color={C.charcoal} letterSpacing={0.06}>
        {code}
      </Label>
      <Label position={[0, py - mono * 0.5, pz]} fontSize={name} color={C.ink}>
        {link.name}
      </Label>
    </group>
  );
}

/** A low concrete sign in front of the ring: CONTACT, the zone code and the link count. */
function Sign({ x, z }: { x: number; z: number }) {
  const y = heightAt(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, 0, 0]}>
      <mesh position={[0, 0.3, 0]} material={mat(C.concrete, { r: 0.95 })} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.6, 0.5]} />
      </mesh>
      <mesh position={[0, 0.605, 0]} material={mat(C.ink, { r: 0.6, m: 0.2 })}>
        <boxGeometry args={[3.2, 0.012, 0.5]} />
      </mesh>
      <mesh position={[-1.6 + 0.08, 0.3, 0.253]} material={mat(C.orange, { r: 0.55 })}>
        <boxGeometry args={[0.06, 0.6, 0.006]} />
      </mesh>
      <Label position={[-1.38, 0.34, 0.256]} anchorX="left" fontSize={0.26} color={C.ink} letterSpacing={0.04}>
        CONTACT
      </Label>
      <Label mono position={[1.45, 0.34, 0.256]} anchorX="right" fontSize={0.1} color={C.charcoal} letterSpacing={0.06}>
        {`${ZONE_CODE} · ${String(LINKS.length).padStart(2, "0")} LINKS`}
      </Label>
    </group>
  );
}

const ZONE_CODE = `Z${String(zones.findIndex((q) => q.id === "contact") + 1).padStart(2, "0")}`;

/** Sets `nearLink` when the car is at a monument's front (with a little hysteresis). */
function LinkWatcher() {
  useFrame(() => {
    const s = getState();
    if (s.phase !== "world") return;
    const { x, z } = carState.pos;
    let best: string | null = null;
    let bd = Infinity;
    for (let i = 0; i < LINK_SPOTS.length; i++) {
      const d = Math.hypot(x - LINK_SPOTS[i][0], z - LINK_SPOTS[i][1]);
      const reach = LINKS[i].key === s.nearLink ? SOCIAL.reach + 0.8 : SOCIAL.reach;
      if (d < reach && d < bd) {
        bd = d;
        best = LINKS[i].key;
      }
    }
    if (best !== s.nearLink) setState({ nearLink: best });
  });
  return null;
}

export function openLink(key: string) {
  const l = LINKS.find((q) => q.key === key);
  if (l) window.open(l.url, "_blank", "noopener");
}

// The sign and the driver stand in the ring's middle, under the Mailbox hotspot, near enough to
// the drive-in point that the chase camera sees the back monument (C04) over both of them.
const SIGN: [number, number] = [SOCIAL.center[0], SOCIAL.center[1] + 0.4];
/** Where the driver stands, just behind the sign, and how near the car comes before he waves (with hysteresis). */
const DRIVER: [number, number] = [SOCIAL.center[0], SOCIAL.center[1] - 1];
const WAVE_IN = 8;
const WAVE_OUT = 10;
/** Facing the drive-in point when nobody is about. */
const REST_YAW = Math.atan2(DRIVE_IN[0] - DRIVER[0], DRIVE_IN[1] - DRIVER[1]) + 0.25;

/** The driver: idles, turns to face the car as it comes in and waves while it is close. */
function Driver() {
  const turn = useRef<THREE.Group>(null);
  const near = useRef(false);
  const wave = useMemo(() => () => near.current, []);
  useFrame((_, dt) => {
    const g = turn.current;
    if (!g) return;
    const live = getState().phase === "world";
    const d = Math.hypot(carState.pos.x - DRIVER[0], carState.pos.z - DRIVER[1]);
    near.current = live && d < (near.current ? WAVE_OUT : WAVE_IN);
    const want = live && d < WAVE_OUT + 6 ? Math.atan2(carState.pos.x - DRIVER[0], carState.pos.z - DRIVER[1]) : REST_YAW;
    // the shorter way round, damped like a person turning on the spot
    let dy = want - g.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.rotation.y += dy * (1 - Math.exp(-3 * dt));
  });
  return (
    <group ref={turn} position={[DRIVER[0], heightAt(DRIVER[0], DRIVER[1]), DRIVER[1]]} rotation={[0, REST_YAW, 0]}>
      {/* a real 1.75 m at the world's scale (../scale.ts) */}
      <Avatar scale={WORLD_SCALE} wave={wave} />
    </group>
  );
}

export default function Social() {
  const [sx, sz] = SIGN;
  return (
    <>
      <Suspense fallback={null}>
        {LINKS.map((l, i) => (
          <Monument key={l.key} link={l} code={`C${String(i + 1).padStart(2, "0")}`} spot={MONUMENTS[i]} />
        ))}
      </Suspense>
      <Sign x={sx} z={sz} />
      <RigidBody type="fixed" colliders={false}>
        {/* one box per monument, its plinth's footprint, the monument's height */}
        {MONUMENTS.map((m, i) => {
          const [fx, fz] = FITS[LINKS[i].key].foot;
          return (
            <CuboidCollider
              key={i}
              args={[fx * K, MONUMENT_H / 2, fz * K]}
              position={[m.x, heightAt(m.x, m.z) + MONUMENT_H / 2, m.z]}
              rotation={[0, m.yaw, 0]}
            />
          );
        })}
        <CuboidCollider args={[1.6, 0.3, 0.25]} position={[sx, heightAt(sx, sz) + 0.3, sz]} />
        {/* the driver, so the car stops short of him */}
        <CylinderCollider args={[real(1.75) / 2, 0.22]} position={[DRIVER[0], heightAt(DRIVER[0], DRIVER[1]) + real(1.75) / 2, DRIVER[1]]} />
      </RigidBody>
      <Driver />
      <LinkWatcher />
    </>
  );
}
