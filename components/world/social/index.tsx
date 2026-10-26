"use client";

// Contact, the way the original does its social area: one concrete slab per link in a half
// ring round a waving Henil, a low CONTACT sign in front. Drive up to a slab and the prompt names it;
// Enter (or a click on the prompt) opens the link. Links come from
// content/profile.ts only.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { profile } from "@/content/profile";
import { carState } from "../carState";
import { C } from "../palette";
import { heightAt } from "../terrain";
import { zoneById, zones } from "../layout";
import { getState, setState } from "../store";
import { geo, mat } from "../models/props/shared";
import { Avatar } from "../models/Avatar";
import { Label } from "../models/props/Label";
import { ICONS, type IconName } from "./icons";

export type SocialLink = { key: string; name: string; url: string; icon: IconName };

export const LINKS: SocialLink[] = [
  { key: "mail", name: "Email", url: `mailto:${profile.email}`, icon: "mail" },
  { key: "linkedin", name: "LinkedIn", url: profile.links.linkedin, icon: "linkedin" },
  { key: "github", name: "GitHub", url: profile.links.github, icon: "github" },
  { key: "resume", name: "Résumé", url: profile.resume, icon: "resume" },
  { key: "scholar", name: "Scholar", url: profile.links.scholar, icon: "googlescholar" },
  { key: "huggingface", name: "Hugging Face", url: profile.links.huggingface, icon: "huggingface" },
  { key: "medium", name: "Medium", url: profile.links.medium, icon: "medium" },
];

/** Centre of the ring: the slabs bow away from the camera (to -z), open side toward it. */
// The ring stands on its park island, 3 m behind the contact zone's hotspot.
export const SOCIAL = { center: [zoneById.contact.pos[0], zoneById.contact.pos[1] - 3] as [number, number], radius: 6.2, reach: 2.6 };

/** World x, z of each slab. */
export const LINK_SPOTS: [number, number][] = LINKS.map((_, i) => {
  const a = (i * Math.PI) / (LINKS.length - 1);
  return [SOCIAL.center[0] + Math.cos(a) * SOCIAL.radius, SOCIAL.center[1] - Math.sin(a) * SOCIAL.radius];
});

// ------------------------------------------------------------ geometry

// Each link is a cast concrete slab on a dark plinth (Concrete & Ink): an ink face with the
// brand glyph in paper, a paper strip with the name in Plex Sans, a Plex Mono code (C01...)
// and one orange chip in the face's corner.
const SLAB_W = 1.0;
const SLAB_D = 0.36;
const SLAB_H = 1.95;
const BASE_H = 0.16;
const FACE_Y = BASE_H + 1.22; // glyph centre height
const FACE_H = 1.0;
const FACE_W = 0.84;

function iconGeometry(name: IconName) {
  return geo(`social-icon-${name}`, () => {
    const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${ICONS[name]}"/></svg>`);
    const shapes = svg.paths.flatMap((p) => p.toShapes());
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 0.8, bevelEnabled: false, curveSegments: 8 });
    // 24-unit grid, y down -> about 0.6 m across, y up, centred, standing proud of the
    // ink face. Flip y and z together (a rotation, not a mirror) so faces keep their winding.
    g.translate(-12, -12, 0);
    const s = 0.6 / 24;
    g.scale(s, -s, -s);
    g.translate(0, 0, 0.8 * s);
    g.computeVertexNormals();
    return g;
  });
}

/** The slab in side profile (z, y), chamfered at the front top edge, extruded across x. */
const slabGeo = () =>
  geo("social-slab", () => {
    const d = SLAB_D / 2;
    const sh = new THREE.Shape();
    sh.moveTo(-d, 0);
    sh.lineTo(d, 0);
    sh.lineTo(d, SLAB_H - 0.16);
    sh.lineTo(d - 0.16, SLAB_H);
    sh.lineTo(-d, SLAB_H);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: SLAB_W, bevelEnabled: false });
    // shape x is the slab's depth: turn it so the profile runs along z and the extrusion along x
    g.rotateY(-Math.PI / 2);
    g.translate(SLAB_W / 2, BASE_H, 0);
    g.computeVertexNormals();
    return g;
  });

function Slab({ link, code, x, z }: { link: SocialLink; code: string; x: number; z: number }) {
  const y = heightAt(x, z);
  // face the ring's centre, turned a little toward the camera so the glyphs read
  const yaw = Math.atan2(SOCIAL.center[0] - x, SOCIAL.center[1] + 4 - z);
  const fz = SLAB_D / 2;
  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, BASE_H / 2, 0.04]} material={mat(C.concreteDark, { r: 0.95 })} castShadow receiveShadow>
        <boxGeometry args={[SLAB_W + 0.24, BASE_H, SLAB_D + 0.4]} />
      </mesh>
      <mesh geometry={slabGeo()} material={mat(C.concrete, { r: 0.95 })} castShadow receiveShadow />
      {/* ink face, glyph in paper, the orange chip top left */}
      <mesh position={[0, FACE_Y, fz + 0.006]} material={mat(C.ink, { r: 0.6, m: 0.2 })}>
        <boxGeometry args={[FACE_W, FACE_H, 0.012]} />
      </mesh>
      <mesh geometry={iconGeometry(link.icon)} position={[0, FACE_Y, fz + 0.012]} material={mat(C.paper, { r: 0.6 })} castShadow />
      <mesh position={[-FACE_W / 2 + 0.07, FACE_Y + FACE_H / 2 - 0.07, fz + 0.014]} material={mat(C.orange, { r: 0.55 })}>
        <boxGeometry args={[0.07, 0.07, 0.006]} />
      </mesh>
      {/* paper strip: the name in Plex Sans, the code in Plex Mono */}
      <mesh position={[0, BASE_H + 0.42, fz + 0.006]} material={mat(C.paper, { r: 0.6 })}>
        <boxGeometry args={[FACE_W, 0.3, 0.012]} />
      </mesh>
      <Label position={[-FACE_W / 2 + 0.06, BASE_H + 0.42, fz + 0.014]} anchorX="left" fontSize={0.13} color={C.ink}>
        {link.name}
      </Label>
      <Label mono position={[FACE_W / 2 - 0.06, BASE_H + 0.42, fz + 0.014]} anchorX="right" fontSize={0.08} color={C.charcoal}>
        {code}
      </Label>
      <Label mono position={[0, BASE_H + 0.42, -SLAB_D / 2 - 0.004]} rotation={[0, Math.PI, 0]} fontSize={0.1} color={C.ink}>
        {code}
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

/** Sets `nearLink` when the car is next to a slab (with a little hysteresis). */
function LinkWatcher() {
  useFrame(() => {
    const s = getState();
    if (s.phase !== "world") return;
    const { x, z } = carState.pos;
    let best: string | null = null;
    let bd = Infinity;
    LINK_SPOTS.forEach(([lx, lz], i) => {
      const d = Math.hypot(x - lx, z - lz);
      const reach = LINKS[i].key === s.nearLink ? SOCIAL.reach + 0.8 : SOCIAL.reach;
      if (d < reach && d < bd) {
        bd = d;
        best = LINKS[i].key;
      }
    });
    if (best !== s.nearLink) setState({ nearLink: best });
  });
  return null;
}

export function openLink(key: string) {
  const l = LINKS.find((q) => q.key === key);
  if (l) window.open(l.url, "_blank", "noopener");
}

export default function Social() {
  const spots = useMemo(() => LINK_SPOTS, []);
  const [cx, cz] = SOCIAL.center;
  return (
    <>
      {LINKS.map((l, i) => (
        <Slab key={l.key} link={l} code={`C${String(i + 1).padStart(2, "0")}`} x={spots[i][0]} z={spots[i][1]} />
      ))}
      <Sign x={cx} z={cz - 4.2} />
      <RigidBody type="fixed" colliders={false}>
        {spots.map(([x, z], i) => (
          <CylinderCollider key={i} args={[SLAB_H / 2 + BASE_H / 2, 0.55]} position={[x, heightAt(x, z) + SLAB_H / 2 + BASE_H / 2, z]} />
        ))}
        <CuboidCollider args={[1.6, 0.3, 0.25]} position={[cx, heightAt(cx, cz - 4.2) + 0.3, cz - 4.2]} />
      </RigidBody>
      <Avatar position={[cx, heightAt(cx, cz - 2.2), cz - 2.2]} rotation={[0, 0.25, 0]} wave />
      <LinkWatcher />
    </>
  );
}
